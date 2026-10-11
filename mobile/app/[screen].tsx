import {useLocalSearchParams,Stack} from 'expo-router';
import {AuthScreen,Feed,Product,Editor,Chat,Settings,Legal,Report,Notifications,ProfileForm,Gate} from '@/components/screens';
import {Screen,Copy} from '@/components/ui';
export default function Page(){const {screen,id='',type}=useLocalSearchParams<{screen:string;id:string;type:string}>();let content;
switch(screen){case 'auth':content=<Gate><ProfileForm/></Gate>;break;case 'reset':content=<AuthScreen reset/>;break;case 'product':content=<Product id={id}/>;break;case 'closet':content=<Feed seller={id}/>;break;case 'saved':case 'seller':content=<Gate><Feed mode={screen}/></Gate>;break;case 'edit':content=<Editor id={id}/>;break;case 'chat':content=<Chat id={id}/>;break;case 'settings':content=<Settings/>;break;case 'details':content=<Gate><ProfileForm/></Gate>;break;case 'legal':content=<Legal id={id}/>;break;case 'report':content=<Report id={id} type={type}/>;break;case 'notifications':content=<Notifications/>;break;default:content=<Screen><Copy>This page is unavailable.</Copy></Screen>;}
return <><Stack.Screen options={{title:screen==='product'?'The piece':screen==='legal'?'Lebse policies':'Lebse'}}/>{content}</>;}
