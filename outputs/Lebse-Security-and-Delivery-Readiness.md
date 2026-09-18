# Lebse: security, privacy, fraud and delivery readiness

Updated 9 September 2026. This document describes the implemented local build and the remaining public-launch requirements. It supplements the MVP specification and supersedes the earlier milestone’s session, privacy, fraud and delivery details.

## Decision

Keep Lebse in local testing while building the safeguards below. A copyright notice or terms agreement cannot make a business immune from applicable law, remove mandatory consumer rights, or guarantee that fraud will not occur. The local safeguards are working; commercial compliance, real identity checks, payment processing and Yango delivery are not completed.

The highest-priority missing capabilities are verified identities and account recovery, provider-backed payment security, protected production infrastructure, staffed dispute operations, secure media processing, and approved legal/data-governance arrangements.

## What now works

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Cookie choices | Optional external images remain off until explicitly allowed. Equally available rejection and allowance buttons; preferences can be changed from the footer. Versioned choice receipts and history persist. | No analytics or advertising SDK is installed. Enabling photos does not authorize a future analytics tool. |
| Essential sessions | HttpOnly, SameSite=Strict session cookie; random session secret stored as a hash on the server; 12-hour expiry; individual logout and revoke-all-sessions. | Local HTTP cookies are not Secure. Public release requires HTTPS and Secure cookies. Browser tabs share an account. |
| Request protection | Session-bound CSRF tokens, application request header, JSON-only mutations, allowed-origin checks, local-host restriction, request and sign-in throttling. | This local, single-process service is not an internet-facing identity platform or DDoS service. |
| Browser protections | Content Security Policy, frame denial, MIME sniffing protection, restrictive permissions policy, no-referrer policy. Remote Google Fonts removed. | CSP allows Unsplash image requests only; application consent decides whether to initiate them. |
| Agreement records | Explicit age/terms checkbox; version, acceptance time and document hash stored per user. Server blocks marketplace mutations without the current agreement. | Age is self-declared. Legal documents are drafts. Privacy requests remain accessible without accepting new commercial terms. |
| Legal notices | Terms, Privacy, Cookies, Copyright and reporting pages; copyright footer; prohibited-item and seller-content rules. | Operator identity, contacts, launch scope and counsel approval remain missing. No safe-harbor or immunity claim. |
| Fraud screening | Suspicious listing phrases, listing velocity, repeated failed payments, high-value purchases from new sellers, unsafe message screening, paid-order dispute holds. | Explainable rules for testing, not a trained fraud model or professional fraud-provider integration. |
| Human review | Private safety cases, requester-facing status, appeals, operator approve/reject/reopen actions, operator responses, audit trail. | Local operator key and command-line tool; no staffed support team or production admin console. |
| Marketplace integrity | Server-owned totals and ownership checks; participant-only chat/orders; order snapshots; reservation uniqueness; payment/message idempotency; one buyer review per completed paid order. | Payments and refunds remain simulated. No real payout is released. |
| Delivery preparation | Private pickup profiles, coordinates and parcel dimensions, expiring quotes, paid-address validation, durable dispatch queue, one reference per order, reconcile-before-retry, cancellation confirmation, signed test events. | Mock provider only. No Yango credentials, guessed API endpoints, or real courier requests. |

## Prioritized launch gaps

All P0 items are required before accepting real public transactions. Ownership is a recommended responsibility, not a claim that a team has already been appointed.

