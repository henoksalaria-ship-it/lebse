import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {startTestApp,expectStatus} from './helpers.mjs';
import {signup,createOrder} from './fixtures.mjs';
import {encryptBackup,decryptBackup,verifyBackup} from '../server/operations.mjs';

test('encrypted backups, isolated recovery, and restricted operational monitoring',async t=>{
 const key='ab'.repeat(32),adminToken='private-test-operations-key-'.repeat(2);
 const h=await startTestApp({adminToken,backupKey:key});t.after(()=>h.close());
 const seller=await signup(h,'seller'),buyer=await signup(h,'buyer');const sample=await createOrder(h,seller,buyer);
 const headers={'x-lebse-ops-key':adminToken};
 await t.test('ordinary accounts cannot inspect queues or download backups',async()=>{
  expectStatus(await h.request('/security/monitor',{token:buyer.token}),404);
  expectStatus(await h.request('/security/backup',{method:'POST',token:buyer.token,body:{}}),404);
 });
 await t.test('snapshot restores accounts, orders and media without touching live data',async()=>{
  const backup=expectStatus(await h.request('/security/backup',{method:'POST',body:{},headers}),200);assert.match(backup.id,/\.enc$/);assert.equal(backup.sha256.length,64);
  const restored=await verifyBackup(path.join(path.dirname(h.dataDir),'backups',backup.id),key);assert.equal(restored.isolated,true);assert.equal(restored.counts.users,2);assert.equal(restored.counts.orders,1);assert.equal(restored.counts.media,1);
  assert.equal(expectStatus(await h.request(`/orders/${sample.order.id}`,{token:buyer.token}),200).order.state,'awaiting_payment');
 });
 await t.test('monitor surfaces aged pending payments without exposing customer records',async()=>{
  expectStatus(await h.request(`/orders/${sample.order.id}/pay`,{method:'POST',token:buyer.token,body:{...sample.pay,outcome:'pending'}}),200);
  await h.app.db.query("UPDATE orders SET updated_at=now()-interval '20 minutes' WHERE id=$1",[sample.order.id]);
  const monitor=expectStatus(await h.request('/security/monitor',{headers}),200);assert.equal(monitor.attention,true);assert.equal(monitor.metrics.pending_payment_attention,1);assert.ok(!JSON.stringify(monitor).includes(buyer.user.id));
 });
});

test('backup encryption rejects tampering and wrong keys',()=>{
 const key='ab'.repeat(32),encrypted=encryptBackup(Buffer.from('private snapshot'),key);assert.equal(decryptBackup(encrypted,key).toString(),'private snapshot');assert.throws(()=>decryptBackup(encrypted,'cd'.repeat(32)));const broken=JSON.parse(encrypted);broken.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(broken)),key));assert.throws(()=>encryptBackup(Buffer.from('data'),'short'));
});
