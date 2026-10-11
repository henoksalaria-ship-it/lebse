-- Hosted beta is isolated from the legacy local/test marketplace.
create schema if not exists lebse_beta;
revoke all on schema lebse_beta from public, anon, authenticated;
grant usage on schema lebse_beta to authenticated, anon;
create table lebse_beta.accounts (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 80),
 username text unique not null check(username ~ '^[a-z0-9._]{3,30}$'),
 bio text not null default '' check(length(bio)<=1000), city text not null default 'Addis Ababa' check(length(city) between 2 and 80),
 interest text not null check(interest in ('menswear','womenswear','both')),
 terms_version text not null, accepted_at timestamptz not null default now(),
 state text not null default 'active' check(state in ('active','suspended','deleting')),
 created_at timestamptz not null default now()
);
create table lebse_beta.media (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references lebse_beta.accounts(id) on delete cascade,
 client_id uuid not null, path text unique not null, ready boolean not null default false,
 created_at timestamptz not null default now(), unique(owner_id,client_id)
);
create table lebse_beta.listings (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references lebse_beta.accounts(id) on delete cascade,
 client_id uuid not null, title text not null check(length(title) between 2 and 120),
 description text not null default '' check(length(description)<=4000), price integer check(price between 50 and 50000),
 category text not null default '', brand text not null default '', size text not null default '', color text not null default '',
 condition text not null default '', flaws text not null default '', city text not null default 'Addis Ababa',
 media_ids uuid[] not null default '{}', status text not null default 'draft' check(status in ('draft','active','sold','archived')),
 version integer not null default 1, hidden boolean not null default false,
 created_at timestamptz not null default now(), unique(seller_id,client_id)
);
create index lb_listings_feed on lebse_beta.listings(created_at desc,id desc) where status='active' and not hidden;
create index lb_listings_seller on lebse_beta.listings(seller_id);
create table lebse_beta.saved (user_id uuid references lebse_beta.accounts(id) on delete cascade, listing_id uuid references lebse_beta.listings(id) on delete cascade, primary key(user_id,listing_id));
create table lebse_beta.blocks (user_id uuid references lebse_beta.accounts(id) on delete cascade, blocked_id uuid references lebse_beta.accounts(id) on delete cascade, primary key(user_id,blocked_id),check(user_id<>blocked_id));
create table lebse_beta.conversations (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references lebse_beta.listings(id) on delete cascade,
 buyer_id uuid not null references lebse_beta.accounts(id) on delete cascade, seller_id uuid not null references lebse_beta.accounts(id) on delete cascade,
 updated_at timestamptz not null default now(), unique(listing_id,buyer_id),check(buyer_id<>seller_id)
);
create table lebse_beta.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references lebse_beta.conversations(id) on delete cascade,
 sender_id uuid not null references lebse_beta.accounts(id) on delete cascade, body text not null check(length(body) between 1 and 2000),
 client_message_id uuid not null, created_at timestamptz not null default now(), unique(sender_id,client_message_id)
);
create index lb_message_page on lebse_beta.messages(conversation_id,created_at desc,id desc);
create table lebse_beta.reads (user_id uuid references lebse_beta.accounts(id) on delete cascade, conversation_id uuid references lebse_beta.conversations(id) on delete cascade, read_at timestamptz not null default now(),primary key(user_id,conversation_id));
create table lebse_beta.notifications (id uuid primary key default gen_random_uuid(),user_id uuid not null references lebse_beta.accounts(id) on delete cascade, conversation_id uuid references lebse_beta.conversations(id) on delete cascade,title text not null,body text not null,read_at timestamptz,created_at timestamptz not null default now());
create table lebse_beta.reports (id uuid primary key default gen_random_uuid(),reporter_id uuid references lebse_beta.accounts(id) on delete set null,target_type text not null check(target_type in ('listing','user','message')),target_id uuid not null,reason text not null check(length(reason) between 3 and 120),details text not null default '' check(length(details)<=2000),state text not null default 'open',resolution text,created_at timestamptz not null default now());
create table lebse_beta.moderators(user_id uuid primary key references auth.users(id) on delete cascade);
create table lebse_beta.audit(id bigint generated always as identity primary key,actor_id uuid,action text not null,target_id uuid,reason text not null,created_at timestamptz not null default now());
create table lebse_beta.rate_limits(user_id uuid not null,window_at timestamptz not null,requests integer not null,primary key(user_id,window_at));
-- No direct table privileges. All requests go through the scoped transaction below.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='lebse_beta' loop
 execute format('alter table lebse_beta.%I enable row level security',t.tablename);
 execute format('revoke all on lebse_beta.%I from public,anon,authenticated',t.tablename);
 end loop;
