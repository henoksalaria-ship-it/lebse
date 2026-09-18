# Lebse MVP Product Specification

Version 1.0 · 8 September 2026 · Product and engineering baseline

Lebse V1 is a mobile resale fashion marketplace for an Addis Ababa pilot. A person can list a piece, discover another seller's item, negotiate or buy at the asking price, pay, track delivery, and leave a review. The seller can manage listings, respond to offers, prepare orders, and track the payout. One account supports both buying and selling.

This specification defines the release scope, reusable design system, screen layouts and actions, required data, transaction rules, architecture, and acceptance criteria. It is the immediate deliverable before the backend and remaining screens are implemented. The existing eight-screen browser prototype remains a visual and interaction reference; its sample reviews, local storage, and simulated payments are not production services.

The product choices below form the recommended V1 baseline. Numerical policies are proposed Lebse operating rules, not claims about provider terms or Ethiopian law. Partner-dependent commitments are isolated in the launch gates so engineering can proceed against explicit contracts without pretending those partnerships already exist.

## 1 Release scope

### 1.1 The V1 contract

| Decision | V1 baseline |
| --- | --- |
| Audience | Adults 18 and over buying and selling their own fashion items. One account can do both. |
| Geography | Addis Ababa only, within an operations-managed delivery-zone list. Anyone may browse; checkout and seller pickup require supported zones. |
| Currency | Ethiopian birr only. Store integer minor units; 100 minor units represent 1 ETB. Never store transaction money as floating point. |
| Inventory | Unique pieces, quantity one. Clothing, shoes, bags, and permitted fashion accessories. Category tree includes Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, and Accessories. |
| Checkout | One listing, one seller, one order. No cart, bundles, or multi-seller checkout. |
| Purchase | Buy at asking price without another seller approval, or accept a negotiated price. Payment must still complete. |
| Media | 1–6 still photos per listing; no video in V1. Original upload at most 6 MB, supported JPG/PNG/WebP; convert supported device HEIC before submission or show a clear conversion error. |
| Payment | Provider-hosted checkout; Telebirr and CBE Birr targeted first through Chapa, subject to merchant enablement. Only enabled methods appear. No cash on delivery or in-app wallet. |
| Delivery | One managed courier workflow. Buyer pays a server-quoted fee. No meetups, self-reported seller delivery, cross-border shipping, or live driver map. |
| Revenue | Closed pilot: 0% seller commission, no buyer service fee; Lebse budgets provider and payout charges. Delivery is passed through. Future fees require a new published policy and fresh order snapshots. |
| Language | English and Amharic interface for public V1; English may be used in a closed test. User-generated descriptions support Unicode. Human translation and Amharic layout review are release gates. |
| Platforms | Shared React Native/Expo app for Android and iOS. Existing responsive React web prototype remains a reference and browser test surface. Production consumer web expansion is deferred. |
| Trust | Verified phone for transactional actions; seller identity and payout eligibility before publishing. Actual review counts only. Phone verification is not identity verification. |
| Navigation | Home · Explore · Sell · Inbox · You. Saved items move to the header heart and You. Notifications use the header bell. |

### 1.2 Feature inventory and required data

Each row is required for V1 unless explicitly deferred. Screen IDs in section 3 define the tap-level behavior.

| Feature | What it does | Required data | Screens |
| --- | --- | --- | --- |
| Account and session | Phone OTP, profile setup, session restoration, logout, recovery, deletion request | User, AuthChallenge, PolicyAcceptance, DeviceSession | A01–A05, S01–S04 |
| Discovery | Paginated active inventory; newest and followed-seller feeds | Listing, ProductMedia, SellerProfile, Follow | H01 |
| Search and filters | Search titles/brands; category, size, condition, price, location, sort | Listing taxonomy, normalized search text, FilterState | E01–E03 |
| Product detail | Photos, price, flaws, measurements, seller credibility, availability | Listing, ProductMedia, SellerProfile, review aggregate | P01, X01 |
| Save and follow | Cross-device saved items and seller following | SavedItem, Follow | H01, P01, C01, U02 |
| Seller closet | Seller bio, active pieces, completed-sale review aggregate | User public projection, SellerProfile, Listing, Review | C01 |
| Offers | Buyer proposal, seller accept/decline/counter, buyer acceptance, expiry | Offer, Conversation, Listing version, Reservation, Order | O01–O03, M02 |
| Chat and inbox | Durable text messages, offer cards, unread state, block/report | Conversation, Message, ConversationMember, Block, Report | M01–M02 |
| Checkout and payment | Address, quote, server price, hosted payment, pending/success/failure | Order, Address, DeliveryQuote, Payment, PaymentEvent | B01–B03 |
| Purchase tracking | Paid-to-completed timeline and help actions | Order, Delivery, OrderEvent, Dispute | R01–R03 |
| Reviews | One verified buyer review of the seller for each completed purchase | Review, Order | V01–V02 |
| Seller profile | Bio, pickup address, verification and payout details | SellerProfile, Address, VerificationCase, PayoutAccount | U01, U03, K01–K02 |
| Listing creation | Upload, describe condition/flaws, price, offers toggle, preview, publish | Listing, ProductMedia, taxonomy, pickup zone | L01–L03 |
| Listing management | Edit, pause, resume, archive, manage drafts and sold pieces | Listing version/status, offers, reservations | L04, U03 |
| Seller fulfilment | Receive sale, mark preparing/ready, see courier and resolution status | Order, Delivery, OrderEvent | R01–R02 |
| Payout tracking | Show pending eligibility, processing, paid, failed, or held with reason | Payout, PayoutAccount, ledger, Order, Dispute | U04 |
| Notifications | In-app records and optional push with secure deep links | Notification, DeviceToken, NotificationPreference | N01, S02 |
| Safety and support | Report users/listings/messages, block users, disputes, returns/refunds | Report, Block, Dispute, Refund, AuditEvent | M02, R03, X02, ADM01–ADM04 |
| Settings | Profile, addresses, notification preferences, language, privacy, help, account closure | User, Address, preference records, deletion request | S01–S04 |
| Shared states | Loading, retry, no results, offline, expired, reserved, sold, removed | Request status, error code, resource status, retry context | X01–X03 plus all screens |
| Operations console | Restricted moderation, verification, delivery updates, disputes, reconciliation | All relevant records with role and audit controls | ADM01–ADM04 |

### 1.3 Explicitly outside V1

Video listings, live shopping, timed drops, auctions, social posts, AI recommendations, image search, luxury authentication guarantees, bidding wars, carts, bundles, promotions, paid boosts, subscriptions, wallet balances, credit, cash on delivery, multiple courier integrations, public APIs, automated dispute decisions, group chat, voice notes, chat attachments, message editing/deletion, and seller-to-buyer public ratings are deferred.

The prototype's “For you” becomes “Latest” until personalization exists. “Fresh drops” is removed rather than implying scheduled drops. Followed-seller inventory stays. Sample trust badges and invented review counts are removed when real records are connected.

### 1.4 Success and release measurement

Primary outcome: completed, undisputed orders per week. Supporting measures: listing-to-first-inquiry time; search-to-product-open rate; product-to-checkout rate; offer acceptance; payment completion; seller-ready deadline compliance; delivery success; refund/dispute rate; and payout completion. Report denominators and distinguish unique buyers from events. Set commercial targets after the first pilot cohort; do not invent traction targets.

Engineering release targets: no known critical authorization or money-handling defects; every core state transition covered by integration tests; no double-selling in concurrent tests; no duplicate charge allocation or payout in webhook replay tests; no horizontal overflow at 320–430 px; core controls operable with screen readers and text scaling. Performance targets are in section 9.

## 2 Shared design system

### 2.1 Visual foundations

Keep the approved Ethiopian Contemporary identity: warm ivory/cream, dark brown, terracotta, modern sans-serif, large clothing photography, restrained corners, and editorial spacing. Ethiopian character comes from people, local language, currency, place names, and occasional subtle woven geometry. Avoid flag-color decoration or claiming cultural authenticity through generic symbols.

| Token family | Contract |
| --- | --- |
| Color | Background #F8F5EE; text #382C26; accent #A64E35; surface #FCFAF5; subtle surface #EEE6D9; border #DFD9CF. Muted #81776E is decorative/large-text only unless contrast passes; use #6F6258 for small secondary copy. |
| Semantic states | Success #4F6747, warning #8A5B23, error #A13B32. Always include a text label or icon; never rely on color alone. Verify contrast for the actual foreground/background pair. |
| Type | DM Sans for Latin, Noto Sans Ethiopic for Amharic; system fallbacks. Body 16/24; secondary 14/20; caption 12/16; label 14/20 medium; section 24/30; screen title 32/38; desktop editorial title 48–64. Avoid tiny product labels from the first prototype. |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64. Mobile gutter 20; compact 16 at 320 px. Desktop max content width 1280. Minimum target 44×44 points/pixels; primary controls 48 high. |
| Geometry | Buttons/inputs/chips 4–6 px radius; product media 4; surfaces 6; mobile sheet top corners 16. Circle only for avatars and small icon containers. |
| Images | Product cards 4:5; detail gallery preserves aspect ratio and permits full-image view. Do not crop out defects. Reserve image space before load; use a neutral fallback and retry affordance on failure. |
| Motion | 120–200 ms feedback; sheet 240 ms; save animation at most 160 ms. Respect reduced motion. State changes remain understandable without animation. |
| Layout | Home/Explore/Saved/Closet have a two-column mobile product grid. Forms are one column except safe paired fields. Checkout and detail may use two columns on desktop. Native safe areas and keyboard insets are mandatory. |

### 2.2 Reusable component contracts

Component names describe required implementations, not claims that all exist today. The current prototype implements Button, Chip, ProductCard, SellerCard, Sheet, and Field in basic form; remaining families and states must be consolidated before adding feature screens.

