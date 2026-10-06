// Due logic (SPEC §6, §6b).
//   windows:  species' own windows → care type's default windows → all year
//   interval: tree override → current window's interval → species base interval → none (never due)
//   due when in a window and (never done, or days since last ≥ interval)
import { todayISO } from './format'
import { db, getSchedule, isActive, isSchedulable, toWindows, windowRows, type Row } from './store.svelte'
import { fmtWindows, halfOf, inWindow, nextWindowStart, type Window } from './windows'

export type Due = {
  careType: string
  interval: number | null
  intervalSource: 'tree' | 'window' | 'species' | null
  windows: Window[]
  windowSource: 'species' | 'type' | 'all-year'
  current: Window | null
  inSeason: boolean
  nextSeason: string | null
  product: string
  last: string | null
  next: string | null
  daysOver: number | null
  due: boolean
}

const DAY = 86_400_000
const toDate = (iso: string) => new Date(`${iso}T00:00:00`)

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / DAY)
}

export function addDays(iso: string, days: number) {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function lastDone(treeId: string, careType: string) {
  let last: string | null = null
  for (const c of db.careLog) if (c.tree_id === treeId && c.care_type === careType && (!last || c.date > last)) last = c.date
  return last
}

/** The windows a species follows for a care type, and where they came from. */
export function effectiveWindows(species: string, careType: string): { windows: Window[]; source: Due['windowSource'] } {
  const own = species ? toWindows(windowRows(careType, species)) : []
  if (own.length) return { windows: own, source: 'species' }
  const def = toWindows(windowRows(careType, ''))
  return def.length ? { windows: def, source: 'type' } : { windows: [], source: 'all-year' }
}

export function dueFor(tree: Row, careType: string, today = todayISO()): Due {
  const treeInterval = Number(getSchedule({ treeId: tree.id }, careType)?.interval_days) || null
  const speciesInterval = (tree.species && Number(getSchedule({ species: tree.species }, careType)?.interval_days)) || null

  const { windows, source } = effectiveWindows(tree.species, careType)
  const h = halfOf(today)
  const current = windows.find((w) => inWindow(h, w)) ?? null
  const inSeason = windows.length === 0 || !!current

  // Out of season, show the interval the next window will use.
  const upcoming = inSeason ? null : nextWindowStart(windows, today)
  const shown = current ?? (upcoming ? windows.find((w) => w.from === halfOf(upcoming)) : null) ?? windows[0] ?? null
  const interval = treeInterval ?? shown?.interval ?? speciesInterval
  const intervalSource = treeInterval ? 'tree' : shown?.interval ? 'window' : speciesInterval ? 'species' : null

  const last = lastDone(tree.id, careType)
  let next = interval && last ? addDays(last, interval) : interval ? today : null
  // A next date that falls between windows moves to the start of the following window.
  if (next && windows.length && !windows.some((w) => inWindow(halfOf(next!), w))) {
    next = nextWindowStart(windows, addDays(next, -1)) ?? next
  }
  const daysOver = next ? daysBetween(next, today) : null
  const due = !!interval && inSeason && isActive(tree) && (daysOver ?? 0) >= 0

  return {
    careType,
    interval,
    intervalSource,
    windows,
    windowSource: source,
    current,
    inSeason,
    nextSeason: upcoming,
    product: current?.product ?? '',
    last,
    next,
    daysOver,
    due,
  }
}

/** True if any interval exists for this tree and care type (tree, any window, or species). */
export function hasSchedule(tree: Row, careType: string) {
  if (Number(getSchedule({ treeId: tree.id }, careType)?.interval_days)) return true
  if (tree.species && Number(getSchedule({ species: tree.species }, careType)?.interval_days)) return true
  return effectiveWindows(tree.species, careType).windows.some((w) => w.interval)
}

export function schedulableTypes() {
  return db.careTypes.filter(isSchedulable).map((c) => c.name)
}

/** Everything due today, grouped by care type (for the Home screen). */
export function dueByType(today = todayISO()) {
  const groups = new Map<string, Row[]>()
  for (const ct of schedulableTypes()) {
    const trees = db.trees.filter((t) => isActive(t) && dueFor(t, ct, today).due)
    if (trees.length) groups.set(ct, trees)
  }
  return groups
}

/** "every 14 days", "every 2 weeks", "every 3 months", "every 2 years" */
export function fmtInterval(days: number) {
  const [n, unit] = days % 365 === 0 ? [days / 365, 'year'] : days % 30 === 0 ? [days / 30, 'month'] : days % 7 === 0 ? [days / 7, 'week'] : [days, 'day']
  return `every ${n === 1 ? '' : `${n} `}${unit}${n === 1 ? '' : 's'}`
}

export { fmtWindows }
