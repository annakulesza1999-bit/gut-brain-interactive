import {normalizeContent,snapshot,HISTORY_LIMIT} from '../presentations.js';
// IndexedDB is independent of the deployed app bundle. No presentation data is written to GitHub.
const DB='gut-mind-library',STORE='presentations';
let connection;
function open(){
 if(!connection)connection=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('Browser storage is unavailable.'));return;}
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
  req.onerror=()=>reject(req.error||Error('Cannot open presentation library.'));
  req.onblocked=()=>reject(Error('Close other Gut & Mind tabs and retry.'));
 }).catch(e=>{connection=null;throw e;});
 return connection;
}
async function transact(mode,operation){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
  let result,reason;
  const fail=e=>{reason=e;try{tx.abort();}catch{}};
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(reason||tx.error||Error('Storage error.'));
  tx.onabort=()=>reject(reason||tx.error||Error('Save cancelled.'));
  try{operation(store,v=>{result=v;},fail);}catch(e){fail(e);}
 });
}
export const listPresentations=()=>transact('readonly',(store,done)=>{const req=store.getAll();req.onsuccess=()=>done(req.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));});
export function createPresentation(content,history=[]){
 const now=new Date().toISOString(),id=globalThis.crypto?.randomUUID?.()||('deck-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const clean=normalizeContent(content);
 const record={id,revision:1,createdAt:now,updatedAt:now,content:clean,history:snapshot(history.slice(-HISTORY_LIMIT),clean,'Created',now)};
 return transact('readwrite',(store,done)=>{store.add(record);done(record);});
}
export function savePresentation(id,expectedRevision,content,{checkpoint=false,label='Saved version'}={}){
 const clean=normalizeContent(content);
 return transact('readwrite',(store,done,fail)=>{
  const get=store.get(id);
  get.onsuccess=()=>{
   try{
    const old=get.result;
    if(!old)throw Error('Presentation was removed. Export a backup of your current work.');
    if(old.revision!==expectedRevision)throw Error('A newer version exists in another tab. Export your current work as a backup before reopening.');
    const now=new Date().toISOString();
    let history=old.history||[];
    if(checkpoint)history=snapshot(history,clean,label,now);
    else if(!history.length||Date.now()-Date.parse(history[history.length-1].at)>300000)history=snapshot(history,old.content,'Autosave checkpoint',now);
    const next={...old,revision:old.revision+1,updatedAt:now,content:clean,history};
    store.put(next);done(next);
   }catch(e){fail(e);}
  };
 });
}
export function restorePresentation(id,expectedRevision,index){
 return transact('readwrite',(store,done,fail)=>{
  const req=store.get(id);req.onsuccess=()=>{
   try{
    const old=req.result;if(!old||old.revision!==expectedRevision)throw Error('Presentation changed. Reopen it before restoring.');
    const version=old.history?.[index];if(!version)throw Error('Version not found.');
    const now=new Date().toISOString(),content=normalizeContent(version.content);
    const history=snapshot(snapshot(old.history,old.content,'Before restore',now),content,'Restored version',now);
    const next={...old,revision:old.revision+1,updatedAt:now,content,history};
    store.put(next);done(next);
   }catch(e){fail(e);}
  };
 });
}
