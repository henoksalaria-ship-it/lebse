import {createClient} from '@supabase/supabase-js';
export function createMarketplace({url,key,storage,redirectTo,detectSessionInUrl=false}){
 if(!url?.startsWith('https://')||!key)throw Error('The secure marketplace configuration is missing.');
 const supabase=createClient(url,key,{auth:{...(storage?{storage}:{}),persistSession:true,autoRefreshToken:true,detectSessionInUrl,flowType:'pkce'}});
 async function api(path,body,method=body===undefined?'GET':'POST'){
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  const response=await fetch(url+'/functions/v1/api'+path,{method,headers:{apikey:key,...(data.session?{Authorization:'Bearer '+data.session.access_token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
  const text=await response.text();let value;try{value=JSON.parse(text);}catch{throw Error('The marketplace could not respond. Please try again.');}
  if(!response.ok){const error=new Error(value.error||'Please try again.');error.code=value.code;error.status=response.status;throw error;}return value;
 }
 async function login(email,password){const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}
 async function signup(email,password){const {error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirectTo}});if(error)throw error;}
 async function recover(email){const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});if(error)throw error;}
 async function callback(url){const parsed=new URL(url),code=parsed.searchParams.get('code');if(code){const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)throw error;}else if(parsed.searchParams.get('error_description'))throw Error(parsed.searchParams.get('error_description'));}
 return {supabase,api,login,signup,recover,callback,redirectTo};
}
