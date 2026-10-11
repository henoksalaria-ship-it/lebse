# First marketplace milestone

## Implemented locally

- New accounts must select Menswear, Womenswear, or Menswear & Womenswear.
- The preference is private, stored in the database, and editable in Profile.
- It does not represent gender identity or restrict browsing. Feed personalization is not implemented by this change.
- Existing accounts without a selection see the preference control; no selection is invented for them.
- Existing terms acceptance remains required; these are still draft legal documents.

## Verified

The onboarding integration test creates two independent accounts, publishes an uploaded-photo listing, finds it in the buyer's feed, saves it, sends a message to the seller, and restarts the database to check persistence. It also checks invalid interests, unauthenticated changes, and attempts to target another user's preference.

The existing marketplace, security, seller, experience, operations, delivery, mobile-origin and staging tests pass with the new preference field. The web build passes. The browser signup selector was checked interactively.

## Deployment and iOS work still required

- The Supabase Edge API still needs working authenticated account, listing, media, save, and messaging routes. Its unfinished backend forwarding is not replaced by this local milestone.
- The new onboarding-schema.sql is included in the Node staging migration sequence; it has not been applied to a hosted database here. Older checksum-tracked schema files were left unchanged.
- The iOS design preview remains separate from the functional web app. The Expo app is still a web wrapper; a native iOS account/listing experience has not been delivered.
- Email verification, recovery, two-factor authentication, native permission flows, and TestFlight/device validation remain required.
- No production deployment, real payment, or live user messaging was performed for these tests.

Next gate: implement the hosted authenticated core loop, then prove these same actions against staging before an iPhone build is described as ready.
