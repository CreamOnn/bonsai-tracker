# Bonsai Tracker — Spec (v1, approved 06/10/2026)

_Last updated: 06/10/2026_

## 1. What it is

A minimal, light, Japanese-inspired web app for iPhone that tracks a personal collection of bonsai **trees** and **pots**, and logs **care** done to trees. Installed to the home screen from Safari (PWA). Single user, no sharing.

## 2. Platform & architecture

| Area | Decision |
|---|---|
| Framework | Svelte + Vite, static build |
| Hosting | GitHub Pages, public repo (code only — no data or secrets) |
| Auth | Google sign-in (personal Gmail), Google Identity Services |
| Drive scope | `drive.file` — app sees only files it created |
| Storage | One Google Sheet (data) + Drive `photos/` folder |
| Connectivity | Online only — saving requires connection |
| Photos | Resized client-side to ~2048px long edge, JPEG |
| Locale | Australia: DD/MM/YYYY, AUD, weeks start Monday, southern-hemisphere seasons |
| Icon | Minimal single-stroke ink bonsai, black on off-white |

## 3. Drive layout

```
Bonsai Tracker/
├── Bonsai Tracker   (Google Sheet)
└── photos/          (resized JPEGs)
```

### Sheet tabs

| Tab | Key columns |
|---|---|
| **Trees** | id, species, style, est. year of origin, price paid (AUD), source, notes, cover photo id, status, status date, sale price |
| **Pots** | id, maker id, style, L×W×H (cm), est. year of origin, price (AUD), cover photo id, status, status date, sale price |
| **Makers** | id, name, country |
| **Photos** | id, owner type (tree/pot), owner id, Drive file id, date, caption |
| **CareLog** | id, date, care type, tree id, notes, round id (blank if single entry) |
| **CareTypes** | name, built-in (y/n), schedulable (y/n), default active months |
| **Schedules** | species *or* tree id, care type, interval (days), active months override |
| **Lists** | list name (species / tree style / pot style), value |

- Bulk rounds write one CareLog row per tree, sharing a `round id`.
- **Status** values: active, sold, died, gifted.

## 4. Data rules

- **Pots and trees are independent** — no link between them.
- **Age** is calculated as *current year − estimated year of origin* and displayed as "c. 31 yrs".
- **Lists** (species, tree style, pot style) are fixed choices with an "＋ Add new" option, pre-filled with common values, all editable.
- **Makers** have a name and country. A maker page lists all their pots.
- **Archiving:** trees and pots are never deleted. Marking one sold, died or gifted records a date (and sale price if sold). Archived items sit at the bottom of the grids, greyed out.
- **Editing:** care entries and photos can be edited or deleted (with confirmation).

## 5. Care types

**Built-in:** prune, wire, unwire, repot, fertilise, insecticide, fungicide, defoliate, outer-canopy defoliation, pinch, carved, lime sulfured, hard cut-back, water-check. Custom types can be added.

**Schedulable:** fertilise, insecticide/fungicide, repot, prune/wire check.

## 6. Due logic

1. Look up the tree's interval for a care type: **tree override → species default → none**. With no interval, the tree is never due.
2. Look up active months: **species override → care type default**. Outside the active months, the tree is never due.
3. A tree is due when *today − last logged date for that care type ≥ interval*. A tree that has never had that care logged counts as due immediately.
4. Species intervals start blank, and you set them yourself.

## 7. Screens

### Home
- Counts: active trees and active pots. Total spent is not shown.
- **Due now:** grouped by care type, e.g. "Fertilise · 6 trees". Tapping a group opens the Log Care sheet with that care type selected.
- Recent care: the last ~5 entries.

### Trees (grid)
- Grid of cover-photo tiles, with search, filter chips (species, style, archived) and sort (newest, oldest, age, price).
- **Tree detail page:**
  - Header photo, then the details.
  - **This week last year:** a card listing care done within ±7 days of today's date one year ago, e.g. "Defoliated, pinched". Hidden if there were none.
  - **Schedule:** each schedulable care type with when it was last done, when it's next due and its interval, editable as a per-tree override.
  - **Calendar:** a swipeable month grid with a coloured dot per care type on each day something was done. Tapping a day lists that day's entries. A 12-month strip above the grid lets you jump to any month, including the same month last year. Care entries only, no photos.
  - **Photo timeline:** dated photos down a vertical timeline, with a **Compare** option to pick two photos for a side-by-side before/after.
  - **Care history:** a list of all entries, which can be edited or deleted.
  - **Actions:** add photo (camera), log care, edit, archive.

### Pots (grid)
- Same grid pattern as Trees. Filters: maker, style, archived.
- **Pot detail page:** a swipeable set of photos (front, side, maker's mark, underside) with one marked as cover, plus details and a link to the maker.

### Log Care (bottom sheet)
- Pick a care type (built-in or custom), a date (default today) and optional notes.
- **Single:** opened from a tree page, with that tree pre-selected.
- **Round:** opened from the home screen or the ＋ button, with all active trees pre-ticked so you untick the exceptions.

### Settings
- Manage lists, care types and their active months, and species intervals. Sign out.

## 8. Design

- Warm off-white background, ink-black type and accents, generous whitespace.
- Thin, modern sans-serif type. Photos are the main visual element.
- Bottom tab bar: **Home · Trees · Pots · Settings**, plus a floating ＋ button that opens a small menu: Add tree / Add pot / Log round.
- Bottom sheets for adding and logging. Subtle motion only.

## 9. Build order

1. Google Cloud setup (guided).
2. App skeleton: sign-in, create the Drive folder and Sheet, deploy to GitHub Pages.
3. Trees: add, edit, archive, photos, lists.
4. Pots and makers.
5. Care log: rounds, custom types, schedules and due logic.
6. Home screen.
7. Tree calendar, "this week last year", photo timeline and compare.
8. Polish: icon, testing on your iPhone.

## 10. Out of scope (v1)

Offline mode, push notifications, sharing, links between pots and trees, a whole-collection calendar, photos on the calendar, total-spent figures.
