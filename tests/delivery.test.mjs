import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {startTestApp,expectStatus} from './helpers.mjs';
import {signup,createOrder,address,confirmPickup} from './fixtures.mjs';
import {mockProvider} from '../server/delivery.mjs';

test('delivery readiness: quotes, one booking, reconciliation and authenticated events',async t=>{
 const secret='local-courier-signature-test-'.repeat(2),provider={...mockProvider},h=await startTestApp({webhookSecret:secret,provider});t.after(()=>h.close());
 const seller=await signup(h,'seller'),buyer=await signup(h,'buyer'),other=await signup(h,'other');
 const post=(route,u,body)=>h.request(route,{method:'POST',token:u?.token,body});let sample,booking;
 async function webhook(body,{stamp=String(Math.floor(Date.now()/1000)),signature}={}){const raw=JSON.stringify(body);return h.request('/delivery-webhooks/mock',{method:'POST',body,headers:{'x-lebse-request':'','x-lebse-test-timestamp':stamp,'x-lebse-test-signature':signature||createHmac('sha256',secret).update(`${stamp}.${raw}`).digest('hex')}});}
 await t.test('pickup data is private; changed, missing or expired quotes cannot be paid',async()=>{
  sample=await createOrder(h,seller,buyer);
  assert.equal(expectStatus(await h.request('/delivery/pickup',{token:other.token}),200).pickup,null);
  const publicState=expectStatus(await h.request('/bootstrap'),200);assert.ok(!JSON.stringify(publicState).includes(address.street));
  expectStatus(await post(`/orders/${sample.order.id}/delivery/quote`,other,{address}),404);
  expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,{...sample.pay,delivery_quote_id:null}),409);
  expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,{...sample.pay,address:{...address,lat:8}}),409);
  await h.app.db.query("UPDATE delivery_quotes SET expires_at=now()-interval '1 second' WHERE id=$1",[sample.quote.id]);
  expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,sample.pay),409);
  sample.quote=expectStatus(await post(`/orders/${sample.order.id}/delivery/quote`,buyer,{address}),200).quote;sample.pay.delivery_quote_id=sample.quote.id;
  expectStatus(await post(`/orders/${sample.order.id}/pay`,buyer,{...sample.pay,total_minor:1}),200);
  assert.equal((await h.app.db.query('SELECT amount_minor FROM payments')).rows[0].amount_minor,115000);
 });
 await t.test('only paid and ready orders queue once; lost booking response reconciles without duplicates',async()=>{
  expectStatus(await post(`/orders/${sample.order.id}/action`,buyer,{action:'ready'}),403);
  await confirmPickup(h,seller,sample.order.id);
  expectStatus(await post(`/orders/${sample.order.id}/action`,seller,{action:'ready'}),200);
  expectStatus(await post(`/orders/${sample.order.id}/action`,seller,{action:'ready'}),200);
  assert.equal((await h.app.db.query('SELECT * FROM deliveries')).rows.length,1);
  let attempts=0;provider.book=async function(db,input){attempts++;await mockProvider.book(db,input);throw Error('Response lost');};
  await h.app.processDeliveries();assert.equal(attempts,1);assert.equal((await h.app.db.query('SELECT status FROM deliveries')).rows[0].status,'unknown');
  await h.app.db.query('UPDATE deliveries SET next_attempt_at=now()');await h.app.processDeliveries();assert.equal(attempts,1);
  booking=(await h.app.db.query('SELECT * FROM deliveries')).rows[0];assert.equal(booking.status,'booked');assert.equal((await h.app.db.query('SELECT * FROM mock_courier_bookings')).rows.length,1);provider.book=mockProvider.book;
 });
 await t.test('forged, stale and altered webhooks fail; repeats and late events cannot regress delivery',async()=>{
  const pickup={event_id:'pickup-event-1',provider_id:booking.provider_id,state:'picked_up'};
  expectStatus(await webhook(pickup,{signature:'forged'}),401);
  expectStatus(await webhook(pickup,{stamp:String(Math.floor(Date.now()/1000)-600)}),401);
  expectStatus(await webhook(pickup),200);assert.equal(expectStatus(await webhook(pickup),200).duplicate,true);
  expectStatus(await webhook({...pickup,state:'delivered',proof:{verified:true}}),409);
  expectStatus(await webhook({event_id:'delivery-event-1',provider_id:booking.provider_id,state:'delivered'}),400);
  const delivered={event_id:'delivery-event-1',provider_id:booking.provider_id,state:'delivered',proof:{verified:true,method:'local_test'}};expectStatus(await webhook(delivered),200);
  const before=(await h.app.db.query('SELECT * FROM orders WHERE id=$1',[sample.order.id])).rows[0];
  assert.equal(expectStatus(await webhook({...delivered,event_id:'delivery-event-2'}),200).applied,false);
  assert.equal(expectStatus(await webhook({...pickup,event_id:'late-pickup'}),200).applied,false);
  const after=(await h.app.db.query('SELECT * FROM orders WHERE id=$1',[sample.order.id])).rows[0];assert.equal(after.state,'delivered');assert.equal(String(after.eligible_at),String(before.eligible_at));assert.equal(after.events.length,before.events.length);
  expectStatus(await post(`/orders/${sample.order.id}/delivery/cancel`,seller,{}),409);
 });
 await t.test('courier must confirm cancellation before the seller cancels a ready order',async()=>{
  const next=await createOrder(h,seller,buyer);await post(`/orders/${next.order.id}/pay`,buyer,next.pay);await confirmPickup(h,seller,next.order.id);await post(`/orders/${next.order.id}/action`,seller,{action:'ready'});await h.app.processDeliveries();
  expectStatus(await post(`/orders/${next.order.id}/action`,seller,{action:'cancel'}),409);
  expectStatus(await post(`/orders/${next.order.id}/delivery/cancel`,seller,{}),200);
  const originalCancel=provider.cancel;provider.cancel=async()=>{throw Error('Network timeout');};await h.app.processDeliveries();assert.equal((await h.app.db.query('SELECT status FROM deliveries WHERE order_id=$1',[next.order.id])).rows[0].status,'cancel_requested');
  expectStatus(await post(`/orders/${next.order.id}/action`,seller,{action:'cancel'}),409);
  provider.cancel=originalCancel;await h.app.db.query('UPDATE deliveries SET next_attempt_at=now() WHERE order_id=$1',[next.order.id]);await h.app.processDeliveries();
  assert.equal(expectStatus(await post(`/orders/${next.order.id}/action`,seller,{action:'cancel'}),200).order.payment_status,'refunded_test');
 });
 await t.test('higher fare and a newly reported dispute stop queued dispatch',async()=>{
  const expensive=await createOrder(h,seller,buyer);await post(`/orders/${expensive.order.id}/pay`,buyer,expensive.pay);await confirmPickup(h,seller,expensive.order.id);await post(`/orders/${expensive.order.id}/action`,seller,{action:'ready'});
  provider.quote=async()=>({amount_minor:999000,currency:'ETB'});await h.app.processDeliveries();provider.quote=mockProvider.quote;
  const held=(await h.app.db.query('SELECT * FROM deliveries WHERE order_id=$1',[expensive.order.id])).rows[0];assert.equal(held.status,'needs_review');assert.equal(held.provider_id,null);
  const disputed=await createOrder(h,seller,buyer);await post(`/orders/${disputed.order.id}/pay`,buyer,disputed.pay);await confirmPickup(h,seller,disputed.order.id);await post(`/orders/${disputed.order.id}/action`,seller,{action:'ready'});
  expectStatus(await post('/security/report',buyer,{kind:'item_problem',subject_id:disputed.order.id,description:'This item has an issue that needs review before collection.'}),200);
  await h.app.processDeliveries();const d=(await h.app.db.query('SELECT * FROM deliveries WHERE order_id=$1',[disputed.order.id])).rows[0];assert.equal(d.status,'needs_review');assert.equal(d.provider_id,null);
 });
});
