import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const platform of ['android','ios']){
 const result=spawnSync(process.execPath,['node_modules/expo/bin/cli','export','--platform',platform,'--output-dir',`dist/${platform}`,'--max-workers','2'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,EXPO_NO_TELEMETRY:'1',EXPO_OFFLINE:'1'}});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
