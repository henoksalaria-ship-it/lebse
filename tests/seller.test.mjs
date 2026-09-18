import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startTestApp,expectStatus} from './helpers.mjs';
import {signup,details,createOrder} from './fixtures.mjs';
import {raiseCase} from '../server/security.mjs';
const draftData={...details,flaws:''};
test('seller workspace: private drafts, listing lifecycle and preserved history',async t=>{
 const h=await startTestApp();t.after(()=>h.close());const seller=await signup(h,'seller'),buyer=await signup(h,'buyer'),outsider=await signup(h,'outsider');
 const post=(route,u,body)=>h.request(route,{method:'POST',token:u.token,body});const get=(route,u)=>h.request(route,{token:u?.token});
 const key=randomUUID();let d,p,offer;
 await t.test('incomplete drafts and their uploaded photos stay private',async()=>{
  d=expectStatus(await post(`/seller/drafts/${key}`,seller,{data:{...draftData,name:'',brand:'',description:'',price:''},step:'photos',version:0,request_id:'save-request-one'}),200).draft;
  assert.equal(d.data.name,'');assert.match(d.data.images[0],/^\/api\/media\//);
  expectStatus(await get(`/seller/drafts/${key}`,buyer),404);expectStatus(await get('/seller/workspace'),401);
  assert.equal(expectStatus(await get('/bootstrap',buyer),200).listings.length,0);
  assert.equal(expectStatus(await get('/seller/workspace',buyer),200).drafts.length,0);
  const photo=await fetch(h.origin+d.data.images[0]);assert.equal(photo.status,404);
  const ownPhoto=await fetch(h.origin+d.data.images[0],{headers:{authorization:`Bearer ${seller.token}`}});assert.equal(ownPhoto.status,200);
 });
 await t.test('save retries do not duplicate photos and stale versions cannot overwrite drafts',async()=>{
  const body={data:{...draftData,images:d.data.images},step:'details',version:d.version,request_id:'save-request-two'};
  d=expectStatus(await post(`/seller/drafts/${key}`,seller,body),200).draft;
  assert.equal(expectStatus(await post(`/seller/drafts/${key}`,seller,body),200).draft.version,d.version);
  expectStatus(await post(`/seller/drafts/${key}`,seller,{...body,request_id:'save-stale-window'}),409);
  expectStatus(await post(`/seller/drafts/${key}`,buyer,{...body,version:d.version}),404);
  assert.equal((await h.app.db.query('SELECT * FROM media')).rows.length,1);
 });
 await t.test('draft survives restart and publishes exactly once from its saved state',async()=>{
  await h.restart();d=expectStatus(await get(`/seller/drafts/${key}`,seller),200).draft;assert.equal(d.step,'details');assert.equal(d.data.name,details.name);
  expectStatus(await post('/listings',seller,{draft_id:key,draft_version:d.version-1}),409);
  p=expectStatus(await post('/listings',seller,{draft_id:key,draft_version:d.version,price:1,seller_id:buyer.user.id}),200).listing;
  assert.equal(p.price,1000);assert.equal(p.seller_id,seller.user.id);assert.equal(expectStatus(await post('/listings',seller,{draft_id:key,draft_version:d.version}),200).listing.id,p.id);
  assert.equal(expectStatus(await get('/seller/workspace',seller),200).drafts.length,0);
  expectStatus(await post(`/seller/drafts/${key}`,seller,{data:d.data,step:'details',version:d.version,request_id:'save-after-publish'}),409);
  assert.equal((await fetch(h.origin+p.image)).status,200);
 });
 await t.test('pause hides the piece and expires open offers; stale buyer actions fail',async()=>{
  offer=expectStatus(await post('/offers',buyer,{listing_id:p.id,amount:800}),200).offer;
  expectStatus(await post(`/seller/listings/${p.id}/pause`,outsider,{version:p.version}),404);
  const old=p;p=expectStatus(await post(`/seller/listings/${p.id}/pause`,seller,{version:p.version}),200).listing;assert.equal(p.status,'paused');
  assert.equal(expectStatus(await get('/bootstrap',buyer),200).listings.length,0);expectStatus(await get(`/listings/${p.id}`,buyer),404);
  expectStatus(await post('/orders',buyer,{listing_id:p.id,version:old.version}),409);expectStatus(await post(`/offers/${offer.id}/action`,seller,{action:'accept'}),409);
  assert.equal(expectStatus(await get('/seller/workspace',seller),200).listings[0].status,'paused');
 });
 await t.test('paused listings can be edited and resumed without reviving old offers',async()=>{
  p=expectStatus(await h.request(`/listings/${p.id}`,{method:'PATCH',token:seller.token,body:{...p,price:1200,description:'An updated description with fresh fit and condition details.'}}),200).listing;assert.equal(p.status,'paused');
  expectStatus(await post(`/seller/listings/${p.id}/resume`,seller,{version:p.version-1}),409);
  p=expectStatus(await post(`/seller/listings/${p.id}/resume`,seller,{version:p.version}),200).listing;assert.equal(p.status,'active');
  expectStatus(await post(`/offers/${offer.id}/action`,seller,{action:'accept'}),409);
 });
 await t.test('archiving and relisting creates a new draft while preventing duplicate active relists',async()=>{
  p=expectStatus(await post(`/seller/listings/${p.id}/archive`,seller,{version:p.version}),200).listing;
  expectStatus(await post(`/seller/listings/${p.id}/relist`,seller,{version:p.version}),400);
  const copied=expectStatus(await post(`/seller/listings/${p.id}/relist`,seller,{version:p.version,confirm_available:true}),200).draft;
  const duplicate=expectStatus(await post(`/seller/listings/${p.id}/relist`,seller,{version:p.version,confirm_available:true}),200).draft;assert.equal(copied.id,duplicate.id);
  const fresh=expectStatus(await post('/listings',seller,{draft_id:copied.id,draft_version:copied.version}),200).listing;assert.notEqual(fresh.id,p.id);assert.equal(fresh.price,1200);
  assert.equal(expectStatus(await get(`/listings/${p.id}`,seller),200).listing.status,'archived');
  expectStatus(await post(`/seller/listings/${p.id}/relist`,seller,{version:p.version,confirm_available:true}),409);
 });
 await t.test('reserved and sold listings cannot pause, archive or relist; orders stay intact',async()=>{
  const sale=await createOrder(h,seller,buyer);let product=expectStatus(await get(`/listings/${sale.p.id}`,seller),200).listing;
  for(const action of ['pause','archive','relist'])expectStatus(await post(`/seller/listings/${product.id}/${action}`,seller,{version:product.version,confirm_available:true}),409);
  expectStatus(await post(`/orders/${sale.order.id}/pay`,buyer,sale.pay),200);product=expectStatus(await get(`/listings/${product.id}`,seller),200).listing;
  expectStatus(await post(`/seller/listings/${product.id}/relist`,seller,{version:product.version,confirm_available:true}),409);
  const workspace=expectStatus(await get('/seller/workspace',seller),200);assert.equal(workspace.sales[0].id,sale.order.id);assert.equal(workspace.sales[0].address,undefined);assert.equal(workspace.sales[0].payment_status,'paid');
 });
 await t.test('fraud checks apply at publication and source holds cannot be bypassed through relisting',async()=>{
  const suspect=expectStatus(await post(`/seller/drafts/${randomUUID()}`,seller,{data:{...draftData,name:'Replica designer bag'},step:'details',version:0,request_id:'suspect-save'}),200).draft;
  expectStatus(await post('/listings',seller,{draft_id:suspect.id,draft_version:suspect.version}),409);
  const plain=expectStatus(await post('/listings',seller,details),200).listing;const old=expectStatus(await post(`/seller/listings/${plain.id}/archive`,seller,{version:plain.version}),200).listing;
  const draft=expectStatus(await post(`/seller/listings/${old.id}/relist`,seller,{version:old.version,confirm_available:true}),200).draft;
  await raiseCase(h.app.db,seller.user,'listing',old.id,'source_review',true);
  expectStatus(await post('/listings',seller,{draft_id:draft.id,draft_version:draft.version}),409);
 });
});
