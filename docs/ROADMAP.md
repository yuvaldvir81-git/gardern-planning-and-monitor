# Roadmap

Things intentionally deferred or planned, and why.

## Seed metadata agent

**Status: not started, planned next.**

An agent that, given a seed type name in the bank, fills in `seed_types`' metadata
columns — days to germinate, days to maturity, sun requirement, spacing, and general
notes (see [DATA_MODEL.md](./DATA_MODEL.md#seed_types)). The schema already has the
columns reserved so this doesn't need another migration.

Open questions to resolve when this is built:
- Trigger model: on-demand per seed type (a button on a future "seed bank" page) vs.
  automatic on first use vs. a batch job over all unfilled types.
- Source of truth: general knowledge via an LLM call (Vercel AI Gateway / AI SDK) vs.
  a web search/tool-use step for accuracy vs. a static reference dataset.
- Where results surface in the UI — a seed bank management page doesn't exist yet
  (the bank currently only powers the name-field autocomplete, see
  [FEATURES.md](./FEATURES.md#seed-type-bank--autocomplete)).

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
