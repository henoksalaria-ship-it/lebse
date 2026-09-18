import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestApp,expectStatus} from './helpers.mjs';
import {signupBody,signup,createOrder,terms,details} from './fixtures.mjs';
import {consentVersion,legalHash,limit} from '../server/security.mjs';
import {createApp} from '../server/index.mjs';

test('cookie sessions, consent and agreement enforcement',async t=>{
 const h=await startTestApp({allowBearer:false});t.after(()=>h.close());let cookie='',csrf='';
 const post=(route,body,headers={})=>h.request(route,{method:'POST',body,headers:{...(cookie?{cookie,'x-csrf-token':csrf}:{}),...headers}});
 await t.test('terms and age are explicit; browser token is HttpOnly and not returned',async()=>{
  expectStatus(await post('/auth/signup',{...signupBody('member'),accept_terms:false}),400);
  expectStatus(await post('/auth/signup',{...signupBody('member'),age_confirmed:false}),400);
  expectStatus(await post('/auth/signup',{...signupBody('member'),terms_version:'old'}),400);
  const r=await post('/auth/signup',signupBody('member'));expectStatus(r,200);assert.equal(r.data.token,undefined);assert.equal(r.data.__session,undefined);csrf=r.data.csrf;
  assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=43200/);cookie=r.headers.get('set-cookie').split(';')[0];
  const stored=(await h.app.db.query('SELECT * FROM sessions')).rows[0];assert.notEqual(stored.token_hash,cookie.split('=')[1]);
  const accepted=(await h.app.db.query('SELECT * FROM legal_acceptances')).rows[0];assert.equal(accepted.content_hash,legalHash);assert.equal(accepted.age_confirmed,true);
  expectStatus(await h.request('/me',{token:cookie.split('=')[1]}),401);
 });
 await t.test('cross-site requests and missing/incorrect CSRF are rejected',async()=>{
  expectStatus(await post('/notifications/read',{}, {'x-csrf-token':''}),403);
  expectStatus(await post('/notifications/read',{}, {'x-csrf-token':'forged'}),403);
  expectStatus(await post('/notifications/read',{}, {'x-lebse-request':''}),403);
  expectStatus(await post('/notifications/read',{}, {origin:'https://attacker.example'}),403);
  expectStatus(await post('/notifications/read',{}, {'sec-fetch-site':'cross-site'}),403);
  expectStatus(await post('/notifications/read',{}),200);
 });
 await t.test('optional consent defaults off, records choice, and can be withdrawn',async()=>{
  assert.equal(expectStatus(await h.request('/consent'),200).choice,null);
  expectStatus(await post('/consent',{version:'old',external_media:true}),400);
  const chosen=await post('/consent',{version:consentVersion,external_media:true});expectStatus(chosen,200);
  const preference=chosen.headers.get('set-cookie').split(';')[0];cookie+='; '+preference;
  assert.equal(expectStatus(await h.request('/consent',{headers:{cookie}}),200).choice.external_media,true);
  expectStatus(await post('/consent',{version:consentVersion,external_media:false}),200);
  assert.equal(expectStatus(await h.request('/consent',{headers:{cookie}}),200).choice.external_media,false);
  assert.equal((await h.app.db.query('SELECT * FROM consent_history')).rows.length,2);
  await h.restart();assert.equal(expectStatus(await h.request('/consent',{headers:{cookie}}),200).choice.external_media,false);
 });
 await t.test('changed agreement blocks commerce, privacy requests remain accessible',async()=>{
  await h.app.db.query('DELETE FROM legal_acceptances');
  expectStatus(await post('/listings',details),403);
  const q=expectStatus(await post('/security/report',{kind:'access',description:'Please provide a copy of my stored personal information.'}),200);assert.equal(q.status,'received');
  expectStatus(await post('/security/accept',terms),200);expectStatus(await post('/listings',details),200);
 });
 await t.test('session revocation and expiry fail closed',async()=>{
  expectStatus(await post('/security/sessions/revoke',{}),200);expectStatus(await h.request('/me',{headers:{cookie}}),401);
  const expired=await h.request('/bootstrap',{headers:{cookie}});expectStatus(expired,401);assert.match(expired.headers.get('set-cookie'),/Max-Age=0/);
 });
 await t.test('rate counters reject excess requests and survive database restart',async()=>{
  assert.equal(await limit(h.app.db,'test','test-ip',2,60),true);assert.equal(await limit(h.app.db,'test','test-ip',2,60),true);assert.equal(await limit(h.app.db,'test','test-ip',2,60),false);await h.restart();assert.equal(await limit(h.app.db,'test','test-ip',2,60),false);
 });
 await t.test('sign-in endpoint throttles brute-force attempts',async()=>{
  let blocked=false;for(let i=0;i<25;i++){const r=await h.request('/auth/login',{method:'POST',body:{email:'member@example.test',password:'WrongPassword2026!'}});if(r.status===429){blocked=true;break;}expectStatus(r,401);}assert.equal(blocked,true);
 });
 await t.test('public production mode cannot enable local payment and courier simulators',async()=>{
  const previous=process.env.NODE_ENV;try{process.env.NODE_ENV='production';await assert.rejects(createApp({dataDir:'memory://'}),/Public launch is disabled/);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
 });
});

