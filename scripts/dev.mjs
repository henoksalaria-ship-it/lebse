import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const children=[];let closing=false;
function stop(){if(closing)return;closing=true;for(const child of children)child.kill('SIGTERM');}
for(const file of ['server/index.mjs','node_modules/vite/bin/vite.js']){const child=spawn(process.execPath,[file],{cwd:root,stdio:'inherit',windowsHide:true});children.push(child);child.on('error',error=>{console.error(error.message);stop();process.exitCode=1;});child.on('exit',code=>{if(!closing){process.exitCode=code||0;stop();}});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
