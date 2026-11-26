import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {wordFrequencies,fitCloudWords,cloudPageSize,wordColor} from '../../wordCloudLayout.js';

const graphicStyle={aspectRatio:'900 / 460',minHeight:240,width:'100%',boxSizing:'border-box'};
const fontFamily='"Source Sans 3", Arial, sans-serif';

export default function WordCloudDisplay({words=[],totalResponses=0,hidden=false}){
 const stats=useMemo(()=>wordFrequencies(words),[words]);
 const [page,setPage]=useState(0),[view,setView]=useState('cloud'),[fontVersion,setFontVersion]=useState(0);
 const graphic=useRef(null),[dimensions,setDimensions]=useState({width:900,height:460});
 const pageSize=cloudPageSize(dimensions.width),pages=Math.max(1,Math.ceil(stats.length/pageSize)),current=Math.min(page,pages-1);
 const visible=stats.slice(current*pageSize,(current+1)*pageSize);
 const hasWords=!hidden&&stats.length>0;
 useEffect(()=>{
  let active=true;
  const refresh=()=>{if(active)setFontVersion(v=>v+1);};
  if(document.fonts){
   document.fonts.load('700 48px "Source Sans 3"').then(refresh,refresh);
   document.fonts.addEventListener('loadingdone',refresh);
  }
  return ()=>{active=false;document.fonts?.removeEventListener('loadingdone',refresh);};
 },[]);
 useLayoutEffect(()=>{
  if(!hasWords||!graphic.current)return;
  const node=graphic.current,update=()=>{
   const width=node.clientWidth,height=node.clientHeight;
   if(width&&height)setDimensions(old=>old.width===width&&old.height===height?old:{width,height});
  };
  update();const observer=new ResizeObserver(update);observer.observe(node);
  return ()=>observer.disconnect();
 },[hasWords,view]);
 const layout=useMemo(()=>{
  const ctx=document.createElement('canvas').getContext('2d');
  return fitCloudWords(visible,(word,size)=>{
   if(!ctx)return word.length*size;
   ctx.font='700 '+size+'px '+fontFamily;
   const m=ctx.measureText(word);
   return Math.max(m.width,(m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||0));
  },dimensions.width,dimensions.height,stats[0]?.count||1);
 },[stats,current,pageSize,dimensions,fontVersion]);
 const control='rounded-md border border-slate-700 px-3 py-1.5 text-xs disabled:opacity-40';
 return <section className="rounded-2xl border border-slate-800 overflow-hidden" style={{background:'#FFFFFF',color:'#032138'}}>
 <div className="flex items-center justify-between px-5 pt-4 gap-3 text-xs" style={{color:'#354D60'}}>
  <span className="tracking-widest uppercase">{hidden?'Hidden responses':'Word cloud'}</span>
  <span>{hidden?'Waiting for reveal':totalResponses+' submissions · '+stats.length+' unique'}</span>
 </div>
 {!hasWords?<div className="min-h-[320px] grid place-items-center text-center px-6"><div><p className="font-serif text-2xl">{hidden?'Responses are hidden':'What comes to mind?'}</p><p className="text-sm mt-2" style={{color:'#354D60'}}>{hidden?'Reveal when everyone is ready.':'Words will appear here as participants submit them.'}</p></div></div>:<>
 {view==='cloud'?<div ref={graphic} role="img" aria-label="Live frequency word cloud" className="gm-wordcloud-graphic" style={{...graphicStyle,display:'flex',flexWrap:'wrap',alignContent:'center',alignItems:'center',justifyContent:'center',columnGap:20,rowGap:12,padding:'20px 24px',fontFamily,fontWeight:700}}>
  {layout.words.map(w=><span key={w.key} data-cloud-word={w.key} data-count={w.count} title={w.count+' '+(w.count===1?'submission':'submissions')} style={{display:'block',flex:'0 0 auto',maxWidth:'100%',overflowWrap:'anywhere',lineHeight:1.2,textAlign:'center',fontSize:w.size,color:wordColor(w.key)}}>{w.text}</span>)}
 </div>:<div ref={graphic} className="gm-wordcloud-graphic" style={{...graphicStyle,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'center'}}>
  <ul aria-label="Response frequencies" style={{display:'grid',width:'100%',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 220px),1fr))',gap:'12px 24px',alignContent:'center',fontSize:18}}>
   {visible.map(w=><li key={w.key} className="flex justify-between gap-3 border-b border-slate-800 pb-2"><span style={{overflowWrap:'anywhere',minWidth:0}}>{w.text}</span><strong>{w.count}</strong></li>)}
  </ul>
 </div>}
 <div className="px-5 pb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
  <button type="button" className={control} onClick={()=>setView(v=>v==='cloud'?'frequencies':'cloud')}>{view==='cloud'?'Response frequencies':'Back to word cloud'}</button>
  {pages>1&&<div className="flex items-center gap-2"><button type="button" className={control} disabled={current===0} onClick={()=>setPage(current-1)} aria-label="Previous word cloud page">Previous</button><span>Page {current+1} of {pages}</span><button type="button" className={control} disabled={current===pages-1} onClick={()=>setPage(current+1)} aria-label="Next word cloud page">Next</button></div>}
 </div>
 </>}
 </section>;
}