test('fraud screening, private cases, review and disputed payout holds',async t=>{
 const adminToken='test-operator-key-'.repeat(3),h=await startTestApp({adminToken});t.after(()=>h.close());
 const seller=await signup(h,'seller'),buyer=await signup(h,'buyer'),other=await signup(h,'other');
 const post=(route,u,body,headers={})=>h.request(route,{method:'POST',token:u?.token,body,headers});let sample,caseId;
 const ops=(body,key=adminToken)=>post('/security/ops',null,body,{'x-lebse-ops-key':key});
 await t.test('suspicious listing is held before publication or media insertion',async()=>{
  const r=expectStatus(await post('/listings',seller,{...details,name:'Replica designer handbag'}),409);assert.equal(r.code,'safety_review');
  assert.equal((await h.app.db.query('SELECT * FROM listings')).rows.length,0);assert.equal((await h.app.db.query('SELECT * FROM media')).rows.length,0);
 });
 await t.test('three failed payments cause a persisted review hold and no fourth attempt',async()=>{
  sample=await createOrder(h,seller,buyer);
  for(let i=0;i<3;i++)expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,{...sample.pay,outcome:'failure',idempotency_key:`payment-failure-${i}`}),200);
  const held=expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,sample.pay),409);caseId=held.case_id;assert.equal(held.code,'safety_review');
  assert.equal((await h.app.db.query('SELECT * FROM payments')).rows.length,3);
  const privateCases=expectStatus(await h.request('/security/center',{token:other.token}),200);assert.deepEqual(privateCases.cases,[]);
  await h.restart();expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,sample.pay),409);
 });
 await t.test('operator requires a private key and recorded reason; approval permits retry',async()=>{
  expectStatus(await ops({case_id:caseId,decision:'approve',reason:'I reviewed the local test case and confirmed this retry.'},'bad'),404);
  expectStatus(await ops({case_id:caseId,decision:'approve',reason:'short'}),400);
  expectStatus(await ops({case_id:caseId,decision:'approve',reason:'I reviewed the local test case and confirmed this retry.'}),200);
  expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,sample.pay),200);
  assert.ok((await h.app.db.query("SELECT * FROM security_audit WHERE action='case_approve'")).rows.length);
 });
 await t.test('unsafe chat is blocked without saving the message',async()=>{
  const c=expectStatus(await post('/conversations',buyer,{listing_id:sample.p.id}),200).conversation;
  expectStatus(await post(`/conversations/${c.id}/messages`,seller,{body:'Please send your verification code to me.',client_message_id:'unsafe-message-1'}),409);
  const chat=expectStatus(await h.request(`/conversations/${c.id}`,{token:buyer.token}),200).conversation;assert.equal(chat.messages.filter(m=>m.client_message_id==='unsafe-message-1').length,0);
 });
 await t.test('buyer dispute pauses dispatch, delivery simulation, completion and payout',async()=>{
  expectStatus(await post('/security/report',other,{kind:'item_problem',subject_id:sample.order.id,description:'I want to dispute an order that belongs to someone else.'}),400);
  expectStatus(await post('/security/report',buyer,{kind:'item_problem',subject_id:sample.order.id,description:'The seller confirmed that this item has undisclosed damage.'}),200);
  const o=expectStatus(await h.request(`/orders/${sample.order.id}`,{token:seller.token}),200).order;assert.equal(o.safety_hold,true);assert.equal(o.payout_status,'disputed');
  expectStatus(await post(`/orders/${o.id}/action`,seller,{action:'ready'}),409);
  expectStatus(await post(`/sandbox/delivery/${o.id}`,seller,{event:'picked_up'}),409);
  expectStatus(await post(`/orders/${o.id}/action`,buyer,{action:'confirm'}),409);
 });
 await t.test('new seller high-value orders are screened',async()=>{
  const b=await signup(h,'highbuyer'),expensive=await createOrder(h,seller,b,{price:25000});
  expectStatus(await post(`/orders/${expensive.order.id}/pay`,b,expensive.pay),409);
  assert.equal((await h.app.db.query('SELECT * FROM payments WHERE order_id=$1',[expensive.order.id])).rows.length,0);
 });
 await t.test('appeals can reopen a decision and operator responses reach only the requester',async()=>{
  const center=expectStatus(await h.request('/security/center',{token:buyer.token}),200),dispute=center.cases.find(c=>c.subject_id===sample.order.id&&c.status==='open');
  expectStatus(await ops({case_id:dispute.id,decision:'reject',reason:'The local review found an unresolved issue requiring a continued hold.'}),200);
  const appeal=expectStatus(await post('/security/report',buyer,{kind:'appeal',subject_id:dispute.id,description:'Please reconsider this local test case using the updated evidence.'}),200);
  expectStatus(await ops({case_id:dispute.id,decision:'reopen',reason:'An appeal added evidence; reopen the decision for another review.'}),200);
  expectStatus(await ops({case_id:dispute.id,decision:'approve',reason:'The updated local test evidence resolves this reported issue.'}),200);
  expectStatus(await ops({request_id:appeal.id,status:'resolved',reason:'Your local test appeal was reviewed and the hold has been lifted.'}),200);
  const result=expectStatus(await h.request('/security/center',{token:buyer.token}),200);assert.match(result.requests.find(r=>r.id===appeal.id).response,/hold has been lifted/);
  assert.equal(expectStatus(await h.request('/security/center',{token:other.token}),200).requests.length,0);
  const o=expectStatus(await h.request(`/orders/${sample.order.id}`,{token:buyer.token}),200).order;assert.equal(o.safety_hold,false);assert.equal(o.payout_status,'pending_completion');
 });
});
