// Finds or creates the app's Drive workspace:
//   Bonsai Tracker/ (folder)
//   ├── Bonsai Tracker (Sheet)
//   └── photos/
// With the drive.file scope, Drive only ever returns files this app created.
import { SCHEMA_VERSION } from './config'
import { gjson, jsonBody } from './google'
import { TABS, seedRows } from './schema'

const DRIVE = 'https://www.googleapis.com/drive/v3'
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
const NAME = 'Bonsai Tracker'

type DriveFile = { id: string; name: string; webViewLink?: string }

export type Workspace = {
  folderId: string
  photosFolderId: string
  sheetId: string
  sheetUrl: string
  email: string
}

async function findOne(q: string): Promise<DriveFile | null> {
  const params = new URLSearchParams({ q: `${q} and trashed=false`, fields: 'files(id,name,webViewLink)', spaces: 'drive' })
  const { files } = await gjson<{ files: DriveFile[] }>(`${DRIVE}/files?${params}`)
  return files[0] ?? null
}

async function createFolder(name: string, parent?: string): Promise<DriveFile> {
  return gjson(`${DRIVE}/files?fields=id,name`, jsonBody({ name, mimeType: FOLDER_MIME, parents: parent ? [parent] : undefined }))
}

function cell(value: string, bold = false) {
  return {
    userEnteredValue: { stringValue: value },
    ...(bold ? { userEnteredFormat: { textFormat: { bold: true } } } : {}),
  }
}

async function createSheet(folderId: string): Promise<DriveFile> {
  const seeds = seedRows(SCHEMA_VERSION)
  const sheets = Object.entries(TABS).map(([title, headers]) => ({
    properties: { title, gridProperties: { frozenRowCount: 1 } },
    data: [
      {
        startRow: 0,
        startColumn: 0,
        rowData: [
          { values: headers.map((h) => cell(h, true)) },
          ...(seeds[title] ?? []).map((row) => ({ values: row.map((v) => cell(v)) })),
        ],
      },
    ],
  }))

  const created = await gjson<{ spreadsheetId: string }>(
    `${SHEETS}?fields=spreadsheetId`,
    jsonBody({
      properties: { title: NAME, locale: 'en_AU', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      sheets,
    }),
  )

  // Sheets API creates in My Drive root; move it into the app folder.
  const { parents } = await gjson<{ parents: string[] }>(`${DRIVE}/files/${created.spreadsheetId}?fields=parents`)
  const params = new URLSearchParams({ addParents: folderId, removeParents: parents.join(','), fields: 'id,name,webViewLink' })
  return gjson(`${DRIVE}/files/${created.spreadsheetId}?${params}`, jsonBody({}, 'PATCH'))
}

export async function ensureWorkspace(): Promise<Workspace> {
  const { user } = await gjson<{ user: { emailAddress: string } }>(`${DRIVE}/about?fields=user(emailAddress)`)

  const folder =
    (await findOne(`name='${NAME}' and mimeType='${FOLDER_MIME}' and 'root' in parents`)) ?? (await createFolder(NAME))
  const photos =
    (await findOne(`name='photos' and mimeType='${FOLDER_MIME}' and '${folder.id}' in parents`)) ??
    (await createFolder('photos', folder.id))
  const sheet =
    (await findOne(`name='${NAME}' and mimeType='${SHEET_MIME}' and '${folder.id}' in parents`)) ??
    (await createSheet(folder.id))

  return {
    folderId: folder.id,
    photosFolderId: photos.id,
    sheetId: sheet.id,
    sheetUrl: sheet.webViewLink ?? `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`,
    email: user.emailAddress,
  }
}
