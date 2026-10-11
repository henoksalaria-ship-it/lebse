import {legal} from './legal.mjs';
const features={payments:false,delivery:false,offers:false};
const disabled=/^\/(orders?|checkout|payments?|offers?|delivery|deliveries|payouts?|sandbox)(\/|$)/;
const codeStatus={sign_in_required:401,session_expired:401,email_verification_required:403,mfa_required:403,moderator_mfa_required:403,account_suspended:403,account_deleting:403,feature_disabled:403,onboarding_required:409,not_found:404,stale_version:409,rate_limited:429,reauthentication_required:401};
export function route(method,path){
 const fixed={'GET /bootstrap':'bootstrap','GET /listings':'listings.list','POST /profile':'profile.save','POST /preferences':'preferences.save','POST /listings':'listings.save','GET /conversations':'conversations.list','POST /conversations':'conversations.create','GET /notifications':'notifications.list','POST /notifications/read':'notifications.read','GET /blocks':'blocks.list','POST /reports':'reports.create','DELETE /account':'account.delete','GET /admin/reports':'admin.list'};
 if(fixed[`${method} ${path}`])return {op:fixed[`${method} ${path}`]};
 for(const [verb,re,op] of [
  ['GET',/^\/profiles\/([\w-]+)$/,'profiles.read'],['GET',/^\/listings\/([\w-]+)$/,'listings.read'],['PATCH',/^\/listings\/([\w-]+)$/,'listings.save'],['POST',/^\/listings\/([\w-]+)\/publish$/,'listings.publish'],['POST',/^\/saved\/([\w-]+)$/,'saved.save'],['POST',/^\/blocks\/([\w-]+)$/,'blocks.save'],['GET',/^\/conversations\/([\w-]+)\/messages$/,'messages.list'],['POST',/^\/conversations\/([\w-]+)\/messages$/,'messages.send'],['POST',/^\/conversations\/([\w-]+)\/read$/,'conversations.read'],['POST',/^\/admin\/reports\/([\w-]+)$/,'admin.resolve']]){const match=path.match(re);if(method===verb&&match)return {op,id:match[1]};}
 return null;
}
export function decodePhoto(data){
 if(typeof data!=='string')throw Error('invalid_photo');
 const m=data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);if(!m||m[2].length>8388608)throw Error('invalid_photo');
 const bytes=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 if(bytes.length<20||bytes.length>6291456||!(m[1]==='image/png'&&png||m[1]==='image/jpeg'&&jpg||m[1]==='image/webp'&&webp))throw Error('invalid_photo');
 return {bytes,mime:m[1]};
}
export function createHandler(env,fetcher=fetch){
 const base=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
 return async req=>{
  const requestId=crypto.randomUUID(),url=new URL(req.url),origin=req.headers.get('origin');
  const allowed=(env('LEBSE_WEB_ORIGIN')||'https://lebse-staging-web7.vercel.app').split(',').map(s=>s.trim());
  if(env('LEBSE_ENV')!=='production')allowed.push('http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:5181','http://localhost:8081');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Request-ID':requestId,'Vary':'Origin',...(origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed.includes(origin))return json({error:'This origin is not allowed.',code:'origin_denied'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
  const path=url.pathname.replace(/^\/functions\/v1\/api|^\/api/,'')||'/health';
  if(disabled.test(path))return json({error:'This feature is not available in this release.',code:'feature_disabled'},403);
  if(env('LEBSE_ENV')==='production')return json({error:'Production release review has not been completed.',code:'release_not_approved'},503);
  if(!base||!anon)return json({error:'Marketplace configuration is incomplete.',code:'configuration_missing'},503);
  if(path==='/legal'&&req.method==='GET')return json(legal);
  const authorization=req.headers.get('authorization')||`Bearer ${anon}`;
  const remote=async(path,options={},privileged=false)=>{
   const response=await fetcher(base+path,{...options,headers:{apikey:privileged?secret:anon,Authorization:privileged?`Bearer ${secret}`:authorization,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
   const text=await response.text();let value;try{value=text?JSON.parse(text):{};}catch{throw Error('upstream_unavailable');}
   if(!response.ok){const e=new Error(value.message||value.msg||value.error||'upstream_unavailable');e.status=response.status;throw e;}return value;
  };
  const rpc=(op,p={})=>remote('/rest/v1/rpc/lb_api',{method:'POST',body:JSON.stringify({op,p})});
  const sign=async path=>{const value=await remote('/storage/v1/object/sign/lebse-photos/'+path,{method:'POST',body:JSON.stringify({expiresIn:900})},true);return base+'/storage/v1'+value.signedURL;};
  const hydrate=async value=>{
   if(Array.isArray(value))return Promise.all(value.map(hydrate));if(!value||typeof value!=='object')return value;
   const out={...value};if(Array.isArray(out.media)){out.images=await Promise.all(out.media.map(m=>sign(m.path)));delete out.media;}
   for(const key of ['items','listing','conversation'])if(out[key])out[key]=await hydrate(out[key]);return out;
  };
  try{
   if(path==='/health'&&req.method==='GET'){await rpc('listings.list',{q:'',max:'50'});return json({status:'ok',mode:'hosted-beta',features});}
   let body={};if(!['GET','HEAD'].includes(req.method)){
    if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'Send JSON.',code:'invalid_content_type'},415);
    if(Number(req.headers.get('content-length')||0)>8500000)return json({error:'Upload too large.',code:'body_too_large'},413);
    const text=await req.text();if(text.length>(path==='/media'?8500000:32000))return json({error:'Request too large.',code:'body_too_large'},413);
    body=JSON.parse(text||'{}');if(!body||Array.isArray(body)||typeof body!=='object')throw Error('invalid_request');
   }
   if(path==='/media'&&req.method==='POST'){
    const photo=decodePhoto(body.data_url),media=await rpc('media.begin',{client_id:body.client_id});
    if(!media.ready){try{await remote('/storage/v1/object/lebse-photos/'+media.path,{method:'POST',headers:{'Content-Type':photo.mime,'x-upsert':'false'},body:photo.bytes},true);}catch(e){if(!String(e.message).match(/already exists|Duplicate/i))throw e;}await rpc('media.finish',{id:media.id});}
    return json({id:media.id,url:await sign(media.path)});
   }
   const selected=route(req.method,path);if(!selected)return json({error:'This action is unavailable.',code:'feature_disabled'},403);
   const p={...Object.fromEntries(url.searchParams),...body,...(selected.id?{id:selected.id}:{})};
   if(p.cursor){let decoded;try{decoded=JSON.parse(atob(p.cursor));}catch{throw Error('invalid_cursor');}p.cursor_time=decoded.time;p.cursor_id=decoded.id;delete p.cursor;}
   let result=await rpc(selected.op,p);
   if(selected.op==='account.delete'){
    for(let i=0;i<result.paths.length;i+=100)await remote('/storage/v1/object/lebse-photos',{method:'DELETE',body:JSON.stringify({prefixes:result.paths.slice(i,i+100)})},true);
    await remote('/auth/v1/admin/users/'+result.id,{method:'DELETE'},true);return json({ok:true});
   }
   if(['listings.list','messages.list'].includes(selected.op)){
    const more=result.items.length>20;result.items=result.items.slice(0,20);const last=result.items.at(-1);result.next_cursor=more?btoa(JSON.stringify({time:last.created_at,id:last.id})):null;
   }
   return json(await hydrate(result));
  }catch(error){
   const raw=String(error.message),known=/^[a-z_]+$/.test(raw),code=known?raw:error.status===401?'session_expired':'invalid_request';
   const status=codeStatus[code]||(['upstream_unavailable','configuration_missing'].includes(code)||error.name==='TimeoutError'?503:400);
   console.error(JSON.stringify({request_id:requestId,path,code,status}));return json({error:code.replaceAll('_',' ')+'.',code,request_id:requestId},status);
  }
 };
}
