# Lebse iOS design and release brief

Prepared 19 September 2026. Status: concept review; NOT submission-ready. This brief is a build specification and evidence checklist, not a certification or guarantee of Apple approval or legal compliance.

## Design directions

| Direction | Screens | Strength | Tradeoff |
| --- | --- | --- | --- |
| [A — Editorial](a-editorial.png) | Discover, product, report/block sheet | Strong fashion identity and generous photography | Fewer pieces visible at once; requires optimized images |
| [B — Everyday](b-everyday.png) | Search, checkout, payment pending | Fast discovery and clear purchase states | More conventional marketplace appearance |
| [C — Closet](c-closet.png) | Seller profile, photo upload, settings | Personal closets and approachable selling | Profile content must not crowd the inventory |

Approved combination: A's visual direction, B's functional checkout, C's seller and settings structure. The user selected this combination. A browser interaction prototype is available at `/ios-design.html` using `npm run dev:ios-design`; build it separately with `npm run build:ios-design`. Its controls use in-memory sample data and never contact payment, moderation or account services. This is a design implementation, not the native iOS release. Existing app screens have not been replaced. Image generation used the built-in tool; concept prompts are in `prompts.json`.

Concept corrections required before implementation: all people, counts, products and prices are illustrative; B's provider symbols are generated placeholders and its payment-security claim must be removed; use provider-approved assets only after integration. A's extra slogans and C's repeated selected tab indicators are not approved copy/navigation. Only the actual current tab is selected. Sample zero fees are not a pricing decision. No delivery service is in V1. Never present mock payment, verification or moderation states as live capabilities.

## Shared iOS design contract

Browser implementation notes: compared the Editorial concept and a 393×852 browser screenshot using image inspection. Cream/brown/terracotta palette, sans-serif title hierarchy, full-width fashion imagery, open spacing, two-column product cards and five-tab navigation carry through. Fixed the hero crop and increased heart targets to 44px. Intentional differences: a persistent preview notice, no fake OS status bar, newly generated standalone photos, no decorative carousel, no unverified security claims, and explicit simulated payment/account actions. The desktop review sidebar is outside the app design. This is a faithful directional implementation, not a pixel-identical native iOS build.

Verified in the in-app browser: page identity, meaningful content, no framework overlay or captured console errors, product navigation, saved selection, checkout provider selection, payment failure state, combined size/condition/price filtering, and the accessible deletion explanation. At 393×852 there is no document horizontal overflow. Build command passes. Photos/upload recovery, native gestures, actual device safe areas, VoiceOver, provider services and release performance remain unverified. Assets are currently full-size PNGs and need optimized variants before release.

- Cream #F8F5EE, brown #382C26, terracotta #A64E35; use darker secondary text where needed to meet contrast. No flag-color motif. SF system sans serif, body 17 pt, section 22 pt, large title 34 pt, secondary 15 pt; support Dynamic Type rather than locking text heights.
- Spacing 4/8/12/16/24/32; 20 pt page gutters; 6–10 pt product/control radii, native system sheet corners. Use 44 pt minimum action targets. Test contrast, selected states and VoiceOver labels; color alone cannot communicate errors.
- Five tabs: Discover, Search, Sell, Inbox, Profile. Each browsing tab owns its navigation history. Product/order screens push onto a stack; filters, reporting and offer entry use dismissible sheets. Selling preserves drafts before dismissal.
- Safe-area insets apply to top controls and bottom actions. Keyboard-aware forms keep the focused field and submit button reachable; support back-swipe, password autofill, paste and dismissal. Sheets preserve focus and announce errors. Respect Reduce Motion.
- Reusable product cards (4:5 images), seller rows, price rows, form errors, permission states, skeletons, empty states and retry panels. Unavailable items cannot be purchased. No fabricated success toasts.

## Launch-critical flows and required behavior

### Marketplace safety

Listing and seller ellipsis menus and chat details expose Report and Block. Reports carry the selected object ID, reason and optional evidence, then show a real case receipt and status. Block hides unwanted contact and stops new messages/offers on the server; existing financial obligations remain accessible through orders/support. Settings lists blocked accounts and supports unblock.

Add explicit prohibited-item rules before publication. Screen text AND images; suspicious listings stay out of discovery pending review. Assign a reviewer and backup for reports, appeals and copyright claims; audit outcomes, publish a monitored contact and define response targets. A keyword rule and a report button alone do not complete this operation.

