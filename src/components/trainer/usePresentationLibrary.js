import {useState,useRef,useEffect,useCallback} from 'react';
import {blankSlide,normalizeContent,makeBackup,readBackup} from '../../presentations.js';
import {listPresentations,createPresentation,savePresentation,restorePresentation} from '../../services/presentationStorage.js';
export default function usePresentationLibrary(){
 const [records,setRecords]=useState([]),[active,setActive]=useState(null),[status,setStatus]=useState('Loading library…'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const saved=useRef(null),draft=useRef(null),dirty=useRef(false),timer=useRef(null),queue=useRef(Promise.resolve()),lock=useRef(false),mounted=useRef(true);
 const report=e=>{if(mounted.current){setError(e.message||String(e));setStatus('Not saved');}};
 const remember=record=>{try{localStorage.setItem('gm_last_deck',record.id);}catch{}};
 const show=record=>{saved.current=record;draft.current=record.content;dirty.current=false;setActive(record);setStatus('Saved on this device');setError('');remember(record);};
 const refresh=async()=>{const list=await listPresentations();if(mounted.current)setRecords(list);return list;};
 useEffect(()=>{mounted.current=true;let cancelled=false;refresh().then(list=>{if(cancelled)return;let last;try{last=localStorage.getItem('gm_last_deck');}catch{}const record=list.find(r=>r.id===last);if(record)show(record);else setStatus('Ready');}).catch(report);return()=>{cancelled=true;mounted.current=false;clearTimeout(timer.current);};},[]);
 const flush=useCallback((checkpoint=false,label='Saved version')=>{
  clearTimeout(timer.current);
  const task=queue.current.catch(()=>{}).then(async()=>{
   if(!saved.current||(!dirty.current&&!checkpoint))return true;
   const content=draft.current,id=saved.current.id;
   if(mounted.current)setStatus('Saving…');
   try{
    const next=await savePresentation(id,saved.current.revision,content,{checkpoint,label});
    saved.current=next;
    const unchanged=draft.current===content;
    if(unchanged)dirty.current=false;
    if(mounted.current){setActive({...next,content:draft.current});setRecords(prev=>[next,...prev.filter(r=>r.id!==next.id)]);setStatus(unchanged?'Saved on this device':'Unsaved changes');setError('');}
    return true;
   }catch(e){report(e);return false;}
  });
  queue.current=task;return task;
 },[]);
 const update=useCallback(patch=>{
  if(!draft.current||lock.current)return;
  draft.current={...draft.current,...patch};dirty.current=true;
  setActive({...saved.current,content:draft.current});setStatus('Saving…');
  clearTimeout(timer.current);timer.current=setTimeout(()=>flush(),350);
 },[flush]);
 useEffect(()=>{
  const unload=e=>{if(dirty.current){e.preventDefault();e.returnValue='';}};
  const visibility=()=>{if(document.visibilityState==='hidden'&&dirty.current)flush();};
  window.addEventListener('beforeunload',unload);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('visibilitychange',visibility);};
 },[flush]);
 async function exclusive(operation){
  if(lock.current)return false;lock.current=true;setBusy(true);
  try{if(!await flush())return false;await operation();return true;}catch(e){report(e);return false;}finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 const create=(content={title:'Untitled presentation',questions:[blankSlide()]},history=[])=>exclusive(async()=>{show(await createPresentation(content,history));await refresh();});
 const open=id=>exclusive(async()=>{const list=await refresh();const record=list.find(r=>r.id===id);if(!record)throw Error('Presentation not found.');show(record);});
 const duplicate=()=>exclusive(async()=>{if(!draft.current)return;show(await createPresentation({...draft.current,title:(draft.current.title||'Untitled')+' — copy'}));await refresh();});
 const restore=index=>exclusive(async()=>{show(await restorePresentation(saved.current.id,saved.current.revision,index));await refresh();});
 const importFile=async file=>{if(!file)return false;if(file.size>80*1024*1024){report(Error('Backup exceeds 80 MB.'));return false;}try{const {content,history}=readBackup(JSON.parse(await file.text()),file.name.replace(/\.json$/i,''));return await create(content,history);}catch(e){report(e);return false;}};
 const exportFile=()=>{
  if(!draft.current)return;
  try{
   const backup=makeBackup({...saved.current,content:normalizeContent(draft.current)});
   const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download=(draft.current.title||'presentation').replace(/[^a-zA-Z0-9 _-]/g,'_')+'.gutmind.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){report(e);}
 };
 return {records,active,status,error,busy,update,flush,create,open,duplicate,restore,importFile,exportFile};
}
