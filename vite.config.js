import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
const headers={
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(self)',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://127.0.0.1:5173 ws://localhost:5173; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
export default defineConfig(({command,mode})=>({resolve:{alias:{'@lebse/app':fileURLToPath(new URL(command==='serve' && loadEnv(mode,process.cwd(),'').VITE_LEBSE_LOCAL_SANDBOX==='true'?'./src/LocalApp.jsx':'./src/hosted/App.jsx',import.meta.url))}},server:{host:'127.0.0.1',port:5173,strictPort:true,headers,proxy:{'/api':'http://127.0.0.1:4174'}},preview:{host:'127.0.0.1',headers,proxy:{'/api':'http://127.0.0.1:4174'}},build:{outDir:'dist'}}));
