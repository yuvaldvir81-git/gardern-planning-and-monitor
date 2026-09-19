# Garden Planning & Monitoring

Track plant starters (seeds) from planting through harvest. Each starter has an editable
record (species, variety, date planted, location, status) and a dated growth log so you can
see progress over time.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui
- Postgres (Neon) via Drizzle ORM
- Clerk for auth (multi-user, data scoped per user)

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
