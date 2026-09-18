// Local operator tool. Never expose this key through VITE_ variables or browser code.
import {readFile} from 'node:fs/promises';
const [action,id,decision,reasonFile]=process.argv.slice(2);
const key=process.env.LEBSE_OPS_TOKEN;
if(!key||key.length<32)throw Error('Set LEBSE_OPS_TOKEN to the same private key used by the local API (at least 32 characters).');
if(!['list','resolve','request'].includes(action))throw Error('Usage: node scripts/safety-ops.mjs list | resolve CASE_ID approve|reject|reopen REASON_FILE | request REQUEST_ID in_progress|resolved RESPONSE_FILE');
let body;
if(action==='resolve'){if(!id||!['approve','reject','reopen'].includes(decision)||!reasonFile)throw Error('Supply case ID, approve/reject and a UTF-8 reason file.');body={case_id:id,decision,reason:(await readFile(reasonFile,'utf8')).trim()};}
if(action==='request'){if(!id||!['in_progress','resolved'].includes(decision)||!reasonFile)throw Error('Supply request ID, status and a UTF-8 response file.');body={request_id:id,status:decision,reason:(await readFile(reasonFile,'utf8')).trim()};}
const res=await fetch('http://127.0.0.1:4174/api/security/ops',{method:body?'POST':'GET',headers:{'x-lebse-ops-key':key,...(body?{'content-type':'application/json','x-lebse-request':'1'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const data=await res.json();if(!res.ok)throw Error(data.error||'Operator request failed.');console.log(JSON.stringify(data,null,2));
