// OAuth client ID is public by design (see docs/GOOGLE_SETUP.md). No secret is used.
export const CLIENT_ID =
  '53894046241-hu6jugdhsvebp7dvneo7a6cj8plhijt1.apps.googleusercontent.com'

// Only files this app creates are visible to it. Sheets API accepts this scope
// for spreadsheets the app created.
export const SCOPES = 'https://www.googleapis.com/auth/drive.file'

export const SCHEMA_VERSION = 1
