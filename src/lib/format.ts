const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 2026-10-06 → 06/10/2026 */
export function fmtDate(iso: string) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export function fmtMoney(v: string) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  if (Number.isNaN(n)) return ''
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n)
}

/** Estimated year of origin → "c. 31 yrs" */
export function fmtAge(originYear: string) {
  const y = Number(originYear)
  if (!y) return ''
  const a = new Date().getFullYear() - y
  return `c. ${a} yr${a === 1 ? '' : 's'}`
}

/** "Acer buergerianum (Trident maple)" → "Trident maple" */
export function commonName(species: string) {
  return species.match(/\(([^)]+)\)\s*$/)?.[1] ?? species
}

/** "Acer buergerianum (Trident maple)" → "Acer buergerianum" */
export function latinName(species: string) {
  return species.replace(/\s*\([^)]+\)\s*$/, '')
}

/** Archive status for display. Pots store 'died' but show it as broken. */
export function statusLabel(status: string, kind: 'tree' | 'pot' = 'tree') {
  if (status === 'died' && kind === 'pot') return 'Broken'
  return { sold: 'Sold', died: 'Died', gifted: 'Gifted' }[status] ?? status
}

export const isRound = (style: string) => /^round\b/i.test(style ?? '')

/** "45 × 32 × 9 cm", or "Ø 30 × 8 cm" for round pots. Missing values are skipped. */
export function fmtSize(pot: Record<string, string>) {
  const parts = isRound(pot.style) ? [pot.length_cm && `Ø ${pot.length_cm}`, pot.height_cm] : [pot.length_cm, pot.width_cm, pot.height_cm]
  const shown = parts.filter(Boolean)
  return shown.length ? `${shown.join(' × ')} cm` : ''
}

/** Keeps digits and one decimal point; '' if nothing usable. */
export function cleanNumber(v: string) {
  const s = String(v ?? '').replace(/[^\d.]/g, '')
  const [a, ...rest] = s.split('.')
  return rest.length ? `${a}.${rest.join('')}` : a
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
