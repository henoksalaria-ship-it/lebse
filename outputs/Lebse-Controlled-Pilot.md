# Lebse — controlled pilot and account-security rollout

10 September 2026. Status: local rehearsal enabled; hosted/customer pilot not yet authorized for launch.

## Completed in this increment

- Operator-only encrypted database snapshots, using a separate AES-256-GCM key and unique files. Backups include uploaded media because this local build stores it in the database.
- Restore verification opens the decrypted snapshot in an isolated in-memory database. It does not overwrite the live database or export plaintext customer files.
- Operator-only monitoring reports review queues, courier exceptions, dispatch waiting more than five minutes, and payments pending more than fifteen minutes. Counts exclude customer content.
- Additional automated checks cover backup access control, restoration, authenticated encryption/tampering, and monitoring alerts.

These facilities run locally. Off-site backups, automatic scheduling, alerts to named responders, and production infrastructure still need hosting configuration. Encryption keys are not generated into source or sent to third parties.

## Required decisions

1. Confirm a dedicated Lebse hosting project. The connected account currently contains other applications, not a Lebse project; none were changed.
2. Confirm the production/staging region, domain, email sender and SMS provider supporting the intended Ethiopian recipients. Confirm costs before enabling services.
3. Name primary and backup reviewers, with their email addresses. No appointments, accounts or invitations have been fabricated or sent.
4. Supply the operating entity and reviewed legal/support contacts before using real customer data.

## Account-security implementation sequence

