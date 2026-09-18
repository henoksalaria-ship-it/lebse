import {ProfileEditor,SavedCollections,AddressBook} from './AccountTools';
import {OrderProblems} from './OrderProblems';
import {SellerWorkspace} from './Seller';
import {PickupSettings} from './Delivery';
import {ConsentProvider,CookieSettingsButton,LegalPage,SafetyCenter,TermsGate} from './Safety';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Home,Search,Plus,MessageCircle,User,Heart,Bell,ArrowUpRight} from 'lucide-react';
import {Store,useStore} from './store';
import {Market,Product,Closet} from './Market';
import {Login,Profile,Notifications} from './Account';
import {ListingEditor} from './Listings';
import {Inbox,Chat,Checkout,OrderDetail} from './Trade';
import {Button,IconButton,BottomNav,Toast,LoadingState,EmptyState} from './ui';
import './styles.css';
import './app.css';
const nav=[{id:'home',label:'Home',icon:Home},{id:'explore',label:'Explore',icon:Search},{id:'sell',label:'Sell',icon:Plus},{id:'inbox',label:'Inbox',icon:MessageCircle},{id:'profile',label:'You',icon:User}];
const protectedRoutes=['seller','draft','sell','edit','inbox','chat','checkout','order','notifications','saved','safety','pickup','problem','edit-profile','addresses'];
function App(){
 const s=useStore(),[hash,setHash]=useState(location.hash||'#home');
 useEffect(()=>{const onHash=()=>{setHash(location.hash||'#home');window.scrollTo(0,0);};window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
 useEffect(()=>{if(!s.toast)return;const timer=setTimeout(()=>s.setToast(''),5000);return()=>clearTimeout(timer);},[s.toast]);
 const [route,rawId]=hash.slice(1).split('/');let id;try{id=rawId?decodeURIComponent(rawId):undefined;}catch{id=undefined;}
 const needsLogin=protectedRoutes.includes(route)&&!s.user;
 useEffect(()=>{if(needsLogin&&!s.loading)sessionStorage.setItem('lebse-return-route',hash);},[needsLogin,s.loading,hash]);
 const unread=s.notifications.filter(n=>!n.read_at).length,unreadConversations=s.conversations.filter(c=>c.unread_count>0).length;let screen;
 if(needsLogin)screen=s.loading?<section className="page"><LoadingState label="Opening your account…"/></section>:<Login/>;
 else if(s.user&&!s.terms_accepted&&protectedRoutes.includes(route)&&route!=='safety')screen=<TermsGate/>;
 else switch(route){
  case 'legal':screen=<LegalPage id={id}/>;break;
  case 'pickup':screen=<PickupSettings/>;break;
  case 'safety':screen=<SafetyCenter/>;break;
  case 'home':case '':screen=<Market/>;break;
  case 'explore':screen=<Market key="explore" explore initialSearch={id}/>;break;
  case 'saved':screen=<SavedCollections/>;break;
  case 'edit-profile':screen=<ProfileEditor/>;break;
  case 'addresses':screen=<AddressBook/>;break;
  case 'problem':screen=<OrderProblems key={id} id={id}/>;break;
  case 'product':screen=<Product key={id} id={id}/>;break;
  case 'closet':screen=<Closet key={id} id={id}/>;break;
  case 'seller':screen=<SellerWorkspace/>;break;
  case 'draft':screen=<ListingEditor key={id} draftId={id}/>;break;
  case 'sell':screen=<ListingEditor key="new"/>;break;
  case 'edit':screen=<ListingEditor key={id} id={id}/>;break;
  case 'login':screen=<Login/>;break;
  case 'profile':screen=s.loading?<section className="page"><LoadingState/></section>:<Profile/>;break;
  case 'notifications':screen=<Notifications/>;break;
  case 'inbox':screen=<Inbox/>;break;
  case 'chat':screen=<Chat key={id} id={id}/>;break;
  case 'checkout':screen=<Checkout key={id} id={id}/>;break;
  case 'order':screen=<OrderDetail key={id} id={id}/>;break;
  default:screen=<section className="page"><EmptyState title="This page took a different turn." description="There are still plenty of good pieces to discover." action="Back to Home" onAction={()=>s.go('home')}/></section>;
 }
 return <><div className="sandbox-ribbon"><span>Local test marketplace · no real payments</span><button onClick={()=>s.go(s.user?'profile':'login')}>{s.user?`@${s.user.username}`:'Sign in to try it'}<ArrowUpRight size={13}/></button></div><header className="site-header"><button className="wordmark" aria-label="Lebse home" onClick={()=>s.go('home')}>lebse<span>.</span></button><nav className="desktop-nav" aria-label="Browse Lebse"><button className={route==='home'?'active':''} onClick={()=>s.go('home')}>Discover</button><button className={route==='explore'?'active':''} onClick={()=>s.go('explore')}>Explore</button><button className={route==='inbox'?'active':''} onClick={()=>s.go('inbox')}>Inbox{unreadConversations>0&&<span className="nav-unread">{unreadConversations}</span>}</button></nav><div className="header-actions"><IconButton label="Saved pieces" onClick={()=>s.go('saved')}><Heart size={21}/></IconButton><IconButton label={`Notifications${unread?`, ${unread} unread`:''}`} onClick={()=>s.go('notifications')}><Bell size={21}/>{unread>0&&<span className="header-dot"/>}</IconButton><button className="header-account" aria-label="Your profile" onClick={()=>s.go('profile')}>{s.user?<span className="avatar">{s.user.name[0]}</span>:<User size={21}/>}</button><Button className="desktop-sell" onClick={()=>s.go('seller')}><Plus size={17}/>Seller workspace</Button></div></header><main>{screen}</main><footer className="site-footer"><span className="footer-wordmark">lebse<span>.</span></span><p>Good style deserves another life.</p><span>Addis Ababa · Thoughtfully passed on</span></footer><div className="legal-footer"><a href="#legal/terms">Terms</a><a href="#legal/privacy">Privacy</a><a href="#legal/copyright">Copyright & reports</a><CookieSettingsButton/><a href="#safety">Safety & privacy</a><small>© 2026 Lebse. Third-party content belongs to its rights holders. Draft legal notices.</small></div><BottomNav unread={unreadConversations} items={nav} active={['product','closet'].includes(route)?'home':['edit','draft','seller'].includes(route)?'sell':route==='chat'?'inbox':['saved','notifications','order','checkout','login'].includes(route)?'profile':route} onChange={route=>s.go(route==='sell'?'seller':route)}/><Toast message={s.toast} onClose={()=>s.setToast('')}/></>;
}
class AppBoundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="page"><h1>A little interruption.</h1><p>Your saved marketplace data is safe. Reload to try again.</p><button onClick={()=>location.reload()}>Reload Lebse</button></div>:this.props.children;}}
createRoot(document.getElementById('root')).render(<AppBoundary><ConsentProvider><Store><App/></Store></ConsentProvider></AppBoundary>);
