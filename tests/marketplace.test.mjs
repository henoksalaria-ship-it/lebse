import {confirmPickup} from './fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestApp,expectStatus,TEST_PASSWORD} from './helpers.mjs';
import {legal} from '../server/security.mjs';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
const details={name:'Test cotton summer shirt',price:1000,brand:'Unbranded',size:'M',category:'Tops',condition:'Good',description:'A soft cotton shirt in good condition with a relaxed fit.',flaws:'Small mark inside the collar',allow_offers:true,images:[image]};
const address={name:'Test Buyer',phone:'0911223344',street:'Test street 10',area:'Bole',lat:9,lon:38.7};

test('persistent marketplace: separate identities, offers, payment, delivery, reviews and conflicts',async t=>{
 const h=await startTestApp();t.after(()=>h.close());
 const post=(route,token,body)=>h.request(route,{method:'POST',token,body});
 const signup=async(name)=>expectStatus(await post('/auth/signup',null,{name,username:name,email:`${name}@example.test`,password:TEST_PASSWORD,accept_terms:true,age_confirmed:true,terms_version:legal.version}),200);
 const seller=await signup('seller'),buyer=await signup('buyer'),outsider=await signup('outsider');let listing,order,conversation,quoteId;expectStatus(await post('/delivery/pickup',seller.token,{address,parcel:{weight_kg:1,length_cm:30,width_cm:25,height_cm:8}}),200);
 await t.test('private data and sessions are scoped to each account',async()=>{
  expectStatus(await h.request('/me'),401);expectStatus(await post('/auth/login',null,{email:'buyer@example.test',password:'WrongPassword2026'}),401);
  const b=expectStatus(await h.request('/bootstrap',{token:buyer.token}),200);assert.equal(b.user.id,buyer.user.id);assert.equal(b.user.email,undefined);assert.equal(b.user.password_hash,undefined);assert.deepEqual(b.orders,[]);
  expectStatus(await h.request('/auth/logout',{token:buyer.token}),405);
 });
 await t.test('seller publishes real uploaded media, buyer sees it and cannot edit',async()=>{
  expectStatus(await post('/listings',null,details),401);
  listing=expectStatus(await post('/listings',seller.token,{...details,seller_id:buyer.user.id,price_minor:1,status:'sold'}),200).listing;
  assert.equal(listing.seller_id,seller.user.id);assert.equal(listing.price,1000);assert.equal(listing.status,'active');assert.match(listing.image,/^\/api\/media\//);
  const res=await fetch(h.origin+listing.image);assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'image/png');assert.ok((await res.arrayBuffer()).byteLength>20);
  expectStatus(await h.request(`/listings/${listing.id}`,{method:'PATCH',token:buyer.token,body:{...details,version:listing.version}}),403);
  expectStatus(await post('/listings',seller.token,{...details,images:['data:image/png;base64,YmFk']}),400);
  expectStatus(await post(`/saved/${listing.id}`,buyer.token,{saved:true}),200);
  assert.deepEqual(expectStatus(await h.request('/bootstrap',{token:buyer.token}),200).saved,[listing.id]);
  assert.deepEqual(expectStatus(await h.request('/bootstrap',{token:seller.token}),200).saved,[]);
 });
 await t.test('chat privacy, message retry and negotiation permissions',async()=>{
  const offer=expectStatus(await post('/offers',buyer.token,{listing_id:listing.id,amount:800}),200);conversation=offer.conversation_id;
  expectStatus(await h.request(`/conversations/${conversation}`,{token:outsider.token}),404);
  expectStatus(await post(`/offers/${offer.offer.id}/action`,buyer.token,{action:'accept'}),403);
  expectStatus(await post(`/conversations/${conversation}/messages`,buyer.token,{body:'Can you confirm the fabric?',client_message_id:'first-message-1'}),200);
  expectStatus(await post(`/conversations/${conversation}/messages`,buyer.token,{body:'Can you confirm the fabric?',client_message_id:'first-message-1'}),200);
  const chat=expectStatus(await h.request(`/conversations/${conversation}`,{token:seller.token}),200).conversation;
  assert.equal(chat.messages.filter(m=>m.client_message_id==='first-message-1').length,1);
  const counter=expectStatus(await post(`/offers/${offer.offer.id}/action`,seller.token,{action:'counter',amount:900}),200);
  assert.equal(counter.offer.proposer_id,seller.user.id);
  expectStatus(await post(`/offers/${offer.offer.id}/action`,seller.token,{action:'accept'}),409);
  order=expectStatus(await post(`/offers/${counter.offer.id}/action`,buyer.token,{action:'accept',version:counter.offer.version}),200).order;
  assert.equal(order.buyer_id,buyer.user.id);assert.equal(order.amount,900);assert.equal(order.total,1050);assert.equal(order.state,'awaiting_payment');
  expectStatus(await post('/orders',outsider.token,{listing_id:listing.id,version:listing.version}),409);
 });
 await t.test('failure, pending, success and idempotency keep one correct payment',async()=>{
  expectStatus(await post(`/orders/${order.id}/pay`,seller.token,{address,delivery_quote_id:quoteId,outcome:'success',idempotency_key:'seller-pay'}),403);
  quoteId=expectStatus(await post(`/orders/${order.id}/delivery/quote`,buyer.token,{address}),200).quote.id;
  const failed=expectStatus(await post(`/orders/${order.id}/pay`,buyer.token,{address,delivery_quote_id:quoteId,outcome:'failure',idempotency_key:'failed-attempt-1'}),200).order;assert.equal(failed.payment_status,'failed');
  const pending=expectStatus(await post(`/orders/${order.id}/pay`,buyer.token,{address,delivery_quote_id:quoteId,outcome:'pending',idempotency_key:'pending-attempt-1',total_minor:1}),200).order;assert.equal(pending.payment_status,'pending');
  expectStatus(await post(`/orders/${order.id}/pay`,buyer.token,{address,delivery_quote_id:quoteId,outcome:'success',idempotency_key:'new-attempt-1'}),409);
  expectStatus(await post(`/orders/${order.id}/action`,buyer.token,{action:'cancel'}),409);
  order=expectStatus(await post(`/sandbox/payment/${order.id}`,buyer.token,{outcome:'success'}),200).order;assert.equal(order.payment_status,'paid');assert.equal(order.total,1050);
  const duplicate=expectStatus(await post(`/orders/${order.id}/pay`,buyer.token,{address,delivery_quote_id:quoteId,outcome:'pending',idempotency_key:'pending-attempt-1'}),200);assert.equal(duplicate.order.payment_status,'paid');
  const payments=(await h.app.db.query('SELECT * FROM payments WHERE order_id=$1',[order.id])).rows;assert.equal(payments.length,2);assert.equal(payments.filter(p=>p.state==='succeeded').length,1);assert.equal(payments[1].amount_minor,105000);
  expectStatus(await h.request(`/orders/${order.id}`,{token:outsider.token}),404);
  const sellerOrder=expectStatus(await h.request(`/orders/${order.id}`,{token:seller.token}),200).order;assert.equal(sellerOrder.address,undefined);assert.equal(sellerOrder.state,'paid');
 });
 await t.test('fulfillment requires payment, seller role and delivery evidence',async()=>{
  expectStatus(await post(`/orders/${order.id}/action`,buyer.token,{action:'ready'}),403);
  expectStatus(await post(`/orders/${order.id}/action`,buyer.token,{action:'confirm'}),409);
  expectStatus(await post(`/orders/${order.id}/action`,seller.token,{action:'prepare'}),200);
  await confirmPickup(h,seller,order.id);
  expectStatus(await post(`/orders/${order.id}/action`,seller.token,{action:'ready'}),200);
  await h.app.processDeliveries();
  expectStatus(await post(`/sandbox/delivery/${order.id}`,outsider.token,{event:'picked_up'}),404);
  expectStatus(await post(`/sandbox/delivery/${order.id}`,seller.token,{event:'delivered'}),409);
  expectStatus(await post(`/sandbox/delivery/${order.id}`,seller.token,{event:'picked_up'}),200);
  expectStatus(await post(`/sandbox/delivery/${order.id}`,seller.token,{event:'delivered'}),200);
  order=expectStatus(await post(`/orders/${order.id}/action`,buyer.token,{action:'confirm'}),200).order;
  assert.equal(order.state,'completed');assert.equal(order.payout_status,'holding');assert.ok(order.events.some(e=>e.source==='sandbox_courier'));
  expectStatus(await post(`/orders/${order.id}/review`,seller.token,{rating:5,comment:'Mine'}),403);
  expectStatus(await post(`/orders/${order.id}/review`,buyer.token,{rating:5,comment:'Lovely piece, exactly as described.'}),200);
  expectStatus(await post(`/orders/${order.id}/review`,buyer.token,{rating:4,comment:'Duplicate'}),409);
  const closet=expectStatus(await h.request(`/users/${seller.user.id}/closet`),200);assert.equal(closet.seller.review_count,1);assert.equal(Number(closet.seller.rating),5);
 });
 await t.test('concurrent buyers cannot purchase one item twice; expirations release unpaid stock',async()=>{
  const p=expectStatus(await post('/listings',seller.token,details),200).listing;
  const attempts=await Promise.all([buyer,outsider].map(u=>post('/orders',u.token,{listing_id:p.id,version:p.version})));
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
  const reservation=attempts.find(r=>r.status===200).data.order;
  await h.app.db.query("UPDATE orders SET reserved_until=now()-interval '1 minute' WHERE id=$1",[reservation.id]);
  const released=expectStatus(await h.request(`/listings/${p.id}`),200).listing;assert.equal(released.status,'active');
  const o=expectStatus(await post('/orders',outsider.token,{listing_id:p.id,version:released.version}),200).order;
  expectStatus(await post(`/orders/${o.id}/action`,seller.token,{action:'ready'}),409);
  expectStatus(await post(`/orders/${o.id}/action`,outsider.token,{action:'cancel'}),200);
 });
 await t.test('editing expires offers and stale edits fail; old offers expire after 24 hours',async()=>{
  const p=expectStatus(await post('/listings',seller.token,details),200).listing;
  const offer=expectStatus(await post('/offers',buyer.token,{listing_id:p.id,amount:800}),200).offer;
  expectStatus(await h.request(`/listings/${p.id}`,{method:'PATCH',token:seller.token,body:{...details,version:p.version,price:1100}}),200);
  expectStatus(await post(`/offers/${offer.id}/action`,seller.token,{action:'accept'}),409);
  expectStatus(await h.request(`/listings/${p.id}`,{method:'PATCH',token:seller.token,body:{...details,version:p.version}}),409);
  const expiring=expectStatus(await post('/offers',buyer.token,{listing_id:p.id,amount:900}),200).offer;
  await h.app.db.query("UPDATE offers SET expires_at=now()-interval '1 minute' WHERE id=$1",[expiring.id]);
  expectStatus(await post(`/offers/${expiring.id}/action`,seller.token,{action:'accept'}),409);
 });
 await t.test('direct purchases create chat; cancellation keeps public order photos available',async()=>{
  const p=expectStatus(await post('/listings',seller.token,details),200).listing;
  const o=expectStatus(await post('/orders',buyer.token,{listing_id:p.id,version:p.version}),200).order;
  const inbox=expectStatus(await h.request('/bootstrap',{token:seller.token}),200).conversations;
  assert.ok(inbox.some(c=>c.listing_id===p.id&&c.buyer_id===buyer.user.id));
  quoteId=expectStatus(await post(`/orders/${o.id}/delivery/quote`,buyer.token,{address}),200).quote.id;
  expectStatus(await post(`/orders/${o.id}/pay`,buyer.token,{address,delivery_quote_id:quoteId,outcome:'success',idempotency_key:'cancel-payment-test'}),200);
  const cancelled=expectStatus(await post(`/orders/${o.id}/action`,seller.token,{action:'cancel'}),200).order;
  assert.equal(cancelled.payment_status,'refunded_test');
  expectStatus(await h.request(`/listings/${p.id}`,{token:buyer.token}),404);
  const photo=await fetch(h.origin+p.image);assert.equal(photo.status,200);
 });
 await t.test('database restart preserves accounts, uploaded pieces, chats, saves, orders and reviews',async()=>{
  await h.restart();
  const persisted=expectStatus(await h.request('/bootstrap',{token:buyer.token}),200);
  assert.ok(persisted.saved.includes(listing.id));assert.ok(persisted.conversations.some(c=>c.id===conversation));
  const complete=persisted.orders.find(o=>o.id===order.id);assert.equal(complete.state,'completed');assert.equal(complete.review.rating,5);
  expectStatus(await post('/auth/login',null,{email:'seller@example.test',password:TEST_PASSWORD}),200);
  expectStatus(await post('/auth/logout',buyer.token,{}),200);expectStatus(await h.request('/me',{token:buyer.token}),401);
 });
});
