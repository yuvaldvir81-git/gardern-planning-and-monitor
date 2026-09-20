# Garden Planning & Monitoring

Track plant starters (seeds) from planting through harvest — either as a flat list or
laid out as trays (a `rows × cols` grid mirroring a physical seed tray, one seed per
cell). Every starter has a dated growth log so you can see progress over time, not just
a single current-status field. See [docs/FEATURES.md](docs/FEATURES.md) for the full
feature rundown, [docs/DATA_MODEL.md](docs/DATA_MODEL.md) for the schema, and
[docs/ROADMAP.md](docs/ROADMAP.md) for what's planned/deferred next.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui
- Postgres (Neon) via Drizzle ORM
- Clerk for auth (multi-user, data scoped per user)
- `.xlsx`/`.csv` import via `exceljs` + `papaparse` (not the `xlsx` package — see
  [docs/DATA_MODEL.md](docs/DATA_MODEL.md#why-not-the-xlsx-package))
- Vercel Blob for seed-package photo uploads, Vercel AI Gateway for the seed
  metadata agent
- `next-intl` for English/Hebrew (full RTL), per-user language setting at `/settings`

## Getting started

1. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and the Clerk keys
   (provisioned via Vercel Marketplace, or from clerk.com / a Neon project directly).
2. Push the schema to the database:
   ```bash
   npm run db:push
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint`
- `npm run db:generate` — generate a Drizzle migration from schema changes
- `npm run db:push` — push the current schema straight to the database
- `npm run db:studio` — open Drizzle Studio
