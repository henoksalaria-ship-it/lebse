import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestApp,expectStatus} from './helpers.mjs';
import {signup,details,address,createOrder} from './fixtures.mjs';
import {searchPieces,emptyFilters} from '../src/discovery.js';

test('search ranks useful matches, tolerates small typos and combines filters',()=>{
 const items=[{id:'one',name:'Linen summer shirt',brand:'Zara',category:'Tops',size:'M',condition:'Good',price:900,created_at:'2026-09-01'},{id:'two',name:'Summer trousers',description:'Wear with a linen shirt',category:'Bottoms',size:'L',condition:'Like new',price:1500,created_at:'2026-09-02'},{id:'three',name:'Cotton shirt',category:'Tops',size:'S',condition:'Good',price:600,created_at:'2026-09-03'}];
 assert.deepEqual(searchPieces(items,{q:'linen shirt'}).map(p=>p.id),['one','two']);assert.equal(searchPieces(items,{q:'linem'}).length,2);
 assert.deepEqual(searchPieces(items,{q:'shirt',categories:['Tops'],sizes:['M','L'],conditions:['Good'],min:800,max:1200}).map(p=>p.id),['one']);assert.equal(searchPieces(items,{q:'linen shoes'}).length,0);assert.equal(searchPieces(items,emptyFilters).length,3);assert.equal(searchPieces(items,{sort:'low'})[0].id,'three');
});
test('private discovery, collections, addresses, profiles and read receipts persist',async t=>{
 const h=await startTestApp();t.after(()=>h.close());const seller=await signup(h,'seller'),buyer=await signup(h,'buyer'),other=await signup(h,'other');const post=(p,u,b)=>h.request(p,{method:'POST',token:u.token,body:b}),get=(p,u)=>h.request(p,{token:u?.token});let listing,search,collection,a1,a2;
 await t.test('recent history and saved searches are private, deduplicated and removable',async()=>{
  listing=expectStatus(await post('/listings',seller,details),200).listing;expectStatus(await post('/experience/recent',buyer,{listing_id:listing.id}),200);expectStatus(await post('/experience/recent',buyer,{listing_id:listing.id}),200);
  search=expectStatus(await post('/experience/searches',buyer,{name:'My cotton',filters:{q:'cotton',sizes:['M'],conditions:['Good']}}),200).id;assert.equal(expectStatus(await post('/experience/searches',buyer,{name:'Again',filters:{q:'cotton',sizes:['M'],conditions:['Good']}}),200).id,search);
  const library=expectStatus(await get('/experience/library',buyer),200);assert.deepEqual(library.recently_viewed,[listing.id]);assert.equal(library.saved_searches.length,1);assert.deepEqual(expectStatus(await get('/experience/library',other),200).recently_viewed,[]);expectStatus(await post(`/experience/searches/${search}/delete`,other,{}),404);
 });
 await t.test('collections only contain owned saves and unsaving removes membership',async()=>{
  expectStatus(await post(`/saved/${listing.id}`,buyer,{saved:true}),200);collection=expectStatus(await post('/experience/collections',buyer,{name:'Daily wear'}),200).id;
  expectStatus(await post(`/experience/collections/${collection}/item`,buyer,{listing_id:listing.id,included:true}),200);expectStatus(await post(`/experience/collections/${collection}/item`,other,{listing_id:listing.id,included:true}),404);
  assert.deepEqual(expectStatus(await get('/experience/library',buyer),200).collections[0].listing_ids,[listing.id]);expectStatus(await post(`/saved/${listing.id}`,buyer,{saved:false}),200);assert.deepEqual(expectStatus(await get('/experience/library',buyer),200).collections[0].listing_ids,[]);
  expectStatus(await post(`/experience/collections/${collection}/rename`,buyer,{name:'Everyday'}),200);
 });
 await t.test('addresses enforce ownership, versions and exactly one default',async()=>{
  a1=expectStatus(await post('/experience/addresses',buyer,{label:'Home',address}),200).id;a2=expectStatus(await post('/experience/addresses',buyer,{label:'Work',address:{...address,street:'Another test street'}}),200).id;
  let list=expectStatus(await get('/experience/addresses',buyer),200).addresses;assert.equal(list.filter(a=>a.is_default).length,1);assert.equal(list[0].id,a1);
  expectStatus(await post(`/experience/addresses/${a2}/default`,other,{version:1}),404);expectStatus(await post(`/experience/addresses/${a2}/default`,buyer,{version:1}),200);expectStatus(await post(`/experience/addresses/${a2}`,buyer,{version:1,label:'Stale',address}),409);
  list=expectStatus(await get('/experience/addresses',buyer),200).addresses;assert.equal(list[0].id,a2);expectStatus(await post(`/experience/addresses/${a2}/delete`,buyer,{version:list[0].version}),200);assert.equal(expectStatus(await get('/experience/addresses',buyer),200).addresses[0].is_default,true);assert.deepEqual(expectStatus(await get('/experience/addresses',seller),200).addresses,[]);
 });
 await t.test('profiles validate versions and closet counts use real records',async()=>{
  const profile=expectStatus(await get('/experience/profile',seller),200).profile;expectStatus(await post('/experience/profile',seller,{...profile,name:'Seller Updated',bio:'Linen and cotton favorites.',closet_description:'Pieces from my own wardrobe.'}),200);expectStatus(await post('/experience/profile',seller,{...profile,name:'Stale'}),409);expectStatus(await post(`/follow/${seller.user.id}`,buyer,{following:true}),200);
  const closet=expectStatus(await get(`/users/${seller.user.id}/closet`),200);assert.equal(closet.seller.name,'Seller Updated');assert.equal(closet.seller.listing_count,1);assert.equal(closet.seller.follower_count,1);assert.equal(closet.seller.closet_description,'Pieces from my own wardrobe.');assert.equal(closet.seller.email,undefined);
 });
 await t.test('read receipts only advance to seen messages and reject outsider access',async()=>{
  const c=expectStatus(await post('/conversations',buyer,{listing_id:listing.id}),200).conversation;expectStatus(await post(`/conversations/${c.id}/messages`,buyer,{body:'Hello, could you confirm the fit?',client_message_id:'receipt-one'}),200);let chat=expectStatus(await get(`/conversations/${c.id}`,seller),200).conversation;assert.equal(chat.unread_count,1);const first=chat.messages.at(-1);
  expectStatus(await post(`/experience/conversations/${c.id}/read`,other,{message_id:first.id}),404);expectStatus(await post(`/experience/conversations/${c.id}/read`,seller,{message_id:first.id}),200);chat=expectStatus(await get(`/conversations/${c.id}`,buyer),200).conversation;assert.equal(chat.messages[0].read_by_other,true);assert.equal(chat.unread_count,0);
  expectStatus(await post(`/conversations/${c.id}/messages`,buyer,{body:'And how long is the sleeve?',client_message_id:'receipt-two'}),200);expectStatus(await post(`/experience/conversations/${c.id}/read`,seller,{message_id:first.id}),200);assert.equal(expectStatus(await get(`/conversations/${c.id}`,seller),200).conversation.unread_count,1);
 });
 await t.test('personal changes survive a database restart and never enter public bootstrap',async()=>{
  await h.restart();const lib=expectStatus(await get('/experience/library',buyer),200);assert.equal(lib.saved_searches[0].id,search);assert.equal(lib.collections[0].name,'Everyday');assert.equal(expectStatus(await get('/experience/addresses',buyer),200).addresses[0].id,a1);assert.ok(!JSON.stringify(expectStatus(await get('/bootstrap'),200)).includes(address.street));expectStatus(await post('/experience/recent',buyer,{clear:true}),200);assert.deepEqual(expectStatus(await get('/experience/library',buyer),200).recently_viewed,[]);
 });
});

