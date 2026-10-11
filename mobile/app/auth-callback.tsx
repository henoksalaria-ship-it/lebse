import {useEffect,useState} from 'react';
import {useLocalSearchParams,router} from 'expo-router';
import {supabase} from '@/lib/client';
import {Screen,Copy,Busy,Button} from '@/components/ui';
export default function Callback(){const {code,error_description,flow}=useLocalSearchParams<{code:string;error_description:string;flow:string}>(),[error,setError]=useState('');useEffect(()=>{if(error_description){setError(error_description);return;}if(!code){setError('This verification link is missing its code. Request a new email.');return;}supabase.auth.exchangeCodeForSession(code).then(({data,error})=>{if(error)setError(error.message);else if(flow==='recovery')router.replace({pathname:'/[screen]',params:{screen:'reset'}} as any);else router.replace('/(tabs)/profile' as any);});},[code,error_description]);return <Screen>{error?<><Copy error>{error}</Copy><Button secondary onPress={()=>router.replace('/(tabs)/profile' as any)}>Back to account</Button></>:<Busy/>}</Screen>;}
