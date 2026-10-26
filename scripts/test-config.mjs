import assert from 'node:assert/strict';import {resolveTokenLinks,safeUrl} from '../src/lib/token-config.ts';
const pending={chainId:1,contractAddress:'',buyUrl:'',chartUrl:'',xUrl:'',telegramUrl:''};
assert.equal(resolveTokenLinks(pending).buy,null);
assert.equal(resolveTokenLinks({...pending,contractAddress:'0x'+'0'.repeat(40)}).contract,null);
assert.equal(resolveTokenLinks({...pending,contractAddress:'0x123'}).explorer,null);
const fixture='0x'+'aB'.repeat(20); // Synthetic fixture, never a configured launch CA.
assert.equal(resolveTokenLinks({...pending,chainId:8453,contractAddress:fixture}).buy,null);
const valid=resolveTokenLinks({...pending,contractAddress:fixture});assert.equal(new URL(valid.buy).searchParams.get('outputCurrency'),fixture);assert.equal(valid.explorer,`https://etherscan.io/token/${fixture}`);
assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://user:secret@example.com'),null);assert.equal(safeUrl('https://example.com/community'),'https://example.com/community');
console.log('PASS: pending, malformed, zero, wrong-chain, destination integrity and HTTPS-only link checks.');
