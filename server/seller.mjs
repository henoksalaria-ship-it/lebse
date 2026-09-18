import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {first,digest,audit,listingCheck,orderHold,holdResponse} from './security.mjs';
export async function setupSeller(db){await db.exec(await readFile(new URL('./seller-schema.sql',import.meta.url),'utf8'));}
export async function ownedDraft(db,id,user,fail){const d=await first(db,'SELECT * FROM listing_drafts WHERE id=$1 AND seller_id=$2',[id,user.id]);if(!d)fail('Draft unavailable.',404);return d;}
export async function ownedPhoto(db,image,user){return typeof image==='string'&&/^\/api\/media\/[^/]+$/.test(image)&&!!await first(db,'SELECT id FROM media WHERE id=$1 AND owner_id=$2',[image.split('/').pop(),user.id]);}
export async function sellerRoutes({db,req,body,user,fail,listing,order,upload}){
 const path=req.url.split('?')[0],method=req.method;
 if(path==='/api/seller/workspace'){
  if(method!=='GET')fail('Method not allowed.',405);
  const listings=[];for(const p of (await db.query('SELECT id FROM listings WHERE seller_id=$1 ORDER BY updated_at DESC,id',[user.id])).rows)listings.push(await listing(db,p.id));
  const drafts=(await db.query('SELECT * FROM listing_drafts WHERE seller_id=$1 AND published_listing_id IS NULL ORDER BY updated_at DESC,id',[user.id])).rows;
  const sales=[];for(const o of (await db.query('SELECT id FROM orders WHERE seller_id=$1 ORDER BY created_at DESC',[user.id])).rows)sales.push(await order(db,o.id,user));
  return {listings,drafts,sales};
 }
 const draftRoute=path.match(/^\/api\/seller\/drafts\/([^/]+)$/);
 if(draftRoute){const id=draftRoute[1];if(method==='GET')return {draft:await ownedDraft(db,id,user,fail)};if(method!=='POST')fail('Method not allowed.',405);
  if(!/^[a-f0-9-]{36}$/i.test(id))fail('Invalid draft reference.');const existing=await first(db,'SELECT * FROM listing_drafts WHERE id=$1',[id]);if(existing&&existing.seller_id!==user.id)fail('Draft unavailable.',404);if(existing?.published_listing_id)fail('This draft is already published. Open the listing to edit it.',409);
  if(typeof body.request_id!=='string'||body.request_id.length<8||body.request_id.length>100)fail('Add a save reference.');const requestHash=digest(JSON.stringify({data:body.data,step:body.step,version:body.version}));
  if(existing?.last_request_id===body.request_id){if(existing.last_request_hash!==requestHash)fail('Save reference already used.',409);return {draft:existing};}
  if(body.version!==(existing?.version||0))fail('This draft changed in another window. Reload the saved draft before editing.',409,'draft_conflict');
  if(!['photos','details'].includes(body.step)||!body.data||typeof body.data!=='object'||Array.isArray(body.data))fail('Invalid draft.');const p=body.data,data={};
  for(const [k,max] of [['name',80],['brand',60],['size',20],['category',30],['condition',30],['description',2000],['flaws',1000]]){if(typeof p[k]!=='string'||p[k].length>max)fail(`Check the ${k} field.`);data[k]=p[k];}
  if(!['', 'Like new','Good','Fair'].includes(data.condition)||!['','Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories'].includes(data.category))fail('Choose a valid category and condition.');
  if(typeof p.allow_offers!=='boolean'||!['string','number'].includes(typeof p.price)||String(p.price).length>12)fail('Check price and offer settings.');data.price=p.price;data.allow_offers=p.allow_offers;
  if(!Array.isArray(p.images)||p.images.length>6)fail('Choose up to six photos.');data.images=[];
  for(const image of p.images){if(await ownedPhoto(db,image,user)||existing?.data.images?.includes(image))data.images.push(image);else data.images.push(await upload(db,user,image));}
  if(!existing){const n=await first(db,'SELECT count(*)::int AS n FROM listing_drafts WHERE seller_id=$1 AND published_listing_id IS NULL',[user.id]);if(n.n>=100)fail('You have 100 drafts. Publish an existing draft before adding another.',409);}
  await db.query('INSERT INTO listing_drafts(id,seller_id,data,step,last_request_id,last_request_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET data=$3,step=$4,version=listing_drafts.version+1,last_request_id=$5,last_request_hash=$6,updated_at=now()',[id,user.id,JSON.stringify(data),body.step,body.request_id,requestHash]);
  return {draft:await ownedDraft(db,id,user,fail)};
 }
 const lifecycle=path.match(/^\/api\/seller\/listings\/([^/]+)\/(pause|resume|archive|relist)$/);if(!lifecycle)return undefined;if(method!=='POST')fail('Method not allowed.',405);
 const p=await listing(db,lifecycle[1]);if(p.seller_id!==user.id)fail('Listing unavailable.',404);if(body.version!==p.version)fail('This piece changed. Refresh your workspace.',409);
 const action=lifecycle[2];if(!({pause:['active'],resume:['paused'],archive:['active','paused'],relist:['archived']}[action]).includes(p.status))fail('This action is unavailable while a piece is reserved or sold.',409);
 if(action==='resume'||action==='relist'){
  const risk=await listingCheck(db,user,p);if(risk)return risk;const hold=await orderHold(db,{id:'',listing_id:p.id,buyer_id:user.id,seller_id:user.id});if(hold)return holdResponse(hold);
  for(const o of (await db.query('SELECT * FROM orders WHERE listing_id=$1',[p.id])).rows){const held=await orderHold(db,o);if(held)return holdResponse(held);if(o.state!=='cancelled')fail('An existing sale must be resolved before relisting.',409);}
 }
 if(action==='relist'){
  if(await first(db,"SELECT d.id FROM listing_drafts d JOIN listings l ON l.id=d.published_listing_id WHERE d.source_listing_id=$1 AND l.status<>'archived' LIMIT 1",[p.id]))fail('A newer listing already exists for this piece. Manage that listing instead.',409);
  if(body.confirm_available!==true)fail('Confirm the piece is back with you and available to sell.');let d=await first(db,'SELECT * FROM listing_drafts WHERE source_listing_id=$1 AND seller_id=$2 AND published_listing_id IS NULL',[p.id,user.id]);
  if(!d){const id=randomUUID(),data={};for(const k of ['name','brand','size','category','condition','description','flaws','price','allow_offers','images'])data[k]=p[k];await db.query("INSERT INTO listing_drafts(id,seller_id,data,step,source_listing_id) VALUES($1,$2,$3,'details',$4)",[id,user.id,JSON.stringify(data),p.id]);d=await ownedDraft(db,id,user,fail);await audit(db,user.id,'relisting_draft_created',id,{source:p.id});}return {draft:d};
 }
 const state={pause:'paused',resume:'active',archive:'archived'}[action];await db.query('UPDATE listings SET status=$2,version=version+1,updated_at=now() WHERE id=$1',[p.id,state]);
 if(state!=='active')await db.query("UPDATE offers SET status='expired',reason='Seller paused or archived the listing',version=version+1 WHERE listing_id=$1 AND status='pending'",[p.id]);
 await audit(db,user.id,'listing_'+action,p.id);return {listing:await listing(db,p.id)};
}