| Priority | Missing capability | Why it matters / acceptance criterion | Suggested owner |
| --- | --- | --- | --- |
| P0 | Verified account access | Verify email/phone; safe password reset and recovery; breached-password controls; reauthentication for payout/contact changes; device/session management. Require strong MFA for operators and sensitive seller changes. Verify recovery cannot bypass MFA. | Engineering / identity provider |
| P0 | Seller identity and payout ownership | Agree risk-based verification with payment/identity partners. Match payout ownership and require additional review for suspicious changes. Use provider-hosted collection; do not gather ID photos in ordinary chat or listing uploads. | Payments / trust operations |
| P0 | Real payment security | Provider-hosted payment entry, server-created intents, authenticated provider events, deduplication, amount/currency/order matching, pending-state reconciliation, verified refunds, disputes and payout ledger. Remove all client-selected outcomes. No raw card storage. | Payments engineering |
| P0 | Production fraud screening | Connect payment-provider fraud signals and verified identity outcomes; define thresholds, manual-review queues, false-positive monitoring and appeals. Decide chargeback liability and reserve policy in the contract. Do not choose a provider without confirming Ethiopian merchant and payout support. | Trust / payments |
| P0 | Production access and secrets | Hosted database with least-privilege service roles, tested tenant/participant authorization, HTTPS, Secure cookies, secret manager, separate production/staging environments, operator MFA, access reviews and auditable approvals. | Platform engineering |
| P0 | Safe media pipeline | Decode and re-encode uploads; enforce actual dimensions and pixel limits; strip EXIF/location metadata; quarantine and scan suspicious content; signed/private evidence storage; abuse moderation. Current MIME signature checks are not sufficient. | Media / security |
| P0 | Disputes and refunds | Staff a support queue; define evidence requirements, return handling, escalation, courier loss/damage responsibility and refund authorization. Test a disputed delivery cannot trigger a payout. Request tickets alone do not fulfill these obligations. | Marketplace operations |
| P0 | Approved legal and privacy documents | Confirm operator identity, address, contact channels, launch countries, consumer/return rights, fees, delivery roles, governing law and permissible liability wording. Review processor agreements, data transfers, required registrations and notices. | Ethiopian counsel / operator |
| P0 | Retention and data rights | Approve data-by-data retention periods; verify access/correction/deletion requests; implement export/erasure, legal holds and backup expiry. Record actual fulfillment and lawful exceptions. A ticket marked resolved does not itself delete data. | Privacy / engineering |
| P0 | Backups and incident response | Encrypted backups, restore drills, defined recovery objectives, protected audit logs, alerting, incident contacts and a breach response/notification procedure reviewed for the actual jurisdictions. | Platform / privacy |
| P0 | Live courier contract and integration | Confirm Ethiopia API availability, multi-seller home pickups, service coverage, pricing, contact sharing, proof of delivery, cancellation/return handling and liability. Test provider outages and ambiguous booking outcomes. | Operations / delivery partner |
| P1 | Scalable service boundaries | Replace local serialized PGlite processing with hosted PostgreSQL, explicit transactional services, durable queue workers with leases, pagination, object storage, resource limits and realtime messaging. Keep provider network operations outside database transactions. | Platform engineering |
| P1 | Broader abuse prevention | User blocking, report triage, repeated-offender policy, review manipulation detection, account takeover alerts, new-account purchase/listing controls, seller reputation monitoring, accessible multilingual safety content. | Trust / product |
| P1 | Continuous assurance | Dependency vulnerability monitoring, security tests in CI, secret scanning, independent penetration testing, load/abuse tests and regular access reviews. These checks have not all been run for this local milestone. | Security / engineering |

## Consent and agreement behavior

1. First visit: essential sign-in functionality remains available. External sample photographs are replaced by local placeholders until a choice allows them. Actual uploaded listing photos remain visible.
2. **Reject optional**: store a preference receipt with `external_media=false`; do not start external image loads. Browsing and marketplace actions remain available.
3. **Allow external photos**: record `external_media=true`, version, source and time. Only then render Unsplash URLs. Those requests disclose connection information to Unsplash, as explained in the notice.
4. **Cookie settings**: reopen the same choices. Withdrawing removes external image URLs and prevents new loads. It cannot undo earlier disclosures or third-party records.
5. Consent expires after 180 days or when the preference version changes. Unknown/unavailable consent defaults to optional content off. A failed save reports an error instead of claiming success.
6. Account creation requires a checked age/terms control. The server independently verifies the flags and current legal version. Existing accounts must accept the current version before performing marketplace writes.
7. Terms acceptance and optional data choices are separate. The Privacy notice explains essential operations rather than requesting blanket consent for all processing.
8. The server freezes the content hash for each legal version. Editing an existing version causes startup to fail; issue a new version for changed terms. Preserve old accepted versions for audit.

