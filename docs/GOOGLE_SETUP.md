# Google Cloud setup (done 06/10/2026)

| Item | Value |
|---|---|
| Google account | owner's personal Gmail |
| Cloud project | Bonsai Tracker (`bonsai-tracker-510805`) |
| APIs enabled | Google Drive API, Google Sheets API |
| Consent screen | External, **Testing** status (do not publish) |
| Test users | owner's personal Gmail |
| Scopes | `https://www.googleapis.com/auth/drive.file` only |
| OAuth client | Web application, "Bonsai Tracker Web" |
| Client ID | `53894046241-hu6jugdhsvebp7dvneo7a6cj8plhijt1.apps.googleusercontent.com` |
| JS origins | `https://creamonn.github.io`, `http://localhost:5173` |
| Redirect URIs | `https://creamonn.github.io/bonsai-tracker/`, `http://localhost:5173/bonsai-tracker/` (full-page OAuth redirect) |

The Client ID is public by design. The client secret is not used and must never be committed.

Console: https://console.cloud.google.com/auth/overview?project=bonsai-tracker-510805
