# Bonsai Tracker — notes for Claude

A minimal, Japanese-inspired web app (PWA) for tracking bonsai **trees**, **pots** and **care** on a phone. Each user's data lives in **their own Google Drive** (one Google Sheet plus a `photos/` folder). There is no backend: the browser talks to the Google Drive and Sheets APIs directly.

- **Source of truth for behaviour:** `docs/SPEC.md`. Read it before changing features, and update it when behaviour changes (sections 6a–6c record decisions made after v1).
- **Setting up a new copy:** `docs/SETUP.md` is the human guide. Run the playbook at the end of this file when the user asks to set the app up.

## Stack and commands

- Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`) + TypeScript + Vite. No UI library and no router library. Keep dependencies minimal.
- `npm run dev`: serves http://localhost:5173/bonsai-tracker/ (port fixed at 5173; Google's redirect URIs depend on it)
- `npm run check`: svelte-check + tsc. **Run before every commit** and keep it at 0 errors, 0 warnings.
- `npm run build`: production build into `dist/`
- **Deploy:** push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages. `BASE_PATH` comes from the repo name.

## Architecture (src/)

| File | Role |
|---|---|
| `lib/config.ts` | **Google OAuth Client ID (per copy)**, the `drive.file` scope |
| `lib/auth.ts` | OAuth implicit flow via a **full-page redirect** (popups break in iOS home-screen apps). Token in localStorage, about 1 hour; silent re-auth with `prompt=none`. `ensureFreshToken()` before forms and uploads. |
| `lib/google.ts` | `gfetch`/`gjson`: authorised fetch; a 401 triggers silent re-auth |
| `lib/drive.ts` | Finds or creates the *Bonsai Tracker* folder, Sheet and `photos/` on first sign-in |
| `lib/schema.ts` | Sheet tabs and columns (`TABS`), seed lists (`LIST_SEEDS`), care types |
| `lib/sheets.ts` | Row access mapped **by header name**: `loadAll`, `appendRow(s)`, `updateRow`, `updateRowsBatch`, `deleteRow(s)` |
| `lib/store.svelte.ts` | In-memory copy of the Sheet (`db`) plus every mutation. **All writes go through here.** Also one-off migrations run on load. |
| `lib/due.ts`, `lib/windows.ts` | Schedule and "due" logic, half-month seasonal windows (SPEC §6, §6b) |
| `lib/photos.ts` | Client-side resize (2048px plus a 640px thumb), EXIF date, Drive upload, cached display |
| `lib/update.ts` | Self-update: compares the build id with the deployed `version.json` and reloads (with a loop guard) |
| `views/*` | Screens and sheets. `Collection.svelte` is the shared Trees/Pots grid. |

Routing is a hash router (`#/trees/<id>`, `#/settings/<page>`); see `lib/router.svelte.ts`.

## Data rules (important)

- **Schema changes:** add columns at the **end** of a tab's list in `schema.ts`. Missing headers are appended to existing Sheets on load, and missing tabs are created. Never reorder or rename existing columns.
- **One-off data changes** (seeding, migrations) must be idempotent and recorded in the `Meta` tab (see `seedNewLists`, `migrateMonthSeasons`).
- **Row numbers:** each in-memory row carries `_row`. After deleting rows, renumber (see `removeRow` / `setWindows`). A stale `_row` makes updates overwrite the wrong row.
- **Renames cascade:** `renameListValue` / `renameCareType` update every referencing record in one batch. A new field that stores a list value must be added to `usages()` in `store.svelte.ts`.
- **Photos are moved to the Drive bin, never permanently deleted.**

## Hard-won lessons

- **Never write test data into the user's real Sheet.** To check logic, push fake rows into `db.*` in memory from the browser console, check the UI, then remove them. If a real write is needed to test something, **ask the user first** and restore the data afterwards.
- **Vite HMR re-runs `loadDb` against the real Sheet.** Stop the dev server (or close the app tab) while editing migration or seeding code, or a half-written change can run against real data.
- After restarting the dev server, do a **full reload**. Changing the hash alone keeps the old JS. When importing the store from the console after HMR, use the same `?t=` URL the app loaded (check `performance.getEntriesByType('resource')`).
- GitHub Pages caches `index.html` for 10 minutes, so phones can show the old version briefly after a deploy. `update.ts` handles this, so don't remove its loop guard.
- `+ New` pick-list values commit on blur, so a form saved without tapping **Add** keeps the typed value.
- PowerShell 5 on Windows adds a BOM with `Set-Content -Encoding utf8`, which breaks `package.json`. Not an issue on a Mac.

## Working with the user

- Confirm design choices before building: ask a few focused questions, then build.
- The user must do every sign-in, consent screen, Terms-of-Service acceptance and Google Cloud change themselves (or approve each one). Never enter passwords.
- After deploying, tell the user it can take about 10 minutes to appear on their phone.

---

## Setup playbook (when the user says "set this up for me")

Follow `docs/SETUP.md`, one step at a time. Confirm each step worked before moving on. Fill in `docs/GOOGLE_SETUP.md` as you go.

1. **Check the tools:** run `node --version`, `git --version`, `gh --version`, `brew --version`. If anything is missing, give the user the install commands from SETUP.md step 1 to run in their own Terminal (Homebrew needs their password).
2. **GitHub:** run `gh auth status`. If they're not logged in, have them run `gh auth login --hostname github.com --git-protocol https --web` themselves. Confirm the repo is **their** copy (`git remote -v` shows their username, not `CreamOnn`). If it's still the template, help them create theirs via **Use this template** (SETUP.md step 2) and clone it. Run `npm install`. Turn on Pages with `gh api -X POST repos/<user>/<repo>/pages -f build_type=workflow`.
3. **Google Cloud** (SETUP.md steps 3–4): the user does these in their browser. Give them the exact link and values for each sub-step, and wait for "done". Work out the values for them from `gh api user --jq .login` and the repo name:
   - JS origins: `https://<login-lowercase>.github.io`, `http://localhost:5173`
   - Redirect URIs: `https://<login-lowercase>.github.io/<repo>/`, `http://localhost:5173/<repo>/`
4. When they paste the **Client ID** (and **never** the secret), put it in `src/lib/config.ts`, then run `npm run check`.
5. **Local test:** start `npm run dev`. The user signs in at `http://localhost:5173/<repo>/`. Expect the "unverified app" warning; they click Continue. If you see `redirect_uri_mismatch`, wait 5–10 minutes. Confirm the *Bonsai Tracker* folder and Sheet appear in their Drive.
6. **Publish:** commit ("Use my Google client ID") and push, wait for the Actions run (`gh run watch`), and give them their live URL.
7. **Phone:** walk them through SETUP.md step 6 for their phone (iPhone: Safari → Share → Add to Home Screen; Android: Chrome → ⋮ → Install app).
8. Suggest first steps: add a tree and a pot, Settings → Fertilisers, Settings → Schedules.
