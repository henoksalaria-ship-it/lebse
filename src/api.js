let csrf=null;
sessionStorage.removeItem('lebse-session-v1');
export const session={get:()=>null,set:()=>{csrf=null;}};
export async function api(path,{method='GET',body,signal}={}){
 if(method!=='GET'&&!csrf){const result=await fetch('/api/security/session',{credentials:'same-origin'}).then(r=>r.json());csrf=result.csrf||null;}
 const response=await fetch(`/api${path}`,{method,signal,credentials:'same-origin',headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-Lebse-Request':'1',...(csrf?{'X-CSRF-Token':csrf}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json().catch(()=>({error:'The server returned an unexpected response.'}));
 if('csrf' in result)csrf=result.csrf;
 if(!response.ok){if(response.status===401||result.code==='csrf')csrf=null;const error=new Error(typeof result.error==='string'?result.error:'Something went wrong. Try again.');error.status=response.status;error.code=result.code;throw error;}
 return result;
}
export const command=(path,body={})=>api(path,{method:'POST',body});
export const money=value=>`${Number(value||0).toLocaleString('en-US')} ETB`;
export const when=value=>value?new Date(value).toLocaleString('en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
