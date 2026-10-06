// Photo processing (resize, EXIF date), Drive upload, and cached display URLs.
import { gfetch, gjson } from './google'

/** Reads DateTimeOriginal from a JPEG's EXIF block → 'YYYY-MM-DD', or null. */
export async function exifDate(file: Blob): Promise<string | null> {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer())
    if (v.getUint16(0) !== 0xffd8) return null
    let off = 2
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off)
      if ((marker & 0xff00) !== 0xff00) break
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiffDate(v, off + 10)
      off += 2 + v.getUint16(off + 2)
    }
  } catch {}
  return null
}

function parseTiffDate(v: DataView, start: number): string | null {
  const le = v.getUint16(start) === 0x4949
  const u16 = (o: number) => v.getUint16(start + o, le)
  const u32 = (o: number) => v.getUint32(start + o, le)
  type Tag = { count: number; value: number }
  const readIfd = (ifd: number) => {
    const tags = new Map<number, Tag>()
    const n = u16(ifd)
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12
      tags.set(u16(e), { count: u32(e + 4), value: u32(e + 8) })
    }
    return tags
  }
  const ascii = (t: Tag) => {
    let s = ''
    for (let i = 0; i < t.count - 1; i++) s += String.fromCharCode(v.getUint8(start + t.value + i))
    return s
  }

  const ifd0 = readIfd(u32(4))
  let dt = ''
  const exif = ifd0.get(0x8769)
  if (exif) {
    const tags = readIfd(exif.value)
    const t = tags.get(0x9003) ?? tags.get(0x9004)
    if (t) dt = ascii(t)
  }
  if (!dt && ifd0.get(0x0132)) dt = ascii(ifd0.get(0x0132)!)
  const m = dt.match(/^(\d{4}):(\d{2}):(\d{2})/)
  return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** Scales so the long edge is at most `max` px and re-encodes as JPEG. Orientation is applied by the browser. */
export async function resizeImage(file: Blob, max: number, quality = 0.85): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo.'))), 'image/jpeg', quality),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function uploadJpeg(blob: Blob, name: string, folderId: string): Promise<string> {
  const boundary = 'bt' + crypto.randomUUID()
  const meta = JSON.stringify({ name, parents: [folderId], mimeType: 'image/jpeg' })
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ])
  const { id } = await gjson<{ id: string }>('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  primeCache(id, blob)
  return id
}

// Display: in-memory object URLs backed by the Cache API, so photos load once per device.
const CACHE = 'bt-photos-v1'
const cacheKey = (id: string) => `https://bonsai-tracker.cache/${id}`
const urls = new Map<string, Promise<string>>()

async function primeCache(id: string, blob: Blob) {
  urls.set(id, Promise.resolve(URL.createObjectURL(blob)))
  try {
    await (await caches.open(CACHE)).put(cacheKey(id), new Response(blob, { headers: { 'Content-Type': blob.type } }))
  } catch {}
}

async function fetchBlob(id: string): Promise<Blob> {
  try {
    const hit = await (await caches.open(CACHE)).match(cacheKey(id))
    if (hit) return await hit.blob()
  } catch {}
  const blob = await (await gfetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).blob()
  try {
    await (await caches.open(CACHE)).put(cacheKey(id), new Response(blob, { headers: { 'Content-Type': blob.type } }))
  } catch {}
  return blob
}

export function photoUrl(id: string): Promise<string> {
  let p = urls.get(id)
  if (!p) {
    p = fetchBlob(id).then((b) => URL.createObjectURL(b))
    p.catch(() => urls.delete(id))
    urls.set(id, p)
  }
  return p
}