### Payments — physical clothing only

Checkout shows the exact server-calculated item price, fees and total before opening Chapa/Telebirr. Provider options appear only when enabled and tested. V1 has no delivery quote, booking, tracking or delivery charge. Define how buyer and seller arrange handover, prove receipt and resolve disputes before enabling purchases; do not silently reuse courier states.

Use a provider-supported browser/SDK handoff with a narrow URL/scheme allowlist. Return to the same order after cancel, app termination or browser switch. A callback URL is not proof of payment: verify transaction reference, merchant, amount and ETB currency server-side, authenticate callbacks and deduplicate them. Pending payments disable duplicate pay attempts; failed, cancelled and timed-out payments have distinct recoverable states. Confirm provider-specific refund and settlement behavior.

### Authentication and account lifecycle

Allow browsing without signing in. Require authentication for selling, chat and checkout. Implement signup, verification, recovery, session expiry and revocation against the deployed backend. Start with first-party email/password; SMS remains off until the chosen provider is validated with +251 numbers. Do not add decorative social-login buttons.

Settings > Account > Delete account: explain consequences and retained records, reauthenticate, confirm, show a receipt/timeframe, and actually complete deletion/anonymization through an auditable worker. Restrict new activity after confirmation; revoke sessions and, if used, Apple tokens. Retain only records justified by the reviewed retention policy. A generic support ticket or deactivation is insufficient evidence of completed deletion. Handle open transactions explicitly without indefinite holds.

### Seller photographs

Use the system photo picker for selected items. Request camera access only after Take photo. Denial offers Add photos and an optional Settings shortcut. Cancellation returns to the draft. Convert HEIC/large photos to supported upload formats, normalize orientation, remove location metadata, compress and create thumbnails. Validate actual media bytes on the server and keep unpublished drafts private. Per-photo progress and retry must not duplicate media. Test limited access, iCloud-only photos, permission revocation, interruption and low memory.

## Current repository findings

| Area | Observed evidence | Release status / next work |
| --- | --- | --- |
| Native experience | `mobile/app/index.tsx` hosts the website in WebView | Review minimum-functionality risk; build and test native navigation, media and payment handoffs |
| Accounts | `supabase/functions/api/index.ts` serves public reads and bridges other routes; no native auth implementation there | BLOCKED: deployed signup and session restoration need an end-to-end pass |
| Safety | `server/security.mjs` stores reports and uses basic rules | BLOCKED: no complete block-user enforcement or image moderation established; operators/contact needed |
| Deletion | `server/security.mjs` stores deletion/closure requests | BLOCKED: no demonstrated deletion worker, retention execution or completion notification |
| Payments | `server/payment-adapters.mjs` applies a generic contract to both providers; order route still simulates outcomes | BLOCKED: provider-specific protocols, verification and refund tests; credentials alone do not complete integration |
| Payment navigation | WebView permits same-origin navigation and opens some HTTPS popups externally | BLOCKED: full provider redirect and app-return paths need explicit handling |
| No-delivery V1 | `server/index.mjs` still adds delivery cost and queues delivery | BLOCKED: remove delivery dependency from orders, totals, UI and completion rules |
| Photos | iOS usage strings exist; server validates JPG/PNG/WebP | PARTIAL: native picker/compression/HEIC and on-device permission coverage missing |
| Push | No notification package/APNs setup demonstrated | UNVERIFIED: implement and test opt-in, token rotation, logout removal and notification routing, or omit push promises |
| Links | Custom `lebse` scheme exists; no associated domains configured | UNVERIFIED: owned domain, AASA and matching routes needed for Universal Links |
| Privacy | Legal notices explicitly remain drafts | BLOCKED: identify operator/contact, finalize policy/retention and audit SDK data collection |
| Device evidence | No iPhone/TestFlight validation performed for these concepts | BLOCKED: native and release-device testing required |

These are source observations, not a fresh audit of live cloud configuration. Earlier local server tests do not validate the deployed Edge API or an iOS binary.

## Apple requirements to carry into implementation

