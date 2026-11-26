// Report only public package-lock metadata so the reviewed npm-generated lock can be committed.
import {readFileSync} from 'node:fs';
const [before,after]=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8')));
const delta={removed:Object.keys(before.packages).filter(k=>!(k in after.packages)),changed:Object.fromEntries(Object.entries(after.packages).filter(([k,v])=>JSON.stringify(before.packages[k])!==JSON.stringify(v))),header:Object.fromEntries(Object.entries(after).filter(([k])=>k!=='packages'))};
console.log('LOCK_DELTA_BEGIN');
console.log(JSON.stringify(delta));
console.log('LOCK_DELTA_END');
