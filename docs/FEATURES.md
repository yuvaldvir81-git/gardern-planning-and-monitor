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
`[locale]` URL segment, just a cookie read, defaulting to English). Every app string
lives in `messages/en.json` / `messages/he.json`; components use `useTranslations()`
(client) or `getTranslations()` (server).

The cookie is per-browser, so a second device (e.g. a phone) with no cookie would
otherwise render English even though the signed-in account's stored preference is
Hebrew — `src/proxy.ts` closes that gap: on any request without the cookie, it looks
up the signed-in user's `user_settings.language` and sets the cookie from it, so a
new device self-corrects to the account's language after its first request rather
than requiring a fresh visit to `/settings` on every device.

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

## Garden planning (map + sun exposure)

`/garden` lists every garden the signed-in user has created (multiple gardens per
account are supported); `/garden/new` geocodes a free-text address via Nominatim
(OpenStreetMap, proxied server-side with a custom `User-Agent` per their usage policy)
and creates a garden centered there. `/garden/[id]` is the map editor:

- Satellite imagery (Esri World Imagery, no API key) via Leaflet/react-leaflet, with
  drawing/editing handled by `@geoman-io/leaflet-geoman-free`.
- Five shape types can be drawn: garden **boundary**, **house**, **tree**, **vegetable
  plot**, **green patch**. Each polygon (trees are a point + radius, rendered as a real
  circle in meters, not a fixed pixel size) is saved with an optional label, a custom
  color (native color picker + presets, falling back to a per-type default), and, for
  house/tree, a height in meters — height is what feeds the shadow simulation below. A
  house can also have a **per-corner height** set (edit dialog → "Per-corner height"),
  to model a sloped roof — the shadow calculation shifts each corner by its own shadow
  length instead of one uniform length for the whole footprint, so a uniform height
  across every corner (the default) behaves exactly like a flat roof, while different
  corner heights naturally produce an asymmetric shadow reflecting the slope, without
  needing full 3D roof-plane geometry.
- **Sun exposure**: a "Compute sun exposure" action (requires a boundary to exist, as a
  sanity check that the garden is mapped out) samples points **within each tree canopy
  and vegetable plot only** — not the whole boundary, which usually also covers the
  house footprint, patios, and paths where sun exposure isn't useful information — and,
  for each one, runs a real shadow simulation (not a fixed-percentage heuristic) across a
  full year — see [`src/lib/sun-exposure.ts`](../src/lib/sun-exposure.ts). For each
  sample point, for each month (sampled on the 15th) and each 30-minute interval during
  daylight, it uses `suncalc` to get the sun's altitude/azimuth at that location/time,
  and checks whether any obstacle (house, other tree canopies) casts a shadow over that
  point: shadow length is `height / tan(altitude)` (skipped below a 2° altitude floor —
  near-horizon numbers blow up and aren't meaningful), shadow direction is
  `azimuth + 180°`, and the shadowed region is the convex hull of the obstacle's
  footprint and that footprint translated by the shadow vector — not just the translated
  copy alone, which would only mark the shadow's far tip and miss the area between the
  object and its shadow. A tree's own footprint is excluded from its own obstacle list
  when sampling itself (its shadow hull always covers its own base in this model, which
  would otherwise make every tree read as permanently shaded) — every other obstacle
  still shades it normally. The result is an average sun-hours-per-day figure per sample
  point, rendered as a colored dot overlay (green = full sun, through yellow, to blue =
  shade).
- Deleting a garden cascades to its shapes.
- **Plan image overlay**: a garden can have one uploaded reference image (a house/garden
  plan or blueprint) fitted onto the map as a georeferenced `ImageOverlay`. Fitting is a
  simple axis-aligned rectangle — two draggable corner handles (south-west, north-east)
  set the image's bounds; there's no rotation/skew support, so this works best when the
  source plan is already roughly north-up. An opacity slider keeps the satellite imagery
  visible underneath while aligning. Uploads reuse the same Vercel Blob flow as seed
  package photos (`/api/upload`); the fit (bounds + opacity) doesn't save until "Save
  fit" is clicked, matching the pattern used for repositioning shapes and the address
  pin.

## Auth & hosting

- Clerk handles sign-up/sign-in; `/starters/*` routes are protected in `src/proxy.ts`.
- Postgres via Neon (Vercel Marketplace), Drizzle ORM, `npm run db:push` to sync schema.
- Deployed on Vercel; both integrations were provisioned through `vercel integration add`.