Use managed authentication once the dedicated project is selected. Supabase is a candidate, not yet connected to Lebse. Its current documentation supports [email/password recovery](https://supabase.com/docs/guides/auth/passwords) and [authenticator MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp). Availability of SMS delivery and sender configuration must be checked separately.

1. Configure staging Auth with confirmed email, an approved SMTP sender, restricted redirect URLs, rate limits and recovery templates. Test delivery, expiry, replay, account-enumeration resistance and session revocation after reset.
2. Configure phone verification through an approved SMS provider. Test Ethiopian numbers, resend limits, wrong-code lockouts and expiry. Do not mark an account verified using client-supplied flags.
3. Map validated provider identities to existing marketplace accounts through a reviewed migration. Never silently merge accounts by an unverified email or expose the local password/session tables to a data API.
4. Require enrolled authenticator MFA and verified assurance level on every administrative request. Assign individual server-managed roles; never trust editable profile metadata or a UI-only administrator flag. Remove the local shared operator key from hosted deployments.
5. Build recovery, verification and MFA UI against the configured service. Avoid fake success notices or local “verified” badges when no message has been delivered and validated.
6. Configure least-privilege database policies for buyer, seller and reviewer access; test ownership reassignment, direct API access and cross-account data access. Keep privileged transaction state changes server-controlled.
7. Put listing uploads through quarantine, decoding/re-encoding, metadata removal and size limits. Store dispute evidence privately with short-lived access. Local signature validation is not this complete pipeline.
8. Enable HTTPS/Secure cookies, protected secrets, encrypted backups, restore drills and alerts before inviting pilot users. The local production-startup guard remains in place.

This increment does not claim these managed account features are already enabled. Hosted authentication requires a real project and configured providers.

## Reviewer responsibilities

| Queue | Primary responsibility | Backup / escalation | Access required |
| --- | --- | --- | --- |
| Fraud alerts | Trust reviewer: examine transaction and listing evidence; record reason; approve or continue hold | Second reviewer for appeal or conflict of interest | Assigned cases and necessary evidence |
| Delivery disputes | Marketplace operations: obtain courier proof, arrange supported return, recommend refund | Payments approver for financial execution | Relevant order and evidence only |
| Appeals | Reviewer who did not make the original adverse decision | Operations lead | Case history and new evidence |
| Copyright | Rights-report reviewer: validate work, authority, listing and contact; apply reviewed notice process | Counsel for contested claims | Report and relevant public content |
| Privacy requests | Privacy lead: verify requester, document lawful retention, coordinate export/correction/erasure | Counsel for exceptions; engineering for fulfillment | Minimum necessary personal data |
| Operational alerts | On-call owner: triage downtime, pending money movement, failed jobs and backup failures | Technical backup owner | Operational metrics; privileged access only when required |

All named assignments are pending. Do not share one production administrator account. A reviewer must acknowledge the role, enroll MFA, complete training and demonstrate the relevant scenario before activation. Use separate financial approval for refunds/payouts in the real pilot. Local case approval does not transfer money or delete records.

Suggested pilot response targets, subject to staffing and legal review: urgent account/payment concern within one staffed hour; other reports by the next staffed business day. Publish actual coverage; do not promise 24/7 service without staffing. Applicable statutory response deadlines must be reviewed independently.

## Backup and monitoring runbook

Set `LEBSE_OPS_TOKEN` and `LEBSE_BACKUP_KEY` in the server process environment. The operator terminal needs the operator key; restore verification needs the backup key. The example file is not loaded automatically. Keep keys out of browser variables, source control, messages and screenshots.

```text
node scripts/operations.mjs backup
node scripts/operations.mjs verify-backup work/backups/RETURNED_FILENAME.enc
node scripts/operations.mjs monitor
```

`backup` requests a consistent snapshot through the running application's serialized work queue. Files are saved under `work/backups`; the response contains a filename, size and checksum, not backup contents. Do not open a second database process against the live data directory.

`verify-backup` authenticates and decrypts the snapshot, opens an isolated database, checks core table counts, and closes it. Successful verification is not a production disaster-recovery switch. A real restore needs the service stopped, a new target directory, session invalidation and an approved cutover procedure.

`monitor` performs one check and exits with code 2 when attention is needed, 0 when clear, and a nonzero error on failure. It does not continuously watch or contact anyone. In hosted staging, schedule checks and route alerts to the named on-call owner. Do not leave a shared operator key in a public health probe.

Before a customer pilot: agree retention and recovery objectives, store encrypted copies off the host, separate key custody, automate daily snapshots, alert on a missed snapshot, and perform a recovery drill. No off-site destination or automatic schedule has been configured in this increment.

## Controlled pilot gates and scenarios

Start with internal test accounts and fictional data. Move to a small invited cohort only after hosted authentication, providers, staffing and legal gates pass. An initial ten buyers/five sellers is a proposed operational limit, not a configured admission restriction.

| Scenario | Expected outcome | Current evidence |
| --- | --- | --- |
| Purchase and simultaneous buyers | One reservation/payment allocation; correct server total | Automated local integration |
| Declined and pending payment | Safe retry after decline; no second charge while pending | Automated local integration |
| Lost courier response | Find original booking by reference instead of booking again | Automated fault simulation |
| Increased fare | Stop dispatch; do not silently charge more | Automated fault simulation |
| Forged/duplicate/out-of-order delivery event | Reject forgery; deduplicate; preserve monotonic progress | Automated signed test events |
| Failed cancellation | Keep order open until courier confirms cancellation | Automated fault simulation |
| Buyer dispute and appeal | Hold progression/payout; restricted review; recorded response; reopen available | Automated local integration |
| Refund | Record test refund on eligible cancellation | Local test ledger only; real refund untested |
| Payout | Preserve holds and prevent real transfer | No payout provider connected; successful real payout NOT tested |
| Backup loss/recovery | Restore encrypted snapshot in isolation; reject wrong key/tampering | Automated restore drill |
| Monitoring | Show stale payment/delivery and review work without exposing customer data | Automated local checks |
| Verified email/phone, password recovery, administrator MFA | Provider proves identity/assurance; expiry/replay/abuse checks pass | BLOCKED on service setup |
| Real delivery, refund and seller payout | Provider sandbox and then controlled live reconciliation | BLOCKED on provider contracts/configuration |

Stop the pilot immediately for cross-account data exposure, unexplained money mismatch, unauthorized administrative access, missing backups or unhandled delivery/payment ambiguity. Keep listings/checkout closed to new transactions while investigating; retain evidence and notify the assigned incident lead. Never mark the pilot successful based only on frontend appearance or the local simulations.

## Acceptance for wider release

Named reviewers and backup coverage; verified managed accounts; enforced administrator MFA; tested database/storage policies; successful off-site restore; monitored payment/courier reconciliation; approved privacy/terms; real refund and payout sandbox evidence; a signed pilot report with no unresolved critical incidents. These remain launch gates, not completed claims.
