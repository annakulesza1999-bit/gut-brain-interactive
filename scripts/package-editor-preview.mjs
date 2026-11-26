import {cp,copyFile,mkdir} from 'node:fs/promises';
await mkdir('dist-preview/atlas',{recursive:true});
await copyFile('public/atlas/brain.glb','dist-preview/atlas/brain.glb');
await cp('public/atlas/draco','dist-preview/atlas/draco',{recursive:true});
await copyFile('ATLAS-LICENSE.md','dist-preview/atlas/ATLAS-LICENSE.md');
await copyFile('LICENSE','dist-preview/LICENSE');
await copyFile('preview/open-preview.py','dist-preview/open-preview.py');
await copyFile('preview/START-HERE.txt','dist-preview/START-HERE.txt');
