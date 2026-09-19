# Roadmap

Things intentionally deferred or planned, and why.

## Seed metadata agent

**Status: shipped.** See [FEATURES.md](./FEATURES.md#seed-metadata-agent).

Resolved open questions: trigger is on-demand (a button per seed type, plus a
"Generate N missing" batch action) on `/starters/seeds` rather than automatic or a
background job. Source of truth is a single LLM call (`anthropic/claude-sonnet-5` via
the AI Gateway, general knowledge, no web search/tool-use) with structured output
validated against a Zod schema — simpler than a search step, and germination/maturity
info for common garden plants is stable, well-known knowledge. Manual edits are
possible from the same page for corrections.

Not done: results aren't labeled as AI-generated vs. manually edited beyond the
`metadata_generated_at` timestamp, and regenerating silently overwrites prior manual
edits — acceptable for v1, worth revisiting if that causes surprise data loss.

## Live Google Sheets import

**Status: deferred, blocked on manual setup.**

The import wizard currently only supports uploading an exported `.xlsx`/`.csv` file
(Excel or Google Sheets' File → Download). A live "pick a Google Sheet without
exporting first" flow was scoped but deferred: it requires Google OAuth credentials
(Client ID/Secret) from a Google Cloud project, which has to be created by hand in the
Google Cloud Console — `vercel connect create google --connection-method oauth`
explicitly requires "bring your own credentials," there's no managed/automatic path.

To pick this back up: create the Google Cloud OAuth client, then wire it through
Vercel Connect (`vercel connect create google ...`) so the app can request a scoped
token for the signed-in user's Sheets access.
