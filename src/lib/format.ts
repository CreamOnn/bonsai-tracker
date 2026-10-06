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

/** Keeps digits and one decimal point; '' if nothing usable. */
export function cleanNumber(v: string) {
  const s = String(v ?? '').replace(/[^\d.]/g, '')
  const [a, ...rest] = s.split('.')
  return rest.length ? `${a}.${rest.join('')}` : a
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
