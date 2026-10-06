// In-memory copy of the Sheet. Every mutation writes to the Sheet first, then updates state.
import type { Workspace } from './drive'
import { newId, todayISO } from './format'
import { resizeImage, trashFile, uploadJpeg } from './photos'
import { LIST_SEEDS } from './schema'
import { appendRow, appendRows, asRow, deleteRow, loadAll, updateRow, type Row } from './sheets'

export type { Row }
export type ArchiveStatus = 'sold' | 'died' | 'gifted'
export type Kind = 'tree' | 'pot'
export type PotSlot = 'front' | 'side' | 'mark'

export const POT_SLOTS: { value: PotSlot; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'mark', label: "Maker's mark" },
]

export const db = $state({
  trees: [] as Row[],
  pots: [] as Row[],
  makers: [] as Row[],
  photos: [] as Row[],
  lists: [] as Row[],
})

export const ui = $state({ addTree: false, addPot: false })

let ws: Workspace

export async function loadDb(workspace: Workspace) {
  ws = workspace
  const all = await loadAll(ws.sheetId)
  db.trees = all.Trees
  db.pots = all.Pots
  db.makers = all.Makers
  db.photos = all.Photos
  db.lists = all.Lists
  await seedNewLists()
}

/** Seeds any list that has no values yet (lists introduced after the Sheet was created). */
async function seedNewLists() {
  const present = new Set(db.lists.map((r) => r.list))
  const rows = Object.entries(LIST_SEEDS)
    .filter(([list]) => !present.has(list))
    .flatMap(([list, values]) => values.map((value) => ({ list, value })))
  const nums = await appendRows('Lists', rows)
  rows.forEach((r, i) => db.lists.push(asRow(r, nums[i])))
}

// Lists

export function listValues(list: string) {
  return db.lists
    .filter((r) => r.list === list)
    .map((r) => r.value)
    .sort((a, b) => a.localeCompare(b))
}

export async function addListValue(list: string, value: string) {
  const v = value.trim()
  if (!v || db.lists.some((r) => r.list === list && r.value.toLowerCase() === v.toLowerCase())) return
  const row = { list, value: v }
  const _row = await appendRow('Lists', row)
  db.lists.push(asRow(row, _row))
}

// Shared record helpers

const TABLE = {
  tree: { tab: 'Trees', prefix: 't', rows: () => db.trees },
  pot: { tab: 'Pots', prefix: 'pot', rows: () => db.pots },
} as const

export const isActive = (r: Row) => !r.status || r.status === 'active'

export function getRecord(kind: Kind, id: string) {
  return TABLE[kind].rows().find((r) => r.id === id)
}

export async function saveRecord(kind: Kind, fields: Record<string, string>, id?: string): Promise<Row> {
  const { tab, prefix, rows } = TABLE[kind]
  const existing = id ? getRecord(kind, id) : undefined
  if (existing) {
    await updateRow(tab, existing._row, { ...existing, ...fields })
    Object.assign(existing, fields)
    return existing
  }
  const row = { ...fields, id: newId(prefix), status: 'active', created_at: new Date().toISOString() }
  const _row = await appendRow(tab, row)
  rows().push(asRow(row, _row))
  return rows()[rows().length - 1]
}

export function archiveRecord(kind: Kind, id: string, status: ArchiveStatus, date: string, salePrice: string) {
  return saveRecord(kind, { status, status_date: date, sale_price: status === 'sold' ? salePrice : '' }, id)
}

export function restoreRecord(kind: Kind, id: string) {
  return saveRecord(kind, { status: 'active', status_date: '', sale_price: '' }, id)
}

// Trees (kept as named helpers for readability in views)

export const getTree = (id: string) => getRecord('tree', id)
export const saveTree = (fields: Record<string, string>, id?: string) => saveRecord('tree', fields, id)
export const restoreTree = (id: string) => restoreRecord('tree', id)

// Pots & makers

export const getPot = (id: string) => getRecord('pot', id)

export function getMaker(id: string) {
  return db.makers.find((m) => m.id === id)
}

