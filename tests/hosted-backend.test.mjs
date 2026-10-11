import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHandler,decodePhoto,route} from '../supabase/functions/api/handler.mjs';

test('hosted sessions, isolated profiles, listing lifecycle, chat, blocking and deletion',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create table auth.mfa_factors(user_id uuid,status text);
 create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create function auth.uid() returns uuid language sql as $$ select (auth.jwt()->>'sub')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260921153906_hosted_beta.sql',import.meta.url),'utf8'));
 const seller=crypto.randomUUID(),buyer=crypto.randomUUID(),stranger=crypto.randomUUID();
 const sessions=new Map();for(const id of [seller,buyer,stranger]){const sid=crypto.randomUUID();sessions.set(id,sid);await db.query('insert into auth.users values($1,now(),null)',[id]);await db.query('insert into auth.sessions values($1,$2)',[sid,id]);}
 async function as(id,extra={}){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(id?{sub:id,session_id:sessions.get(id),aal:'aal1',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}],...extra}:{})]);}
 const call=async(op,p={})=>(await db.query('select public.lb_api($1,$2::jsonb) result',[op,JSON.stringify(p)])).rows[0].result;
 for(const [id,name] of [[seller,'seller'],[buyer,'buyer'],[stranger,'stranger']]){await as(id);await call('profile.save',{name,username:name,shopping_interest:'both',accept_terms:true,age_confirmed:true,terms_version:'2026-09-21-beta-1'});}
 await as(seller);const photo=await call('media.begin',{client_id:crypto.randomUUID()});await db.query("insert into storage.objects values('lebse-photos',$1)",[photo.path]);await call('media.finish',{id:photo.id});
 let listing=(await call('listings.save',{client_id:crypto.randomUUID(),title:'Cotton shirt',description:'A comfortable cotton shirt, worn twice.',price:500,category:'Tops',size:'M',condition:'Good',media_ids:[photo.id]})).listing;
 await as(buyer);assert.equal((await call('listings.list')).items.length,0);await assert.rejects(call('listings.read',{id:listing.id}),/not_found/);
 await assert.rejects(call('listings.save',{id:listing.id,version:listing.version,title:'Stolen edit'}),/not_found/);
 await assert.rejects(call('listings.save',{client_id:crypto.randomUUID(),title:'Other piece',media_ids:[photo.id]}),/invalid_media/);
 await as(seller);listing=(await call('listings.publish',{id:listing.id,version:listing.version})).listing;
 await as(null);assert.equal((await call('listings.list')).items.length,1);assert.equal((await call('bootstrap')).user,null);await assert.rejects(call('saved.save',{id:listing.id,saved:true}),/sign_in_required/);
 await db.exec('set role anon');await assert.rejects(db.query('select * from lebse_beta.accounts'),/permission denied/);await db.exec('reset role');
 await as(buyer);await call('saved.save',{id:listing.id,saved:true});assert.deepEqual((await call('bootstrap')).saved,[listing.id]);
 const publicSeller=(await call('profiles.read',{id:seller})).profile;assert.equal(publicSeller.interest,undefined);assert.equal(publicSeller.terms_version,undefined);
 const conv=(await call('conversations.create',{listing_id:listing.id})).conversation.id;
 const msg={id:conv,body:'Is this still available?',client_message_id:crypto.randomUUID()};await call('messages.send',msg);await call('messages.send',msg);assert.equal((await call('messages.list',{id:conv})).items.length,1);
 await as(stranger);await assert.rejects(call('messages.list',{id:conv}),/not_found/);await assert.rejects(call('admin.list'),/moderator_mfa_required/);
 await as(seller);assert.equal((await call('conversations.list')).items[0].unread_count,1);await call('conversations.read',{id:conv});assert.equal((await call('conversations.list')).items[0].unread_count,0);
 await call('blocks.save',{id:buyer,blocked:true});await as(buyer);await assert.rejects(call('messages.send',{...msg,client_message_id:crypto.randomUUID()}),/not_found/);
 await assert.rejects(call('orders.create'),/feature_disabled/);
 await db.query("insert into auth.mfa_factors values($1,'verified')",[buyer]);await assert.rejects(call('bootstrap'),/mfa_required/);await as(buyer,{aal:'aal2'});assert.ok((await call('bootstrap')).user);
 await as(buyer,{aal:'aal2',amr:[]});await assert.rejects(call('account.delete',{confirmation:'DELETE'}),/reauthentication_required/);
 await as(buyer,{aal:'aal2'});assert.equal((await call('account.delete',{confirmation:'DELETE'})).id,buyer);await assert.rejects(call('bootstrap'),/account_deleting/);
 await as(seller);await db.query('delete from auth.sessions where user_id=$1',[seller]);await assert.rejects(call('bootstrap'),/session_expired/);
});

test('edge blocks commerce before calling upstream and rejects forged image data',async()=>{
 const handler=createHandler(k=>({SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'anon'})[k],()=>{throw Error('must not reach upstream');});
 for(const path of ['orders','payments/check','offers','delivery','sandbox/payment','payouts'])assert.equal((await handler(new Request('https://example.test/functions/v1/api/'+path,{method:'POST'}))).status,403);
 assert.equal((await handler(new Request('https://example.test/functions/v1/api/bootstrap',{headers:{origin:'https://evil.test'}}))).status,403);
 assert.equal(route('POST','/conversations/123/messages').op,'messages.send');assert.equal(route('DELETE','/listings/123'),null);
 assert.throws(()=>decodePhoto('data:image/png;base64,YmFk'),/invalid_photo/);
 const result=await createHandler(k=>({SUPABASE_URL:'x',SUPABASE_ANON_KEY:'x',LEBSE_ENV:'production'})[k])(new Request('https://example.test/api/bootstrap'));assert.equal(result.status,503);
});
