# Supabase Edge API migration

The first migration step is a compatibility gateway at:

`/functions/v1/api/*`

Set these Edge Function secrets in the Supabase dashboard:

- `LEBSE_WEB_ORIGIN` — the Vercel staging origin
- `LEBSE_LEGACY_API_ORIGIN` — the private Render API origin while routes are being migrated

`/health` is served directly by the Edge Function. Other routes are forwarded server-side through the bridge so clients keep the existing `/api/...` contract. Routes can then be moved from `server/index.mjs` into this function incrementally without changing the app.

Do not put `LEBSE_LEGACY_API_ORIGIN`, database passwords, or service-role keys in Vercel or the mobile app.
