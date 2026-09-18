# Lebse — connected marketplace milestone

Built 8 September 2026. This is a working, local full-stack test marketplace. It is the first implementation milestone from the V1 specification, not the complete public-launch MVP.

## Run it

Open **http://127.0.0.1:5173/** while the development server is running.

From the source package, install Node.js 22.12+ and dependencies with `npm install` (or `pnpm install`), then run `npm run dev`. This starts the frontend on port 5173 and the local database API on port 4174. Both bind to 127.0.0.1. Stop the terminal process to stop both services. Do not start a second copy against the same database directory.

`npm test` runs the isolated integration checks. `npm run build` builds the frontend. A frontend build alone does not include or deploy the database API.

## Try the complete journey

1. Open two separate browser tabs. Sign in as Sara in one and Dani in the other using the **Try the test accounts** buttons. Every account can buy and sell; a person cannot buy their own listing.
2. As Sara, select **Sell a piece**, upload 1–6 JPG, PNG, or WebP photos, continue to details, and publish. Each photo may be up to 6 MB. The listing appears in the shared Home feed.
3. As Dani, find that piece, save it, visit Sara’s closet, and make an offer. An offer opens a conversation. Both accounts see the messages and offer history.
4. As Sara, accept, decline, or counter. The receiver of a counteroffer can accept it. Acceptance creates one reserved order for the buyer. **Buy now** can also create an order directly.
5. As the buyer, open checkout, enter fictional delivery details, and choose a test payment result. A failed result allows retry. A pending result prevents another payment; use **Check payment status** or the clearly labeled **Test tools** to resolve it. Success records a test payment against the order.
6. As the seller, open the order and start preparing or mark it ready for pickup. In **Test tools**, simulate courier pickup and then delivery.
7. As the buyer, confirm receipt and leave one review. The seller sees the same completed order, review, and holding payout status.

The three seeded test accounts are `sara@lebse.test`, `dani@lebse.test`, and `mimi@lebse.test`, all using `LebseDemo2026!`. These are deliberately public, local demo credentials. Account creation also works with an email-shaped identifier and a password of at least 10 characters. Use test credentials; email verification and recovery are not connected.

## What is connected

| Area | Working behavior |
| --- | --- |
| Accounts | Separate registered identities, salted password hashes, expiring/revocable sessions, sign out. |
| Discovery | Shared database listings; category, size, condition, price filters; title/brand/seller search; price sort; following feed. |
| Saves and follows | Account-specific saved pieces and followed closets persist across reloads and server restarts. |
| Listings | Real file upload, publication, owner-only edits with version checks, photo removal, sold/reserved availability states. |
| Offers | 24-hour expiry, accept/counter/decline/withdraw, six proposals per negotiation, three new negotiations per piece per buyer per 24 hours. One pending offer per conversation. |
| Chat | Participant-only conversations and persisted messages, duplicate-send protection, offer history, and order links. Direct purchases create a conversation too. |
| Checkout | Server-owned prices and totals, one reserved order per piece, required delivery address, failed/pending/successful simulated payment states and retry protection. |
| Orders | Shared buyer/seller history, seller preparation, readiness, simulated courier events, buyer confirmation, immutable product snapshot, cancellation and test refund notation. |
| Reviews | One buyer review per completed paid order; seller rating and count derived from saved reviews. |
| Notifications | Persisted account-specific offer, message, and order notifications; mark all as read. |
| Design system | Reusable buttons, cards, navigation, tabs, search, chips, fields, badges, modal/bottom sheet, toast, loading, empty, and error states. |

The main routes are `#home`, `#explore`, `#product/:id`, `#closet/:id`, `#sell`, `#edit/:id`, `#login`, `#profile`, `#saved`, `#inbox`, `#chat/:id`, `#checkout/:orderId`, `#order/:id`, and `#notifications`. Payment results, offers, reviews, and unavailable states are connected screen states within these routes.

## Local architecture

The existing React/Vite frontend is retained. Shared components live in `src/ui.jsx` and `src/ui.css`, with connected screen groups in `Market.jsx`, `Account.jsx`, `Listings.jsx`, and `Trade.jsx`. `store.jsx` loads account-scoped data and refreshes visible tabs every four seconds. This is polling, not hosted push or realtime infrastructure.