test('order reports, returns and pickup confirmations protect the core order flow',async t=>{
 const key='review-key-'.repeat(5),h=await startTestApp({adminToken:key});t.after(()=>h.close());const seller=await signup(h,'seller'),buyer=await signup(h,'buyer'),other=await signup(h,'other');const post=(p,u,b)=>h.request(p,{method:'POST',token:u?.token,body:b}),get=(p,u)=>h.request(p,{token:u?.token}),review=(i,decision,extra={})=>h.request(`/issues/ops/${i.id}`,{method:'POST',headers:{'x-lebse-ops-key':key},body:{version:i.version,decision,reason:'Test reviewer examined the order and submitted evidence.',...extra}});let sample,issue;
 await t.test('seller must confirm this order’s quote and package before dispatch',async()=>{
  sample=await createOrder(h,seller,buyer);expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,sample.pay),200);expectStatus(await post(`/orders/${sample.order.id}/action`,seller,{action:'ready'}),409);assert.equal(expectStatus(await get(`/orders/${sample.order.id}`,seller),200).order.state,'paid');
  expectStatus(await get(`/experience/orders/${sample.order.id}/pickup`,buyer),403);expectStatus(await post(`/experience/orders/${sample.order.id}/pickup`,seller,{quote_id:'wrong',confirmed:true}),409);expectStatus(await post(`/experience/orders/${sample.order.id}/pickup`,seller,{quote_id:sample.quote.id,confirmed:true,notes:'Ring at pickup.'}),200);assert.equal(expectStatus(await post(`/orders/${sample.order.id}/action`,seller,{action:'ready'}),200).order.pickup_confirmed,true);await h.app.processDeliveries();expectStatus(await post(`/sandbox/delivery/${sample.order.id}`,seller,{event:'picked_up'}),200);expectStatus(await post(`/sandbox/delivery/${sample.order.id}`,seller,{event:'delivered'}),200);
 });
 await t.test('buyer evidence is private and reports stop completion and payout',async()=>{
  expectStatus(await post(`/issues/order/${sample.order.id}`,other,{kind:'damaged',description:'This report does not belong to this account.'}),404);expectStatus(await post(`/issues/order/${sample.order.id}`,seller,{kind:'damaged',description:'The seller cannot impersonate the buyer.'}),403);
  issue=expectStatus(await post(`/issues/order/${sample.order.id}`,buyer,{kind:'damaged',description:'There is a tear in the sleeve that was not described.',photos:details.images}),200).issue;assert.equal(issue.evidence.length,1);assert.equal(expectStatus(await post(`/issues/order/${sample.order.id}`,buyer,{kind:'damaged',description:'Same request repeated after a network interruption.'}),200).issue.id,issue.id);
  const url=h.origin+issue.evidence[0].url;assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url,{headers:{authorization:`Bearer ${other.token}`}})).status,404);assert.equal((await fetch(url,{headers:{authorization:`Bearer ${seller.token}`}})).status,200);
  const o=expectStatus(await get(`/orders/${sample.order.id}`,buyer),200).order;assert.equal(o.safety_hold,true);assert.equal(o.payout_status,'disputed');expectStatus(await post(`/orders/${o.id}/action`,buyer,{action:'confirm'}),409);expectStatus(await post(`/orders/${o.id}/action`,buyer,{action:'cancel'}),409);expectStatus(await post(`/issues/ops/${issue.id}`,buyer,{version:issue.version,decision:'refund'}),404);
 });
 await t.test('invalid evidence rolls back and stale decisions cannot overwrite a case',async()=>{
  expectStatus(await post(`/issues/report/${issue.id}/evidence`,buyer,{version:issue.version,description:'More details about this garment.',photos:['data:image/png;base64,YmFk']}),400);assert.equal(expectStatus(await get(`/issues/order/${sample.order.id}`,buyer),200).issue.version,issue.version);
  const before=issue;issue=expectStatus(await review(issue,'request_evidence'),200).issue;expectStatus(await review(before,'reject'),409);issue=expectStatus(await post(`/issues/report/${issue.id}/evidence`,buyer,{version:issue.version,description:'The photo shows the tear on the left sleeve.',photos:[]}),200).issue;assert.equal(issue.status,'under_review');
 });
 await t.test('approved returns need buyer shipment and seller receipt before test refund',async()=>{
  expectStatus(await review(issue,'refund'),409);issue=expectStatus(await review(issue,'approve_return',{return_instructions:'Use the agreed test courier. Return delivery is covered by the seller for this test decision.'}),200).issue;expectStatus(await post(`/issues/report/${issue.id}/return_sent`,seller,{version:issue.version,tracking:'Test courier 100'}),403);issue=expectStatus(await post(`/issues/report/${issue.id}/return_sent`,buyer,{version:issue.version,tracking:'Test courier 100'}),200).issue;issue=expectStatus(await post(`/issues/report/${issue.id}/return_received`,seller,{version:issue.version,confirmed:true}),200).issue;assert.equal(issue.status,'returned');issue=expectStatus(await review(issue,'refund'),200).issue;assert.equal(issue.status,'resolved');const o=expectStatus(await get(`/orders/${sample.order.id}`,buyer),200).order;assert.equal(o.payment_status,'refunded_test');assert.equal(o.safety_hold,false);assert.equal(o.state,'cancelled');assert.equal(expectStatus(await get(`/seller/workspace`,seller),200).listings.find(p=>p.id===sample.p.id).status,'archived');
 });
 await t.test('cancellation is a request until the seller accepts, with a recorded resolution',async()=>{
  const next=await createOrder(h,seller,buyer);expectStatus(await post(`/orders/${next.order.id}/pay`,buyer,next.pay),200);let i=expectStatus(await post(`/issues/order/${next.order.id}`,buyer,{kind:'cancellation',description:'I no longer need this piece and request cancellation.'}),200).issue;assert.equal(expectStatus(await get(`/orders/${next.order.id}`,seller),200).order.state,'paid');expectStatus(await post(`/issues/report/${i.id}/accept_cancellation`,buyer,{version:i.version}),403);i=expectStatus(await post(`/issues/report/${i.id}/accept_cancellation`,seller,{version:i.version}),200).issue;assert.equal(i.status,'resolved');assert.equal(expectStatus(await get(`/orders/${next.order.id}`,buyer),200).order.payment_status,'refunded_test');
 });
 await t.test('unpaid cancellation holds survive reservation expiry without releasing another buyer’s item',async()=>{
  const next=await createOrder(h,seller,buyer);
  const i=expectStatus(await post(`/issues/order/${next.order.id}`,buyer,{kind:'cancellation',description:'Please cancel this unpaid reservation before I pay.'}),200).issue;
  await h.app.db.query("UPDATE orders SET reserved_until=now()-interval '1 minute' WHERE id=$1",[next.order.id]);
  assert.equal(expectStatus(await get(`/orders/${next.order.id}`,buyer),200).order.state,'awaiting_payment');
  const held=expectStatus(await get(`/listings/${next.p.id}`),200).listing;
  assert.equal(held.status,'reserved');expectStatus(await post('/orders',other,{listing_id:held.id,version:held.version}),409);
  expectStatus(await post(`/issues/report/${i.id}/accept_cancellation`,seller,{version:i.version}),200);
  const available=expectStatus(await get(`/listings/${next.p.id}`),200).listing;
  assert.equal(available.status,'active');const newer=expectStatus(await post('/orders',other,{listing_id:available.id,version:available.version}),200).order;
  expectStatus(await post(`/issues/report/${i.id}/accept_cancellation`,seller,{version:i.version}),409);
  assert.equal(expectStatus(await get(`/listings/${next.p.id}`),200).listing.status,'reserved');
  assert.equal(expectStatus(await get(`/orders/${newer.id}`,other),200).order.state,'awaiting_payment');
 });
 await t.test('a rejected cancellation cannot reopen after expiry and affect a later purchase',async()=>{
  const next=await createOrder(h,seller,buyer);
  let i=expectStatus(await post(`/issues/order/${next.order.id}`,buyer,{kind:'cancellation',description:'Please review this unpaid cancellation request.'}),200).issue;
  i=expectStatus(await review(i,'reject'),200).issue;
  await h.app.db.query("UPDATE orders SET reserved_until=now()-interval '1 minute' WHERE id=$1",[next.order.id]);
  assert.equal(expectStatus(await get(`/orders/${next.order.id}`,buyer),200).order.state,'cancelled');
  const available=expectStatus(await get(`/listings/${next.p.id}`),200).listing;
  expectStatus(await post('/orders',other,{listing_id:available.id,version:available.version}),200);
  expectStatus(await review(i,'reopen'),409);
  assert.equal(expectStatus(await get(`/listings/${next.p.id}`),200).listing.status,'reserved');
 });
 await t.test('review state, evidence and updates survive restart',async()=>{await h.restart();const saved=expectStatus(await get(`/issues/order/${sample.order.id}`,buyer),200).issue;assert.equal(saved.status,'resolved');assert.equal(saved.evidence.length,1);assert.ok(saved.events.some(e=>e.label==='Return sent'));});
});
