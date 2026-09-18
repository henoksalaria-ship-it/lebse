# Supabase Edge API migration

The Edge Function serves `health` directly and serves `bootstrap` directly when the public tables are available. Other routes remain behind the compatibility bridge until migrated.

Required secrets:

- `LEBSE_WEB_ORIGIN` — Vercel staging origin
- `SUPABASE_ANON_KEY` — the project's publishable/anon key
- `LEBSE_LEGACY_API_ORIGIN` — optional private API origin during migration

`SUPABASE_URL` is provided automatically by Supabase Edge Functions. Keep service-role keys and database passwords out of clients and Vercel.
