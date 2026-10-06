// In-memory copy of the Sheet. Every mutation writes to the Sheet first, then updates state.
import type { Workspace } from './drive'
import { newId, todayISO } from './format'
import { resizeImage, trashFile, uploadJpeg } from './photos'
import { LIST_SEEDS } from './schema'
import { appendRow, appendRows, asRow, deleteRow, deleteRows, loadAll, updateRow, type Row } from './sheets'
import { halfCode, parseHalf, windowsFromMonths, type Window } from './windows'
import { assignCodes } from './codes'

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
  windows: [] as Row[],
  meta: [] as Row[],
})

// Log care presets: logCareTree = one tree (single entry); logCareTrees = a round with just these ticked;
// neither = a round with all active trees ticked.
export const ui = $state({
  addTree: false,
  addPot: false,
  logCare: false,
  logCareType: '',
  logCareTree: '',
  logCareTrees: [] as string[],
})

export function openLogCare(opts: { treeId?: string; treeIds?: string[]; careType?: string } = {}) {
  ui.logCareTree = opts.treeId ?? ''
  ui.logCareTrees = opts.treeIds ?? []
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
  db.windows = all.Windows
  db.meta = all.Meta
  await seedNewLists()
  await migrateMonthSeasons()
}

/**
 * One-off: whole-month seasons (CareTypes.active_months, Schedules.active_months) become
 * half-month windows (SPEC §6b). Recorded in Meta so it never runs twice.
 */
async function migrateMonthSeasons() {
  if (getMeta('windows_migrated')) return
  const rows: Record<string, string>[] = []
  const add = (care_type: string, species: string, months: string, interval = '') => {
    for (const w of windowsFromMonths(months)) {
      rows.push({ care_type, species, from: halfCode(w.from), to: halfCode(w.to), interval_days: interval, product: '' })
    }
  }
  for (const ct of db.careTypes) if (ct.active_months) add(ct.name, '', ct.active_months)
  for (const s of db.schedules) if (s.species && !s.tree_id && s.active_months) add(s.care_type, s.species, s.active_months)
  const nums = await appendRows('Windows', rows)
  rows.forEach((r, i) => db.windows.push(asRow(r, nums[i])))
  await setMeta({ windows_migrated: new Date().toISOString() })
}

// Windows

/** Windows for a care type: the species' own if given and present, else none (callers fall back to the default). */
export function windowRows(careType: string, species: string) {
  return db.windows.filter((w) => w.care_type === careType && w.species === species)
}

export function toWindows(rows: Row[]): Window[] {
  return rows
    .map((r) => ({ from: parseHalf(r.from) ?? 0, to: parseHalf(r.to) ?? 0, interval: Number(r.interval_days) || null, product: r.product }))
    .filter((w) => w.from && w.to)
    .sort((a, b) => a.from - b.from)
}

/** Replaces all windows for (care type, species). species '' = the care type's default windows. */
export async function setWindows(careType: string, species: string, windows: Window[]) {
  const old = windowRows(careType, species)
  await deleteRows('Windows', old.map((r) => r._row))
  const removed = old.map((r) => r._row)
  db.windows = db.windows.filter((r) => !old.includes(r))
  for (const r of db.windows) r._row -= removed.filter((n) => n < r._row).length

  const rows = windows.map((w) => ({
    care_type: careType,
    species,
    from: halfCode(w.from),
    to: halfCode(w.to),
    interval_days: w.interval ? String(w.interval) : '',
    product: w.product ?? '',
  }))
  const nums = await appendRows('Windows', rows)
  rows.forEach((r, i) => db.windows.push(asRow(r, nums[i])))
}

// Meta: key/value settings

export function getMeta(key: string) {
  return db.meta.find((m) => m.key === key)?.value ?? ''
}

export async function setMeta(values: Record<string, string>) {
  const added: { key: string; value: string }[] = []
  for (const [key, value] of Object.entries(values)) {
    const row = db.meta.find((m) => m.key === key)
    if (row) {
      if (row.value === value) continue
      await updateRow('Meta', row._row, { key, value })
      row.value = value
    } else added.push({ key, value })
  }
  const nums = await appendRows('Meta', added)
  added.forEach((r, i) => db.meta.push(asRow(r, nums[i])))
}

/** Deletes a Sheet row and renumbers the in-memory rows below it. */
async function removeRow(tab: string, rows: Row[], row: Row) {
  await deleteRow(tab, row._row)
  const removed = row._row
  const i = rows.indexOf(row)
  if (i >= 0) rows.splice(i, 1)
  for (const r of rows) if (r._row > removed) r._row -= 1
}

/**
 * Seeds lists introduced after the Sheet was created, once each. Meta `seeded_lists`
 * remembers what was seeded so a list the user empties on purpose stays empty.
 */
