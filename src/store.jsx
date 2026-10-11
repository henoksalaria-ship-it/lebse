import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {api,command,session} from './api';
const Context=createContext(null);
const empty={user:null,preferences:null,listings:[],users:[],saved:[],following:[],conversations:[],orders:[],notifications:[]};
export function Store({children}){
 const [data,setData]=useState(empty),[loading,setLoading]=useState(true),[error,setError]=useState(''),[toast,setToast]=useState('');
 const refreshing=useRef(null),generation=useRef(0),navigationGuard=useRef(null);
 const refresh=useCallback(async()=>{
  if(refreshing.current)return refreshing.current;
  const epoch=generation.current;
  refreshing.current=(async()=>{try{const next=await api('/bootstrap');if(epoch===generation.current){setData({...empty,...next});setError('');}return next;}catch(e){if(epoch===generation.current){if(e.status===401){session.set(null);setData(empty);setError('Your session expired. Please sign in again.');}else setError(e.message);}throw e;}finally{if(epoch===generation.current){refreshing.current=null;setLoading(false);}}})();
  return refreshing.current;
 },[]);
 useEffect(()=>{refresh().catch(()=>{});const tick=setInterval(()=>{if(document.visibilityState==='visible')refresh().catch(()=>{});},4000);const visible=()=>{if(document.visibilityState==='visible')refresh().catch(()=>{});};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',visible);};},[refresh]);
 const act=async(path,body,notice)=>{const result=await command(path,body);await refresh();if(notice)setToast(notice);return result;};
 const authenticate=async(path,body)=>{const result=await command(path,body);generation.current++;refreshing.current=null;session.set(result.token);setData(empty);await refresh();return result;};
 const logout=async()=>{try{await command('/auth/logout');}finally{generation.current++;refreshing.current=null;session.set(null);setData(empty);await refresh();}};
 const go=useCallback((route,id)=>{const navigate=()=>{location.hash=id?`${route}/${encodeURIComponent(id)}`:route;window.scrollTo(0,0);};if(navigationGuard.current)navigationGuard.current(navigate);else navigate();},[]);
 const requireUser=()=>{if(data.user)return true;sessionStorage.setItem('lebse-return-route',location.hash||'#home');go('login');return false;};
 const save=async p=>{if(!requireUser())return;try{await act(`/saved/${p.id}`,{saved:!data.saved.includes(p.id)},data.saved.includes(p.id)?'Removed from saved.':'Saved to your finds.');}catch(e){setToast(e.message);}};
 return <Context.Provider value={{...data,loading,error,toast,setToast,refresh,act,authenticate,logout,go,requireUser,save,navigationGuard}}>{children}</Context.Provider>;
}
export const useStore=()=>useContext(Context);
export function useResource(path){
 const [value,setValue]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const reload=useCallback(async()=>{if(!path)return;try{const result=await api(path);setValue(result);setError('');return result;}catch(e){setError(e.message);}finally{setLoading(false);}},[path]);
 useEffect(()=>{let active=true;setLoading(true);setValue(null);setError('');if(!path){setLoading(false);return;}const controller=new AbortController();api(path,{signal:controller.signal}).then(result=>{if(active)setValue(result);}).catch(e=>{if(active&&e.name!=='AbortError')setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;controller.abort();};},[path]);
 return {value,error,loading,reload};
}
