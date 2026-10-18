# Google Cloud setup record

Fill this in once your setup is done (docs/SETUP.md, steps 3–4), so you, or Claude, can find things later. Nothing here is secret: the Client ID is public by design. **Never** record the client secret.

| Item | Value |
|---|---|
| Google account | (the account that holds your data) |
| Cloud project | Bonsai Tracker (`<project-id>`) |
| APIs enabled | Google Drive API, Google Sheets API |
| Consent screen | External, **Testing** status (don't publish) |
| Test users | (your email, plus anyone you share with) |
| Scopes | `https://www.googleapis.com/auth/drive.file` only |
| OAuth client | Web application, "Bonsai Tracker Web" |
| Client ID | `<…>.apps.googleusercontent.com` (also in `src/lib/config.ts`) |
| JS origins | `https://<github-user>.github.io`, `http://localhost:5173` |
| Redirect URIs | `https://<github-user>.github.io/bonsai-tracker/`, `http://localhost:5173/bonsai-tracker/` |

Console: `https://console.cloud.google.com/auth/overview?project=<project-id>`
