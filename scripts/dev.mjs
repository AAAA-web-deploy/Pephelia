import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2);let host='0.0.0.0',port=process.env.PORT||'3000';
for(let i=0;i<args.length;i++){if(['--host','--hostname'].includes(args[i]))host=args[++i];else if(args[i]==='--port')port=args[++i];else if(args[i]!=='--strictPort')throw new Error(`Unsupported option: ${args[i]}`);}
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),'dev','--webpack','--hostname',host,'--port',port],{stdio:'inherit',env:process.env});for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>child.kill(s));child.on('exit',c=>process.exit(c??0));