Essential storage: `lebse_session` up to 12 hours; `lebse_consent` up to 180 days after saving a choice; temporary sessionStorage navigation and support-reference values. Authentication secrets are no longer stored in browser sessionStorage. No advertising or analytics category is enabled.

## Fraud rules and outcomes

These are initial test thresholds, not production risk recommendations or verified fraud findings. They use marketplace activity, not protected demographic attributes.

| Trigger | Action | Recovery |
| --- | --- | --- |
| Listing text includes counterfeit, stolen, replica, or fake designer | Save a review case; reject publication/edit before new media is saved. | Operator reviews evidence and can approve the precise case; user can appeal. Phrases can cause false positives and miss obfuscated content. |
| Seller has already created 10 listings within an hour | Create an account hold; block further publication and affected order progression. | Operator review. Rate controls need tuning and stronger anti-evasion measures before launch. |
| Buyer has 3 failed payments in 30 minutes | Next payment attempt enters review; no additional payment record is created. | Authorized approval permits a retry; other unresolved holds still apply. |
| Item costs at least 20,000 ETB and seller account is under 7 days old | Hold checkout for review. | Review seller and item evidence. Age or high price alone does not establish fraud. |
| Message asks for credentials/codes or directs payment outside checkout using screened phrases | Block that message, record a non-hold case, show safe-payment advice. | Rephrase a legitimate message; report or appeal an erroneous decision. This is not comprehensive language moderation. |
| Buyer reports a problem with their paid order | Create a dispute hold and mark payout disputed. Block new preparation/dispatch, local courier simulation and receipt confirmation. | Investigate; approve/reject with recorded reason, reopen on appeal. A real courier already in motion needs a separate cancellation/return process. |

Rules run on the server. An affected order checks buyer, seller, listing and order holds. The dispatch worker repeats the safety check immediately before booking. Valid courier facts should still be recorded when an order is disputed; the hold prevents further marketplace progression or payout, not knowledge of an actual delivery.

Limitations: no device fingerprinting, stolen-card network, document verification, bank-account verification, cross-account graph detection, image authenticity model, professional risk SDK or automated chargeback resolution is connected. Attackers can evade simple text rules and create new identities. No current screen should describe these rules as guaranteed fraud protection or verified identity.

## Review and support workflow

**Report a concern** opens **Safety & privacy**, carrying the selected reference. Request types: suspicious activity, copyright, paid-order problem, appeal, access, correction, deletion and account closure. A description of 20–2,000 characters is required; order problems must reference the buyer’s own paid order.

Requests and cases are visible only to their requester through the account API. Authorized local operators can inspect the queue, record a response, move a request to in-progress/resolved, approve/reject a case, or reopen a decision. Every operator decision requires a reason of 20–1,000 characters and creates an audit record. A rejection keeps a hold in place. Reopening enables an appeal review; approval removes that case’s hold only. Refunds, erasure and other remedies are separate operations and are not performed merely by resolving a ticket.

Local operator access is intentionally absent from the browser bundle. Set `LEBSE_OPS_TOKEN` to a strong random secret of at least 32 characters in the server process and the operator terminal. Never use a `VITE_` variable for it. The example file is documentation and is not loaded automatically.

```text
node scripts/safety-ops.mjs list
node scripts/safety-ops.mjs resolve CASE_ID approve REASON_FILE
node scripts/safety-ops.mjs resolve CASE_ID reject REASON_FILE
node scripts/safety-ops.mjs resolve CASE_ID reopen REASON_FILE
node scripts/safety-ops.mjs request REQUEST_ID in_progress RESPONSE_FILE
node scripts/safety-ops.mjs request REQUEST_ID resolved RESPONSE_FILE
```

The reason/response file contains the actual review outcome, with no passwords or unnecessary identity data. Case resolution text and request responses are shown to the requester. This single local operator key is a development mechanism; replace it with individual roles, MFA and approval controls before production. There is no staffed support service attached to this build.

