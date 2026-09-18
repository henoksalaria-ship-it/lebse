import {readFile} from 'node:fs/promises';
const [command,id,inputFile]=process.argv.slice(2);
if(!['list','show','review'].includes(command)||(command!=='list'&&!/^[a-f0-9-]{36}$/i.test(id||''))||(command==='review'&&!inputFile))throw new Error('Use: list | show REPORT_ID | review REPORT_ID decision.json');
const key=process.env.LEBSE_OPS_TOKEN;if(!key||key.length<32)throw new Error('Set the existing server-side LEBSE_OPS_TOKEN for authorized local reviewers.');
const body=command==='review'?JSON.parse(await readFile(inputFile,'utf8')):undefined;
const response=await fetch(`http://127.0.0.1:4174/api/issues/ops${command==='list'?'':`/${id}`}`,{method:body?'POST':'GET',headers:{'X-Lebse-Ops-Key':key,...(body?{'Content-Type':'application/json','X-Lebse-Request':'1'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const result=await response.json();if(!response.ok)throw new Error(result.error||`Review request failed (${response.status}).`);console.log(JSON.stringify(result,null,2));
