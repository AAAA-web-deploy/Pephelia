import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),prefix=(process.env.NEXT_PUBLIC_BASE_PATH||'').replace(/\/$/,'');
const pages=['','how-to-purchase','communication'];
const docs=new Map();
for(const route of pages){const html=await fs.readFile(path.join(root,'out',route,'index.html'),'utf8');docs.set(route,html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));}
let checked=0;
for(const [route,html] of docs){
 assert.ok(html.includes('How to Purchase')&&html.includes('Communication'),route);
 for(const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
  const raw=m[1].replaceAll('&amp;','&');if(raw.startsWith('https:')||raw.startsWith('mailto:'))continue;
  if(raw.startsWith('#')){assert.ok(html.includes(`id="${raw.slice(1)}"`),`${route}: ${raw}`);continue;}
  if(!raw.startsWith('/'))continue;
  assert.ok(!prefix||raw.startsWith(prefix+'/'),`Wrong base path: ${raw}`);
  const rel=(prefix?raw.slice(prefix.length):raw).split(/[?#]/)[0];
  const local=decodeURIComponent(rel).replace(/^\//,'');
  const file=path.extname(local)?local:path.join(local,'index.html');
  assert.ok((await fs.stat(path.join(root,'out',file))).size>0,raw);checked++;
 }
}
assert.ok(docs.get('how-to-purchase').includes('https://app.uniswap.org/swap?chain=mainnet'));
assert.ok(docs.get('how-to-purchase').includes('id="official-contract"'));
assert.ok(docs.get('communication').includes('pephelia-community-media.zip'));
assert.ok(docs.get('').includes('home-communication-title'));
const settings=JSON.parse(await fs.readFile(path.join(root,'src/content/token.json'),'utf8'));
if(!settings.contractAddress){assert.ok(docs.get('how-to-purchase').includes('Contract announcement pending'));assert.ok(!docs.get('how-to-purchase').includes('outputCurrency='));}
console.log(`PASS: three pages; ${checked} local links/resources resolve at ${prefix||'/'}; ungated exchange guidance; home integrations and media pack.`);
