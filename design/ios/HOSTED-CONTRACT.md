# Hosted beta contract

Hosted clients use Supabase Auth (email/password, confirmation, recovery, TOTP MFA) and send its access token as `Authorization: Bearer ...`. There is no custom hosted password/session endpoint. API base is `/functions/v1/api` on Supabase, proxied as `/api` on Vercel. Responses are JSON; errors are `{error,code}` with non-2xx status. No privileged keys in clients.

All ids are strings; prices are whole ETB 50–50000. `shopping_interest` is `menswear|womenswear|both`. Profile: `{id,name,username,bio,city}`. Listing: `{id,seller_id,title,description,price,category,brand,size,color,condition,flaws,city,status,version,media_ids,images,created_at}`. Status is `draft|active|sold|archived`. Images are resolved read URLs; clients never assume public storage. Categories: Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories. Conditions: New with tags, Like new, Good, Fair. Public profile reads never include private preferences/email.

- `GET /health`: readiness plus `{features:{payments:false,delivery:false,offers:false}}`.
- `GET /bootstrap`: `{user:Profile|null,preferences:{shopping_interest}|null,terms_accepted,legal_version,features,saved:string[]}`. Missing profile after verified auth returns user:null and onboarding_required:true.
- `GET /legal`: `{version,status,operator,documents}`; same terms version used for onboarding. Draft legal text stays explicitly draft in staging. Production fails closed until release policy configured.
- `POST /profile`: initial onboarding or edit `{name,username,bio,city,shopping_interest,accept_terms,age_confirmed,terms_version}`; returns `{profile}`. Onboarding requires verified email, interests and current acceptance. Edits may omit acceptance if already current.
- `GET /profiles/:id`: `{profile,listing_count}`.
- `POST /preferences`: `{shopping_interest}` -> `{preferences}`.
- `GET /listings?q=&category=&size=&condition=&min=&max=&cursor=&seller_id=&saved=1&mine=1&status=`: `{items:Listing[],next_cursor:string|null}`. Page size 20. Drafts only accessible to owner; public browse active/sold only. Combine filters.
- `GET /listings/:id`: `{listing,seller:Profile}`.
- `POST /media`: `{data_url,client_id}` -> `{id,url}`. JPG/PNG/WebP only, maximum decoded size 6MB, idempotent per owner/client_id. Native compresses/converts first. Private uploads, owner-only drafts.
- `POST /listings`: draft fields plus `{client_id}` -> `{listing}`. At least title needed for draft; publish validates completeness.
- `PATCH /listings/:id`: fields and required `{version}` -> `{listing}`. Optional status only `archived|sold` for owner. No buyer can change status.
- `POST /listings/:id/publish`: `{version}` -> `{listing}`; must have own uploaded photo and valid details. Publishing must use moderation safeguards.
- `POST /saved/:id`: `{saved:boolean}` -> `{saved:boolean}`.
- `GET /conversations`: `{items:[{id,listing,other:Profile,unread_count,last_message,updated_at}]}`.
- `POST /conversations`: `{listing_id}` -> `{conversation:{id}}`.
- `GET /conversations/:id/messages?cursor=`: `{items:[{id,sender_id,body,created_at}],next_cursor}` chronological display (API newest page first).
- `POST /conversations/:id/messages`: `{body,client_message_id}` -> `{message}`; participant-only, blocked users cannot send.
- `POST /conversations/:id/read`: `{}` -> `{ok:true}`.
- `GET /notifications`: `{items:[{id,title,body,conversation_id,read_at,created_at}]}`; `POST /notifications/read` marks own unread.
- `POST /reports`: `{target_type:'listing'|'user'|'message',target_id,reason,details}` -> `{id}`.
- `GET /blocks`: `{items:[{id,name,username}]}`; `POST /blocks/:id`: `{blocked:boolean}` -> `{ok:true}`.
- `DELETE /account`: `{confirmation:'DELETE'}` -> `{ok:true}`; requires recent authentication, rejects otherwise with code `reauthentication_required`. Invalidate access promptly, remove personal data and owned uploads. Client signs out.
- `GET /admin/reports` and `POST /admin/reports/:id`: moderator membership from private database + verified aal2 required; no public admin self-enrollment. Action `resolve|hide_listing|suspend_user` plus reason.

All checkout/order/payment/offer/delivery/payout/sandbox paths return 403 `feature_disabled`, regardless of request body. No legacy forwarding. All writes require verified authenticated active account and server validation; safe public reads remain available signed out. Blocked content/conversations hidden from the blocker, both directions prohibit messages. Auth headers are validated server-side and RLS enforces ownership.

Web mode is hosted unless explicitly running local sandbox on localhost. Native reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY; no website wrapper fallback. EAS beta uses staging; production requires explicit production project configuration and finalized legal/support details. Empty data is displayed honestly.
