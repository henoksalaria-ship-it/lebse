export function marketplaceUrl(value:string|undefined,development:boolean){
 const url=new URL(value||(development?'http://127.0.0.1:5173':''));
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Use the marketplace origin only, without a login, path, or query.');
 const local=development&&url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname);
 if(url.protocol!=='https:'&&!local)throw new Error('A secure HTTPS marketplace address is required.');
 if(!development&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('A phone release needs a reachable marketplace origin.');
 return url.origin;
}
export function isMarketplaceNavigation(value:string,origin:string){try{return new URL(value).origin===origin;}catch{return false;}}
