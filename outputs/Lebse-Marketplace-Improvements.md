# Lebse marketplace improvements — September 2026

This milestone extends the existing local marketplace. All data below persists in the local PostgreSQL database. No real payment, refund, payout, courier, email/SMS or push notification integration is implied.

## Discover and return to good finds

Search matches words across titles, brands, categories, sellers, sizes and descriptions. Exact title matches rank above description matches; prefix matching and one-character typo tolerance help with longer words. All query words must match. Category, size and condition allow multiple choices within each group; groups and minimum/maximum price are combined. Individual applied chips can be removed, and Reset all clears the query and filters. Sorting supports relevance, newest and both price directions.

Signed-in users can save up to 30 named searches and reopen them to see current matches. This does not send alerts. Recently viewed keeps the last 30 unique public pieces privately per account, with a Clear history control. Search and recently viewed only reveal listings available through the existing public listing rules.

## Conversations

Unread conversation counts come from messages after each participant’s read position, independent of the notifications list. Opening a visible conversation at the bottom marks only the latest observed message and earlier messages read. A delayed request cannot mark a newer unseen message read or move the read position backward. Sent/Read labels use the recipient’s actual read position. Background browser tabs do not acknowledge reading.

Inbox search matches people, piece names and conversation text within the signed-in user’s own conversations. The unread filter and order search have clear empty states. Chat offers show proposal number, opening/counter status, time, amount and closure reason. Item and associated order links stay visible, including cancelled order history.

## Order problems and returns

Buyers choose missing, damaged, incorrect-item or cancellation reports, add a description and optional evidence, review the report, and submit. Damaged/incorrect reports require recorded delivery. Delivered-item reports use the existing 48-hour window; later requests are directed to manual support. Each order has one case and can be followed by both parties. Cancelled orders cannot start another case.

Evidence photos are stored separately from public product media, authenticated for the two order participants and authorized reviewers, and never appear in the public feed. Each participant can add up to six JPG/PNG/WebP photos under 6 MB. Notes and an append-only event history make updates visible to both parties. Evidence can be enlarged inside the app.

Open cases hold dispatch, completion and payout. A courier already carrying an item requires operational intervention; opening a report does not recall the courier. Cancellation requests leave the order open until the seller or reviewer accepts. Existing courier cancellation confirmation is still required. An accepted cancellation records a full **test** refund when a test payment exists.

Reviewers can request evidence, review, approve a return with explicit instructions and delivery-cost responsibility, reject, resolve, or record a full test refund. Approved returns proceed through buyer shipment reference → seller receipt confirmation → reviewer resolution. Damaged/incorrect-item refunds require the return receipt step. Rejected reports can be reopened by an authorized reviewer after an appeal while the order remains open. A cancelled order cannot reopen and change a later buyer’s reservation. Open cancellation requests suspend unpaid reservation expiry until a decision. Earlier order events and sold-item history remain intact.

### Authorized reviewer commands

The server and reviewer terminal must use the same existing `LEBSE_OPS_TOKEN` environment variable. Do not put this key in the browser or mobile build.

```text
node scripts/order-reviews.mjs list
node scripts/order-reviews.mjs show REPORT_ID
node scripts/order-reviews.mjs review REPORT_ID decision.json
```

Read the current report first. A decision file contains the current `version`, `decision`, and a reviewer `reason` of 20–1,000 characters. `approve_return` also requires `return_instructions` of 20–1,500 characters. Available decisions are `review`, `request_evidence`, `approve_return`, `reject`, `refund`, `resolve`, and `reopen`; allowed transitions are enforced by the server. Version checks reject stale decisions. The script never stores or prints the operator key.

## Profiles, closets and saved collections

Members can edit their name, username, city, biography and separate closet description. Profile versions prevent older edits from overwriting newer changes. Public counts come from actual live listings, followers, following and completed-purchase reviews. Closet tabs show live pieces and buyer reviews; unlisted drafts and paused pieces stay in the seller workspace.

Saved pieces can belong to multiple private collections. Users can create, rename or delete collections, and add/remove already-saved pieces. Deleting a collection keeps the original saves. Unsaving a piece removes its collection memberships. Collection routes check ownership.

## Checkout and pickup

Members can save up to 20 private delivery addresses, edit or remove them, and choose one default. Removing the default promotes another saved address; existing orders retain their address snapshot. Checkout can select a saved address or save entered details. Selecting/editing an address invalidates its previous quote. Coordinates are still entered manually or taken from the clearly labelled local sample; partner map search is not connected.

The cost breakdown shows the piece, quoted delivery, zero current marketplace fee, and total. An expired or missing quote disables payment and asks for a new quote. The server rechecks quote identity, expiry, address and amount when payment is attempted.

For newly created orders, the seller must confirm the paid quote’s pickup contact, location and packed dimensions before marking ready. This is an order-specific snapshot, with optional pickup notes. If those details are wrong, support must review them; the app does not silently change a paid delivery price. Existing legacy orders retain their previous readiness behavior.

## Phone app

The `mobile/` project prepares Expo Android and iPhone builds using a native WebView around the same marketplace. It provides safe-area handling, Android back navigation, native loading/error recovery and an origin restriction. Browser account cookies stay inside the WebView; no session token is bridged to native JavaScript. Microphone and location permissions are blocked. Test the system photo picker and camera on actual devices before release.

Phone builds require a reachable HTTPS marketplace, Expo configuration and platform signing. The local backend is deliberately not exposed to the network. USB Android testing can forward localhost ports as described in `mobile/README.md`. App-store approval and live providers remain separate work. Native bundle validation does not mean a signed APK/IPA has been produced.
