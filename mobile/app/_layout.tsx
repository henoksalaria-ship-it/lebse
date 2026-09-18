import {Stack} from 'expo-router/stack';
import {StatusBar} from 'expo-status-bar';
export default function Layout(){return <><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#f8f5ee'}}}><Stack.Screen name="index" options={{title:'Lebse'}}/></Stack></>;}