The Node API in `server/index.mjs` uses [PGlite](https://pglite.dev/docs/), an embedded PostgreSQL implementation, with its schema in `server/schema.sql`. Database files live under `work/lebse-db` and persist on this computer. Uploaded images are stored in the database for this milestone. Listings use public media; media referenced by a historical order remains available after cancellation so order photos do not break. The API returns public profile fields, restricts conversations/orders to their participants, and keeps delivery addresses visible to the buyer only.

Mutations are serialized and transactional in this local server. Unique indexes protect active reservations, successful payments, pending payments, and per-order reviews. Money is stored as integer minor units; checkout totals come from the server. Browser input cannot set a listing’s owner, order amount, or payment amount.

Sessions use a per-tab browser session token so two tabs can test separate identities. Listings, offers, chat, saves, payments, reviews, and orders live on the server; they are not stored in browser localStorage. Old prototype localStorage data is not migrated. Seed fashion photography comes from Unsplash and DM Sans from Google Fonts, so those assets require internet access.

## Rules implemented in this milestone

- Price: whole ETB values from 50 to 50,000. Offers: 50–100% of the current asking price, with a 50 ETB minimum.
- Direct purchase reserves for 15 minutes; an accepted offer reserves for 30. Other pending offers expire when the piece is reserved. Expired unpaid reservations reopen the listing. Expiry is processed when API requests arrive, not by a hosted scheduler.
- This test version reserves a piece when **Buy now** is tapped. The final V1 spec’s checkout reservation timing must be reconciled before launch.
- Editing an active listing expires pending offers. Reserved and sold listings cannot be edited. Stale versions are rejected.
- Test delivery costs 150 ETB, paid by the buyer. No platform fee, tax calculation, or actual courier quote is applied.
- Buyers can cancel before readiness. Sellers can cancel before pickup. Pending payments must be resolved first. A paid cancellation records `refunded_test` and archives the listing; no money is actually refunded.
- Receipt confirmation requires a recorded delivery event. The local simulator is explicitly available to the order participants for testing; it is not a production courier endpoint.
- Payout status remains **holding** after completion. The 48-hour eligibility timestamp is recorded, but automatic release, auto-completion, dispute freezing, and bank payouts are not implemented. No screen claims funds were transferred.

## Verification completed

The final frontend build passed. The automated run reported **10 passing tests**: one parent scenario and nine substantive subtests covering account privacy, uploads, ownership, message retries, offer permissions, payment outcomes/idempotency, delivery evidence, reviews, simultaneous buyers, expiry, stale edits, direct-purchase chat, cancellation photos, and persistence after closing/reopening the database.

Browser checks used the Codex in-app browser at its desktop viewport and at 390×844. The following journey was exercised through the UI with separate buyer and seller sessions:

**Create buyer account → seller uploads and publishes → buyer sees and saves → offer → seller counteroffer and chat reply → buyer accepts → declined payment → pending payment → test success → seller prepares/marks ready → test courier pickup/delivery → buyer confirms → buyer publishes review.**

The completed order and review remained after restarting the server. Search empty state, condition filtering, profile purchase history, the mobile filter sheet, and card save/unsave were also checked. A product-image overlap that intercepted heart taps was fixed and retested. No application warnings or errors appeared in either browser session. The mobile page had no horizontal document overflow. The test upload used a deliberately blank PNG fixture, so that one QA order has a blank thumbnail; the seeded marketplace uses fashion photographs.

## Remaining before a hosted pilot

1. Create or select the Lebse hosting/database project; configure deployment, production authentication, backups, access policies, and storage. No connected Supabase projects were modified in this milestone.
2. Integrate the payment provider and verify signed callbacks, reconciliation, refunds, payouts, fee rules, and applicable marketplace operating requirements. Replace client-selected test outcomes with provider-owned events.
3. Connect delivery evidence and operational support. Implement the dispute, cancellation escalation, refund, auto-completion, and payout jobs from the specification.
4. Finish V1 verification, account settings/recovery/deletion, moderation/reporting/blocking, notification preferences/push, listing lifecycle management, and review policy enforcement. Their complete V1 behavior remains defined in the product specification, but these are not all built here.
5. Move from this single-process local database to the hosted multi-user architecture, with pagination, realtime delivery, media processing, monitoring, provider failure testing, and load testing. Native iOS/Android packaging is a subsequent implementation step; the current deliverable is a mobile-responsive web app.

Do not expose this local server publicly or describe it as production payment infrastructure. Its seeded credentials, local simulation controls, polling, and embedded database are intentional test-stage choices.