## Delivery contract prepared for integration

### Working local journey

Seller saves private pickup contact, phone, address, location coordinates and parcel weight/dimensions → buyer reserves a listing → buyer enters delivery details and requests a quote → server stores a five-minute quote snapshot → buyer confirms the total through a simulated payment → seller marks ready → a durable queue creates one mock courier booking → authenticated test events update tracking → buyer confirms receipt after delivery evidence.

New orders require a quote. Old orders remain compatible with their earlier flat-rate simulation and are not automatically booked. The test fare is 150 ETB plus 5 ETB per rounded-up straight-line kilometre; it is an artificial testing formula, not Yango pricing or an actual coverage check. Changing the address invalidates the UI approval and the server rejects a mismatched or expired quote. The buyer cannot choose the payable amount. Seller pickup data is private and snapshot into the quote; update package details before the buyer checks out. A production flow must let sellers verify each order’s pickup/package snapshot before dispatch.

The worker books only paid, ready, unheld orders. It persists one reference per order and looks it up before every attempt. If a provider accepted a request but its response was lost, lookup reconciles the existing booking instead of making a second one. The adapter must support that guarantee through provider idempotency or reliable merchant-reference lookup.

A higher fresh fare pauses dispatch for review; Lebse does not silently charge the difference. Unknown outcomes are retried after a delay with lookup first. A cancellation remains pending until confirmed. Cancel the courier and wait for confirmation before cancelling a ready order; after collection, use a return/support workflow. Cancelled bookings are not automatically replaced.

### Internal adapter boundary

`quote(pickup, destination, parcel)` → amount in integer minor units, currency, expiry.

`book(reference, order, pickup, destination, parcel, max_amount)` → provider booking ID.

`lookup(reference)` → confirmed provider identity and state, including “not created” only when authoritative.

`cancel(reference)` → confirmed cancellation state, not merely an accepted cancellation request.

Normalized events use an event ID, provider booking ID, state and delivery evidence. Duplicate IDs with identical content are accepted idempotently; changed content under the same ID is rejected. Repeated and older events do not regress the order or extend its delivery holding window. Production adapters must validate their actual provider contract, payload schema, currency, IDs, proof and state transitions.

The current `/api/delivery-webhooks/mock` endpoint verifies an **internal test** HMAC using `LEBSE_TEST_WEBHOOK_SECRET`, a timestamp within five minutes and the raw request body. It fails closed without a configured secret. This is not Yango’s webhook signature format. No `/yango` webhook or guessed Yango API implementation exists.

The queue persists locally, runs every two seconds while this application is running, and uses the same serialization boundary as local requests. It is not a hosted always-on job system. Replace it with a durable worker/lease architecture before scaling or enabling external providers. Do not put real provider network calls inside request database transactions.

### Required from Yango

- Written confirmation of delivery API access for the Ethiopian operating entity and launch area.
- A marketplace arrangement allowing pickups from many independent sellers, rather than one shop.
- Current API/version documentation, sandbox credentials, production authentication, quotas and support contacts.
- Quote, booking, merchant-reference lookup/idempotency, cancellation, tracking and return APIs; real webhook verification instructions or approved polling alternatives.
- Service-area and address/coordinate requirements; package limits, restricted goods and seller readiness expectations.
- ETB fares, quote expiry, final-price changes, billing, unsuccessful pickup fees, cancellation fees and settlement arrangements.
- Proof of pickup/delivery, missing or damaged parcel handling, recipient unavailability, returns, claims, insurance and liability allocation.
- Contact-data processing terms, retention, access controls, subprocessors and any cross-border processing arrangements.

