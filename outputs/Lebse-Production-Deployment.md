# Lebse production deployment runbook

## Current staging project

- Supabase project: `lebse-staging` (`cbkjondhiftswrmxllwn`), Frankfurt (`eu-west-1`), created in the Lebse organization.
- Vercel: use a private project owned by Lofty's team for the Vite web build.
- Render: use the `render.yaml` Blueprint for the API and worker in Frankfurt.
- Payments and courier are simulated until the provider contracts and sandbox credentials are approved.

The Supabase project is deliberately separate from existing projects. Do not copy local demo accounts, address records or uploaded evidence into it. Create fresh fictional staging accounts after the hosted schema and Auth provider are configured.

## Deployment order

1. Create a private GitHub repository for this source tree and connect it to Vercel. Protect `main`; require the validation workflow before merging.
2. Create the Render Blueprint from `render.yaml`. Add the Supabase pooled PostgreSQL connection string as `DATABASE_URL`, and add the server CA certificate if the chosen connection endpoint requires one.
3. Create the restricted `lebse_runtime` database role and run `pnpm migrate:staging` once with an owner-only connection. Keep the migration connection out of Render runtime variables.
4. Configure Supabase Auth for the staging domain: email confirmation, custom SMTP, password recovery, short OTP expiry, and rate limits. Keep the Supabase Data API disabled for marketplace tables unless a table has reviewed RLS policies.
5. Add the Render API origin to the Vercel project’s `LEBSE_RENDER_ORIGIN` and `LEBSE_STAGING_ORIGIN` values. Add a random staging username and password hash to Vercel. Vercel must proxy `/api/*` through `middleware.js`.
6. Set `EXPO_PUBLIC_MARKETPLACE_URL` to the exact Vercel HTTPS origin, including the trailing slash, then run `pnpm production:apk` from `mobile/` after signing into EAS.
7. Run `pnpm prove:staging` with fictional staging credentials. It must report one listing, one order, one payment, one booking, signed pickup/delivery events, duplicate-event safety and a completed order with payout held.

## Required secrets

Generate unique values for `LEBSE_GATEWAY_SECRET`, `LEBSE_OPS_TOKEN` and `LEBSE_TEST_WEBHOOK_SECRET`; never reuse them. Store them only in Vercel/Render secret variables. Do not put the Supabase service-role key, database owner password, payment keys or courier keys in Vercel browser variables or the mobile build.

## Release gates

The APK is not a store release until the hosted API has real HTTPS, managed authentication, protected storage, backups, monitoring and a reviewed payment/courier adapter. Use the internal APK for invited testing. Use the production AAB for Google Play submission. Physical-device testing is required for photo permissions, poor connectivity and deep links.
