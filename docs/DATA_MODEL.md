# Data model

Schema lives in [`src/db/schema.ts`](../src/db/schema.ts) (Drizzle ORM, Postgres/Neon).
Every table is scoped by a `userId` column (Clerk user id) — there's no separate
`users` table since Clerk owns identity.

## `starter_trays`

A physical tray: a `rows × cols` grid. `date_planted` / `location` / `seed_source` /
`notes` are shared across every cell in the tray.

| column | notes |
|---|---|
| `rows`, `cols` | grid dimensions |
| `date_planted` | not null — inherited by starters created from this tray |

## `plant_starters`

One seed/starter. `tray_id` + `row_index` + `col_index` are set (and a
`starter_trays` row exists) when the starter is a tray cell; all three are `null` for a
standalone starter in the flat `/starters` list. `on delete cascade` on `tray_id` — 
deleting a tray deletes its starters (and their growth logs, transitively).

| column | notes |
|---|---|
| `status` | `starter_status` enum: `seed` → `germinating` → `seedling` → `transplanted` → `growing` → `harvested` / `dead` |
| `date_planted` | not null even for tray cells — copied from the tray at creation time (denormalized, not a live reference) |
| `photo_url` | nullable, a Vercel Blob URL — optional seed *package* photo, distinct from growth-log photos (see [FEATURES.md](./FEATURES.md#seed-package-photos)) |

## `growth_entries`

Dated history for one `plant_starters` row — this is what makes growth "monitored"
rather than a single current-status field. `on delete cascade` on `starter_id`.
Adding an entry with a `stage` also updates the parent starter's `status`.

## `seed_types`

Per-user bank of unique seed/variety names, unique on `(user_id, name)`. Every
starter-creation path (manual add/edit, table import, tray import/edit) upserts into
this table via `ensureSeedTypes()` — see
[`src/app/starters/seed-types/actions.ts`](../src/app/starters/seed-types/actions.ts).
The metadata columns are nullable, filled either by the seed metadata agent or by
hand on `/starters/seeds` (see
[FEATURES.md](./FEATURES.md#seed-metadata-agent)):

| column | intent |
|---|---|
| `days_to_germinate_min` / `_max` | expected germination window |
| `days_to_maturity` | days from planting to harvest |
| `sun_requirement` | free text, e.g. "full sun" |
| `spacing_cm` | recommended spacing |
| `notes` | free-form, e.g. agent-generated summary |
| `metadata_generated_at` | null until the agent has generated this row at least once; regenerating overwrites all metadata columns including manual edits |

## `user_settings`

One row per user (`user_id` is the primary key — no separate `id`). Currently just
`language` (`app_locale` enum: `en` | `he`), defaulting to `en`. This is the durable
per-account record; the `NEXT_LOCALE` cookie is what actually drives rendering on any
given request (see [FEATURES.md](./FEATURES.md#language-english--hebrew)) — the two
are only synced when the user explicitly changes their language on `/settings`, so a
fresh browser session with no cookie renders English even if the account's stored
preference is Hebrew, until they revisit Settings.

## Why not the `xlsx` package

Import parses `.xlsx` with `exceljs` and `.csv` with `papaparse` instead of the more
commonly-known `xlsx` (SheetJS) npm package. The npm-registry build of `xlsx` (0.18.5
at the time this was built) carries an unpatched high-severity prototype-pollution /
ReDoS advisory — SheetJS only ships the fixed build via their own CDN, not npm. Since
import parses untrusted user-uploaded files, that risk wasn't worth it.
`exceljs` pins an old `uuid` with its own moderate advisory; `package.json` has an
`overrides` entry pinning `uuid` to a patched version instead.