| Component | Anatomy and data | Variants and states | Action contract |
| --- | --- | --- | --- |
| Button / IconButton | Label, icon, accessible label, action ID, size | Primary, secondary, text, destructive; default, pressed, focused, disabled, submitting | One press initiates one command. Submitting keeps width and shows progress, prevents duplicate taps. Destructive action uses a named confirmation. |
| ProductCard | Listing ID/version, cover/alt, title, price, size, condition, seller, saved/status | Active, reserved, sold; loading skeleton; failed image | Photo/title opens P01; heart saves/un-saves; seller opens C01. Taps must not propagate between targets. Sold/reserved state cannot expose an enabled purchase action. |
| SellerCard | Seller ID, avatar/fallback, username, precise verification flags, real review aggregate | Compact, full; new seller; loading | Card opens C01. Follow button is a separate target. Zero reviews says “New seller,” not a fabricated score. |
| BottomNavigation | Five route IDs, active route, unread inbox count | Normal, hidden for focus flow, safe-area/keyboard aware | Home H01, Explore E01, Sell L01, Inbox M01, You U01. Repeat tab returns to tab root; tab switching preserves list position. |
| Tabs | Label, value, optional count, selected value | Underline; 2–4 tabs; horizontal scroll when necessary | Changes scoped content, not hidden global filters. Expose selected state and keyboard navigation on web. |
| SearchField | Query, placeholder, clear action, loading state | Empty, typing, results, unavailable | Submit opens E02; Clear removes query; Cancel returns to prior screen. Debounced suggestions can run at 300 ms but do not create history until submit. |
| FilterChip | Label, value/count, selected, removable | Category selector, applied filter, disabled | Category updates local filter; remove chip clears only that criterion. Selected appearance and accessible state agree. |
| InputField | Persistent label, value, helper text, error ID, required indicator | Text, phone, money, multiline, select, checkbox/switch, OTP | Validate on blur and submit; preserve entry on errors; focus first invalid field. Currency adornment never substitutes for a label. |
| Badge | Semantic label, type, optional explanation | New, offers allowed, reserved, sold, phone verified, identity verified | Status is readable without color. Interactive explanation uses a real button. Never show synthetic scarcity or unsupported protection claims. |
| Modal / BottomSheet | Title, body, close, primary/secondary action, dismiss policy | Filters, offer, confirmation, picker, error | Back/Escape closes dismissible sheet and returns focus. Trap focus on web; screen-reader modal on native; lock background scroll. Unsaved work prompts Keep editing / Discard. |
| Toast | Message, severity, optional Undo, dedupe key | Success 4 s; undo/error 8 s; screen-reader announcement | Used for completed low-risk feedback. Never sole evidence of payment, order status, or blocking error; those remain on the page. |
| LoadingState | Resource type, row count, accessible status | Product skeleton, list skeleton, inline spinner, pending payment | Preserve layout. Slow request at 10 s shows explanation and safe Retry/Check status. Never represent unknown payment as failed. |
| EmptyState | Context-specific title, reason, illustration/icon if useful, CTA | No inventory/results/saves/chats/orders/reviews/notifications | CTA leads to a useful destination; filters offer Reset; a failed request never renders an empty state. |
| PriceBreakdown | Item, delivery, fees, discounts, total, seller net, currency | Buyer checkout, seller proceeds, refund breakdown | Read-only server quote; change invalidates prior quote and requires review before paying. |
| Timeline / StatusRow | Event label, time, source, state, next action | Order, delivery, payment, payout, verification | Display real events in order. A projected step is visibly pending and cannot impersonate a confirmed event. |
| OfferCard | Offer version, proposer, amount, expiry, status, allowed actions | Incoming, outgoing, counter, accepted, declined, expired | Always refetch/validate before transition. Old chat offer cards stay in history and become non-actionable. |
| MediaUploader | File list, upload IDs, per-file progress/error, order, cover | Empty, uploading, retry, uploaded, unsupported | Add/camera requests permission at time of use; remove affects draft only; retry only failed file; publish waits for validated media. |

### 2.3 Shared behavioral requirements

All screens use the same header, spacing, validation, loading, retry, and authentication-gate patterns. Guest browse is allowed; Save, Follow, Message, Offer, Buy, and Sell save a safe return intent and open A01. After successful authentication, navigate back and ask the person to complete any purchase or offer action explicitly; do not silently submit money-related actions. Saving/following may complete once after login if the original action is still valid.

All date/time values are stored in UTC; display Addis Ababa local time and clear relative timestamps. Expiry uses the server clock. On return from background, refresh status and deadlines. Currency, pluralization, and translations use shared formatters. Error copy explains the next step without showing provider errors or internal IDs except a safe support reference.

The component review surface must demonstrate every family in default, selected, disabled, loading, error, empty, long-text, and Amharic variants. Features must consume these components rather than copying markup or restyling controls independently.

## 3 Screen designs and action map

These layouts specify the information hierarchy and behavior for every V1 surface. They extend the approved visual system; they are build specifications, not newly implemented screens. Global Back returns to the previous valid route. If opened through a deep link with no history, it returns to the relevant tab root. Global loading/error/access rules in section 2 apply to every action below.

### A01 Sign up or log in

Layout: small lebse wordmark; “Welcome to your next chapter”; phone entry with +251; concise explanation; Continue; Terms and Privacy links; guest browsing. No social login buttons in V1.

Data: normalized phone, safe return intent, auth challenge response, terms/privacy versions.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Continue | Normalize 09/07 national format or +251; request OTP; open A02 with masked phone and challenge expiry | Invalid phone stays inline. Rate limit shows retry time. Generic response avoids revealing whether an account exists. |
| Terms / Privacy | Open current policy document; return without losing phone | Policy load failure provides retry. |
| Browse for now | Open H01 as guest | No transactional rights are granted. |

### A02 Verify phone

Layout: six-digit entry, masked destination, countdown, Verify, Resend, Change number. Permit OTP autofill and paste.

Data: challenge ID, entered code in memory only, expiry, retry-after, remaining attempts.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Verify | Auth provider verifies code and creates session; existing complete profile resumes intent; new profile opens A03 | Expired/invalid code stays inline; five failed attempts invalidate challenge. No OTP is logged or saved in application tables. |
| Resend | Issue new challenge and invalidate prior code | Disabled for 60 s; configured send limits and abuse checks apply. |
| Change number | Return A01 with editable number | Existing challenge is abandoned. |

V1 target OTP expiry is five minutes, configured and tested in the chosen provider. It is a Lebse requirement, not an assumption about provider defaults.

### A03 Create profile

Layout: name, unique username, optional avatar, language, city, 18+ declaration, explicit agreement to current Terms; Create account. Privacy link is informational, not a bundled marketing opt-in.

Data: User public/private fields, PolicyAcceptance, language, onboarding completion.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Add avatar | Open local photo picker, crop and upload avatar | Permission denied explains how to choose an image; avatar remains optional. |
| Create account | Validate name/username/age declaration/terms; save profile and policy record; resume intent or H01 | Username collision returns alternatives without losing form. Missing agreement blocks submission. |
| Change language | Switch interface locale immediately | Preserve entered values. |

### A04 Session expired and recovery

Layout: “Sign in to continue,” explanation, Continue with phone, Help with my number.

Data: safe route/IDs, session status, support recovery case.

Continue with phone → A01; success restores the route but never automatically replays payments. Help → A05 recovery form. Existing private cached data is hidden when the session becomes invalid; drafts remain encrypted on that device until reauthentication or deletion.

### A05 Recover access

Layout: old phone, reachable contact channel, short explanation, Submit request, Back. No promise that an old number alone proves ownership.

Submit validates contact and creates a private support case; show case reference and instructions. Operations checks existing account and transaction evidence under a documented recovery procedure. No buyer, seller, or support UI can directly overwrite account ownership. A replacement phone requires verification before recovery completes.

### H01 Home

Layout: compact wordmark, Search/Notifications/Saved; Latest and Following tabs; category chips; immediate two-column product feed; unobtrusive sell invitation lower down. Keep the mobile editorial introduction short enough to expose at least the first product row near the first viewport.

Data: paginated active Listing public projection, covers, seller summaries, saved IDs, follows, unread notification count, cursor.

Search → E01; bell → N01; heart → U02; product → P01; seller → C01; item heart toggles SavedItem with optimistic update and rollback on error. Latest sorts published_at descending then ID. Following filters to followed sellers; no follows renders a closet-discovery CTA into E01. Category applies to this feed. Load more/pull to refresh loads the next cursor or refreshes; preserve existing products if the next page fails. Sell invitation → L01 through authentication and seller eligibility.

### E01 Explore search entry

Layout: focused search field, recent searches, category list. Category names use the listing taxonomy.

Data: query, device-local recent submitted queries (last ten), taxonomy, safe previous route.

Submit query → E02; category → E02 with category filter; recent query → E02; remove recent query deletes only local history; Clear all confirms then clears local history; Cancel returns to H01. Do not upload raw search history to analytics.

### E02 Search results

Layout: search field, result count, Sort, Filters count, removable applied chips, two-column grid, pagination.

Data: query, applied filters, sort, results/cursor, saved IDs.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Submit edited query | Fetch first page with retained visible filters | Query and filters remain in URL/native route state; no hidden filter carries to Home. |
| Sort | Open picker: Relevance, Newest, Price low–high, Price high–low | Relevance becomes newest if query is empty; every ordering has ID tie-breaker. |
| Filters | Open E03 with a copy of applied values | Unsaved selections do not alter results. |
| Remove filter chip | Clear only that filter and reload page one | Preserve query and other filters. |
| Product / heart / seller | P01 / toggle save / C01 | Same component contract as H01. |
| Reset filters in no-results state | Clear filters, retain query, rerun | Secondary Clear search resets query too. |

### E03 Filters bottom sheet

Layout: title and Close; category; brand text; category-aware size; condition; color; min/max ETB; supported area; Reset; Show results.

Data: temporary FilterState, taxonomy, valid size options, zone list, optional preview count.

Selecting controls edits temporary values. Show results validates min ≤ max and category/size compatibility, applies atomically and closes into E02. Reset clears temporary filters, not the query. Close/Back discards temporary changes. No results count is shown while a preview count is unavailable; use “Show results” rather than a fake zero.

### P01 Product detail

Layout: back/share/heart; swipeable gallery and photo count; title/price; size/condition/location; flaws highlighted; description and item attributes; seller card and real reviews; sticky Buy now and Make offer; Message seller as secondary action.

Data: full public Listing, media, seller summary, availability/version, saved state, allowed server actions.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Gallery / thumbnail | Open full image viewer; swipe changes selected index | Bad image has Retry; never substitute an unrelated product. |
| Heart | Toggle SavedItem | Authentication gate; rollback on failure. |
| Share | Native share with canonical public listing link | Removed/private listing cannot expose private data. |
| Seller / Reviews | C01 / V02 | Deleted seller has limited archived identity on owned orders only. |
| Message seller | Get or create unique buyer/seller/listing conversation; M02 | Self-message disabled; block/suspension rules apply. |
| Make offer | O01 | Hidden if allow_offers=false; disabled for own/sold/reserved listing or ineligible account. |
| Buy now | B01 with listing ID/version and asking-price intent | Opening checkout alone does not reserve the piece; server revalidates at Pay. |
| Report | X02 with listing reference | Auth required, reason and optional explanation. |
| Edit my listing | L04 | Owner-only; reserved/sold restrictions apply. |

### C01 Seller closet

Layout: avatar, username, precise verification label, bio, city, real rating/count and sold count; Follow; Listings/Reviews tabs; product grid. No private phone, ID image, or pickup address.

Data: User public projection, SellerProfile, review aggregate, follow state, seller listings.

Follow toggles Follow; Listings tab shows active and visibly sold pieces with active first; Reviews opens V02 in context; product → P01; Report/block → X02. Messaging starts from a listing in V1, avoiding unscoped spam conversations. New seller displays “No reviews yet.”

