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
  careLog: [] as Row[],
  careTypes: [] as Row[],
  schedules: [] as Row[],
})

// logCareTree preselects one tree (single entry); empty means a round with all active trees ticked.
export const ui = $state({ addTree: false, addPot: false, logCare: false, logCareType: '', logCareTree: '' })

export function openLogCare(opts: { treeId?: string; careType?: string } = {}) {
  ui.logCareTree = opts.treeId ?? ''
  ui.logCareType = opts.careType ?? ''
  ui.logCare = true
}

let ws: Workspace

export async function loadDb(workspace: Workspace) {
  ws = workspace
  const all = await loadAll(ws.sheetId)
  db.trees = all.Trees
  db.pots = all.Pots
  db.makers = all.Makers
  db.photos = all.Photos
  db.lists = all.Lists
  db.careLog = all.CareLog
  db.careTypes = all.CareTypes
  db.schedules = all.Schedules
  await seedNewLists()
}

/** Deletes a Sheet row and renumbers the in-memory rows below it. */
async function removeRow(tab: string, rows: Row[], row: Row) {
  await deleteRow(tab, row._row)
  const removed = row._row
  const i = rows.indexOf(row)
  if (i >= 0) rows.splice(i, 1)
  for (const r of rows) if (r._row > removed) r._row -= 1
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
  await removeRow('Photos', db.photos, photo)

  const kind = photo.owner_type as Kind
  const owner = kind in TABLE ? getRecord(kind, photo.owner_id) : undefined
  if (owner?.cover_photo_id === id) await saveRecord(kind, { cover_photo_id: '' }, owner.id)

  // Files go to the Drive bin; a failure here leaves only an orphaned file, never a broken row.
  await Promise.allSettled([photo.drive_file_id, photo.thumb_file_id].filter(Boolean).map(trashFile))
}

export function setCover(kind: Kind, ownerId: string, photoId: string) {
  return saveRecord(kind, { cover_photo_id: photoId }, ownerId)
}

// Care types

// Types that show Product + Amount unless the Sheet says otherwise.
const PRODUCT_DEFAULT = new Set(['Fertilise', 'Insecticide', 'Fungicide', 'Lime sulfured'])

export function getCareType(name: string) {
  return db.careTypes.find((c) => c.name === name)
}

export const isSchedulable = (ct: Row) => ct.schedulable === 'y'
export const usesProduct = (ct: Row | undefined) => (!ct ? false : ct.uses_product ? ct.uses_product === 'y' : PRODUCT_DEFAULT.has(ct.name))

export async function saveCareType(
  fields: { name: string; schedulable: boolean; usesProduct: boolean; activeMonths?: string },
  existingName?: string,
) {
  const row: Record<string, string> = {
    name: fields.name.trim(),
    schedulable: fields.schedulable ? 'y' : 'n',
    uses_product: fields.usesProduct ? 'y' : 'n',
  }
  if (fields.activeMonths !== undefined) row.active_months = fields.activeMonths
  const existing = existingName ? getCareType(existingName) : undefined
  if (existing) {
    await updateRow('CareTypes', existing._row, { ...existing, ...row })
    Object.assign(existing, row)
    return existing
  }
  if (getCareType(row.name)) throw new Error(`"${row.name}" already exists.`)
  const full = { ...row, built_in: 'n', active_months: row.active_months ?? '' }
  const _row = await appendRow('CareTypes', full)
  db.careTypes.push(asRow(full, _row))
  return db.careTypes[db.careTypes.length - 1]
}

export async function setCareTypeMonths(name: string, activeMonths: string) {
  const ct = getCareType(name)
  if (!ct) return
  await updateRow('CareTypes', ct._row, { ...ct, active_months: activeMonths })
  ct.active_months = activeMonths
}

// Care log

export const productList = (careType: string) => `product:${careType}`

export function careFor(treeId: string) {
  return db.careLog
    .filter((c) => c.tree_id === treeId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export function getCare(id: string) {
  return db.careLog.find((c) => c.id === id)
}

/** Amount from the most recent entry with this care type and product. */
export function lastAmount(careType: string, product: string) {
  let best: Row | undefined
  for (const c of db.careLog) {
    if (c.care_type !== careType || c.product !== product || !c.amount) continue
    if (!best || c.date > best.date || (c.date === best.date && c.created_at > best.created_at)) best = c
  }
  return best?.amount ?? ''
}

/** One CareLog row per tree; rows logged together share a round_id. */
export async function logCare(opts: { careType: string; date: string; treeIds: string[]; notes: string; product: string; amount: string }) {
  const round = opts.treeIds.length > 1 ? newId('r') : ''
  const now = new Date().toISOString()
  const rows = opts.treeIds.map((tree_id) => ({
    id: newId('c'),
    date: opts.date,
    care_type: opts.careType,
    tree_id,
    notes: opts.notes.trim(),
    round_id: round,
    created_at: now,
    product: opts.product,
    amount: opts.amount.trim(),
  }))
  const nums = await appendRows('CareLog', rows)
  rows.forEach((r, i) => db.careLog.push(asRow(r, nums[i])))
}

export async function updateCare(id: string, fields: { date: string; notes: string; product: string; amount: string }) {
  const c = getCare(id)
  if (!c) return
  const next = { date: fields.date, notes: fields.notes.trim(), product: fields.product, amount: fields.amount.trim() }
  await updateRow('CareLog', c._row, { ...c, ...next })
  Object.assign(c, next)
}

export async function deleteCare(id: string) {
  const c = getCare(id)
  if (c) await removeRow('CareLog', db.careLog, c)
}

// Schedules: a row is either a species default (species set) or a tree override (tree_id set).

export function getSchedule(key: { species?: string; treeId?: string }, careType: string) {
  return db.schedules.find(
    (s) => s.care_type === careType && (key.treeId ? s.tree_id === key.treeId : !s.tree_id && s.species === key.species),
  )
}

export async function setSchedule(key: { species?: string; treeId?: string }, careType: string, fields: { interval_days?: string; active_months?: string }) {
  const existing = getSchedule(key, careType)
  const next = {
    species: key.treeId ? '' : (key.species ?? ''),
    tree_id: key.treeId ?? '',
    care_type: careType,
    interval_days: fields.interval_days ?? existing?.interval_days ?? '',
    active_months: fields.active_months ?? existing?.active_months ?? '',
  }
  const empty = !next.interval_days && !next.active_months
  if (existing) {
    if (empty) return removeRow('Schedules', db.schedules, existing)
    await updateRow('Schedules', existing._row, next)
    Object.assign(existing, next)
  } else if (!empty) {
    const _row = await appendRow('Schedules', next)
    db.schedules.push(asRow(next, _row))
  }
}