async function seedNewLists() {
  const seeded = new Set([...db.lists.map((r) => r.list), ...getMeta('seeded_lists').split(',').filter(Boolean)])
  const toSeed = Object.keys(LIST_SEEDS).filter((list) => !seeded.has(list))

  const rows: { list: string; value: string }[] = []
  for (const list of toSeed) for (const value of LIST_SEEDS[list]) rows.push({ list, value })

  // Every flagged species must also be a pickable species (also repairs half-finished seeding).
  const species = new Set(db.lists.filter((r) => r.list === 'species').map((r) => r.value))
  const flagged = [...db.lists.filter((r) => r.list === 'p_sensitive').map((r) => r.value), ...rows.filter((r) => r.list === 'p_sensitive').map((r) => r.value)]
  for (const value of flagged) {
    if (species.has(value) || rows.some((r) => r.list === 'species' && r.value === value)) continue
    rows.push({ list: 'species', value })
  }

  const nums = await appendRows('Lists', rows)
  rows.forEach((r, i) => db.lists.push(asRow(r, nums[i])))

  const record = [...new Set([...seeded, ...toSeed])].sort().join(',')
  if (record !== getMeta('seeded_lists')) await setMeta({ seeded_lists: record })
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

export async function removeListValue(list: string, value: string) {
  const row = db.lists.find((r) => r.list === list && r.value === value)
  if (row) await removeRow('Lists', db.lists, row)
}

// Phosphorus sensitivity (SPEC §6a): species flag in Lists 'p_sensitive', tree override in Trees.p_sensitive.

export const FERTILISE = 'Fertilise'

export function speciesPSensitive(species: string) {
  return !!species && db.lists.some((r) => r.list === 'p_sensitive' && r.value === species)
}

export async function setSpeciesPSensitive(species: string, on: boolean) {
  if (on) await addListValue('p_sensitive', species)
  else await removeListValue('p_sensitive', species)
}

export function isPSensitive(tree: Row) {
  if (tree.p_sensitive === 'y') return true
  if (tree.p_sensitive === 'n') return false
  return speciesPSensitive(tree.species)
}

export type FertGroup = 'p' | 'std'

/** Default product + amount for each group, set in Settings → Fertilisers. */
export function fertDefaults(group: FertGroup) {
  return { product: getMeta(`fert_${group}_product`), amount: getMeta(`fert_${group}_amount`) }
}

export function setFertDefaults(values: Record<FertGroup, { product: string; amount: string }>) {
  return setMeta({
    fert_p_product: values.p.product,
    fert_p_amount: values.p.amount.trim(),
    fert_std_product: values.std.product,
    fert_std_amount: values.std.amount.trim(),
  })
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

/** Calendar code per care type name (explicit CareTypes.code, else preset, else automatic). */
export function careCodes() {
  return assignCodes(db.careTypes.map((c) => ({ name: c.name, code: c.code })))
}

// CareTypes.active_months is legacy: seasons now live in the Windows tab (SPEC §6b).
export async function saveCareType(
  fields: { name: string; schedulable: boolean; usesProduct: boolean; code?: string },
  existingName?: string,
) {
  const row: Record<string, string> = {
    name: fields.name.trim(),
    schedulable: fields.schedulable ? 'y' : 'n',
    uses_product: fields.usesProduct ? 'y' : 'n',
  }
  if (fields.code !== undefined) row.code = fields.code.trim().slice(0, 3)
  const existing = existingName ? getCareType(existingName) : undefined
  if (existing) {
    await updateRow('CareTypes', existing._row, { ...existing, ...row })
    Object.assign(existing, row)
    return existing
  }
  if (getCareType(row.name)) throw new Error(`"${row.name}" already exists.`)
  const full = { ...row, built_in: 'n', active_months: '' }
  const _row = await appendRow('CareTypes', full)
  db.careTypes.push(asRow(full, _row))
  return db.careTypes[db.careTypes.length - 1]
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

/**
 * One CareLog row per tree; rows logged together share a round_id. Each tree can carry
 * its own product/amount (e.g. P-sensitive trees get a different fertiliser).
 */
export async function logCare(opts: {
  careType: string
  date: string
  notes: string
  items: { treeId: string; product: string; amount: string }[]
}) {
  const round = opts.items.length > 1 ? newId('r') : ''
  const now = new Date().toISOString()
  const rows = opts.items.map((item) => ({
    id: newId('c'),
    date: opts.date,
    care_type: opts.careType,
    tree_id: item.treeId,
    notes: opts.notes.trim(),
    round_id: round,
    created_at: now,
    product: item.product,
    amount: item.amount.trim(),
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

// Schedules: a row is either a species base interval (species set) or a tree override (tree_id set).
// Schedules.active_months is legacy: seasons now live in the Windows tab (SPEC §6b).

export function getSchedule(key: { species?: string; treeId?: string }, careType: string) {
  return db.schedules.find(
    (s) => s.care_type === careType && (key.treeId ? s.tree_id === key.treeId : !s.tree_id && s.species === key.species),
  )
}

export async function setSchedule(key: { species?: string; treeId?: string }, careType: string, intervalDays: string) {
  const existing = getSchedule(key, careType)
  const next = {
    species: key.treeId ? '' : (key.species ?? ''),
    tree_id: key.treeId ?? '',
    care_type: careType,
    interval_days: intervalDays,
    active_months: '',
  }
  const empty = !next.interval_days
  if (existing) {
    if (empty) return removeRow('Schedules', db.schedules, existing)
    await updateRow('Schedules', existing._row, next)
    Object.assign(existing, next)
  } else if (!empty) {
    const _row = await appendRow('Schedules', next)
    db.schedules.push(asRow(next, _row))
  }
}
