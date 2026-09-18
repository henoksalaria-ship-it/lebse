# Lebse — local marketplace and pilot preparation

Updated 13 September 2026. The app remains a local test marketplace. Real email/SMS verification, managed password recovery, administrator MFA, hosted infrastructure, Yango, refunds and payouts are not connected.

## Run and test

Install dependencies with the supplied lockfile, then run `npm run dev`. The frontend is at http://127.0.0.1:5173/ and the local API at port 4174. Both bind to localhost. Run `npm test` for isolated integration checks and `npm run build` for the frontend build. Do not start another server against the same database directory.

The database and uploaded media persist in `work/lebse-db`. Browser tabs now share an HttpOnly cookie session. Use separate browser profiles or sign out between buyer/seller roles. Local test accounts Sara, Dani and Mimi use the documented demo credentials `LebseDemo2026!` and their `@lebse.test` email addresses. Never use these accounts for a public deployment.

## Current changes

- Discovery with relevance ranking, small-typo matching, combined filters, reset, private saved searches and recently viewed pieces.
- Inbox search, unread message counts, read receipts, offer history and links to the associated piece and order.
- Guided order problems with private evidence, seller cancellation responses, reviewer decisions, returns and visible resolution history. Open reports hold fulfillment and payout; cancellation reviews preserve inventory reservations.
- Editable profiles and closet stories, actual listing/follower/review counts, public reviews and private saved collections.
- Multiple private delivery addresses with a default, quote-expiry guidance, full cost breakdown and seller confirmation of each paid pickup/package snapshot.
- Expo Android/iPhone project in `mobile/`, using the existing responsive marketplace inside a native WebView. Android back navigation, safe areas, connection recovery and restricted navigation are included. The app uses the same server data and account cookies.
- Seller workspace with live, draft, paused, archived and sales sections; title search, real counts and preparation reminders.
- Private drafts automatically save uploaded photos and incomplete details to the local database. Resume after reloading, change the cover photo, or use Save & exit. Drafts can be published once; retries do not create duplicate listings or photos.
- Edit live or paused pieces, pause/resume, archive, and copy an available archived piece into a new relisting draft. Pausing and archiving close pending offers. Reserved/sold pieces and unresolved order holds block incompatible actions; previous order history stays intact.
- Seller sales filters open existing order tracking, preparation and payout-status screens. Payouts remain simulated and unavailable for real withdrawal.
- Consent-controlled external sample photos, explicit versioned draft terms, privacy/copyright notices and safety requests.
- Server-side fraud rules, order holds, operator review, appeals and private responses.
- Private seller pickup settings, expiring delivery quotes, duplicate-safe mock bookings and authenticated test delivery events.
- Encrypted local backups, isolated restore verification and restricted operational status checks.

Open **Sell** on mobile, **Seller workspace** in the desktop header, or the seller workspace link on your profile. Draft saving requires the local server to be reachable. Uploaded photos resume with the draft; partially transferred files and offline editing are not supported. Stale draft saves are rejected with a conflict message, and unsaved listing edits prompt before leaving through app navigation.

Validation: 66 automated tests passed across the marketplace, security, delivery, operations, seller workspace, new experience features and mobile origin rules. The frontend build, mobile type check and Android/iPhone JavaScript exports passed. Current browser checks cover mobile discovery, combined filters, reset/empty results and public item/closet navigation; authenticated checks for this milestone remain pending local QA account approval. Earlier seller-workspace browser checks covered draft and listing transitions. No physical-device, signed APK/IPA or app-store validation has been completed.

Read [Marketplace improvements](Lebse-Marketplace-Improvements.md) for feature behavior and review operations. See `mobile/README.md` for local Android USB testing, internal builds and signing requirements. The mobile export is compiled JavaScript, not an installable APK/IPA. A hosted, reviewed HTTPS marketplace and your signing accounts are needed for shared phone builds.

See [Security and delivery readiness](Lebse-Security-and-Delivery-Readiness.md) for the existing safeguards and [Controlled pilot rollout](Lebse-Controlled-Pilot.md) for account setup, reviewer responsibilities, operational commands and remaining release gates. In the source archive these documents are under `docs/`.

The operator, test-webhook and backup keys are separate server-side environment variables described in `.env.example`. That file is not loaded automatically. Do not put secrets in frontend variables. Monitoring currently runs once per command; scheduled off-site backups and alert delivery have not been configured.

The earlier connected-milestone document is historical; its per-tab tokens, always-loaded remote photography and flat-rate delivery description have been superseded. The MVP specification describes intended V1 scope, not a claim that every public-launch requirement is built.
