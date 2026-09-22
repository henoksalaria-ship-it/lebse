# Lebse native beta — release status

Updated 22 September 2026. This is a connected beta implementation, not approval for a public production launch.

## Implemented

- Shared Supabase Auth and Edge API for native and website accounts and records.
- Native Expo Router screens for account onboarding, interests, listings, photos, saved pieces, messages, reports, blocks and settings.
- Private database schema, scoped RPC authorization, live session checks, ownership/membership checks and MFA enforcement.
- Payment, offer, order, delivery and payout operations rejected by the beta API.
- Production mobile profiles require explicit non-staging configuration. Hosted website builds exclude the local demo entry point.
- Draft beta legal notices. No social sign-in, GPS, advertising tracking or push notifications.

## Environments

- Staging Supabase: `cbkjondhiftswrmxllwn`.
- Website target: `https://lebse-staging-web7.vercel.app`.
- EAS `beta`: signed iOS beta, staging backend; requires Apple enrollment and signing.
- EAS `preview`: internal Android APK, staging backend.
- EAS `production` / `production-apk`: explicit production backend required. Production backend is not provisioned or approved. Edge API deliberately refuses production mode pending release review.
- Run the hosted website locally with `pnpm run dev:hosted`. The old local sandbox is opt-in with `VITE_LEBSE_LOCAL_SANDBOX=true` for the development server only.

## Verification and limits

The earlier 73-test suite passed, including isolated database ownership/session tests. Release configuration regression tests were added. Web build and native TypeScript checks pass. Earlier iOS/Android JavaScript exports passed; these are not signed device builds.

Live staging health, bootstrap and listings respond; commerce is disabled. The Codex browser reports `ERR_BLOCKED_BY_CLIENT` for the Supabase domain even though direct HTTP and CORS preflight checks succeed. Browser-to-backend acceptance therefore remains unverified in this environment.

## Required before a beta acceptance pass

1. Configure Supabase Auth site URL and allowlisted verification/recovery callbacks for the exact deployed website and `lebse://auth-callback` (including recovery query). Verify email sending with user-owned inboxes. Do not disable verification for convenience.
2. Have two consenting testers register and verify email, select interests, publish and save a photographed listing, exchange messages across web/native, and test recovery, MFA, blocking, reporting and deletion.
3. Test camera denial, photo-library selection, interrupted upload, expired session, offline/retry behavior and smaller iPhones on physical devices.
4. Confirm Apple Developer membership, bundle signing and App Store Connect app before an EAS beta build and TestFlight submission.

## Required before public production

- Create a separate production project without copying staging accounts or credentials; configure email delivery, backups, monitoring and a tested restoration procedure.
- Finalize operator identity, support contact, data retention, hosting disclosures, terms, privacy notice and safety appeals process.
- Assign moderators and securely provision moderator membership; mandatory authenticator MFA is already enforced by the API.
- Review moderation coverage: current text screening is limited and is not an image-moderation service. Signed image links expire after 15 minutes; already-issued links are not immediately revoked by blocking.
- Complete App Store privacy disclosures and review materials, and demonstrate the complete two-account acceptance flow against production before removing the production release gate.
- Optional tracking must stay absent until a separate informed consent flow and disclosures exist. Essential session storage should be disclosed in the final privacy notice.

Do not describe a successful build, health response, or mocked database test as proof that email, native device behavior, moderation operations or the production service are ready.