Apple's review rules call for content filtering, reporting with timely responses, blocking abusive users and reachable contact information for UGC. Physical clothing payments use methods other than In-App Purchase. First-party-only login has a guideline 4.8 exception; adding social login requires checking the equivalent-login criteria (Sign in with Apple is the usual implementation). A thin website wrapper introduces minimum-functionality review risk. The submitted app and backend must work and be accessible to reviewers. [App Review Guidelines, 1.2, 2.1, 3.1.3(e), 4.2 and 4.8](https://developer.apple.com/app-store/review/guidelines/)

Account creation requires an accessible in-app deletion initiation flow, including guest accounts if applicable. Deactivation alone does not qualify. Communicate completion time and necessary retention; Apple-login tokens must be revoked when applicable. [Account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

Inventory account/contact data, photos, messages, purchases, approximate location, identifiers and diagnostics, including data collected by SDKs. Determine which categories are linked to identity and which purposes apply before completing App Store Connect disclosures. Audit the built archive's privacy manifests and required-reason APIs. [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)

Keep cross-app/site advertising tracking out of V1. ATT is conditional on tracking behavior; it is not a generic permission for accounts, cookies or push. If tracking is added, obtain the appropriate authorization before it starts and respect refusal. [Tracking guidance](https://developer.apple.com/app-store/user-privacy-and-data-use/)

Prefer selection-scoped photo access rather than broad library access. [Apple photo picker guidance](https://developer.apple.com/documentation/PhotoKit/selecting-photos-and-videos-in-ios)

Universal Links need an owned HTTPS domain with the matching AASA file and associated-domain entitlement. Hash-only website routes are not a completed Universal Link strategy. [Associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)

## Ethiopia and release evidence

Record results with a consenting tester and test account on each intended carrier/network; do not use customer credentials in logs. Test Wi-Fi and Ethiopian cellular connectivity on Android and iOS: provider opens, successful payment, failed authorization, delayed callback, repeated callback, app-killed return, refund and settlement. Chapa's server verification endpoint is documented; do not infer that Telebirr uses the same API/signature protocol. Obtain the official merchant integration pack and sandbox access. [Chapa verification](https://developer.chapa.co/integrations/verify-payments)

SMS/OTP, if selected: verify delivery, resend delays, expiration, throttling and recovery for +251 numbers. Maps/GPS are deferred because delivery is excluded; use a user-entered city/area. APNs: test denied/granted permission, foreground/background/terminated launch and private notification previews on physical iPhones. Avoid showing sensitive message/payment details on a locked screen by default.

Performance targets to validate, not claims: first usable cached feed within 2 seconds, useful loading feedback immediately, 24-item pagination, thumbnail requests rather than full originals, bounded decoded-image cache, compression before upload, and resumable drafts. Test the oldest device supported by the selected Expo SDK, a small supported screen and a recent notched/Dynamic Island device. Add VoiceOver, largest Dynamic Type, Reduce Motion, offline/slow networks, IPv6-only networking and interrupted uploads. Current `supportsTablet:true` also requires an iPad layout/test decision.

## Submission gate

Do not label an iOS build production-ready until every row below has an owner, a release build identifier, dated evidence and a reviewer. Unchecked means blocked, not implicitly passed.

- [ ] Deployed signup, login, recovery, logout and session expiry pass.
- [ ] Report listing/user/message, block/unblock, moderation queue and staffed response pass.
- [ ] Account deletion completes and retained records match the published policy.
- [ ] Chapa and Telebirr each pass the payment matrix, or the unready option is absent.
- [ ] No-delivery order lifecycle, handover, disputes, refunds and payouts pass.
- [ ] Camera/photo permissions, compression and upload recovery pass on iPhone.
- [ ] Native experience, safe areas, accessibility and supported-device performance pass.
- [ ] Links and push pass, or deferred features are removed from release claims.
- [ ] Privacy policy, support contact, consent behavior, SDK inventory and disclosures match reality.
- [ ] Apple team, signing, bundle ID, export-compliance declaration and provisioning are reviewed.
- [ ] TestFlight build passes smoke tests; reviewer access and live backend are available.
- [ ] Store age rating, screenshots, support/privacy URLs and review notes describe the actual release.

Suggested implementation order: restore hosted accounts; implement safety/deletion; remove delivery and complete payment protocols; implement selected native design and media flow; device/TestFlight validation; submission. Design review can proceed while backend work is blocked. No design choice alone clears these gates.