### L01 Sell and add photos

Layout: step 1 of 3; large photo picker; ordered thumbnails with cover marker; photo guidance; Save draft; Continue.

Data: seller eligibility, Listing draft ID, ProductMedia upload records, local pending files.

Add photos opens library; Take photo requests camera on demand. Upload validates file type/size and shows per-file progress. Drag reorder or accessible Move left/right changes sort order; Set cover changes cover media ID; Remove removes draft association; Retry resends only failed media. Save draft persists valid progress and returns U03. Continue requires at least one processed photo and opens L02. New seller can draft immediately; K01 eligibility must complete before Publish.

### L02 Listing details

Layout: step 2 of 3; cover summary; title, category/subcategory, brand or Unbranded, size, color, condition, flaws yes/no and detail, description, price, Allow offers toggle, pickup area; Continue to preview.

Data: Listing draft/version, media, seller pickup address, taxonomy, effective price policy.

Continue validates and saves draft → L03. Flaws=Yes reveals mandatory description and at least one marked flaw photo. Condition Fair requires a specific wear description even if no discrete flaw exists. Size is chosen from category options; dimensions optional. Price is 50–50,000 ETB in whole ETB for the pilot. Category changes invalidate incompatible size. Back returns L01 with all fields retained. Save draft permits incomplete fields but does not publish.

### L03 Preview and publish

Layout: buyer-style preview; visibility/pickup summary; asking price, seller proceeds and fee policy; Publish; Edit details; Edit photos.

Publish checks ownership, verified phone, seller eligibility, pickup coverage, valid media, prohibited-item rules, and complete fields. One transaction marks Listing active and sets published_at; H01 and C01 can fetch it; success opens P01 with owner actions. Validation error links to the field. Moderation hold displays “Under review” in U03. Missing eligibility opens K01 and returns to preview. Edit details/photos → L02/L01.

### L04 Edit or manage listing

Layout: same details/media controls with Save changes; Pause/Resume; Archive; listing status; active-offer notice.

Data: Listing version/status, ownership, open offers, reservation/order state.

Save uses version checking. A conflicting edit refetches and asks user to review. Material changes (price, size, condition, flaws, description, media) invalidate open offers and notify participants before save is confirmed; changes cannot alter an existing order snapshot. Pause removes from discovery and expires open offers. Resume revalidates. Archive is available only with no active reservation or uncompleted sale; it removes public visibility without erasing transaction history. Reserved or paid pieces cannot be edited/paused/archived. Back with unsaved changes → Keep editing/Discard.

### O01 Make offer

Layout: product summary, asking price, amount field, suggested amounts at 90%, 80%, 70%, “Delivery is additional,” expiry explanation, Send offer.

Data: listing/version, buyer, conversation, proposed price, current negotiation state, rate-limit state.

Suggested amount fills the field; it never sends. Send validates at least 50% of asking price and no more than asking price, within pilot money bounds, then creates Offer and system Message and seller Notification atomically; opens M02 with pending offer card. Whole-ETB suggestions round up. Self-offer, inactive listing, blocked participant, expired session, or rate cap returns explicit reason. Cancel returns P01 with no write.

### O02 Offer received

Layout: buyer identity, listing, offer amount, seller net, asking price comparison, expiry countdown; Accept, Counter, Decline; conversation below or linked.

Data: latest Offer, listing/version, conversation, seller eligibility, server allowed actions.

Accept atomically accepts the current offer, creates one awaiting-payment Order and 30-minute Reservation, and expires competing open offers; notification asks buyer to pay. Seller sees “Accepted · waiting for payment,” never “Sold.” Counter opens O03. Decline uses optional reason, updates status, writes system message, notifies buyer. Open chat → M02. Stale/expired card becomes read-only after server response.

### O03 Counteroffer and buyer response

Layout: existing price, new amount, seller net when seller is proposing, exchange count, Send counter. Incoming counter card includes Accept and pay, Counter, Decline.

Send counter appends a new Offer version linked to its predecessor, supersedes previous pending version, and notifies the other party. Accept and pay by buyer atomically creates the same 30-minute reserved order then opens B01. Seller acceptance of a buyer counter follows O02. Decline closes this negotiation. Only the receiver of the latest proposal can counter or accept; the proposer can Withdraw. At the exchange cap, Counter is hidden and Accept/Decline remain.

### M01 Inbox

Layout: Conversations/Offers tabs; unread dot/count; avatar, listing thumbnail, last-message preview, timestamp, order/offer label; pagination.

Data: member-scoped conversations, last message, unread cursors, current offers and order links.

Conversation row → M02 and advances read cursor after visible messages load. Offers tab lists current incoming/outgoing offers; row → O02 or M02 according to role. No chats shows “Ask about a piece” → E01. Refresh loads changes; failed refresh keeps cached rows with an error strip. No typing indicator or presence promise is required in V1.

### M02 Chat

Layout: back; other person; pinned product summary; chronological text/system/offer cards; order link when applicable; composer; overflow Report/Block.

Data: Conversation, members, paginated Message, offer versions, related Order, block status.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Send | Persist text with client-generated dedupe ID, then broadcast; show sent state on acknowledgement | 1–2,000 characters, rate limits, member and block checks. Offline stays “Not sent,” never silently sends offers/payments on reconnect. |
| Retry failed message | Resubmit same dedupe ID | No duplicate message. |
| Product header | P01 | Sold listing remains viewable with no Buy action. |
| Other person's name | C01 | Preserve chat scroll on return. |
| Offer action | O01–O03 transition according to card role/status | Never trust old card data. |
| Track order | R01 | Order accessible only to participants. |
| Report message | X02 with message ID | Reported content snapshot retained privately. |
| Block | Confirm, create Block, disable new text/offers in both directions | Active order history and support remain accessible. Existing fulfilment obligations are not cancelled. |
| Unblock | Remove own Block | The other person's block, if any, still prevents communication. |

Messages and offers are records with timestamps; free-text promises do not change the order price. Do not render executable HTML or automatically open pasted links.

### B01 Checkout

Layout: product summary; buyer address; delivery quote; price breakdown; allowed payment methods; amount-bearing “Pay [total] ETB” button; reservation timer only if one exists; support link.

Data: existing accepted Order or buy-now intent, listing/version, buyer Address, quote ID/expiry, enabled methods, current payment attempt.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Add/edit address | Address sheet validates name, phone, supported zone, street/landmark; save and recalculate quote | Precise location permission is unnecessary. Seller never receives buyer address beyond courier needs. |
| Choose method | Choose only provider-enabled method | If provider-hosted checkout cannot enforce a preselection, show a single “Continue to payment” CTA and let the provider choose. |
| Pay total | Revalidate price/availability/quote. Buy now creates Order plus 15-minute Reservation; accepted offer uses its existing reservation. Create a unique Payment attempt and launch provider checkout | If anything changed, display revised breakdown and require another explicit Pay. Own item, unsupported zone, sold or unavailable listing cannot proceed. |
| Back/cancel before payment starts | Leave checkout; accepted reservation remains until expiry or explicit cancel | No implied cancellation of an in-flight payment. |
| Return from provider | B02 pending until server confirms, then success/failure | Client redirect is never proof of payment. |

### B02 Payment pending and success

Pending layout: “Checking your payment,” order/amount, status explanation, Check status, View order, Get help. Check status performs a rate-limited server verification; View order → R01. Closing the app does not lose the pending order. Never show another Pay button while the attempt is unknown.

Success layout: “Payment received,” exact paid amount and order reference, next seller step, Track order, Message seller, Continue browsing. Track → R01; Message → M02; Continue → H01. Success renders only after verified server allocation of a successful payment to this order. A success event that cannot acquire the listing is a refund case, not a successful purchase screen.

### B03 Payment failure or cancellation

Layout: clear failure/cancellation reason safe for the user, unchanged order summary, Retry payment when eligible, Change method, Back to item, Help.

Retry creates a new attempt only after the previous one is terminal and the reservation remains valid. Change method → B01 with preserved address. Expired reservation requires availability/price recheck and a fresh order/reservation; no re-use of an expired price commitment. Unknown status routes to B02 pending, not Retry. Provider paid but order cancelled routes to refund status in R03.

### R01 Order tracking for buyer and seller

Layout: order reference, piece summary, current state and next action; event timeline; delivery estimate and masked contact; payment summary; participant chat; help. Seller view adds proceeds and readiness actions. Buyer view adds receipt/review actions.

Data: Order immutable snapshot, permitted OrderEvents, Delivery, Payment allocation, Dispute summary, seller Payout summary.

| Tap | Result and write | Guard or alternate result |
| --- | --- | --- |
| Buyer Confirm received | Confirmation explains dispute deadline; set buyer_confirmed_at and complete fulfilment if delivery evidence is valid | Does not shorten the 48-hour dispute window or payout hold. If courier has not recorded delivery, create a delivery-verification support task rather than releasing money. |
| Buyer Report a problem | R03 | Available for eligible unresolved/non-delivered orders; window shown for delivered orders. |
| Buyer Cancel order | Confirmation with reason; allowed before seller marks Ready; initiate refund if paid | After Ready, support request only; no promise of automatic cancellation. |
| Seller Start preparing | Paid → preparing | Verified payment required. |
| Seller Mark ready | R02 confirmation then ready; notify operations/courier | Cannot imply picked up or delivered. |
| Seller Cancel sale | Reasoned confirmation; available before courier pickup; cancel and initiate refund | After pickup only support resolution. Seller cancellation review rules apply. |
| Track delivery / timeline | Expand actual events and estimates | No fake live-map position. |
| Review seller | V01 for completed, eligible order | Only buyer, once per order. |
| Payout details | U04 for seller | Never expose payout account to buyer. |
| Message / Help | M02 / R03 | Blocked chat routes to support; order actions remain. |

### R02 Mark item ready

Layout: packing checklist, confirmed pickup address, earliest pickup instruction, Mark ready, Back.

Mark ready requires paid or preparing, seller ownership, verified pickup address, and checklist acknowledgement. Write OrderEvent and Delivery awaiting_pickup, notify operations and buyer, return R01. Repeated tap returns the existing ready result. Changing pickup address after payment requires an operations-reviewed delivery update and cannot silently change the buyer's paid quote.

### R03 Problem, return and refund status

Layout: problem reason (not received, not as described, damage, wrong item, payment issue, cancellation), description, optional 1–6 evidence photos, submit; then case timeline, evidence requests, resolution, return instructions/refund progress.

Submit creates Dispute linked to Order, pauses payout eligibility, stores evidence privately, and shows case reference. Add evidence appends to the case. Confirm requested return follows assigned instructions and records evidence, not a self-declared refund. View refund displays initiated/processing/completed/failed with provider-confirmed timestamps. Contact support opens the case thread. Withdraw complaint requires confirmation; operations still assesses unresolved payment risk. Appeals can be submitted through this case within seven days of resolution.

