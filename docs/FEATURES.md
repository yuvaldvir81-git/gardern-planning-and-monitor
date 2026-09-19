# Features

## Plant starters

A plant starter is a single seed/seedling being tracked. Each has a name, species,
variety, seed source, date planted, location, status (`seed` → `germinating` →
`seedling` → `transplanted` → `growing` → `harvested`/`dead`), and notes.

- `/starters` — list of standalone starters (not part of a tray), with add/edit/delete.
- `/starters/[id]` — detail page: editable fields plus a **growth log**, a dated history
  of entries (height, stage, notes, photo URL) so progress over time is visible, not
  just a single current-status field. Adding an entry with a `stage` also updates the
  starter's current status.
- All data is scoped per signed-in user (Clerk `userId`).

## Starter trays (grid layout)

A tray models a physical seed-starting tray: a `rows × cols` grid where each cell is
either empty or holds one plant starter at a specific `(rowIndex, colIndex)` position.
Tray-level fields (date planted, location, seed source, notes) apply to the whole tray;
individual cells only need a seed name.

- `/starters` — trays render above the flat starter list as clickable grid previews.
- `/starters/trays/new` — create a tray by hand: set name/size/metadata, then fill each
  cell directly (with seed-bank autocomplete, see below).
- `/starters/trays/[id]` — tray detail: metadata (editable via the Edit button), and the
  grid itself. Clicking a filled cell opens that starter's normal detail/growth-log page.
  "Edit cells" switches the grid to editable inputs and saves only the cells that
  changed — existing starters are renamed, previously-empty positions get a new
  starter, and blanking a cell is a no-op (not a delete) to avoid losing growth history
  by accident.
- Deleting a tray cascades to its starters and their growth logs.

## Import from a spreadsheet

`/starters/import` asks up front which shape the source file has, since the two are
parsed completely differently:

- **Table with columns** — one row per starter, with header columns like species/date
  planted/status. Upload → (pick a sheet if the workbook has more than one) → match
  columns to fields (best-guess auto-mapping, manually adjustable) → preview per-row
  validation → import the valid rows. Bounded to the contiguous block starting at the
  header row, stopping at the first fully empty row or the first empty header cell, so
  stray notes/columns outside the real table aren't pulled in.
- **Tray grid** — one cell per seed, positional. Upload → pick a sheet, or **import all
  sheets in the workbook at once, each becoming its own tray named after its sheet** →
  shared metadata form → creates one tray per sheet. Grid bounds are the rectangle from
  the top-left cell to the first fully empty row and the first fully empty column;
  individual empty cells inside that rectangle are just unplanted positions.

Both paths parse `.xlsx` with `exceljs` and `.csv` with `papaparse` (not the `xlsx`
npm package — see [DATA_MODEL.md](./DATA_MODEL.md#why-not-the-xlsx-package)).

## Seed type bank + autocomplete

Every starter-creation path (manual add/edit, table import, tray import, manual tray
cell entry) upserts the starter's name into a per-user `seed_types` bank (unique
names only). The name field everywhere a starter is created or renamed is a free-text
combobox that suggests matches from that bank as you type, without restricting input to
existing names.

The `seed_types` table already carries metadata columns (germination days range, days
to maturity, sun requirement, spacing) — currently unpopulated — reserved for the
planned seed-metadata agent (see [ROADMAP.md](./ROADMAP.md)).

## Auth & hosting

- Clerk handles sign-up/sign-in; `/starters/*` routes are protected in `src/proxy.ts`.
- Postgres via Neon (Vercel Marketplace), Drizzle ORM, `npm run db:push` to sync schema.
- Deployed on Vercel; both integrations were provisioned through `vercel integration add`.
