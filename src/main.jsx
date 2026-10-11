import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '@lebse/app';
class AppBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main role="alert"><h1>We couldn’t open Lebse.</h1><p>Please reload and try again.</p><button onClick={()=>location.reload()}>Reload</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')).render(<AppBoundary><App/></AppBoundary>);
