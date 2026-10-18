// ─── SETUP: your Google OAuth client ID ───────────────────────────────────────
// Every copy of this app needs its own Google Cloud OAuth client (docs/SETUP.md, step 4).
// Replace this value with yours. It is public by design; no client secret is used,
// and a secret must never be committed.
export const CLIENT_ID =
  '53894046241-hu6jugdhsvebp7dvneo7a6cj8plhijt1.apps.googleusercontent.com'
// ──────────────────────────────────────────────────────────────────────────────

// Only files this app creates are visible to it. Sheets API accepts this scope
// for spreadsheets the app created.
export const SCOPES = 'https://www.googleapis.com/auth/drive.file'

export const SCHEMA_VERSION = 1
