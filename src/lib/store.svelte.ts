// In-memory copy of the Sheet. Every mutation writes to the Sheet first, then updates state.
import type { Workspace } from './drive'
import { newId, todayISO } from './format'
import { resizeImage, uploadJpeg } from './photos'
import { appendRow, asRow, loadAll, updateRow, type Row } from './sheets'

export type { Row }
export type ArchiveStatus = 'sold' | 'died' | 'gifted'

export const db = $state({
  trees: [] as Row[],
  pots: [] as Row[],
  photos: [] as Row[],
  lists: [] as Row[],
})

export const ui = $state({ addTree: false })

let ws: Workspace

export async function loadDb(workspace: Workspace) {
  ws = workspace
  const all = await loadAll(ws.sheetId)
  db.trees = all.Trees
  db.pots = all.Pots
  db.photos = all.Photos
  db.lists = all.Lists
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

// Trees

export const isActive = (r: Row) => !r.status || r.status === 'active'

export function getTree(id: string) {
  return db.trees.find((t) => t.id === id)
}

export async function saveTree(fields: Record<string, string>, id?: string): Promise<Row> {
  const existing = id ? getTree(id) : undefined
  if (existing) {
    const merged = { ...existing, ...fields } as Row
    await updateRow('Trees', existing._row, merged)
    Object.assign(existing, fields)
    return existing
  }
  const row = { ...fields, id: newId('t'), status: 'active', created_at: new Date().toISOString() }
  const _row = await appendRow('Trees', row)
  const created = asRow(row, _row)
  db.trees.push(created)
  return db.trees[db.trees.length - 1] ?? created
}

export function archiveTree(id: string, status: ArchiveStatus, date: string, salePrice: string) {
  return saveTree({ status, status_date: date, sale_price: status === 'sold' ? salePrice : '' }, id)
}

export function restoreTree(id: string) {
  return saveTree({ status: 'active', status_date: '', sale_price: '' }, id)
}

// Photos

export function photosFor(ownerType: 'tree' | 'pot', ownerId: string) {
  return db.photos
    .filter((p) => p.owner_type === ownerType && p.owner_id === ownerId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export function getPhoto(id: string) {
  return db.photos.find((p) => p.id === id)
}

export async function addPhoto(opts: {
  ownerType: 'tree' | 'pot'
  ownerId: string
  file: Blob
  date: string
  caption: string
  makeCover: boolean
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
  }
  const _row = await appendRow('Photos', row)
  db.photos.push(asRow(row, _row))

  if (opts.makeCover && opts.ownerType === 'tree') await saveTree({ cover_photo_id: row.id }, opts.ownerId)
}

export function setTreeCover(treeId: string, photoId: string) {
  return saveTree({ cover_photo_id: photoId }, treeId)
}

/** The tree's cover photo, falling back to its newest photo. */
export function coverFor(tree: Row) {
  return (tree.cover_photo_id && getPhoto(tree.cover_photo_id)) || photosFor('tree', tree.id)[0]
}
