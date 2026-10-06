// Seasonal windows (SPEC §6b). The year is split into 24 half-months:
//   1 = 1–15 Jan, 2 = 16 Jan–end, … 24 = 16 Dec–end.
// Stored as codes 'MMa' (1st–15th) / 'MMb' (16th–end), e.g. '09a' … '12a' = 1 Sep – 15 Dec.

export type Window = { from: number; to: number; interval: number | null; product: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parseHalf(code: string): number | null {
  const m = code?.match(/^(\d{2})([ab])$/)
  if (!m) return null
  const month = Number(m[1])
  if (month < 1 || month > 12) return null
  return (month - 1) * 2 + (m[2] === 'a' ? 1 : 2)
}

export function halfCode(h: number) {
  return `${String(Math.ceil(h / 2)).padStart(2, '0')}${h % 2 ? 'a' : 'b'}`
}

export function halfOf(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return (m - 1) * 2 + (d <= 15 ? 1 : 2)
}

/** Start label: "1 Sep" / "16 Sep". End label: "15 Sep" / "end Sep". */
export function startLabel(h: number) {
  return `${h % 2 ? 1 : 16} ${MONTHS[Math.ceil(h / 2) - 1]}`
}
export function endLabel(h: number) {
  return `${h % 2 ? '15' : 'end'} ${MONTHS[Math.ceil(h / 2) - 1]}`
}

export const HALVES = Array.from({ length: 24 }, (_, i) => i + 1)

export function inWindow(h: number, w: Pick<Window, 'from' | 'to'>) {
  return w.from <= w.to ? h >= w.from && h <= w.to : h >= w.from || h <= w.to
}

export function fmtWindow(w: Pick<Window, 'from' | 'to'>) {
  return `${startLabel(w.from)} – ${endLabel(w.to)}`
}

export function fmtWindows(ws: Pick<Window, 'from' | 'to'>[]) {
  return ws.length ? [...ws].sort((a, b) => a.from - b.from).map(fmtWindow).join(', ') : 'All year'
}

/** First day of a half-month in a given year, as an ISO date. */
function halfStart(h: number, year: number) {
  return `${year}-${String(Math.ceil(h / 2)).padStart(2, '0')}-${h % 2 ? '01' : '16'}`
}

/** The next date (after today) on which one of the windows starts. */
export function nextWindowStart(ws: Pick<Window, 'from' | 'to'>[], today: string) {
  const year = Number(today.slice(0, 4))
  const starts = ws.flatMap((w) => [halfStart(w.from, year), halfStart(w.from, year + 1)]).filter((d) => d > today)
  return starts.sort()[0] ?? null
}

/** Converts an old whole-month season ("9,10,11,12,1,2,3,4") into windows (one per run of months). */
export function windowsFromMonths(months: string): { from: number; to: number }[] {
  const set = new Set(months.split(',').map(Number).filter((n) => n >= 1 && n <= 12))
  if (set.size === 0 || set.size === 12) return []
  const has = (m: number) => set.has((((m - 1) % 12) + 12) % 12 + 1)
  const out: { from: number; to: number }[] = []
  for (let m = 1; m <= 12; m++) {
    if (!has(m) || has(m - 1)) continue
    let len = 1
    while (len < 12 && has(m + len)) len++
    const last = ((m + len - 2) % 12) + 1
    out.push({ from: (m - 1) * 2 + 1, to: last * 2 })
  }
  return out
}
