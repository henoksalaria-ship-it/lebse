import {createClient} from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
const config=Constants.expoConfig?.extra||{};
export const backendUrl=process.env.EXPO_PUBLIC_SUPABASE_URL||config.supabaseUrl;
const key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||config.supabasePublishableKey;
export const configured=typeof backendUrl==='string'&&backendUrl.startsWith('https://')&&Boolean(key);
// Chunk sessions to stay below platform keychain item limits. Serialize reads/writes.
let queue:Promise<unknown>=Promise.resolve();
function locked<T>(fn:()=>Promise<T>):Promise<T>{const next=queue.then(fn,fn);queue=next.catch(()=>{});return next;}
const storage={
 getItem:(key:string)=>locked(async()=>{const count=Number(await SecureStore.getItemAsync(key+'.count'));if(!count)return null;let value='';for(let i=0;i<count;i++){const part=await SecureStore.getItemAsync(key+'.'+i);if(part===null)return null;value+=part;}return value;}),
 setItem:(key:string,value:string)=>locked(async()=>{const old=Number(await SecureStore.getItemAsync(key+'.count')),count=Math.ceil(value.length/1800);await SecureStore.deleteItemAsync(key+'.count');for(let i=0;i<count;i++)await SecureStore.setItemAsync(key+'.'+i,value.slice(i*1800,(i+1)*1800),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});for(let i=count;i<old;i++)await SecureStore.deleteItemAsync(key+'.'+i);await SecureStore.setItemAsync(key+'.count',String(count));}),
 removeItem:(key:string)=>locked(async()=>{const count=Number(await SecureStore.getItemAsync(key+'.count'));await SecureStore.deleteItemAsync(key+'.count');for(let i=0;i<count;i++)await SecureStore.deleteItemAsync(key+'.'+i);})
};
export const supabase=createClient(configured?backendUrl:'https://configuration.invalid',key||'configuration-missing',{auth:{storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
export const redirectTo='lebse://auth-callback';
export async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<any>{
 if(!configured)throw Error('This build needs the secure marketplace configuration.');
 const {data,error}=await supabase.auth.getSession();if(error)throw error;
 const response=await fetch(backendUrl+'/functions/v1/api'+path,{method,headers:{apikey:key,...(data.session?{Authorization:'Bearer '+data.session.access_token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 const text=await response.text();let value;try{value=JSON.parse(text);}catch{throw Error('The marketplace is not responding. Please try again.');}
 if(!response.ok){const error=Object.assign(new Error(value.error||'Please try again.'),{code:value.code,status:response.status});throw error;}return value;
}