end $$;

create function lebse_beta.profile(a lebse_beta.accounts) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',a.id,'name',a.name,'username',a.username,'bio',a.bio,'city',a.city)
$$;
revoke all on function lebse_beta.profile(lebse_beta.accounts) from public;
create function lebse_beta.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from lebse_beta.blocks where (user_id=a and blocked_id=b) or (user_id=b and blocked_id=a))
$$;
revoke all on function lebse_beta.blocked(uuid,uuid) from public;
create function lebse_beta.listing_json(l lebse_beta.listings) returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(l)-'client_id'-'hidden' || jsonb_build_object('images','[]'::jsonb,'media',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'path',m.path) order by array_position(l.media_ids,m.id)) from lebse_beta.media m where m.id=any(l.media_ids) and m.ready),'[]'::jsonb))
$$;
revoke all on function lebse_beta.listing_json(lebse_beta.listings) from public;

create function lebse_beta.handle(op text, p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
 u uuid:=auth.uid(); a lebse_beta.accounts; l lebse_beta.listings; c lebse_beta.conversations; m lebse_beta.media;
 target uuid; other_id uuid; result jsonb; page jsonb; n integer; v integer; ids uuid[]; cursor_time timestamptz; cursor_id uuid;
 terms constant text:='2026-09-21-beta-1';
begin
 if u is not null then
  if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and deleted_at is null) then raise exception 'email_verification_required' using errcode='P0001'; end if;
  if not exists(select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=u) then raise exception 'session_expired' using errcode='P0001'; end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'mfa_required' using errcode='P0001'; end if;
  select * into a from lebse_beta.accounts where id=u;
  if a.state='suspended' then raise exception 'account_suspended' using errcode='P0001'; end if;
  if a.state='deleting' and op<>'account.delete' then raise exception 'account_deleting' using errcode='P0001'; end if;
 end if;
 if op='bootstrap' then return jsonb_build_object('user',case when a.id is null then null else lebse_beta.profile(a) end,'preferences',case when a.id is null then null else jsonb_build_object('shopping_interest',a.interest) end,'terms_accepted',coalesce(a.terms_version=terms,false),'onboarding_required',u is not null and a.id is null,'legal_version',terms,'saved',coalesce((select jsonb_agg(listing_id) from lebse_beta.saved where user_id=u),'[]'::jsonb),'features',jsonb_build_object('payments',false,'delivery',false,'offers',false)); end if;
 if op='listings.read' then
  target:=nullif(p->>'id','')::uuid;
  select * into l from lebse_beta.listings where id=target and ((seller_id=u) or (status in ('active','sold') and not hidden and exists(select 1 from lebse_beta.accounts where id=seller_id and state='active'))) and not lebse_beta.blocked(u,seller_id);
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  return jsonb_build_object('listing',lebse_beta.listing_json(l),'seller',(select lebse_beta.profile(x) from lebse_beta.accounts x where x.id=l.seller_id));
 end if;
 if op='profiles.read' then
  select * into a from lebse_beta.accounts where id=(p->>'id')::uuid and state='active' and not lebse_beta.blocked(u,id);
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  return jsonb_build_object('profile',lebse_beta.profile(a),'listing_count',(select count(*) from lebse_beta.listings where seller_id=a.id and status='active' and not hidden));
 end if;
 if op='listings.list' then
  if (p->>'mine'='1' or p->>'saved'='1') and u is null then raise exception 'sign_in_required' using errcode='P0001'; end if;
  if length(coalesce(p->>'q',''))>120 then raise exception 'invalid_search' using errcode='P0001'; end if;
  cursor_time:=nullif(p->>'cursor_time','')::timestamptz; cursor_id:=nullif(p->>'cursor_id','')::uuid;
  select coalesce(jsonb_agg(lebse_beta.listing_json(x) order by x.created_at desc,x.id desc),'[]'::jsonb) into page from (
   select l.* from lebse_beta.listings l join lebse_beta.accounts a on a.id=l.seller_id
   where a.state='active' and not lebse_beta.blocked(u,l.seller_id)
   and (case when p->>'mine'='1' then l.seller_id=u else l.status in ('active','sold') and not l.hidden end)
   and (nullif(p->>'status','') is null or l.status=p->>'status')
   and (nullif(p->>'seller_id','') is null or l.seller_id=(p->>'seller_id')::uuid)
   and (coalesce(p->>'saved','')<>'1' or exists(select 1 from lebse_beta.saved s where s.user_id=u and s.listing_id=l.id))
   and (nullif(p->>'q','') is null or concat_ws(' ',l.title,l.brand,l.description) ilike '%'||(p->>'q')||'%')
   and (nullif(p->>'category','') is null or l.category=p->>'category') and (nullif(p->>'size','') is null or l.size=p->>'size')
   and (nullif(p->>'condition','') is null or l.condition=p->>'condition')
   and (nullif(p->>'min','') is null or l.price>=(p->>'min')::integer) and (nullif(p->>'max','') is null or l.price<=(p->>'max')::integer)
   and (cursor_time is null or (l.created_at,l.id)<(cursor_time,cursor_id)) order by l.created_at desc,l.id desc limit 21
  ) x;
  return jsonb_build_object('items',page);
 end if;
 if u is null then raise exception 'sign_in_required' using errcode='P0001'; end if;
 -- A transaction-scoped limit cannot be bypassed by changing Edge instances.
 if op not in ('conversations.list','messages.list','notifications.list','blocks.list','admin.list') then
  insert into lebse_beta.rate_limits values(u,date_trunc('minute',now()),1) on conflict(user_id,window_at) do update set requests=lebse_beta.rate_limits.requests+1 returning requests into n;
  if n>60 then raise exception 'rate_limited' using errcode='P0001'; end if;
 end if;
 if op='profile.save' then
  if a.id is null or a.terms_version<>terms then
   if p->>'accept_terms'<>'true' or p->>'age_confirmed'<>'true' or p->>'terms_version'<>terms or not(p ? 'accept_terms' and p ? 'age_confirmed' and p ? 'terms_version') then raise exception 'terms_required' using errcode='P0001'; end if;
  end if;
  insert into lebse_beta.accounts(id,name,username,bio,city,interest,terms_version)
  values(u,trim(p->>'name'),lower(trim(p->>'username')),coalesce(p->>'bio',''),coalesce(nullif(trim(p->>'city'),''),'Addis Ababa'),p->>'shopping_interest',terms)
  on conflict(id) do update set name=excluded.name,username=excluded.username,bio=excluded.bio,city=excluded.city,interest=excluded.interest,terms_version=excluded.terms_version,accepted_at=case when lebse_beta.accounts.terms_version<>terms then now() else lebse_beta.accounts.accepted_at end returning * into a;
  return jsonb_build_object('profile',lebse_beta.profile(a));
 end if;
 if a.id is null then raise exception 'onboarding_required' using errcode='P0001'; end if;
 if op='preferences.save' then update lebse_beta.accounts set interest=p->>'shopping_interest' where id=u returning * into a;return jsonb_build_object('preferences',jsonb_build_object('shopping_interest',a.interest)); end if;
 if op='media.begin' then
  insert into lebse_beta.media(owner_id,client_id,path) values(u,(p->>'client_id')::uuid,u::text||'/'||(p->>'client_id')) on conflict(owner_id,client_id) do nothing;
  select * into m from lebse_beta.media where owner_id=u and client_id=(p->>'client_id')::uuid;
  return to_jsonb(m);
 end if;
 if op='media.finish' then
  update lebse_beta.media set ready=true where owner_id=u and id=(p->>'id')::uuid and exists(select 1 from storage.objects where bucket_id='lebse-photos' and name=lebse_beta.media.path) returning * into m;
  if not found then raise exception 'upload_incomplete' using errcode='P0001'; end if; return to_jsonb(m);
 end if;
 if op in ('listings.save','listings.publish') then
  if p ? 'id' then select * into l from lebse_beta.listings where id=(p->>'id')::uuid and seller_id=u for update;
   if not found then raise exception 'not_found' using errcode='P0001'; end if;
   if l.version<>coalesce((p->>'version')::integer,0) then raise exception 'stale_version' using errcode='P0001'; end if;
  else
   insert into lebse_beta.listings(seller_id,client_id,title) values(u,(p->>'client_id')::uuid,trim(p->>'title')) on conflict(seller_id,client_id) do nothing;
   select * into l from lebse_beta.listings where seller_id=u and client_id=(p->>'client_id')::uuid for update;
   -- Retrying a create must not overwrite edits or publish twice.
   if l.version>1 then return jsonb_build_object('listing',lebse_beta.listing_json(l)); end if;
  end if;
  if op='listings.save' then
   if p ? 'media_ids' then select coalesce(array_agg(x::uuid),'{}') into ids from jsonb_array_elements_text(p->'media_ids') x; else ids:=l.media_ids; end if;
   if cardinality(ids)>8 or exists(select 1 from unnest(ids) x where not exists(select 1 from lebse_beta.media where id=x and owner_id=u and ready)) then raise exception 'invalid_media' using errcode='P0001'; end if;
   if p ? 'status' and (p->>'status' not in ('archived','sold') or l.status not in ('active','draft')) then raise exception 'invalid_status' using errcode='P0001'; end if;
   update lebse_beta.listings set title=coalesce(trim(p->>'title'),l.title),description=coalesce(p->>'description',l.description),price=coalesce((p->>'price')::integer,l.price),category=coalesce(p->>'category',l.category),brand=left(coalesce(p->>'brand',l.brand),80),size=left(coalesce(p->>'size',l.size),30),color=left(coalesce(p->>'color',l.color),60),condition=coalesce(p->>'condition',l.condition),flaws=left(coalesce(p->>'flaws',l.flaws),1000),city=left(coalesce(p->>'city',l.city),80),media_ids=ids,status=coalesce(p->>'status',case when l.status='active' then 'draft' else l.status end),version=version+1 where id=l.id returning * into l;
  else
   if l.hidden or l.status not in ('draft','active') then raise exception 'listing_unavailable' using errcode='P0001'; end if;
   if l.price is null or length(l.description)<20 or cardinality(l.media_ids)=0 or length(l.size)=0 or l.category not in ('Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories') or l.condition not in ('New with tags','Like new','Good','Fair') then raise exception 'listing_incomplete' using errcode='P0001'; end if;
   if concat_ws(' ',l.title,l.description,l.brand) ~* '(counterfeit|replica|weapon|firearm|porn|stolen)' then raise exception 'content_review_required' using errcode='P0001'; end if;
   update lebse_beta.listings set status='active',version=version+1 where id=l.id returning * into l;
  end if;
  return jsonb_build_object('listing',lebse_beta.listing_json(l));
 end if;
 if op='saved.save' then
  target:=(p->>'id')::uuid;
  if p->>'saved'='true' then
   if not exists(select 1 from lebse_beta.listings where id=target and status in ('active','sold') and not hidden and not lebse_beta.blocked(u,seller_id)) then raise exception 'not_found' using errcode='P0001'; end if;
   insert into lebse_beta.saved values(u,target) on conflict do nothing;
  else delete from lebse_beta.saved where user_id=u and listing_id=target;end if;
  return jsonb_build_object('saved',p->>'saved'='true');
 end if;
 if op='conversations.create' then
  select * into l from lebse_beta.listings where id=(p->>'listing_id')::uuid and status='active' and not hidden;
  if not found or l.seller_id=u or lebse_beta.blocked(u,l.seller_id) then raise exception 'listing_unavailable' using errcode='P0001'; end if;
  insert into lebse_beta.conversations(listing_id,buyer_id,seller_id) values(l.id,u,l.seller_id) on conflict(listing_id,buyer_id) do nothing;
  select * into c from lebse_beta.conversations where listing_id=l.id and buyer_id=u;return jsonb_build_object('conversation',jsonb_build_object('id',c.id));
 end if;
 if op='conversations.list' then
  select coalesce(jsonb_agg(x.data order by x.updated_at desc),'[]'::jsonb) into result from (select c.updated_at,jsonb_build_object('id',c.id,'listing',lebse_beta.listing_json(l),'other',lebse_beta.profile(a),'updated_at',c.updated_at,'last_message',(select body from lebse_beta.messages where conversation_id=c.id order by created_at desc limit 1),'unread_count',(select count(*) from lebse_beta.messages m where m.conversation_id=c.id and m.sender_id<>u and m.created_at>coalesce((select read_at from lebse_beta.reads where user_id=u and conversation_id=c.id),'-infinity'::timestamptz))) data from lebse_beta.conversations c join lebse_beta.listings l on l.id=c.listing_id join lebse_beta.accounts a on a.id=case when c.buyer_id=u then c.seller_id else c.buyer_id end where u in(c.buyer_id,c.seller_id) and a.state='active' and not lebse_beta.blocked(u,a.id) order by c.updated_at desc limit 100) x;
  return jsonb_build_object('items',result);
 end if;
 if op in ('messages.list','messages.send','conversations.read') then
  select * into c from lebse_beta.conversations where id=(p->>'id')::uuid and u in(buyer_id,seller_id);
  other_id:=case when c.buyer_id=u then c.seller_id else c.buyer_id end;
  if c.id is null or lebse_beta.blocked(u,other_id) or not exists(select 1 from lebse_beta.accounts where id=other_id and state='active') then raise exception 'not_found' using errcode='P0001'; end if;
  if op='messages.list' then
   select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]'::jsonb) into page from (select id,sender_id,body,created_at from lebse_beta.messages where conversation_id=c.id and (nullif(p->>'cursor_time','') is null or (created_at,id)<((p->>'cursor_time')::timestamptz,(p->>'cursor_id')::uuid)) order by created_at desc,id desc limit 21) x;return jsonb_build_object('items',page);
  end if;
  if op='conversations.read' then insert into lebse_beta.reads values(u,c.id,now()) on conflict(user_id,conversation_id) do update set read_at=now();return '{"ok":true}';end if;
  if p->>'body' ~* '(send|share).{0,30}(password|otp|verification code)' then raise exception 'unsafe_message' using errcode='P0001';end if;
  insert into lebse_beta.messages(conversation_id,sender_id,body,client_message_id) values(c.id,u,trim(p->>'body'),(p->>'client_message_id')::uuid) on conflict(sender_id,client_message_id) do nothing;
  get diagnostics n=row_count;
  if n>0 then
   update lebse_beta.conversations set updated_at=now() where id=c.id;
   insert into lebse_beta.notifications(user_id,conversation_id,title,body) values(other_id,c.id,'New message','You have a new message about a piece.');
  end if;
  select to_jsonb(x) into result from lebse_beta.messages x where sender_id=u and client_message_id=(p->>'client_message_id')::uuid and conversation_id=c.id;
  if result is null then raise exception 'idempotency_conflict' using errcode='P0001';end if;return jsonb_build_object('message',result);
 end if;
 if op='notifications.list' then return jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from lebse_beta.notifications where user_id=u order by created_at desc limit 100) x),'[]'::jsonb));end if;
 if op='notifications.read' then update lebse_beta.notifications set read_at=now() where user_id=u and read_at is null;return '{"ok":true}';end if;
 if op='blocks.list' then return jsonb_build_object('items',coalesce((select jsonb_agg(lebse_beta.profile(x)) from lebse_beta.blocks b join lebse_beta.accounts x on x.id=b.blocked_id where b.user_id=u),'[]'::jsonb));end if;
 if op='blocks.save' then
  if p->>'blocked'='true' then insert into lebse_beta.blocks values(u,(p->>'id')::uuid) on conflict do nothing;else delete from lebse_beta.blocks where user_id=u and blocked_id=(p->>'id')::uuid;end if;return '{"ok":true}';
 end if;
 if op='reports.create' then
  target:=(p->>'target_id')::uuid;
  if not ((p->>'target_type'='user' and exists(select 1 from lebse_beta.accounts where id=target)) or (p->>'target_type'='listing' and exists(select 1 from lebse_beta.listings where id=target and (status in ('active','sold') or seller_id=u))) or (p->>'target_type'='message' and exists(select 1 from lebse_beta.messages m join lebse_beta.conversations c on c.id=m.conversation_id where m.id=target and u in(c.buyer_id,c.seller_id)))) then raise exception 'not_found' using errcode='P0001';end if;
  insert into lebse_beta.reports(reporter_id,target_type,target_id,reason,details) values(u,p->>'target_type',target,p->>'reason',coalesce(p->>'details','')) returning id into target;return jsonb_build_object('id',target);
 end if;
 if op like 'admin.%' then
  if auth.jwt()->>'aal'<>'aal2' or not exists(select 1 from lebse_beta.moderators where user_id=u) then raise exception 'moderator_mfa_required' using errcode='P0001';end if;
  if op='admin.list' then return jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from lebse_beta.reports order by created_at desc limit 100) x),'[]'::jsonb));end if;
  if length(coalesce(p->>'reason',''))<10 or p->>'action' not in ('resolve','hide_listing','suspend_user') then raise exception 'resolution_required' using errcode='P0001';end if;
  select target_id into target from lebse_beta.reports where id=(p->>'id')::uuid for update;
  if not found then raise exception 'not_found' using errcode='P0001';end if;
  if p->>'action'='hide_listing' then update lebse_beta.listings set hidden=true where id=target;end if;
  if p->>'action'='suspend_user' then update lebse_beta.accounts set state='suspended' where id=target and id<>u;end if;
  update lebse_beta.reports set state='resolved',resolution=p->>'reason' where id=(p->>'id')::uuid;
  insert into lebse_beta.audit(actor_id,action,target_id,reason) values(u,p->>'action',target,p->>'reason');return '{"ok":true}';
 end if;
 if op='account.delete' then
  if p->>'confirmation' is distinct from 'DELETE' then raise exception 'confirmation_required' using errcode='P0001';end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) amr where amr->>'method' in ('password','totp') and to_timestamp((amr->>'timestamp')::double precision)>now()-interval '5 minutes') then raise exception 'reauthentication_required' using errcode='P0001';end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'mfa_required' using errcode='P0001';end if;
  update lebse_beta.accounts set state='deleting' where id=u;
  return jsonb_build_object('id',u,'paths',coalesce((select jsonb_agg(path) from lebse_beta.media where owner_id=u),'[]'::jsonb));
 end if;
 raise exception 'feature_disabled' using errcode='P0001';
end $$;
revoke all on function lebse_beta.handle(text,jsonb) from public;
grant execute on function lebse_beta.handle(text,jsonb) to anon,authenticated;
create function public.lb_api(op text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select lebse_beta.handle(op,p) $$;
revoke all on function public.lb_api(text,jsonb) from public;
grant execute on function public.lb_api(text,jsonb) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('lebse-photos','lebse-photos',false,6291456,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