export function makersSorted() {
  return [...db.makers].sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveMaker(fields: { name: string; country: string }, id?: string): Promise<Row> {
  const clean = { name: fields.name.trim(), country: fields.country }
  const existing = id ? getMaker(id) : undefined
  if (existing) {
    await updateRow('Makers', existing._row, { ...existing, ...clean })
    Object.assign(existing, clean)
    return existing
  }
  const row = { ...clean, id: newId('m') }
  const _row = await appendRow('Makers', row)
  db.makers.push(asRow(row, _row))
  return db.makers[db.makers.length - 1]
}

export function potsByMaker(makerId: string) {
  return db.pots.filter((p) => p.maker_id === makerId)
}

// Photos

export function photosFor(kind: Kind, ownerId: string, slot?: PotSlot) {
  return db.photos
    .filter((p) => p.owner_type === kind && p.owner_id === ownerId && (!slot || p.slot === slot))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export function getPhoto(id: string) {
  return db.photos.find((p) => p.id === id)
}

/**
 * Explicit cover if set. Otherwise trees use their newest photo; pots use their
 * newest Front photo, then any photo.
 */
export function coverFor(record: Row, kind: Kind = 'tree') {
  const explicit = record.cover_photo_id && getPhoto(record.cover_photo_id)
  if (explicit) return explicit
  if (kind === 'pot') return photosFor('pot', record.id, 'front')[0] ?? photosFor('pot', record.id)[0]
  return photosFor('tree', record.id)[0]
}

export async function addPhoto(opts: {
  ownerType: Kind
  ownerId: string
  file: Blob
  date: string
  caption: string
  makeCover: boolean
  slot?: PotSlot
}) {
  const full = await resizeImage(opts.file, 2048)
  const thumb = await resizeImage(full, 640, 0.8)
  const base = `${opts.ownerId}_${opts.date || todayISO()}_${Math.random().toString(36).slice(2, 6)}`
  const [fullId, thumbId] = await Promise.all([
    uploadJpeg(full, `${base}.jpg`, ws.photosFolderId),
    uploadJpeg(thumb, `${base}_thumb.jpg`, ws.photosFolderId),
  ])

  const row = {
    id: newId('p'),
    owner_type: opts.ownerType,
    owner_id: opts.ownerId,
    drive_file_id: fullId,
    thumb_file_id: thumbId,
    date: opts.date || todayISO(),
    caption: opts.caption.trim(),
    created_at: new Date().toISOString(),
    slot: opts.slot ?? '',
  }
  const _row = await appendRow('Photos', row)
  db.photos.push(asRow(row, _row))

  if (opts.makeCover) await saveRecord(opts.ownerType, { cover_photo_id: row.id }, opts.ownerId)
}

export async function updatePhoto(id: string, fields: { date: string; caption: string; slot?: string }) {
  const photo = getPhoto(id)
  if (!photo) return
  const next: Record<string, string> = { date: fields.date, caption: fields.caption.trim() }
  if (fields.slot !== undefined) next.slot = fields.slot
  await updateRow('Photos', photo._row, { ...photo, ...next })
  Object.assign(photo, next)
}

/** Removes the Sheet row, then bins both Drive files. Clears the cover if it pointed here. */
export async function deletePhoto(id: string) {
  const photo = getPhoto(id)
  if (!photo) return
  await deleteRow('Photos', photo._row)
  db.photos = db.photos.filter((p) => p.id !== id)
  for (const p of db.photos) if (p._row > photo._row) p._row -= 1

  const kind = photo.owner_type as Kind
  const owner = kind in TABLE ? getRecord(kind, photo.owner_id) : undefined
  if (owner?.cover_photo_id === id) await saveRecord(kind, { cover_photo_id: '' }, owner.id)

  // Files go to the Drive bin; a failure here leaves only an orphaned file, never a broken row.
  await Promise.allSettled([photo.drive_file_id, photo.thumb_file_id].filter(Boolean).map(trashFile))
}

export function setCover(kind: Kind, ownerId: string, photoId: string) {
  return saveRecord(kind, { cover_photo_id: photoId }, ownerId)
}
