// Short calendar codes for care types. Presets for the built-ins; anything else gets an
// automatic two-letter code that doesn't clash. CareTypes.code overrides both.

export const PRESET_CODES: Record<string, string> = {
  Prune: 'Pr',
  Wire: 'Wi',
  Unwire: 'Uw',
  Repot: 'Rp',
  Fertilise: 'Fe',
  Insecticide: 'In',
  Fungicide: 'Fu',
  Defoliate: 'Df',
  'Outer-canopy defoliation': 'Od',
  Pinch: 'Pi',
  Carved: 'Cv',
  'Lime sulfured': 'Ls',
  'Hard cut-back': 'Hc',
  'Water-check': 'Wc',
}

/** First letter plus the first later letter that makes it unique, e.g. "Root prune" → "Ro", then "Rt"… */
export function autoCode(name: string, taken: Set<string>) {
  const letters = name.replace(/[^a-z]/gi, '')
  const first = (letters[0] ?? '?').toUpperCase()
  for (const ch of letters.slice(1)) {
    const code = first + ch.toLowerCase()
    if (!taken.has(code)) return code
  }
  for (let n = 2; n < 100; n++) if (!taken.has(`${first}${n}`)) return `${first}${n}`
  return first
}

/** Codes for every care type name, in order, honouring explicit codes first. */
export function assignCodes(types: { name: string; code?: string }[]) {
  const out = new Map<string, string>()
  const taken = new Set<string>()
  for (const t of types) {
    const c = t.code?.trim() || PRESET_CODES[t.name]
    if (c) {
      out.set(t.name, c)
      taken.add(c)
    }
  }
  for (const t of types) {
    if (out.has(t.name)) continue
    const c = autoCode(t.name, taken)
    out.set(t.name, c)
    taken.add(c)
  }
  return out
}
