import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('both production mobile profiles reject missing and staging configuration',()=>{
 for(const profile of ['production','production-apk']){
  for(const url of ['', 'https://cbkjondhiftswrmxllwn.supabase.co']){
   const result=spawnSync(process.execPath,['-e',"import('./mobile/app.config.js')"],{encoding:'utf8',env:{...process.env,EAS_BUILD_PROFILE:profile,EXPO_PUBLIC_SUPABASE_URL:url,EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test-key'}});
   assert.notEqual(result.status,0);
   assert.match(result.stderr,/Production needs an explicitly configured/);
  }
 }
});

test('production website build cannot select the local fixture interface',async()=>{
 const {default:config}=await import('../vite.config.js');
 const resolved=config({command:'build',mode:'production'});
 assert.match(resolved.resolve.alias['@lebse/app'],/hosted[/\\]App.jsx$/);
 const eas=JSON.parse(readFileSync('mobile/eas.json','utf8'));
 assert.equal(eas.build.production.env.EXPO_PUBLIC_LEBSE_ENV,'production');
 assert.equal(eas.build['production-apk'].extends,'production');
});

