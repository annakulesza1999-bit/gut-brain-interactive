import {safeSlideArtwork} from './activities.js';
// Image pages retain original PNG/JPEG/WebP bytes. No network request or raster recompression.
export const maxArtworkBytes=3100000,maxDeckArtworkBytes=35000000;
export function sortPages(files){return [...files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));}
function read(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read '+file.name));reader.readAsDataURL(file);});}
async function inspect(data,file){const image=new Image();image.src=data;await image.decode();if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>18000000)throw Error('Image dimensions are too large: '+file.name);}
export async function importArtwork(files,existing=[]){
 const pages=sortPages(files);if(!pages.length)throw Error('Choose exported PNG or JPG slides.');
 if(pages.length+existing.length>500)throw Error('A deck can have at most 500 slides.');
 if(pages.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>maxArtworkBytes))throw Error('Use PNG, JPG or WebP pages under 3.1 MB each. Extract Canva’s ZIP first.');
 if(pages.reduce((n,f)=>n+f.size,0)+existing.reduce((n,q)=>n+Math.ceil((q.slideArtwork?.length||0)*.75),0)>maxDeckArtworkBytes)throw Error('These images exceed the 35 MB artwork limit. Export smaller pages or split the deck.');
 let id=existing.reduce((n,q)=>Math.max(n,q.id||0),0);
 const result=[];
 for(const file of pages){const media=await read(file);if(!safeSlideArtwork(media))throw Error('Unsupported artwork: '+file.name);await inspect(media,file);result.push({id:++id,type:'text',question:file.name.replace(/\.[^.]+$/,''),body:'',revealMode:'all',timerSeconds:0,options:[],correctAnswer:null,slideArtwork:media,artworkAlt:'',contentOrigin:'Imported slide artwork'});}
 return result;
}