### N01 Notifications

Layout: chronological list grouped by date; unread marker; concise event text; thumbnail where useful; Mark all read; preferences link.

Data: owner-scoped Notification, target type/ID, read_at, cursor.

Tap row marks read and opens the authorized current destination: offer/chat → M02/O02; sale/delivery/payment → R01; listing moderation → U03/L04; review → V02; verification → K01; payout → U04; dispute → R03. Deleted/inaccessible target shows X01 with a safe route. Mark all read affects only this user's existing notifications. Preferences → S02. No notifications renders a neutral empty state.

### U01 Your profile

Layout: avatar/name/username, Edit profile, public closet link; rows for Saved, Buying, Selling, Payouts, Verification, Settings. Buying/Selling use clear status counts, not invented balance cards.

Saved → U02; Buying → own order list → R01; Selling → U03; Payouts → U04; Verification → K01; Settings → S01; Edit profile → S03; public closet → C01 with own seller ID. Guest sees Sign in → A01. Private fields are never reused in public seller cards.

### U02 Saved items

Layout: Saved title, Active/All tabs, two-column grid. All includes clearly marked sold/reserved pieces.

Data: SavedItem joined to permitted Listing summaries.

Heart removes SavedItem with Undo; product → P01; seller → C01. Sold remains read-only and may offer Search similar → E02 with category and size, without implying a recommendation algorithm. Removed listings show “No longer available” with Remove. Empty CTA → E01. Saved filters are local to this screen.

### U03 Selling dashboard

Layout: Active, Drafts, Sales tabs; listing rows with status, asking price, next action; Add listing. Optional Paused/Archived filters within Active management.

Active row → L04/P01; draft → L01/L02 at last valid step; sale → R01. Add → L01. Publish blocked by verification shows K01. Draft delete confirms and removes unused draft/media through a scheduled cleanup; archive published listing follows L04. Sales cannot be erased by deleting a listing. No listings CTA → L01.

### U04 Payout status

Layout: per-order proceeds, eligibility date, status and reason, masked destination, event history; Manage payout account; Help. No spendable wallet balance.

Data: Payout, ledger-derived amount, completed/disputed Order, verified PayoutAccount.

Row expands calculation and status; related order → R01; Manage account → K02 with reauthentication; Help opens support case. A failed payout offers “Update details” when address/account invalid, or “Contact support” otherwise. Seller cannot fire repeated transfers from the app. Operations retries only after verification of previous attempt. In-flight transfers retain their original destination snapshot.

### V01 Leave a review

Layout: completed piece/seller, 1–5 stars, optional written comment up to 1,000 characters, Submit, Not now.

Data: eligible completed Order, buyer/seller IDs, rating/comment.

Submit creates unique Review(order_id,buyer_id), updates aggregate, notifies seller, and opens V02. Duplicate submission returns existing review. Not now returns R01. Review window: 14 days from completed_at; must have no unresolved dispute or full refund. Users cannot review themselves or purchases without verified payment. Published review is immutable in V1; Report handles abuse. A later full refund hides the review from aggregate with an audit reason.

### V02 Seller reviews

Layout: real average/count, chronological verified-purchase reviews; item reference only if publicly available; Report action.

Review list paginates. Report opens X02 with review ID. Seller name returns C01. Empty says “No reviews yet.” Do not show reviewer phone, address, order total, or payment details. Seller replies and sorting by rating are deferred.

### K01 Verification

Layout: separate Phone verified and Seller eligibility sections; identity status; payout status; next action; privacy explanation.

Data: phone_verified_at, VerificationCase state, PayoutAccount state, rejection reason safe for user.

Start identity check launches the contracted provider flow or restricted manual-review form with required fields and private evidence upload. Submit creates pending VerificationCase. Pending shows status, not a reusable submit button. Rejected permits resubmission with explanation. Phone change → S04 and reauthentication. Add payout account → K02. Completion returns to L03 if Publish was the intent. Do not collect identity documents before the operating verification method, access and retention policy are established.

### K02 Payout account setup

Layout: provider-supported destination list, legal account name and account identifier, eligibility explanation, Verify and save; show only masked identifier after save.

Data: current authenticated seller, provider destination metadata, token/reference or encrypted payout identifier, verification result.

Verify and save requires recent reauthentication and provider/account checks; store verified account version and notify seller of changes. Invalid destination stays inline. Changes pause new payouts for 24 hours and trigger risk review if identity/name differs; existing in-flight transfers retain their snapshot. Full account details never appear in analytics or buyer-visible responses.

### S01 Settings

Layout: Account, Addresses, Notifications, Language, Privacy and terms, Help, Log out, Delete account.

Edit profile → S03; Addresses opens owner-only list/add/edit/archive sheets; Notifications → S02; Language picker saves preference and switches localized copy; Privacy/Terms opens versioned document; Help opens support form with relevant order selector; Log out confirms then clears session/private cache; Delete account → S04.

### S02 Notification preferences

Layout: in-app transaction information explanation; push toggle; chat push toggle; marketing toggle default off; OS permission status.

Enable push requests OS permission only after tap, registers DeviceToken on success, then saves preference. Denied shows Open device settings; changing app toggle does not pretend to change OS permission. Disable unregisters or suppresses delivery for this device. Transaction records remain in-app even when push is off. Marketing notifications remain unused in V1; no default opt-in or scheduled promotional campaign.

### S03 Edit profile and addresses

Layout: name, username, avatar, bio, city; separate private address editor.

Save profile validates uniqueness and writes allowed fields only; public preview → C01. Seller pickup address updates affect future orders, not snapshots. Archive address hides it from future selection but keeps existing order snapshots. Avatar remove uses a fallback initial. Cancel returns without committing unsaved edits. No client-editable role, verification, review count, or payout status fields.

### S04 Account security and closure

Layout: masked phone, Change phone, sign out all devices, deletion eligibility and explanation.

Change phone requires verification of current session/recent OTP plus new phone; lost-number path → A05. Sign out all devices revokes refresh sessions and sensitive operations check account/session status. Delete account requires reauthentication and explicit confirmation. Open orders, refunds, disputes or payouts create a pending closure request and disable new transactions while support resolves obligations. When eligible, revoke access and anonymize public profile; retain only necessary restricted transaction records according to an approved retention schedule. Show requested/completed status; never claim immediate total erasure while obligations remain.

### X01 Sold, reserved, removed or inaccessible

Sold: preserve product image/title with Sold badge; disable Buy/Offer; show Search similar and Remove from saved. Reserved by another buyer: show Unavailable right now; Refresh availability rechecks server; no buyer identity. Reserved by this buyer: Resume checkout → B01 and Cancel reservation if no unknown payment. Removed/moderated: neutral unavailable screen; Go back/Explore. Unauthorized private target: generic unavailable; never disclose another user's order existence. Deep-link handling uses the same states.

### X02 Report and block sheet

Layout: resource summary, reason selector, optional explanation, Submit; user reports also offer Block separately.

Submit creates Report with resource ID and private evidence snapshot, closes with case acknowledgement. No automatic public accusation or removal follows one report. Block follows M02 rules. Cancel writes nothing. For urgent order problems the sheet directs to R03 so payout protection can be considered, rather than treating a content report as a dispute.

### X03 Error, offline, empty and maintenance

Offline: show cached public feed and clear stale indicator; Retry reconnects. Saving may show failure/rollback; offers, checkout and publication require server acknowledgement. Empty: contextual CTA as specified per screen. Forbidden: no private data with safe destination. Request timeout: retain entered data and offer Retry only for safe/idempotent commands. Payment unknown: B02. Maintenance: status text and Retry; open orders remain accessible when safe. Unexpected error: safe support reference and Restart screen, with draft preservation.

### ADM01 Moderation and verification queue

Restricted operations layout: queue tabs, case detail, submitted evidence, reason history, Approve/Reject/Request information; user/listing restriction actions.

Role-checked action records reason and AuditEvent; affected user gets a safe Notification. Listing remove/seller suspension hides active inventory and prevents new purchases but leaves active-order resolution accessible. Identity evidence is private and access-logged. Review content moderation is separate from refund decisions.

### ADM02 Delivery operations

Restricted layout: paid/ready orders, courier assignment, pickup/delivery event entry, evidence, exception queue.

Assign courier creates assignment; Confirm pickup requires courier reference/time and moves to in_transit; Confirm delivery requires validated proof and delivered_at; Failed delivery records reason and next attempt/return. Every action is role-checked and audited. Seller cannot use these operations endpoints. Target updates include idempotency references to avoid duplicate timeline events.

### ADM03 Disputes, returns and refunds

Restricted layout: case history, buyer/seller evidence, order/payment/delivery snapshots, proposed outcome and amount; Request evidence, Approve return, Approve refund, Reject with reason, Escalate.

Each action updates Dispute and audited reason. Refund approval creates an idempotent Refund request, not an editable “paid” flag. Operations cannot both approve and execute an exceptional manual payout/refund outside normal rules without a second authorized reviewer. Refund completion comes from reconciliation. Resolution informs both parties and explains appeal route.

### ADM04 Payments and payout reconciliation

Restricted layout: mismatched payments, unknown attempts, refunds, payout holds/failures, provider references and expected/actual amounts; Verify status, Retry eligible operation, Pause release, Export reconciliation.

Verify calls provider server-to-server. Retry uses documented reference/idempotency rules and cannot duplicate an unknown transfer. Exports omit full account numbers and identities unnecessary for reconciliation. Manual exception changes require reason and audit. No direct editing of payment success or payout completion from a browser form.

## 4 Marketplace operating rules

### 4.1 Offers and reservation

| Rule | V1 behavior |
| --- | --- |
| Offer lifetime | Each pending proposal expires 24 hours after server creation. A valid counter gets its own 24-hour expiry. |
| Negotiation limits | One active negotiation per buyer/listing. At most six proposals total in one negotiation, including first offer and counters. At most three buyer-started negotiations per listing in a rolling 24 hours. Withdraw/restart does not reset rate limits. |
| Valid amount | Whole ETB, within 50%–100% of current asking price, and within the pilot listing bounds. At asking price, explain Buy now as an option. |
| Who can act | Only the receiver of the latest pending proposal may accept, decline or counter. Proposer may withdraw. Self-offers and blocked/suspended participants are forbidden. |
| Competing buyers | Pending offers do not reserve inventory. First atomic successful acceptance or buy-now reservation wins. Others see unavailable; no identity or private offer price is revealed. |
| Acceptance | Creates an awaiting-payment order with immutable accepted price and a 30-minute exclusive reservation. Other pending offers expire with a reason. Acceptance itself is not payment or completion. |
| Buy now | At Pay, create an awaiting-payment order and 15-minute reservation after validating quote and price. No further seller acceptance is needed. |
| Unpaid expiry | If no unknown/in-flight payment exists, cancel the unpaid order, release reservation, return listing active. The accepted offer remains historical and is not reusable. |
| Unknown payment at expiry | Keep inventory unavailable in a reconciliation hold. Resolve provider status before release; alert operations after 15 minutes unknown, escalate after 24 hours. Time alone must not permit double-selling. |
| Editing while negotiating | Material edit invalidates pending proposals. Reserved/paid listing cannot be edited. Existing order snapshots never change. |

