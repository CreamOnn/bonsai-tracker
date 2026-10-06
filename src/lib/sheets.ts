// Row-level access to the data Sheet. Columns are mapped by header name, so
// new schema columns are appended to existing Sheets automatically.
import { gjson, jsonBody } from './google'
import { TABS } from './schema'

const API = 'https://sheets.googleapis.com/v4/spreadsheets'

export type Row = Record<string, string> & { _row: number }

export function asRow(fields: Record<string, string>, _row: number): Row {
  return { ...fields, _row } as unknown as Row
}

const NUMERIC = new Set(['origin_year', 'price_paid', 'price', 'sale_price', 'length_cm', 'width_cm', 'height_cm', 'interval_days'])

let sheetId = ''
const headers: Record<string, string[]> = {}
const tabIds: Record<string, number> = {}

function colLetter(index: number) {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const range = (r: string) => encodeURIComponent(r)

export async function loadAll(id: string): Promise<Record<string, Row[]>> {
  sheetId = id

  // Add any tabs a newer schema introduced.
  type Props = { properties: { title: string; sheetId: number } }
  const meta = await gjson<{ sheets: Props[] }>(`${API}/${id}?fields=sheets(properties(title,sheetId))`)
  for (const s of meta.sheets) tabIds[s.properties.title] = s.properties.sheetId
  const missing = Object.keys(TABS).filter((t) => !(t in tabIds))
  if (missing.length) {
    const res = await gjson<{ replies: { addSheet: Props }[] }>(
      `${API}/${id}:batchUpdate`,
      jsonBody({ requests: missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
    )
    for (const r of res.replies) tabIds[r.addSheet.properties.title] = r.addSheet.properties.sheetId
  }

  const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE' })
  for (const t of Object.keys(TABS)) params.append('ranges', `'${t}'`)
  const { valueRanges } = await gjson<{ valueRanges: { values?: unknown[][] }[] }>(`${API}/${id}/values:batchGet?${params}`)

  const out: Record<string, Row[]> = {}
  const headerFixes: { range: string; values: string[][] }[] = []

  Object.keys(TABS).forEach((tab, i) => {
    const values = valueRanges[i].values ?? []
    const head = (values[0] ?? []).map(String)
    const add = TABS[tab].filter((h) => !head.includes(h))
    if (add.length) {
      headerFixes.push({ range: `'${tab}'!${colLetter(head.length)}1`, values: [add] })
      head.push(...add)
    }
    headers[tab] = head

    out[tab] = values
      .slice(1)
      .map((r, j) => {
        const row = { _row: j + 2 } as Row
        head.forEach((h, k) => (row[h] = r[k] == null ? '' : String(r[k])))
        return row
      })
      .filter((row) => head.some((h) => row[h] !== ''))
  })

  if (headerFixes.length) {
    await gjson(`${API}/${id}/values:batchUpdate`, jsonBody({ valueInputOption: 'RAW', data: headerFixes }))
  }
  return out
}

function toCells(tab: string, obj: Record<string, unknown>) {
  return headers[tab].map((h) => {
    const v = obj[h] == null ? '' : String(obj[h])
    return NUMERIC.has(h) && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v
  })
}

/** Appends a row and returns its 1-based row number. */
export async function appendRow(tab: string, obj: Record<string, unknown>): Promise<number> {
  const res = await gjson<{ updates: { updatedRange: string } }>(
    `${API}/${sheetId}/values/${range(`'${tab}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    jsonBody({ values: [toCells(tab, obj)] }),
  )
  const row = Number(res.updates.updatedRange.match(/![A-Z]+(\d+)/)?.[1])
  if (!row) throw new Error('Saved, but could not read back the row position. Please reload.')
  return row
}

/** Appends several rows in one request and returns their row numbers. */
export async function appendRows(tab: string, objs: Record<string, unknown>[]): Promise<number[]> {
  if (!objs.length) return []
  const res = await gjson<{ updates: { updatedRange: string } }>(
    `${API}/${sheetId}/values/${range(`'${tab}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    jsonBody({ values: objs.map((o) => toCells(tab, o)) }),
  )
  const first = Number(res.updates.updatedRange.match(/![A-Z]+(\d+)/)?.[1])
  if (!first) throw new Error('Saved, but could not read back the row positions. Please reload.')
  return objs.map((_, i) => first + i)
}

/** Removes several rows in one request (bottom-up, so earlier deletions don't shift later ones). */
export async function deleteRows(tab: string, rows: number[]) {
  if (!rows.length) return
  const requests = [...rows]
    .sort((a, b) => b - a)
    .map((row) => ({ deleteDimension: { range: { sheetId: tabIds[tab], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }))
  await gjson(`${API}/${sheetId}:batchUpdate`, jsonBody({ requests }))
}

/** Removes a row; rows below it move up by one, so callers must renumber their copies. */
export async function deleteRow(tab: string, row: number) {
  await gjson(
    `${API}/${sheetId}:batchUpdate`,
    jsonBody({
      requests: [{ deleteDimension: { range: { sheetId: tabIds[tab], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }],
    }),
  )
}

export async function updateRow(tab: string, row: number, obj: Record<string, unknown>) {
  const last = colLetter(headers[tab].length - 1)
  await gjson(
    `${API}/${sheetId}/values/${range(`'${tab}'!A${row}:${last}${row}`)}?valueInputOption=RAW`,
    jsonBody({ values: [toCells(tab, obj)] }, 'PUT'),
  )
}
