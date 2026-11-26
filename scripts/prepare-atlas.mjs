// Explicit setup command, not a lifecycle hook. Downloads data only, checks pinned Git blob hash.
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public','atlas'),file=path.join(dir,'brain.glb');
const pin='2929e94f521a8ddceab26bc100a98dc06b0da060',expected='c80dd62202b5cf8a2a43c7a019311781bd95457c',size=4650816;
const verify=b=>b.length===size&&createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')===expected&&b.subarray(0,4).toString()==='glTF';
await mkdir(path.join(dir,'draco'),{recursive:true});
let existing;try{existing=await readFile(file);}catch{}
if(!existing||!verify(existing)){
 const res=await fetch('https://raw.githubusercontent.com/itayinbarr/brainproject/'+pin+'/brain-atlas/models/brain.glb',{redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!res.ok)throw Error('Atlas download failed: '+res.status);
 const b=Buffer.from(await res.arrayBuffer());if(!verify(b))throw Error('Atlas integrity verification failed.');
 await writeFile(file,b);
}
for(const name of ['draco_decoder.js','draco_decoder.wasm','draco_wasm_wrapper.js'])await copyFile(path.join(root,'node_modules','three','examples','jsm','libs','draco','gltf',name),path.join(dir,'draco',name));
console.log('Pinned atlas and local decoder prepared. Run the reviewed build only after security review.');
