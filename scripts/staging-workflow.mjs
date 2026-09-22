import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function clientFactory(base, headers = {}) {
  return () => {
    let session = '', csrf = '';
    return async (route, body, extra = {}) => {
      const response = await fetch(`${base}/api${route}`, {method: body === undefined ? 'GET' : 'POST',
        redirect:'error', signal:AbortSignal.timeout(30000), headers:{...headers,...extra,
          ...(session ? {cookie:session} : {}), ...(body === undefined ? {} : {'content-type':'application/json','x-lebse-request':'1','x-csrf-token':csrf})},
        ...(body === undefined ? {} : {body:JSON.stringify(body)})});
      for (const value of response.headers.getSetCookie()) if (value.startsWith('lebse_session=')) session = value.split(';')[0];
      const data = await response.json();
      if (!response.ok) throw new Error(`Workflow stopped at ${route}: HTTP ${response.status}`);
      if ('csrf' in data) csrf = data.csrf || '';
      return data;
    };
  };
}

export async function purchaseDeliveryProof({makeClient, webhookSecret, processJobs, allowLocal = false}) {
  const guest = makeClient(), seller = makeClient(), buyer = makeClient();
  const health = await guest('/health');
  assert.ok(health.mode === 'private-staging' || allowLocal && health.mode === 'local-sandbox');
  assert.equal(health.payments,'simulated'); assert.equal(health.delivery,'mock');
  const legal = await guest('/legal'), run = randomUUID().slice(0,8);
  const account = role => ({name:`QA ${role} ${run}`,username:`qa.${role}.${run}`,email:`qa.${role}.${run}@example.test`,
    shopping_interest:'both',password:randomBytes(24).toString('hex'),accept_terms:true,age_confirmed:true,terms_version:legal.version});
  await seller('/auth/signup',account('seller')); await buyer('/auth/signup',account('buyer'));
  const address = {name:'QA recipient',phone:'0911223344',street:'Fictional staging address — no delivery',area:'Bole',lat:9,lon:38.7};
  await seller('/delivery/pickup',{address,parcel:{weight_kg:1,length_cm:30,width_cm:25,height_cm:8}});
  const listing = (await seller('/listings',{name:`QA staging cotton shirt ${run}`,price:1000,brand:'Unbranded',size:'M',category:'Tops',condition:'Good',
    description:'Fictional staging piece for automated purchase and delivery verification.',allow_offers:true,
    images:['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=']})).listing;
  assert.ok((await buyer('/bootstrap')).listings.some(p => p.id === listing.id));
  const order = (await buyer('/orders',{listing_id:listing.id,version:listing.version})).order;
  const quote = (await buyer(`/orders/${order.id}/delivery/quote`,{address})).quote;
  const payment = {address,delivery_quote_id:quote.id,outcome:'success',idempotency_key:randomUUID()};
  assert.equal((await buyer(`/orders/${order.id}/pay`,payment)).order.payment_status,'paid');
  assert.equal((await buyer(`/orders/${order.id}/pay`,payment)).order.payment_status,'paid');
  await seller(`/experience/orders/${order.id}/pickup`,{quote_id:quote.id,confirmed:true,notes:'Synthetic staging test.'});
  await seller(`/orders/${order.id}/action`,{action:'ready'});
  if (processJobs) await processJobs();
  let current;
  const until = Date.now() + 60000;
  do {
    current = (await buyer(`/orders/${order.id}`)).order;
    if (current.fulfillment?.status === 'booked') break;
    await new Promise(resolve => setTimeout(resolve,1500));
  } while (Date.now() < until);
  assert.equal(current.fulfillment?.status,'booked','The independent worker must create a booking.');
  const provider = current.fulfillment.provider_id;
  async function webhook(body) {
    const stamp = String(Math.floor(Date.now()/1000));
    return guest('/delivery-webhooks/mock',body,{'x-lebse-test-timestamp':stamp,
      'x-lebse-test-signature':createHmac('sha256',webhookSecret).update(`${stamp}.${JSON.stringify(body)}`).digest('hex')});
  }
  await webhook({event_id:randomUUID(),provider_id:provider,state:'picked_up'});
  assert.equal((await buyer(`/orders/${order.id}`)).order.state,'in_transit');
  const delivered = {event_id:randomUUID(),provider_id:provider,state:'delivered',proof:{verified:true,method:'synthetic_staging'}};
  await webhook(delivered); assert.equal((await webhook(delivered)).duplicate,true);
  assert.equal((await buyer(`/orders/${order.id}`)).order.state,'delivered');
  await buyer(`/orders/${order.id}/action`,{action:'confirm'});
  const complete = (await buyer(`/orders/${order.id}`)).order;
  assert.equal(complete.state,'completed'); assert.equal(complete.payment_status,'paid');
  assert.equal(complete.payout_status,'holding'); assert.equal(complete.total,1150);
  await seller('/auth/logout',{}); await buyer('/auth/logout',{});
  return {mode:health.mode,listing_id:listing.id,order_id:order.id,booking_reference:provider,
    total_etb:complete.total,state:complete.state,payout:'holding',payments:'simulated',delivery:'mock',
    checks:['listing visible','payment retry safe','worker booked','signed pickup','signed delivery','duplicate event safe','buyer confirmed']};
}

async function main() {
  const origin = new URL(process.env.LEBSE_STAGING_ORIGIN || 'invalid:');
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('Exact staging HTTPS origin required.');
  const user = process.env.LEBSE_STAGING_USER, password = process.env.LEBSE_STAGING_PASSWORD;
  if (!user || !password || !process.env.LEBSE_TEST_WEBHOOK_SECRET) throw new Error('Staging test credentials required.');
  const unauthenticated = await fetch(`${origin.origin}/api/bootstrap`,{redirect:'manual'});
  assert.equal(unauthenticated.status,401,'The staging website must reject unauthenticated access.');
  const proof = await purchaseDeliveryProof({makeClient:clientFactory(origin.origin,{authorization:`Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`}),webhookSecret:process.env.LEBSE_TEST_WEBHOOK_SECRET});
  console.log(JSON.stringify(proof,null,2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  console.error('Staging workflow did not pass. Inspect the staging API and worker logs; no success is claimed.');process.exitCode=1;
});

