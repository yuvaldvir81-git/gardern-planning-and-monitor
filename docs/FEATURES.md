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
- The Edit dialog can also resize the tray (rows/columns, up to 20 each). Shrinking is
  blocked — not just discouraged — if it would cut off a position that already has a
  starter: `updateTraySize()` computes the highest occupied row/column and rejects a
  size below that, so this can't silently orphan a starter's growth log.
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

Once a seed type has generated metadata, filled tray cells whose name matches it show
a small dot and a hover tooltip with the summary (germination range, maturity, sun,
spacing) — on both the tray detail grid and the mini tray previews on `/starters`.
Hover doesn't exist on touch devices, so the same summary is also shown as a plain
"Seed info" card on the starter's own detail page (`/starters/[id]`), which is what
tapping any cell opens — that's the reliable path on mobile, the grid tooltip is a
desktop-only bonus on top of it.

Every filled cell (regardless of whether its seed type has metadata) also shows days
since planting on its own line under the name — computed from the starter's
`date_planted`, not stored.

## Seed package photos

Adding or editing a starter (via the standalone Add/Edit dialog, or the tray "Add a
seed" quick-add) has an optional photo — meant for a picture of the seed packet, not a
growth-progress shot (that's what [growth log](#plant-starters) photos are for,
though photo *capture* isn't wired up there yet, only a URL field). On mobile, the
file input's `capture="environment"` attribute opens the camera directly instead of a
file picker.

Uploads go straight from the browser to Vercel Blob via `@vercel/blob/client`'s
`upload()`, not through a Server Action — Server Actions cap request bodies well below
what a phone camera photo needs. `src/app/api/upload/route.ts` implements
`handleUpload` to mint a short-lived client token per request (auth-gated via Clerk,
restricted to image content types, 10 MB max) rather than handling the file bytes
itself. The Blob store was provisioned with `vercel storage create ... --access public`
and connected with OIDC credentials (no `BLOB_READ_WRITE_TOKEN` needed, same OIDC
pattern as the AI Gateway).

## Seed metadata agent

`/starters/seeds` lists the seed bank with its metadata columns (germination days
range, days to maturity, sun requirement, spacing, notes). Each row has a Generate/
Regenerate action (sparkle icon) that calls `anthropic/claude-sonnet-5` through the
Vercel AI Gateway with a Zod-validated structured-output schema
(`generatedMetadataSchema` in
[`src/app/starters/seed-types/actions.ts`](../src/app/starters/seed-types/actions.ts))
to fill in that one seed type from general horticultural knowledge — the model
returns `null` for anything it isn't confident about rather than guessing. A header
button generates every seed type that's never been generated in one pass
(sequential, not parallel — fine at the scale of a personal seed bank). Every row is
also manually editable (pencil icon) to correct AI output. `metadata_generated_at`
tracks whether a row has been generated at all; regenerating overwrites prior values,
including manual edits.

Auth to the AI Gateway is automatic — Vercel injects an OIDC token for deployed
functions, and `vercel env pull` already pulled `VERCEL_OIDC_TOKEN` into `.env.local`
for local dev, so no separate `AI_GATEWAY_API_KEY` was needed.

## Language (English / Hebrew)

`/settings` has a language switcher; the choice is stored per user in `user_settings`
(`language` column) and mirrored into a `NEXT_LOCALE` cookie, which is what actually
drives rendering on every request via `next-intl` (`src/i18n/request.ts` — no
`[locale]` URL segment, just a cookie read, defaulting to English until the user has
ever picked one). Every app string lives in `messages/en.json` / `messages/he.json`;
components use `useTranslations()` (client) or `getTranslations()` (server).

Hebrew is full RTL, not just translated text: `<html dir="rtl">` is set from the
resolved locale, which — combined with CSS logical properties — flips flex-row order,
text alignment, and form-control layout automatically. The handful of physical
`left`/`right` classes that existed were converted to logical (`start`/`end`)
equivalents, `shadcn migrate rtl` was run once to convert the shadcn primitives
(dialog close buttons, dropdown carets, etc.) the same way, and back-arrow icons get
`rtl:rotate-180` since SVG icons don't mirror on their own. Clerk's own sign-in/sign-up
widget is localized too via `@clerk/localizations`' `heIL`, driven by the same
resolved locale.

**Known gap**: form validation error messages (Zod schema messages, e.g. "Name is
required") and a handful of rare server-thrown error strings (spreadsheet-parsing
edge cases) are still English-only — translating those requires turning each Zod
schema into a locale-aware factory, which was scoped out of this pass as a
meaningfully separate refactor from translating UI chrome.

## Auth & hosting

- Clerk handles sign-up/sign-in; `/starters/*` routes are protected in `src/proxy.ts`.
- Postgres via Neon (Vercel Marketplace), Drizzle ORM, `npm run db:push` to sync schema.
- Deployed on Vercel; both integrations were provisioned through `vercel integration add`.
