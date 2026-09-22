import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SessionProvider} from '@/components/session';
export default function Layout(){return <SessionProvider><StatusBar style="dark"/><Stack screenOptions={{headerTintColor:'#382c26',headerStyle:{backgroundColor:'#f8f5ee'},contentStyle:{backgroundColor:'#f8f5ee'}}}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="[screen]" options={{title:'Lebse'}}/><Stack.Screen name="auth-callback" options={{title:'Account verification'}}/></Stack></SessionProvider>;}