Official Yango pages describe business integrations in some markets; that does not establish Ethiopia eligibility. Confirm the contract directly through the [Ethiopia partnership contact page](https://yango.com/en_et/support/taxi-all-app-yango/popular-question/partnership/). No partner has been contacted or courier ordered through this work.

## Added data structure

| Object | Main fields and purpose |
| --- | --- |
| Legal version | Version, full content, content hash, creation time; immutable per version. |
| Legal acceptance | User, document version/hash, declared age confirmation, acceptance time. |
| Consent receipt/history | Random receipt ID, preference version, external-media choice, source, timestamp; separate from terms acceptance. |
| Security limit | Hashed request bucket, counter, expiry; rejects abuse without keeping raw IP in the bucket. |
| Security audit | Actor, action, subject, minimal details, time. Local database access is still privileged and not tamper-proof archival storage. |
| Safety case | User, subject type/reference, rule, hold flag, open/approved/rejected state, evidence details, reason, timestamps. |
| Support/privacy request | Requester, kind, subject, description, received/in-progress/resolved state, response, timestamps. |
| Pickup profile | Seller, private validated contact/location, parcel dimensions/weight, version. |
| Delivery quote | Order, buyer, provider, integer amount, pickup/destination/parcel snapshots, expiry. |
| Delivery booking | Unique order/reference, provider ID, state, attempts, retry time, error and evidence. |
| Delivery event | Unique event ID, booking, body hash, normalized state, applied flag, time. |

Order additions: `delivery_required`, `delivery_quote_id`, buyer/seller-safe fulfillment summary and computed `safety_hold`. Existing payment, order, listing and review constraints remain in place. These objects support the next integration; they are not a claim that all production data-governance obligations are implemented.

## Legal review and source basis

Ethiopia has a Personal Data Protection Proclamation. Its official publication is a starting point for counsel to assess Lebse’s actual obligations, territorial scope, processing and providers. This document does not claim that a cookie banner alone satisfies that law. [Ethiopian Ministry of Justice publication](https://justice.gov.et/en/law/personal-data-protection-proclamation/).

Session and request safeguards draw on the [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), and [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). Implementing selected safeguards does not constitute an OWASP certification or complete security audit.

The cookie interface follows a conservative opt-in approach. The [UK ICO cookie guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/) is a design reference, not an assertion that UK rules automatically govern an Ethiopia-only launch.

Before replacing the drafts, obtain the legal operator’s full name, registered address, support/privacy contacts and launch markets. Counsel should review consumer rights, seller/buyer roles, prohibited goods, copyright complaints, refund/cancellation rules, courier and payment contracts, permitted liability limits, data-processing notices and dispute resolution. Confirm ownership/trademark clearance for the Lebse brand and preserve third-party rights. Do not invent entity or contact details.

## Verification

The complete automated run passes **33 tests**, including four parent scenarios and 29 substantive subtests. Coverage includes the existing marketplace loop, cookie attributes, CSRF and origin rejection, agreement enforcement, consent withdrawal/persistence, session revocation, sign-in throttling, production startup refusal, fraud holds, operator access, appeals, private responses, quote expiry/address changes, lost booking responses, webhook forgery/replay/order, cancellation failures and price increases.

The frontend build succeeds. Browser checks at `http://127.0.0.1:5173/` used the Codex in-app browser at desktop size and 390×844. Verified initial optional-photo blocking, allow/reject/withdraw behavior, unchecked terms gate, test-account sign-in/out, private pickup save, delivery quote enabling payment, changed address disabling payment, cancellation confirmation, a persisted privacy request, legal pages and mobile consent layout. DOM inspection showed zero external image URLs before allowance, six after allowance, and zero after withdrawal. No application warnings/errors or framework overlay appeared. Mobile safety/consent pages had no horizontal overflow.

Automated tests exercise dispatch and fraud scenarios against isolated databases; the browser checkout check intentionally stopped before payment and cancelled its test reservation. Existing user data was retained. Real Yango, payment, KYC, SMS, email, mobile-native, production load, penetration and legal-compliance tests remain outstanding.

## Next implementation milestone

Select the operating entity and pilot market, appoint legal/support owners, and choose an Ethiopia-compatible payment/authentication arrangement. Then migrate to secured hosted infrastructure and replace the payment simulator, certify the delivery adapter, and test the disputed-order/refund/payout loop with sandbox providers. Keep the current visual design and reusable components while replacing each local test service.