### 4.2 Cancellation, delivery and payout

| Question | V1 rule |
| --- | --- |
| Can sellers cancel after a sale? | Before courier pickup, yes through a reasoned cancellation that triggers full buyer refund. Two seller-caused cancellations in 30 days pause new selling pending review. After pickup, operations resolves through return/dispute. |
| Can buyers cancel? | Unpaid: cancel if no unknown payment. Paid but not Ready: buyer self-cancellation with full refund. Ready or in transit: request support; do not guarantee cancellation. |
| How quickly must seller act? | Seller must mark Ready within 48 hours of verified payment. Remind at 24 h and 40 h. At 48 h, server cancels/refunds if still not Ready and no recorded exception approved before deadline. |
| Who pays delivery? | Buyer pays the confirmed quote for the initial attempt. Seller sees the pickup obligation. No hidden fee is added after Pay. |
| What is the delivery promise? | Show provider/zone quote estimate, not the prototype's universal 2–4 day statement. One standard retry for address/contact failure; operations confirms revised timing. Non-delivery goes to investigation/return, not automatic completion. |
| What counts as delivery? | Courier-confirmed event with trusted proof/reference. Seller marking Ready or buyer silence never proves delivery. |
| Buyer does not confirm | After verified delivered_at + 48 hours, server completes if no open dispute or delivery exception. Notify on delivery and at 24 h; show exact deadline. If no reliable proof, hold and investigate instead. |
| When does seller get paid? | Eligible no earlier than 48 hours after verified delivery, after completion, with verified payout account, reconciled funds, no dispute/hold, and supported settlement arrangement. Queue next business day; show processing until provider confirms paid. |
| Buyer confirms early | Completes fulfilment view; does not shorten the 48-hour reporting/payout hold. |
| Payout fails | Funds stay payable in the ledger. Notify seller of actionable reason; operations verifies prior transfer before retry. Never mark paid on request acceptance alone. |

### 4.3 Disputes and refunds

Eligible reasons: non-delivery, wrong item, material mismatch with listing, undisclosed damage, or payment error. Buyer remorse and fit issues accurately disclosed in listing do not automatically qualify. Mandatory consumer rights, once confirmed for the operating model, take precedence over the product policy.

Report delivery/description problems within 48 hours of verified delivery; non-delivery can be reported whenever the quoted window is missed. Opening an eligible dispute freezes payout, even if the buyer previously tapped Confirm received. Operations aims to acknowledge within one business day and request evidence; this is a staffing target, not a promised legal resolution deadline. Require a reasoned decision and auditable evidence. Appeals remain available for seven days after resolution.

| Resolution | Buyer refund | Cost ownership and record |
| --- | --- | --- |
| Seller cancellation / item unavailable / no seller readiness | Full item + delivery + any buyer fees charged | Seller net becomes zero. Lebse absorbs unrecovered provider charges during pilot. |
| Buyer cancellation before Ready | Full amount paid | Pilot absorbs provider charges; no undisclosed cancellation deduction. |
| Wrong/not-as-described/damaged item upheld | Full amount paid after verified return, unless operations determines return unnecessary | Seller bears documented return delivery according to accepted policy; pilot may subsidize rather than create unapproved account debits. |
| Courier lost item | Full amount paid after investigation outcome | Lebse pursues carrier claim separately; seller compensation decision recorded independently. |
| Payment collected after cancellation / duplicate payment | Refund excess/unallocatable successful amount | Never allocate the same listing to another paid buyer. Create exception case and notify affected buyer. |
| Agreed partial refund | Only operations-approved amount with buyer's recorded agreement | Snapshot refund and remaining seller proceeds; total refunds cannot exceed captured amount. |
| Rejected dispute | No automatic refund; explain evidence and appeal | Resume normal completion/payout only when no hold remains. |

