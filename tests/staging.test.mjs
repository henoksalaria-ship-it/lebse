import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createApp} from '../server/index.mjs';
import {setupSecurity} from '../server/security.mjs';
import {stagingGateway} from '../server/staging-gateway.mjs';
import {stagingConfig} from '../server/staging-config.mjs';
import {postgresAdapter,connectionOptions} from '../server/postgres.mjs';
import {clientFactory,purchaseDeliveryProof} from '../scripts/staging-workflow.mjs';

const env = {LEBSE_ENV:'staging',LEBSE_TEST_MODE:'true',LEBSE_STAGING_ORIGIN:'https://lebse-staging.example.test',
  LEBSE_RENDER_ORIGIN:'https://lebse-staging-api.example.test',LEBSE_STAGING_USER:'tester',
  LEBSE_STAGING_PASSWORD_SHA256:createHash('sha256').update('test-only-password').digest('hex'),
  LEBSE_GATEWAY_SECRET:'gateway-test-'.repeat(4),LEBSE_OPS_TOKEN:'operator-test-'.repeat(4),LEBSE_TEST_WEBHOOK_SECRET:'webhook-test-'.repeat(4)};
const auth = 'Basic ' + Buffer.from('tester:test-only-password').toString('base64');

test('staging gateway fails closed and forwards only authenticated API requests', () => {
  const req = (path,headers={}) => new Request(env.LEBSE_STAGING_ORIGIN+path,{headers});
  assert.equal(stagingGateway(req('/'),{}).status,503);
  for (const path of ['/','/assets/app.js','/api/bootstrap','/api/media/photo']) assert.equal(stagingGateway(req(path),env).status,401);
  assert.equal(stagingGateway(req('/',{authorization:'Basic invalid'}),env).status,401);
  assert.equal(stagingGateway(new Request('https://other.example.test/',{headers:{authorization:auth}}),env).status,403);
  assert.equal(stagingGateway(req('/api/orders',{authorization:auth,origin:'https://evil.example.test'}),env).status,403);
  const result=stagingGateway(req('/api/bootstrap',{authorization:auth,'x-lebse-gateway':'forged',cookie:'lebse_session=test','x-lebse-client-ip':'forged'}),env);
  assert.equal(result.headers.get('x-middleware-rewrite'),env.LEBSE_RENDER_ORIGIN+'/api/bootstrap');
  assert.equal(result.headers.get('x-middleware-request-x-lebse-gateway'),env.LEBSE_GATEWAY_SECRET);
  assert.equal(result.headers.get('x-middleware-request-authorization'),null);
  assert.equal(result.headers.get('x-middleware-request-x-lebse-client-ip'),'private-staging');
  assert.equal(result.headers.get('cache-control'),'private, no-store');
});

test('hosted configuration rejects public mode, unsafe TLS and reused secrets', () => {
  assert.equal(stagingConfig(env).origin,env.LEBSE_STAGING_ORIGIN);
  for (const change of [{LEBSE_ENV:'production'},{LEBSE_TEST_MODE:'false'},{LEBSE_STAGING_ORIGIN:'http://test.local'},
    {LEBSE_GATEWAY_SECRET:'short'},{LEBSE_OPS_TOKEN:env.LEBSE_GATEWAY_SECRET},{PORT:'-1'}]) assert.throws(()=>stagingConfig({...env,...change}));
  assert.throws(()=>connectionOptions({DATABASE_URL:'postgres://test:secret@db.example.test/db?sslmode=no-verify'}));
  const options=connectionOptions({DATABASE_URL:'postgres://test:secret@db.example.test/db'});
  assert.equal(options.ssl.rejectUnauthorized,true); assert.equal(options.max,4);
  assert.throws(()=>options.types.getTypeParser(20)('9007199254740993'));
});

test('PostgreSQL adapter keeps all transactional work on one connection and rolls back errors', async () => {
  const calls=[],client={query:async(sql,args)=>{calls.push(sql);return {rows:[{ok:true}]};},release:()=>calls.push('release')};
  const db=postgresAdapter({connect:async()=>client,end:async()=>{}});
  await db.transaction(async tx=>{await tx.query('UPDATE test SET value=$1',[1]);});
  assert.deepEqual(calls.slice(-3),['UPDATE test SET value=$1','COMMIT','release']);
  assert.ok(calls.includes('SELECT pg_advisory_xact_lock(726194, 1)'));
  calls.length=0;await assert.rejects(db.transaction(async()=>{throw Error('failed');}));
  assert.deepEqual(calls.slice(-2),['ROLLBACK','release']);
});

test('private staging gate, secure cookies and complete simulated purchase/delivery workflow', async t => {
  const db=new PGlite();await db.waitReady;
  for (const file of ['schema.sql','security-schema.sql','delivery-schema.sql','seller-schema.sql','experience-schema.sql']) await db.exec(await readFile(new URL('../server/'+file,import.meta.url),'utf8'));
  await setupSecurity(db);await db.exec("CREATE TABLE staging_metadata(id boolean PRIMARY KEY,environment text); INSERT INTO staging_metadata VALUES(true,'staging');");
  const app=await createApp({database:db,staging:stagingConfig(env),seed:false,migrate:false,deliveryWorker:false,webhookSecret:env.LEBSE_TEST_WEBHOOK_SECRET});
  t.after(()=>app.close());const base=`http://127.0.0.1:${await app.start(0)}`;
  assert.equal((await fetch(base+'/healthz')).status,200);
  assert.equal((await fetch(base+'/api/bootstrap')).status,404);
  assert.equal((await fetch(base+'/api/bootstrap',{headers:{'x-lebse-gateway':'forged'}})).status,404);
  assert.equal((await fetch(base+'/api/bootstrap',{headers:{'x-lebse-gateway':env.LEBSE_GATEWAY_SECRET,origin:'https://evil.example.test'}})).status,403);
  const gateway={'x-lebse-gateway':env.LEBSE_GATEWAY_SECRET,origin:env.LEBSE_STAGING_ORIGIN};
  const proof=await purchaseDeliveryProof({makeClient:clientFactory(base,gateway),webhookSecret:env.LEBSE_TEST_WEBHOOK_SECRET,processJobs:()=>app.processDeliveries()});
  assert.equal(proof.state,'completed');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM payments')).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM mock_courier_bookings')).rows[0].n,1);
  const consent=await fetch(base+'/api/consent',{method:'POST',headers:{...gateway,'content-type':'application/json','x-lebse-request':'1'},body:JSON.stringify({version:'2026-09-09-1',external_media:false})});
  assert.match(consent.headers.get('set-cookie'),/; Secure/);
  assert.match(consent.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
});
