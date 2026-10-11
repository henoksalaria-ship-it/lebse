import React,{createContext,useContext,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {Session} from '@supabase/supabase-js';
import {api,supabase,configured} from '@/lib/client';
type State={session:Session|null;boot:any;loading:boolean;error:string;mfa:boolean;refresh:()=>Promise<void>};
const Context=createContext<State>({session:null,boot:null,loading:true,error:'',mfa:false,refresh:async()=>{}});
export const useSession=()=>useContext(Context);
export function SessionProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[boot,setBoot]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[mfa,setMfa]=useState(false),[revision,setRevision]=useState(0);
 const refresh=async()=>{setRevision(x=>x+1);};
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setRevision(x=>x+1);});const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{setSession(s);setRevision(x=>x+1);});const app=AppState.addEventListener('change',state=>{if(state==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();});return()=>{subscription.unsubscribe();app.remove();supabase.auth.stopAutoRefresh();};},[]);
 useEffect(()=>{let live=true;setLoading(true);setBoot(null);(async()=>{if(!configured)throw Error('This build needs a secure backend configuration.');if(session){const r=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(r.error)throw r.error;if(r.data.nextLevel==='aal2'&&r.data.currentLevel!=='aal2'){if(live)setMfa(true);return;}}if(live)setMfa(false);const b=await api('/bootstrap');if(live){setBoot(b);setError('');}})().catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[revision]);
 return <Context.Provider value={{session,boot,loading,error,mfa,refresh}}>{children}</Context.Provider>;
}
