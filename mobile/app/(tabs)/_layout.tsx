import {Tabs} from 'expo-router';
import {Image} from 'expo-image';
const icons:Record<string,string>={index:'house',explore:'magnifyingglass',sell:'plus.circle',inbox:'bubble.left.and.bubble.right',profile:'person.crop.circle'};
export default function TabLayout(){return <Tabs screenOptions={({route})=>({headerStyle:{backgroundColor:'#f8f5ee'},headerTintColor:'#382c26',tabBarStyle:{backgroundColor:'#f8f5ee',borderTopColor:'#d8cec0'},tabBarActiveTintColor:'#a64e35',tabBarInactiveTintColor:'#776d62',tabBarIcon:({color})=><Image source={'sf:'+icons[route.name]} style={{width:23,height:23}} tintColor={String(color)}/>})}><Tabs.Screen name="index" options={{title:'Lebse',tabBarLabel:'Home'}}/><Tabs.Screen name="explore" options={{title:'Explore'}}/><Tabs.Screen name="sell" options={{title:'Sell a piece',tabBarLabel:'Sell'}}/><Tabs.Screen name="inbox" options={{title:'Inbox'}}/><Tabs.Screen name="profile" options={{title:'Your Lebse',tabBarLabel:'You'}}/></Tabs>;}

