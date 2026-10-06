// Due logic (docs/SPEC.md §6).
//   interval:      tree override → species default → none (never due)
//   active months: species override → care type default → all year
//   due when in season and (never done, or days since last ≥ interval)
import { todayISO } from './format'
import { db, getCareType, getSchedule, isActive, isSchedulable, type Row } from './store.svelte'

export type Due = {
  careType: string
  interval: number | null
  intervalSource: 'tree' | 'species' | null
  activeMonths: string
  inSeason: boolean
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

export function monthsSet(months: string) {
  return new Set(months.split(',').map(Number).filter((n) => n >= 1 && n <= 12))
}

export function inSeason(months: string, iso = todayISO()) {
  const set = monthsSet(months)
  return set.size === 0 || set.has(toDate(iso).getMonth() + 1)
}

export function lastDone(treeId: string, careType: string) {
  let last: string | null = null
  for (const c of db.careLog) if (c.tree_id === treeId && c.care_type === careType && (!last || c.date > last)) last = c.date
  return last
}

export function dueFor(tree: Row, careType: string, today = todayISO()): Due {
  const treeRow = getSchedule({ treeId: tree.id }, careType)
  const speciesRow = tree.species ? getSchedule({ species: tree.species }, careType) : undefined

  const treeInterval = Number(treeRow?.interval_days) || null
  const speciesInterval = Number(speciesRow?.interval_days) || null
  const interval = treeInterval ?? speciesInterval
  const intervalSource = treeInterval ? 'tree' : speciesInterval ? 'species' : null

  const activeMonths = speciesRow?.active_months || getCareType(careType)?.active_months || ''
  const season = inSeason(activeMonths, today)
  const last = lastDone(tree.id, careType)
  const next = interval && last ? addDays(last, interval) : interval ? today : null
  const daysOver = next ? daysBetween(next, today) : null
  const due = !!interval && season && isActive(tree) && (daysOver ?? 0) >= 0

  return { careType, interval, intervalSource, activeMonths, inSeason: season, last, next, daysOver, due }
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "9,10,11,12,1,2,3,4" → "Sep–Apr"; '' → "All year" */
export function fmtMonths(months: string) {
  const set = monthsSet(months)
  if (set.size === 0 || set.size === 12) return 'All year'
  // Month m may run past 12 or below 1; wrap it onto 1–12.
  const has = (m: number) => set.has((((m - 1) % 12) + 12) % 12 + 1)
  const runs: string[] = []
  for (let m = 1; m <= 12; m++) {
    if (!has(m) || has(m - 1)) continue // only start at the first month of a run
    let len = 1
    while (len < 12 && has(m + len)) len++
    const start = MONTHS[m - 1]
    const end = MONTHS[(m + len - 2) % 12]
    runs.push(len === 1 ? start : `${start}–${end}`)
  }
  return runs.join(', ')
}
