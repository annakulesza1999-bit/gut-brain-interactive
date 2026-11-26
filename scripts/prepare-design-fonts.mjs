// Pinned public OFL fonts from Google Fonts; no code execution or runtime network requests.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const assets=[
 ['sourcesans3/SourceSans3%5Bwght%5D.ttf','source-sans-3.ttf',646340,'d259aa494fe7117141a2752a998a52c172bbd42b'],
 ['inter/Inter%5Bopsz%2Cwght%5D.ttf','inter.ttf',876576,'047c92f6e2212473dc436020afed689527076d44'],
 ['sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf','source-serif-4.ttf',1209508,'40bbb58cb58e893ad0470f0bb291e096c73d3554'],
 ['sourcesans3/OFL.txt','OFL-SourceSans3.txt',4579,'50ee76cf00fbfe42fb7c74a9b95c9508dec5bb8f'],
 ['inter/OFL.txt','OFL-Inter.txt',4377,'21f6aff961064c2e429f570995e446bcdd555422'],
 ['sourceserif4/OFL.txt','OFL-SourceSerif4.txt',4400,'318074ec9d43c936a56ee1dae92999f4df073ce8']
];
await mkdir('src/fonts',{recursive:true});
for(const [path,name,size,hash] of assets){
 const response=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+path,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Font preparation failed: '+name);
 const bytes=Buffer.from(await response.arrayBuffer());
 const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(bytes.length!==size||actual!==hash)throw Error('Font integrity mismatch: '+name);
 await writeFile('src/fonts/'+name,bytes);
 console.log('Verified '+name);
}