Refund to the original payment method where supported. A request accepted by the provider is “Refund processing”; only verified completion is “Refunded.” Do not promise a universal arrival date before partner timelines are confirmed. Chapa documents separate refund progress and non-refundable provider charges; the pilot subsidy is a Lebse policy choice. [Chapa refund documentation](https://developer.chapa.co/refund)

Returns have a case-specific deadline, default three calendar days to hand over after return instructions and five days for seller/operations receipt review. Missed deadlines trigger human review, not automatic forfeiture. Original sold listing is not silently relisted after a return; seller must review condition and create a new listing.

### 4.4 Permitted and prohibited items

V1 permits authentic, lawfully owned clothing, footwear, bags and accessories that can be safely reused; traditional and contemporary Ethiopian garments are included in clothing categories. Sellers must disclose flaws, actual condition, size and brand accurately, and use their own photos.

Prohibit counterfeits and misleading brand claims; stolen goods; weapons; drugs and regulated substances; explicit sexual goods; used underwear/intimate garments; unsafe, contaminated, recalled or severely damaged products; cosmetics and opened hygiene products; animals; services and digital goods; payment instruments; documents or identity credentials; items outside supported fashion categories. Luxury authenticity certification is not offered; suspect authenticity is reviewed or removed. Prohibited-item policy is versioned and visible before publish; enforcement includes report, removal reason, appeal and audited repeat-offender review.

### 4.5 Money and policy invariants

Buyer total = item amount + delivery + buyer fee − discount. Pilot buyer fee and discount are zero. Seller payable = item amount − seller commission − approved seller refund share; pilot commission is zero. Provider charges and pilot subsidies are separate accounting entries, never silently subtracted from the displayed seller net.

Order captures policy version, price and fees at commitment. Later changes apply only to future orders. Sum of successful refunds ≤ captured amount. A payout cannot exceed reconciled seller payable. One order has at most one allocated successful collection; extra successful attempts become refund exceptions. A listing has at most one current reservation or live paid sale. These are database constraints/transaction invariants, not client-side checks alone.

## 5 Data model

### 5.1 Conventions and relationships

IDs are UUIDs; timestamps are UTC timestamptz; money is integer minor units with currency=ETB. Enumerations are controlled values. Required fields below are mandatory unless marked optional, nullable, derived or conditional. Every mutable business record has created_at, updated_at and version where concurrency matters; event records are append-only. Server controls IDs, timestamps, ownership and derived state. Use explicit foreign keys and indexes. API responses expose purpose-specific projections rather than raw table rows.

User has one optional SellerProfile, many Listings, SavedItems, Notifications and Addresses. Listing has many ProductMedia and Offer versions. One Conversation joins buyer, seller and listing; it has members and Messages. Accepted Offer or Buy now creates an Order referencing one Listing and one Reservation. Order has many Payment attempts and events, one outward Delivery, optional return Delivery, Refunds, Disputes, one eligible buyer Review and seller Payout records. Payout ledger entries are independent of user-visible order labels.

### 5.2 Core objects

| Object | Fields and types | Constraints and visibility |
| --- | --- | --- |
| User | user_id UUID linked to auth; phone_e164 text unique in private identity; phone_verified_at timestamp nullable; display_name text 1–60; username normalized text 3–30 unique; avatar_asset_key text optional; city_code text; locale enum en/am; account_status active/restricted/closure_pending/closed; age_declaration_at timestamp; onboarding_completed_at timestamp nullable | Auth secrets/OTP remain with auth provider. Avatar uses a separately authorized avatar storage path, not a ProductMedia listing foreign key. Public projection only ID, display name, username, avatar, city and earned verification labels. Phone/account status are not public. |
| Listing | listing_id UUID; seller_id UUID; title text 5–80; category_id and optional subcategory_id; brand text 1–60; size_code text; measurements_cm optional JSON of validated chest/waist/length numeric values; color_codes text[]; condition like_new/good/fair; has_flaws boolean; flaws text conditional; description text 20–2000; price_minor bigint; currency ETB; allow_offers boolean; city_code and area_code; pickup_address_id UUID private; cover_media_id UUID; status draft/pending_review/active/paused/reserved/sold/archived/removed; published_at nullable; sold_at nullable; version integer; policy_version text | seller_id immutable. Price 5,000–5,000,000 minor units, divisible by 100 for pilot whole ETB. Active requires validated media and eligibility. Public location is coarse; pickup address private. Status transitions are server commands. |
| ProductMedia | media_id UUID; listing_id UUID; owner_id UUID; storage_key text; mime_type text; width/height integers; bytes integer; sort_order integer; alt_text text; is_flaw boolean; state uploading/processing/ready/rejected/deleted; content_hash text | Unique listing/order position; at least one cover belongs to same listing and is ready. 1–6 ready listing photos. Clean published derivatives public; original/private draft objects restricted. Strip EXIF location. |
| SellerProfile | seller_id UUID PK/FK User; bio text ≤300; pickup_address_id UUID; identity_status not_started/pending/verified/rejected/expired; payout_eligibility eligible/incomplete/held; rating_average/count and sold_count derived; selling_status enabled/paused/restricted; verification_case_id nullable | Only owner edits bio/pickup; trusted services update verification, eligibility and counts. Counts based on eligible real records. |
| Offer | offer_id UUID; negotiation_id UUID; previous_offer_id UUID nullable; listing_id; listing_version integer; buyer_id; seller_id; proposer_id; amount_minor; currency; sequence integer; status pending/accepted/declined/withdrawn/superseded/expired; expires_at; responded_at nullable; close_reason nullable; accepted_order_id UUID nullable | One pending proposal per negotiation; unique negotiation/sequence; proposer must be buyer or seller; receiver-only transitions. Accepted price snapshot is immutable. Participants and authorized support only. |
| Message | message_id UUID; conversation_id; sender_id UUID nullable for system; client_message_id UUID; kind text/offer/system/order; body text nullable; offer_id/order_id nullable; sent_at timestamp; moderation_status visible/hidden | Unique sender/client_message_id; text 1–2,000 characters. Immutable after send in V1. Members only; system events writable only by server. Never use message text as transaction authorization. |
| Order | order_id UUID; order_number unique text; buyer_id; seller_id; listing_id; accepted_offer_id nullable; listing_snapshot JSON with title/brand/size/condition/flaws/media IDs; item_minor; delivery_minor nullable before checkout; buyer_fee_minor; seller_commission_minor; discount_minor; total_minor nullable before checkout; seller_net_minor; currency; policy_version; address_snapshot private JSON nullable before checkout; quote_id nullable before checkout; pricing_complete boolean; state awaiting_payment/paid/preparing/ready/in_transit/delivered/completed/cancelled/returned; resolution_status none/open/return_required/resolved; paid_at/ready_at/delivered_at/completed_at/cancelled_at nullable; buyer_confirmed_at nullable; cancel_reason nullable; version | Buyer≠seller. Accepted-offer order can exist before buyer supplies address/quote. Item price is fixed at reservation; delivery and final total are completed in B01. Payment initialization requires pricing_complete=true and all checkout fields, then freezes the complete snapshot. Fulfilment, payment, resolution and payout are distinct dimensions. Participant projections protect address and payout information. |
| Payment | payment_id UUID; order_id; attempt_number integer; provider; merchant_tx_ref unique; provider_ref nullable; requested_minor; captured_minor; currency; method_code nullable; state initialized/pending/succeeded/failed/cancelled/unknown; allocation_status unallocated/allocated/excess/refund_required; checkout_url optional short-lived; idempotency_key; verified_at nullable; failure_code nullable; mode test/live | Unique order/attempt and provider/reference. At most one allocated collection per order. Client cannot write status/amount/ref. Never store card PIN, wallet PIN, CVV or OTP. |
| Delivery | delivery_id UUID; order_id; direction outbound/return; courier_id nullable; provider_reference nullable; status awaiting_assignment/awaiting_pickup/picked_up/in_transit/delivered/failed/returning/returned/cancelled; quote_id; promised_from/to nullable; pickup_at/delivered_at nullable; proof_storage_key private nullable; event_version | One active outbound delivery per order; return linked to Dispute. Trusted courier/operations confirms events. Public/other users cannot read precise addresses. |
| Review | review_id UUID; order_id unique; reviewer_id buyer; seller_id; rating integer 1–5; comment optional text ≤1000; status published/hidden; submitted_at; moderation_reason nullable | Completed eligible paid order only; reviewer≠seller; 14-day window. Aggregate excludes hidden/refunded-ineligible reviews. Public review projection does not expose private order data. |
| SavedItem | user_id UUID; listing_id UUID; created_at | Composite primary key user/listing; owner-only. Removed listing can remain as minimal tombstone until user removes save. |
| Notification | notification_id UUID; user_id; event_key unique per recipient; type enum; target_type; target_id; title_key/body_key plus safe template arguments; read_at nullable; delivery_status queued/sent/failed/skipped; created_at | Owner-only. Deep link rechecks authorization. Push payload excludes chat body, precise address, payment credentials and identity details. |

### 5.3 Additional required records

| Object | Fields | Why it is needed |
| --- | --- | --- |
| Address | address_id, user_id, kind pickup/delivery, recipient_name, phone, zone_id, street, landmark, archived_at | Private reusable addresses; snapshots protect active orders from edits. |
| Follow | follower_id, seller_id, created_at; unique pair | Following feed without inventing personalization. |
| Conversation | conversation_id, buyer_id, seller_id, listing_id, created_at; unique buyer/seller/listing | Keeps negotiations and text in a single context. |
| ConversationMember | conversation_id, user_id, last_read_message_id/time, muted_until optional | Owner read cursor and unread counts; membership authorization. |
| Reservation | reservation_id, listing_id, buyer_id, order_id, reason buy_now/offer, expires_at, state active/consumed/released/reconciliation_hold | Exclusive inventory lock with deterministic expiry and payment ambiguity handling. Partial unique active/hold reservation per listing. |
| DeliveryQuote | quote_id, zone_from/to, fee_minor, currency, estimate_window, expires_at, provider/config version | Server-owned delivery calculation and fee snapshot. Default quote validity 15 minutes. |
| PaymentEvent | event_id, provider_event_key, payment/refund/payout reference, received_at, verified_at, payload_hash, processing_state, safe error, restricted raw payload reference | Durable webhook inbox, deduplication, out-of-order reconciliation and audit. |
| Refund | refund_id, payment_id, order_id, dispute_id optional, amount_minor, reason, merchant_reference unique, provider_ref, status requested/processing/completed/failed, approved_by, completed_at | Refund progress is separate from collection success. Sum capped under transaction lock. |
| Payout | payout_id, order_id, seller_id, payout_account_version_id, amount_minor, eligible_at, status pending/held/queued/processing/paid/failed, hold_reason, merchant_reference, provider_ref, paid_at | Seller status and transfer retry without duplicating money. Unique active payable per order; attempt records are separate append-only children. |
| PayoutAccount | account_version_id, seller_id, provider, bank/destination code, token or encrypted identifier, masked_identifier, legal_name, verification_status, verified_at, active_from | Private payment destination; changes require new version, no overwriting in-flight destination. |
| LedgerTransaction / LedgerEntry | transaction_id, event_key unique, timestamp; entries with ledger_account_id, debit_minor, credit_minor, currency, order/refund/payout references | Balanced double-entry record for cash/clearing, seller payable, fees, subsidies, delivery and refund obligations. No client access. |
| Dispute | dispute_id, order_id, raised_by, reason, description, opened_at, status open/evidence_needed/return_required/resolved/appealed, resolution, approved_refund_minor, deadlines, assigned_operator | Pauses payout and records human resolution. One unresolved case per order; repeated submissions append evidence. |
| VerificationCase | case_id, seller_id, provider_ref optional, private evidence refs, status, submitted_at, reviewed_at, reviewer, reason, retention_delete_at | Exact basis for eligibility and bounded identity retention. |
| Report / Block | report_id, reporter_id, resource_type/id, reason, private snapshot, state; blocker_id, blocked_id, created_at | Content safety and member interaction restrictions. |
| DeviceToken / Preferences | token_id, user_id, platform, encrypted push token, validity; locale and push/chat preferences | Device-aware delivery, token revocation, language choice. |
| OrderEvent / AuditEvent | event_id, entity ID, transition/action, actor/service, reason, occurred_at, correlation_id, prior/new safe values | Timeline evidence, staff accountability and recovery. No sensitive full payload in general logs. |
| OutboxEvent / Job | event_id unique, aggregate/version, type, safe payload, next_attempt_at, attempts, state | Transactional notifications, expiries and provider work survive crashes. |
| PolicyAcceptance / ClosureRequest / RecoveryCase | actor/account, policy versions and accepted_at; case ID, verified contact, state, deadlines | Proves product agreement and supports account lifecycle without erasing financial obligations. |
| Taxonomy / DeliveryZone / PolicyConfig | versioned category-size mappings, supported zones/rates, policy limits and effective date | Shared validation; no hardcoded prototype list used as live business policy. |

AuthChallenge is provider-backed challenge metadata: challenge_id, masked destination, expires_at, resend_after, attempts_remaining; the code itself is never persisted by Lebse. DeviceSession references the auth provider's session_id, user_id, platform, last_seen_at and revoked_at; auth tokens are not copied into public application tables. FilterState is client/route data, not a user-tracking table: query, category, brand, sizes, conditions, colors, minimum/maximum price, area, sort and cursor.

SupportCase stores case_id, user_id, order_id optional, category, subject, status, assigned_operator, created_at and resolved_at. SupportMessage stores case_id, author_id/role, body, private evidence references and sent_at; only the case owner and assigned support can read it. Disputes and recovery cases link to this thread rather than giving staff access to unrelated marketplace chats. PayoutAttempt and RefundAttempt store attempt_id, logical parent ID, unique merchant reference, provider reference, amount, destination version where relevant, state, requested_at, verified_at and safe failure code. A retry creates a new attempt only after reconciliation proves the previous attempt did not complete.

### 5.4 Example listing payload

This is an illustrative API representation. “media” is a joined projection from ProductMedia, not a second unsynchronized source of truth. Internal price uses minor units; display formatting produces 1,450 ETB.

```json
{
  "listing_id": "8c3c4e41-90fa-4236-93ab-4c7c0ffce584",
  "seller_id": "1b5a3f0d-5095-4d78-9475-d0f9472bcf35",
  "title": "Cream linen shirt",
  "category_id": "tops",
  "brand": "Unbranded",
  "size_code": "M",
  "color_codes": ["cream"],
  "condition": "good",
  "has_flaws": true,
  "flaws": "Small repaired seam inside the left cuff, shown in photo 3.",
  "description": "Relaxed fit with a 54 cm chest width laid flat. Washed and ready to wear.",
  "price_minor": 145000,
  "currency": "ETB",
  "allow_offers": true,
  "location": {"city_code": "addis_ababa", "area_code": "bole"},
  "media": [
    {"media_id": "067ad396-9ea6-42cf-bf60-50b8d232328b", "sort_order": 0, "is_cover": true, "is_flaw": false},
    {"media_id": "e36aab53-8488-481c-aa72-9e83715306bc", "sort_order": 1, "is_cover": false, "is_flaw": false},
    {"media_id": "b46b8245-9e38-40b8-ac3c-41317c980c73", "sort_order": 2, "is_cover": false, "is_flaw": true}
  ],
  "status": "active",
  "version": 1,
  "created_at": "2026-09-08T14:00:00Z"
}
```

The third photo is marked as flaw evidence. Precise pickup address and original storage keys are omitted from the public payload.

### 5.5 Access and retention

| Data | Who can read | Who can change |
| --- | --- | --- |
| Active listing/public profile/eligible reviews | Everyone; sold visibility follows screen policy | Owner commands for allowed fields; moderation service for status |
| Drafts, original media, private addresses, saves | Owner; specifically authorized support where required | Owner with row ownership and field validation |
| Conversation/messages/offers | Two participants and support only when investigating | Participants through member-checked commands; system messages server-only |
| Orders | Buyer/seller with different projections; assigned delivery operations | Server state machine and constrained actor commands |
| Payments/refunds/payout ledger | Restricted service/finance; sanitized status to participants | Verified provider adapter and audited operations workflow |
| Identity and payout credentials | Verification/finance roles and scoped provider | Secure workflow only; not general support or public storage |
| Notifications/device tokens | Owner and delivery service | Owner read/preferences; server notification content |

Retention baseline for implementation: delete abandoned upload objects after 24 h; abandoned drafts after 90 days with notice; private raw identity evidence 30 days after final review unless a documented case requires a hold; operational logs 30 days and minimized audit records under the approved retention schedule. Financial/order/tax retention periods and cross-border data hosting must be confirmed for the actual Ethiopian operating entity before live launch. Record per-data-class retention and legal holds rather than promising a blanket deletion time. These unresolved legal durations do not justify retaining every field indefinitely.

## 6 State machines and backend command contracts

### 6.1 Core transaction flow

Seller saves draft → validates media and eligibility → publishes active listing → buyer sees database-backed feed → buyer opens current listing → buyer offers or buys → accepted offer/buy-now reserves one piece and creates awaiting-payment order → provider receives payment → verified server event allocates payment and marks listing sold → seller prepares and marks ready → courier confirms pickup/delivery → buyer confirms or 48-hour timer completes → eligible review and provider-backed seller payout.

Seller acceptance is required only for negotiated proposals. At asking price, publishing an active listing enables Buy now. Creating an unpaid order before payment is necessary to give every payment attempt an immutable amount and order reference.

### 6.2 Transition ownership

| Aggregate | Allowed progression | Authority |
| --- | --- | --- |
| Listing | draft → pending_review or active; active ↔ paused; active → reserved → sold; expired unpaid reservation → active; eligible active/paused → archived; moderation → removed | Seller publish/manage commands, transaction service, moderation |
| Offer | pending → accepted/declined/withdrawn/superseded/expired; terminal statuses never revived | Authorized participant or expiry job; atomic current-version check |
| Reservation | active → consumed/released/reconciliation_hold; hold → consumed/released after reconciliation | Transaction service only |
| Payment | initialized → pending/unknown → succeeded/failed/cancelled; verified later facts can resolve unknown; succeeded never overwritten by an older failed callback | Provider verification adapter; refunds tracked separately |
| Order | awaiting_payment → paid → preparing → ready → in_transit → delivered → completed; pre-pickup cancellation → cancelled; approved return → returned | Payment service, seller commands, courier/operations, completion job |
| Resolution | none → open → return_required/resolved; appeal reopens hold under operations review | Dispute service and operations |
| Refund | requested → processing → completed/failed; failed retry is a new attempt on same logical refund | Finance adapter; unique reference and amount cap |
| Payout | pending → held or queued → processing → paid/failed; held → pending only after reason clears | Payout service; verified provider transfer result |

### 6.3 Service commands

These names are internal command contracts, not provider API endpoint names. All commands require authenticated actor where relevant, validated payload, correlation ID, idempotency key for mutations, and a typed result. Authorization is server-side. Return current resource version and allowed actions after success.

| Command | Inputs | Atomic result and side effects | Key rejection |
| --- | --- | --- | --- |
| publishListing | draft ID/version | Validate media/eligibility; active listing; outbox event | incomplete, not_owner, verification_required, unsupported_zone |
| updateListing | ID/version/allowed fields/offer-invalidation confirmation | Save new version; close affected offers; notifications | version_conflict, reserved, sold |
| setSaved / setFollow | target ID, desired boolean | Unique owner relation insert/delete; safe retry | unavailable, blocked |
| sendMessage | conversation ID, client_message_id, text | Durable Message; update preview; outbox | not_member, blocked, rate_limited |
| proposeOffer | listing/version, amount, previous_offer_id optional | New Offer; supersede previous; system Message; Notification | stale, invalid_amount, cap_reached |
| acceptOffer | offer ID/version | Lock listing; mark accepted; create one Order/Reservation; expire competitors; outbox | expired, not_receiver, already_reserved |
| decline / withdrawOffer | current offer ID/version, reason optional | Terminal status; system Message | stale, wrong_actor |
| quoteDelivery | owned address IDs, listing | DeliveryQuote with fee/expiry | unsupported_zone, address_invalid |
| startCheckout | listing/version or reserved order ID, address ID, quote ID, expected total, payment method | Lock availability; create/reuse Order and Reservation; enqueue payment initialization with unique reference | price_changed, quote_expired, payment_unknown |
| verifyPayment | owned order ID | Reconcile provider reference; allocate at most one successful payment; update Order/Listing/outbox | mismatch, still_pending, excess_payment |
| cancelOrder | order/version, actor reason | Validate pickup/state; cancel; release safe reservation or request refund; events | already_picked_up, payment_unknown |
| startPreparing / markReady | owned paid order/version | Valid next state and event; delivery/outbox | unpaid, cancelled, already_transitioned |
| recordDeliveryEvent | order/delivery, source reference, event/proof | Validate source/order progression; durable event and status | unauthorized_source, stale_event, missing_proof |
| confirmReceipt | buyer/order/version | Record confirmation; complete only with delivery proof; preserve hold deadline | no_delivery_evidence, not_buyer |
| openDispute | owned order, reason, evidence refs | Case + payout hold + notification | duplicate_case, expired_window, wrong_actor |
| resolveDispute | case/version, outcome, amount, reason | Resolution and refund/return command; audited | forbidden_role, amount_exceeds_capture |
| submitReview | owned completed order, rating/comment | Unique Review; aggregate update; outbox | ineligible, duplicate, window_expired |
| releasePayout | order/ledger reference, verified account version | Lock eligibility; create unique logical Payout; enqueue transfer | open_dispute, unreconciled, hold_not_elapsed |

### 6.4 Concurrency, crashes and webhook handling

1. Reserve under a database transaction and row lock; enforce uniqueness in the database. Two browsers accepting or paying simultaneously cannot both reserve the listing.
2. Persist the order and payment-initialization job before calling the provider. Provider calls cannot be inside a long database transaction. A worker retries safely by reference and reconciles uncertain responses before issuing another collection request.
3. Webhook handler verifies origin, durably stores the event and acknowledges accepted receipt. A worker re-verifies transaction status, amount, currency, expected reference and test/live mode before allocation. Chapa documents independent verification and idempotent handling. [Chapa webhooks](https://developer.chapa.co/integrations/webhooks)
4. Store event dedupe keys. Out-of-order/duplicate callbacks are harmless. An old failure cannot overwrite a verified success. Excess or mismatched payment opens finance review/refund workflow and never authorizes fulfilment.
5. Expiry and payment workers take the same order/listing locks. Unknown payments block inventory release until resolved. A late success after cancellation is refunded; it does not recreate a cancelled order or steal a new buyer's reservation.
6. Write notification/outbox events in the same transaction as domain changes. Retriable workers deliver chat updates, notifications, timeouts and payout work. A dropped push must not affect the order state.
7. Payout eligibility and dispute creation lock the same order/payable record. New dispute within the window wins before release; once a provider transfer is in flight, operations applies a separate recovery hold and cannot pretend to retract a completed transfer.
8. Run payment/refund/payout reconciliation every five minutes for pending attempts, with a nightly ledger comparison and exception queue. Operational schedules are configurable; every job can resume after downtime without duplicate side effects.

## 7 Technical architecture

### 7.1 Selected direction

| Layer | Selection | Rationale and implementation boundary |
| --- | --- | --- |
| Mobile | React Native + Expo + TypeScript + Expo Router | One Android/iOS application with native media, navigation and notifications. Expo documents a shared Android/iOS/web model. This choice does not make existing DOM/CSS components native automatically. [Expo introduction](https://docs.expo.dev/tutorial/introduction/) |
| Design system | Shared token/format/validation package; native UI primitives for mobile; existing React web components remain the reference implementation | Reuse contracts and visual values. Port layout to native components; do not embed the entire prototype in a WebView. |
| Backend | Supabase-hosted PostgreSQL plus TypeScript server functions and SQL transaction functions for domain commands | Relational offers/orders/payment constraints and auditable transactions fit PostgreSQL. Avoid client-managed state transitions. |
| Database access | Explicit exposed read projections, row-level security, narrow command endpoints | Supabase RLS can restrict rows by ownership; policies must exist for every exposed table and storage use case. Public keys are not secret authorization. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Authentication | Supabase Auth phone OTP with supported SMS provider; initially evaluate Twilio and local delivery route options | Supabase phone login requires an SMS provider. Ethiopian delivery reliability/cost, sender registration, abuse controls and recovery must be tested; no automatic assumption of coverage. [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login) |
| Photos | Supabase Storage with direct authorized upload, image processing and published derivatives | Separate public listing derivatives from private originals, identity and dispute evidence. Policies restrict bucket/object access. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) |
| Video | Deferred | Keep schema extensible but do not ship unused recorder/transcoding controls. |
| Chat | Durable PostgreSQL Message rows plus Supabase Realtime private/member-authorized updates | Realtime transports updates; the database stores history and read cursors. Private-channel and row access must both be enforced. [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) |
| Payments | Chapa hosted checkout behind a provider adapter | Server initializes checkout and receives a checkout URL. Credentials stay server-side; browser return only resumes status check. [Chapa accept payment](https://developer.chapa.co/integrations/accept-payments) |
| Payouts | Provider transfer adapter with verification and internal ledger | Chapa documents bank transfers and approval/status steps; transfer availability alone does not establish a marketplace fund-holding arrangement. [Chapa transfers](https://developer.chapa.co/transfer/transfers) |
| Notifications | Database Notification inbox + Expo push service on mobile | Expo supports Android/iOS push; setup requires platform credentials and development builds. In-app inbox is canonical. [Expo push overview](https://docs.expo.dev/push-notifications/overview/) · [Push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) |
| Search | PostgreSQL normalized fields, indexed category/price/location, trigram matching where appropriate | No external search cluster in V1. Support Unicode queries; test Amharic literal/partial matches and do not promise English stemming for Amharic. |
| Client data | Query cache for server records, typed API client, secure session storage; local draft persistence | Optimistic saves/follows; authoritative server offers/orders; explicit failed-message retry. No real financial state in localStorage. |
| Jobs | Database-backed outbox and scheduled workers | Expiry, reminders, image cleanup, completion, reconciliation, payout. Work is idempotent and observable. |
| Operations | Restricted React web console | Role-gated moderation, verification, courier updates and finance/support queues; staff MFA and action audit. |
| Analytics | First-party event collector and aggregated PostgreSQL reporting in V1 | Minimal funnel events; no chat bodies, identity documents or addresses. External session replay is deferred. |
| Error monitoring | Structured redacted server/client errors with correlation IDs and operations alerts | Separate technical errors from product analytics; never log secrets or full provider payloads to general logs. |

### 7.2 Architecture boundary and repository layout

Mobile clients and the existing web reference call the same typed domain API. API authenticates the actor, checks permitted actions, and delegates transactional changes to PostgreSQL. Media goes directly to storage using short-lived scoped upload authorization. Provider webhooks enter a separate authenticated-by-signature endpoint, then the durable event inbox. Workers perform external side effects and update the database. Realtime/push notify clients to refresh authoritative records.

```text
apps/mobile         Expo app and feature screens
apps/admin          Restricted operations console
apps/web-reference  Existing React prototype and browser design reference
packages/tokens     Colors typography spacing motion semantic values
packages/domain     Types validators formatters action and error contracts
packages/api-client Typed transport and query helpers
supabase            Versioned schema policies functions and seed fixtures
services/workers    Provider adapters outbox jobs reconciliation
tests               Access control transitions concurrency and end-to-end flows
```

Separate development, staging and production projects, storage buckets, keys and payment modes. Pin versions and commit lockfiles when implementation begins. Use staging migrations and rollback/forward-fix plans; destructive migrations require data backup and a verified restore. Backup frequency/recovery capacity must match expected order volume and be tested before launch.

### 7.3 Provider and launch gates

| Gate | Evidence needed before enabling live behavior | Work that can proceed now |
| --- | --- | --- |
| Marketplace payment/settlement | Written confirmation of supported marketplace model, seller onboarding, fund custody/delayed settlement, refunds, payout funding, fees and chargeback responsibility | Adapter interface, sandbox flow, ledger and state-machine tests |
| Methods | Merchant account confirms Telebirr/CBE Birr and tested refund/payout behavior; UI reads enabled methods | Hosted-checkout flow and pending/success/failure designs |
| SMS | Successful OTP testing on intended Ethiopian networks, delivery/cost/rate-limit agreement and account recovery procedure | Phone/OTP UX and provider abstraction |
| Delivery | Supported zones, quote table, staffing/courier workflow, proof of delivery, failed-attempt and return handling | Admin workflow and delivery state machine |
| Identity/privacy | Verification operator/provider, exact required evidence, access roles, retention, data-region/cross-border review | Separate eligibility states and private evidence access design |
| Product/legal policy | Actual operating entity's terms, consumer/refund rules, prohibited categories, tax/record retention and 18+ approach reviewed | Proposed rules and versioned policy acceptance |
| Operations | Named support/finance/moderation owners, refund funding, business calendar and escalation coverage | Queues, permission matrix and runbooks |
| Language and mobile release | Human Amharic QA, physical-device accessibility/performance checks, app-store accounts and policies | Shared native app and localized message keys |

Chapa's published method list includes Telebirr and CBE Birr, but listing a method does not confirm this marketplace's merchant approval or settlement contract. [Supported payment methods](https://developer.chapa.co/payment-methods)

If delayed seller payout cannot be supported by the approved partner/operating model, the product cannot quietly promise a 48-hour protection hold. Resolve the partner model or revise the checkout/payout policy explicitly before live payments. Do not implement a home-grown escrow wallet as a workaround.

## 8 Backend-first implementation plan

### Phase 0 Specification and contracts

Deliver this baseline, component/state inventory, screen map, data dictionary, API command contracts and provider gates. Add change log entries for scope changes. No cloud database or payment account has been created by this specification.

### Phase 1 Shared components and missing-screen layouts

Consolidate the component families in section 2 and create a component gallery covering all states. Implement the missing screens using domain-shaped fixtures and explicit demo mode. Build priority: A01–A03; E02/E03; O01–O03 and M01/M02; B02/B03; R01–R03; N01/U02/V01/V02; K01/K02/S01–S04; X01–X03. Existing eight screens inherit the same components. Do not expand live transaction behavior until phase 2 has passed.

### Phase 2 Database and core loop

Create versioned schema, ownership policies and storage policies; seed two buyer/seller test identities; implement listing publication, discovery, current listing fetch, offers/counters, atomic reservations/orders, sandbox payment verification, fulfilment events, completion and ledger/payout eligibility. Build the operations controls necessary to advance delivery using trusted evidence. The first end-to-end test must use two separate authenticated sessions and real database records.

### Phase 3 Replace the prototype data

| Prototype source | Production replacement | Migration behavior |
| --- | --- | --- |
| Hardcoded products | Paginated active Listing read API | Do not upload sample brands/images as real seller stock. Seed fixtures only in test environments. |
| Seller names and fake ratings | Public user/seller projection and eligible Review aggregate | New sellers show zero history. |
| Local saved IDs/follow arrays | SavedItem and Follow relations | If importing demo selections, ask in the app and map only valid IDs; never treat local demo IDs as production IDs. |
| Inline photo Data URLs | ProductMedia/storage upload workflow | Local drafts can be offered for review; do not auto-publish or transmit them. |
| Demo orders | Order/Payment/Delivery APIs | Demo orders are never migrated as paid orders. |
| Local success transitions | Typed commands and server allowed_actions | Pending states remain visible until acknowledged. |
| Placeholder verification | Actual eligibility records | Remove synthetic checkmarks. |

Add query invalidation after mutations, paging, reconnect recovery, safe session refresh, accessible form errors and image retry. Backend IDs appear in native routes and share links. App restart on a product/order opens the correct database record; never default to the first sample product.

### Phase 4 Marketplace operations and hardening

Connect notifications, chat reconciliation, refunds, returns, payout status, moderation and verification. Exercise support queues, missed jobs, late payments, denied media access, provider downtime and account closure. Run staging rehearsals of payout/refund reconciliation, backups and incident handling. Confirm launch gates and operating budget before enabling live money.

### Phase 5 Closed pilot then public V1

Release to a small invited cohort within staffed zones; monitor the transaction funnel and exceptions daily. Move to public V1 only after the acceptance matrix passes, provider and policy gates close, and English/Amharic mobile flows are reviewed. No calendar estimate is committed without team capacity and partner lead times.

## 9 Acceptance tests and quality bar

| ID | Scenario | Required observable result |
| --- | --- | --- |
| QA01 | Guest saves then signs in | Returns to the same valid piece; one save exists; no payment action replays. |
| QA02 | Wrong/expired OTP, resend, network timeout | Clear error and retry time; no account enumeration, duplicate session or lost safe intent. |
| QA03 | Publish with valid photos and eligibility | Exactly one active listing appears in another user's feed and seller closet. |
| QA04 | Invalid media, flaws without evidence, bad price | Publish blocked at correct field; valid draft survives; failed file alone can retry. |
| QA05 | Edit a listing with open proposals | User sees invalidation warning; confirmed edit updates version and closes affected offers. |
| QA06 | Search plus filters then Home | Results match displayed criteria; Home has no hidden search filter; pagination has no duplicates. |
| QA07 | Save/follow on two devices | Relations persist and both sessions converge; unsave has no duplicate leftover row. |
| QA08 | Offer/counter/accept | Latest receiver only can act; accepted price creates one reserved unpaid order; old card cannot execute. |
| QA09 | Two buyers reserve simultaneously | One success, one unavailable; database proves no double reservation/sale. |
| QA10 | Offer expires during tap | Server rejects stale acceptance and UI shows expired with valid next action. |
| QA11 | Payment callbacks duplicated/out of order | One allocation, one paid transition, one seller notification; old failure does not regress success. |
| QA12 | Wrong amount/currency/mode/reference or invalid signature | No paid order, no fulfilment; rejected/quarantined event visible to operations. |
| QA13 | Provider timeout, app closes, late payment after cancellation | Unknown blocks unsafe retry; reopening shows authoritative status; late unallocatable success enters refund path. |
| QA14 | Seller misses Ready deadline | One cancellation/refund request and notification; listing never remains a hidden paid obligation. |
| QA15 | Seller attempts to mark delivered | Authorization denies it; only trusted delivery evidence advances timeline. |
| QA16 | Buyer silent or confirms early | Completion follows evidence and rules; payout never precedes 48-hour hold; no-proof order stays held. |
| QA17 | Dispute arrives while payout job runs | Transaction lock ensures eligible hold prevents release; documented exception path if transfer already sent. |
| QA18 | Refund/payout worker retries or crashes | No duplicate transfer/refund; pending and completed distinguish request from verified outcome. |
| QA19 | User guesses another order/chat/evidence ID | No private data returned via API, storage, realtime, notification link or export. |
| QA20 | Block chat participant during an order | New chat/offers stopped; tracking and support remain; no silent cancellation. |
| QA21 | Review duplicate, self-review, unpaid or refunded order | Ineligible writes rejected; real aggregate stays correct. |
| QA22 | Native back, sheet dismissal, keyboard, screen reader | Focus/route restored; no background interaction or hidden primary CTA; fields retain values. |
| QA23 | Loading, offline, empty, sold, removed | Correct distinct state and actionable recovery; no blank screen or misleading Buy button. |
| QA24 | Closure with active obligations | New activity disabled, case retained, sessions/permissions controlled; no premature erasure of open orders. |
| QA25 | Provider integration recovery and backups | Reconciliation recovers missed event; restore rehearsal recovers a consistent ledger and order state. |

Performance targets on a representative midrange Android device and throttled mobile network: meaningful cached Home within 1 second; first usable uncached feed within 3 seconds under the agreed test profile; API p95 reads below 700 ms excluding media/provider latency; primary local tap response within 100 ms; no full-size original photo downloads in the product grid. Record test network and device with results; these are engineering goals, not measured performance of the current prototype.

Accessibility: 44×44 minimum targets, text scaling to 200% without lost actions, sufficient contrast, label/role/state on controls, keyboard access for web console/reference, screen-reader order, focus restoration, readable Amharic fallback, reduced motion, and no solely color-coded state. Mobile viewport coverage 320, 390 and 430 px; tablet/desktop reference checks at 768 and 1440 px.

### 9.1 Analytics events

Required events: signup_started/completed; listing_draft_started/published; search_submitted (query length/category, not raw text); listing_viewed; saved_toggled; conversation_started; offer_sent/countered/accepted/expired; checkout_started; payment_verified/failed/unknown; order_ready/delivered/completed/cancelled; dispute_opened/resolved; refund_completed; payout_completed/failed; review_submitted. Use event_id, occurred_at, actor pseudonymous ID, resource IDs where authorized, app version, locale, source route and safe reason codes. Server emits money/status outcomes. Client emits interaction intent. Deduplicate and keep test-mode data out of live reporting.

## 10 Definition of ready for the next build

V1 scope, component contracts, action destinations, data fields, state ownership and transaction invariants are defined in this document. The next engineering milestone is the two-account database-backed core loop in sandbox, supported by the shared components and missing-screen layouts. Completion means a second device can discover and buy a seller's listing, both parties see the same order state, verified payment events are processed once, and completion/payout eligibility follow the rules.

The live-money gates remain partner agreement, SMS delivery verification, courier operations, identity/privacy setup, policy review, support ownership and mobile release checks. None has been silently treated as completed. Design/schema/sandbox work can proceed against the contracts now.

### 10.1 Specification coverage check

| Requested area | Location |
| --- | --- |
| Buyer and seller MVP scope | Section 1 |
| All requested reusable components | Section 2, including loading/empty/toast states |
| Missing MVP screens and every named action | Section 3, A01–ADM04 |
| Offer, cancellation, payout, dispute, delivery, prohibited-item and refund rules | Section 4 |
| All 12 requested objects and necessary supporting records | Section 5 |
| Backend core loop and safe state transitions | Section 6 |
| Cross-platform frontend, backend, database, storage, auth, push, payments, chat, analytics | Section 7 |
| Connecting polished UI to real database data | Section 8 |
| Testable completion criteria | Section 9 |

### 10.2 Evidence and source notes

The visual baseline is the existing Lebse prototype and the approved written cream/brown/terracotta identity. Provider documentation was checked on 8 September 2026. Sources support described platform capabilities; they do not prove Lebse has opened accounts, negotiated a contract, obtained approval or tested production integrations. Product-policy numbers and architecture selections are recommendations made in this specification.

Official references are linked at the relevant architecture/rule sections. Supabase's changelog was also inspected for planning context; exact SDK and service versions must be pinned and rechecked when implementation starts. [Supabase changelog](https://supabase.com/changelog)
