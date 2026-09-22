import {getPreferences,savePreferences} from './preferences.mjs';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
export const legal=JSON.parse(await readFile(new URL('../src/legal-documents.json',import.meta.url),'utf8'));
export const digest=v=>createHash('sha256').update(v).digest('hex');
export const legalHash=digest(JSON.stringify(legal));
export const consentVersion='2026-09-09-1';
export const first=async(db,sql,args=[])=> (await db.query(sql,args)).rows[0];
export const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const cookie=(req,key)=>{const entry=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='));return entry?.slice(key.length+1)||null;};
export const csrfFor=token=>digest(`lebse-csrf:${token}`);
export const cookieValue=(key,value,age,secure=false)=>`${key}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
export async function setupSecurity(db){await db.exec(await readFile(new URL('./security-schema.sql',import.meta.url),'utf8'));const old=await first(db,'SELECT content_hash FROM legal_versions WHERE version=$1',[legal.version]);if(old&&old.content_hash!==legalHash)throw new Error('Legal content changed without a new version.');await db.query('INSERT INTO legal_versions(version,content,content_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[legal.version,JSON.stringify(legal),legalHash]);}
export async function audit(db,actor,action,subject,details={}){await db.query('INSERT INTO security_audit(id,actor_id,action,subject_id,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,action,subject,JSON.stringify(details)]);}
export async function limit(db,scope,identifier,max,seconds){const bucket=digest(`${scope}:${identifier}:${Math.floor(Date.now()/(seconds*1000))}`);await db.query('DELETE FROM security_limits WHERE expires_at<now()');const r=await first(db,'INSERT INTO security_limits(bucket,count,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET count=security_limits.count+1 RETURNING count',[bucket,new Date(Date.now()+seconds*1000)]);return r.count<=max;}
export async function acceptLegal(db,user,body){if(body.accept_terms!==true||body.age_confirmed!==true||body.terms_version!==legal.version)return false;await db.query('INSERT INTO legal_acceptances(id,user_id,version,content_hash,age_confirmed) VALUES($1,$2,$3,$4,true) ON CONFLICT(user_id,version) DO NOTHING',[randomUUID(),user.id,legal.version,legalHash]);await audit(db,user.id,'terms_accepted',legal.version);return true;}
export const hasLegal=async(db,user)=>!!(user&&await first(db,'SELECT id FROM legal_acceptances WHERE user_id=$1 AND version=$2',[user.id,legal.version]));
export async function raiseCase(db,user,type,subject,rule,hold,details={}){const old=await first(db,'SELECT * FROM safety_cases WHERE user_id=$1 AND subject_type=$2 AND subject_id=$3 AND rule=$4',[user.id,type,subject,rule]);if(old)return old;const id=randomUUID();await db.query('INSERT INTO safety_cases(id,user_id,subject_type,subject_id,rule,hold,details) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,user.id,type,subject,rule,hold,JSON.stringify(details)]);await audit(db,user.id,'safety_case_created',id,{type,rule,hold});return first(db,'SELECT * FROM safety_cases WHERE id=$1',[id]);}
export const holdResponse=c=>({__status:409,error:'This action needs a safety review. Open Safety & privacy to view the case or appeal.',code:'safety_review',case_id:c.id});
export async function assess(db,user,type,subject,rule,details={}){const c=await raiseCase(db,user,type,subject,rule,true,details);return c.status==='approved'?null:holdResponse(c);}
export async function orderHold(db,o){const issue=await first(db,"SELECT id FROM order_issues WHERE order_id=$1 AND status NOT IN ('resolved','rejected') LIMIT 1",[o.id]);if(issue)return issue;return first(db,"SELECT * FROM safety_cases WHERE hold=true AND status<>'approved' AND ((subject_type='order' AND subject_id=$1) OR (subject_type='listing' AND subject_id=$2) OR (subject_type='account' AND subject_id IN ($3,$4))) LIMIT 1",[o.id,o.listing_id,o.buyer_id,o.seller_id]);}
export async function listingCheck(db,user,p){const held=await first(db,"SELECT * FROM safety_cases WHERE subject_type='account' AND subject_id=$1 AND hold=true AND status<>'approved' LIMIT 1",[user.id]);if(held)return holdResponse(held);const subject=p.id||digest(`${user.id}:${p.name}:${p.price}:${p.description}`);const words=`${p.name} ${p.description}`;if(/\b(counterfeit|stolen|replica|fake designer)\b/i.test(words))return assess(db,user,'listing',subject,'listing_authenticity',{name:p.name});const count=await first(db,"SELECT count(*)::int AS n FROM listings WHERE seller_id=$1 AND created_at>now()-interval '1 hour'",[user.id]);if(count.n>=10)return assess(db,user,'account',user.id,'listing_velocity');return null;}
export async function paymentCheck(db,user,o){const held=await orderHold(db,o);if(held)return holdResponse(held);const failures=await first(db,"SELECT count(*)::int AS n FROM payments WHERE buyer_id=$1 AND state='failed' AND created_at>now()-interval '30 minutes'",[user.id]);if(failures.n>=3)return assess(db,user,'order',o.id,'repeated_payment_failures');const seller=await first(db,'SELECT created_at FROM users WHERE id=$1',[o.seller_id]);if(o.amount_minor>=2000000&&Date.now()-new Date(seller.created_at).getTime()<7*86400000)return assess(db,user,'order',o.id,'new_seller_high_value');return null;}
export async function securityRoutes({db,req,body,user,fail,adminToken}){
 const route=req.url.split('?')[0],method=req.method;
 if(route==='/api/legal'&&method==='GET')return legal;
 if(route==='/api/consent'){
  const receipt=cookie(req,'lebse_consent');const old=receipt&&await first(db,'SELECT * FROM consent_receipts WHERE id=$1 AND updated_at>now()-interval \'180 days\'',[receipt]);
  if(method==='GET')return {version:consentVersion,choice:old?.version===consentVersion?{external_media:old.external_media}:null};
  if(method!=='POST')fail('Method not allowed.',405);
  if(body.version!==consentVersion||typeof body.external_media!=='boolean')fail('Choose the current cookie preference version.');
  const id=old?.id||randomUUID();await db.query('INSERT INTO consent_receipts(id,version,external_media) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET version=$2,external_media=$3,updated_at=now()',[id,consentVersion,body.external_media]);await db.query('INSERT INTO consent_history(id,receipt_id,version,external_media,source) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,consentVersion,body.external_media,'cookie_preferences']);return {choice:{external_media:body.external_media},version:consentVersion,__consent:id};
 }
 if(route==='/api/security/ops'){
  if(!adminToken||adminToken.length<32||!equal(req.headers['x-lebse-ops-key'],adminToken))fail('Not found.',404);
  if(method==='GET')return {cases:(await db.query('SELECT * FROM safety_cases ORDER BY created_at DESC LIMIT 100')).rows,requests:(await db.query('SELECT * FROM safety_requests ORDER BY created_at DESC LIMIT 100')).rows};
  if(method!=='POST')fail('Method not allowed.',405);
  if(typeof body.reason!=='string'||body.reason.trim().length<20||body.reason.length>1000)fail('Record a review reason of 20–1,000 characters.');
  if(body.request_id){if(!['in_progress','resolved'].includes(body.status))fail('Choose in_progress or resolved.');const request=await first(db,'SELECT * FROM safety_requests WHERE id=$1',[body.request_id]);if(!request)fail('Request not found.',404);await db.query('UPDATE safety_requests SET status=$2,response=$3,updated_at=now() WHERE id=$1',[request.id,body.status,body.reason.trim()]);await audit(db,'local_operator','request_reviewed',request.id,{status:body.status,reason:body.reason.trim()});return {ok:true};}
  if(!['approve','reject','reopen'].includes(body.decision))fail('Choose approve, reject or reopen.');const c=await first(db,'SELECT * FROM safety_cases WHERE id=$1',[body.case_id]);if(!c)fail('Case not found.',404);
  if(body.decision==='reopen'?c.status==='open':c.status!=='open')fail('Reopen a closed case before changing its decision.',409);
  const status={approve:'approved',reject:'rejected',reopen:'open'}[body.decision];await db.query("UPDATE safety_cases SET status=$2,resolution=$3,resolved_at=CASE WHEN $2='open' THEN NULL ELSE now() END WHERE id=$1",[c.id,status,body.reason.trim()]);
  if(c.subject_type==='order'){const o=await first(db,'SELECT * FROM orders WHERE id=$1',[c.subject_id]);if(o&&o.payment_status==='paid'){if(await orderHold(db,o))await db.query("UPDATE orders SET payout_status='disputed' WHERE id=$1",[o.id]);else if(o.payout_status==='disputed')await db.query('UPDATE orders SET payout_status=$2 WHERE id=$1',[o.id,o.delivered_at?'holding':'pending_completion']);}}
  await audit(db,'local_operator','case_'+body.decision,c.id,{reason:body.reason.trim()});return {ok:true};
 }
 if(!route.startsWith('/api/security/'))return undefined;
 if(route==='/api/security/session'&&method==='GET')return {csrf:req.sessionToken?csrfFor(req.sessionToken):null,user_id:user?.id||null};
 if(!user)fail('Sign in to continue.',401);
 if(route==='/api/security/preferences'&&method==='GET')return {preferences:await getPreferences(db,user.id)};
 if(route==='/api/security/preferences'&&method==='POST')return {preferences:await savePreferences(db,user.id,body.shopping_interest,fail)};
 if(route==='/api/security/accept'&&method==='POST'){if(!await acceptLegal(db,user,body))fail('Read and explicitly accept the current terms and confirm your age.');return {ok:true};}
 if(route==='/api/security/sessions/revoke'&&method==='POST'){await db.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);await audit(db,user.id,'all_sessions_revoked',user.id);return {ok:true,__logout:true};}
 if(route==='/api/security/center'&&method==='GET')return {legal_version:legal.version,accepted:await hasLegal(db,user),cases:(await db.query('SELECT id,subject_type,subject_id,hold,status,resolution,created_at FROM safety_cases WHERE user_id=$1 ORDER BY created_at DESC',[user.id])).rows,requests:(await db.query('SELECT id,kind,subject_id,status,response,created_at FROM safety_requests WHERE user_id=$1 ORDER BY created_at DESC',[user.id])).rows};
 if(route==='/api/security/report'&&method==='POST'){
  if(!['fraud','copyright','item_problem','access','correction','deletion','close_account','appeal'].includes(body.kind)||typeof body.description!=='string'||body.description.trim().length<20||body.description.length>2000)fail('Choose a request type and describe it in 20–2,000 characters.');const subject=typeof body.subject_id==='string'?body.subject_id.slice(0,100):'';
  if(body.kind==='item_problem'){const o=await first(db,'SELECT * FROM orders WHERE id=$1 AND buyer_id=$2',[subject,user.id]);if(!o||o.payment_status!=='paid'||o.state==='cancelled')fail('Choose your paid order.',400);await raiseCase(db,user,'order',o.id,'buyer_dispute',true,{description:body.description.trim()});await db.query("UPDATE orders SET payout_status='disputed' WHERE id=$1",[o.id]);}
  const id=randomUUID();await db.query('INSERT INTO safety_requests(id,user_id,kind,subject_id,description) VALUES($1,$2,$3,$4,$5)',[id,user.id,body.kind,subject,body.description.trim()]);await audit(db,user.id,'request_received',id,{kind:body.kind});return {id,status:'received'};
 }
 fail('Not found.',404);
}

