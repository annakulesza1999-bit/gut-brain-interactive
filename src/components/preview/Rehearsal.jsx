import React,{useEffect,useReducer,useState,useRef,useMemo} from 'react';
import {ArrowLeft,ArrowRight,Maximize2,Smartphone,Play,Pause,Eye,RotateCcw} from 'lucide-react';
import {RehearsalProvider} from '../../context/QuizContext';
import {startSlide,previewReducer,previewData} from '../../previewSession.js';
import {isExploreSimulation} from '../../simulations.js';
import {textLines,liveResultsEnabled,slideSources} from '../../activities.js';
import ParticipantQuestionScreen from '../participant/ParticipantQuestionScreen';
import ParticipantResultScreen from '../participant/ParticipantResultScreen';
import TextSlide from '../common/TextSlide';
import SlideFrame from '../common/SlideFrame';
import SequenceMedia,{SequenceHeading} from '../common/SequenceMedia';
import {CurveResults} from '../common/CurveActivity';
import {SpatialResults} from '../common/SpatialActivity';
import {SimulationResults} from '../common/SimulationActivity';
import {ResearchResults} from '../common/ResearchActivity';
import {BrainResults} from '../common/BrainActivity';
import WordCloudDisplay from '../trainer/WordCloudDisplay';
const button='px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm disabled:opacity-40';
const primary='px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40';
const CHANNEL='gm-rehearsal-v1';
function Stage({question:q,data,state}){
 const showResults=state.revealed||liveResultsEnabled(q),result=state.revealed?data.reveal:showResults?data.live:null;
 const props={question:q,result,revealed:state.revealed,showResults,count:data.completed};
 if(q.type==='text')return <TextSlide question={q} presenter visible={state.visible}/>;
 if(q.type==='curve')return <CurveResults question={q} curves={result?.curves||[]} reference={result?.referenceCurve} revealed={state.revealed} showResults={showResults} count={data.completed}/>;
 if(['pointmap','matching'].includes(q.type))return <SpatialResults {...props}/>;
 if(q.type==='simulation')return <SimulationResults {...props}/>;
 if(q.type==='research')return <ResearchResults {...props}/>;
 if(q.type==='brain')return <BrainResults {...props}/>;
 if(q.type==='wordcloud')return <div className="space-y-5"><h1 className="text-3xl">{q.question}</h1><WordCloudDisplay words={showResults?data.words:[]} totalResponses={showResults?data.words.length:0} hidden={!showResults}/></div>;
 return <div className="gm-question-stage space-y-4"><h1 className="text-3xl font-serif">{q.question}</h1>{q.type==='sequence'&&<div className="gm-sequence-stage"><SequenceHeading question={q}/><SequenceMedia artwork={q.sequenceArtwork} media={state.revealed?q.afterMedia:q.beforeMedia} preset={state.revealed?q.afterPreset:q.beforePreset} phase={state.revealed?'after':'before'}/></div>}
 <div className="gm-choice-grid space-y-3">{(q.options||[]).map((o,i)=>{const d=result?.optionDist[i],correct=state.revealed&&q.correctAnswer===i;return <div key={i} className="relative overflow-hidden rounded-xl border border-slate-800 p-4 bg-slate-900"><div className="absolute inset-y-0 left-0 transition-all" style={{width:(d?.pct||0)+'%',background:correct?'#DFEFF0':'#F4E8F8'}}/><div className="relative flex justify-between gap-3"><span>{String.fromCharCode(65+i)}. {o}</span>{showResults&&<strong>{d?.count||0} · {d?.pct||0}%{correct?' ✓':''}</strong>}</div></div>;})}</div>{state.revealed&&q.explanation&&<p className="text-sm">{q.explanation}</p>}</div>;
}
export default function Rehearsal({content,startIndex=0,onExit,onEdit}){
 const [state,dispatch]=useReducer((s,a)=>previewReducer(content,s,a),null,()=>startSlide(content,Math.max(0,Math.min(startIndex,content.questions.length-1))));
 const [phone,setPhone]=useState(true),[frameReady,setFrameReady]=useState(0),[fullscreen,setFullscreen]=useState(false),[error,setError]=useState('');
 const frame=useRef(null),stage=useRef(null),latest=useRef(null);
 const q=content.questions[state.index],data=useMemo(()=>previewData(content,state),[content,state]),hidden=q.type==='text'&&state.visible<textLines(q).length,explore=isExploreSimulation(q);
 const context={role:'participant',currentQuestion:data.question,currentQuestionIndex:state.index,totalQuestions:content.questions.length,selectedOption:Number.isInteger(state.response)?state.response:null,isAnswerSubmitted:data.own,timeRemaining:state.remaining,timerDuration:state.duration,activeDuration:state.duration,sessionStatus:state.paused?'paused':'running',questionState:state.revealed?'revealed':'active',speedBonusEnabled:false,showTopic:false,qaQuestions:state.qa,participants:data.participants,participantName:'Participant 1',participantPhone:'',leaderboard:data.participants.map((p,i)=>({...p,score:i===0?data.ownScore?.pointsEarned||0:0})),revealData:data.reveal,lastAnswerResult:data.ownScore,brainFeedback:data.brainFeedback};
 latest.current={state,context};
 useEffect(()=>{const id=setInterval(()=>dispatch({type:'tick'}),1000);return()=>clearInterval(id);},[]);
 useEffect(()=>{if(phone&&frameReady)frame.current?.contentWindow?.postMessage({channel:CHANNEL,type:'state',visit:state.visit,context},location.origin);},[phone,frameReady,state,content]);
 useEffect(()=>{
  const receive=e=>{
   if(e.origin!==location.origin||e.source!==frame.current?.contentWindow||e.data?.channel!==CHANNEL)return;
   if(e.data.type==='ready'){setFrameReady(x=>x+1);return;}
   if(e.data.type!=='action')return;
   const a=e.data.action,old=latest.current.state;
   if(!a||!['answer','word','reaction','qa','upvote'].includes(a.type)||a.visit!==old.visit)return;
   const next=previewReducer(content,old,a),success=next!==old;
   if(success){latest.current.state=next;dispatch(a);}
   e.source.postMessage({channel:CHANNEL,type:'ack',id:e.data.id,success},location.origin);
  };
  window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 },[content]);
 useEffect(()=>{const key=e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target?.tagName)||e.target?.isContentEditable)return;if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();dispatch({type:'next'});}if(e.key==='ArrowLeft'){e.preventDefault();dispatch({type:'goto',index:state.index-1});}if(e.key.toLowerCase()==='r'){dispatch({type:'reveal'});}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[state.index]);
 useEffect(()=>{const change=()=>setFullscreen(document.fullscreenElement===stage.current);document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
 const done=state.index===content.questions.length-1&&(q.type==='text'?!hidden:explore||state.revealed);
 const exit=fn=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});fn(state.index);};
 return <RehearsalProvider value={context}><div className="min-h-screen bg-slate-950 text-slate-100"><header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 p-3 flex flex-wrap items-center gap-3"><button className={button} onClick={()=>exit(onExit)}><ArrowLeft size={15} className="inline mr-1"/>Library</button><button className={button} onClick={()=>exit(onEdit)}>Edit current slide</button><div className="flex-1 min-w-32"><h1 className="text-lg font-serif">{content.title}</h1><p className="text-xs text-slate-400">Rehearsal · no live audience</p></div><button className={button} aria-pressed={phone} onClick={()=>setPhone(v=>!v)}><Smartphone size={16} className="inline mr-1"/>Student phone</button><button className={primary} onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.current.requestFullscreen();}catch{setError('Full screen is unavailable in this browser.');}}}><Maximize2 size={16} className="inline mr-1"/>Full screen</button></header>
 <main className="p-3 md:p-5 grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)]"><aside className="rounded-xl border border-slate-800 bg-slate-900 p-3 max-h-[75vh] overflow-auto"><p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Slides</p>{content.questions.map((slide,i)=><button type="button" key={slide.id} aria-current={i===state.index?'step':undefined} onClick={()=>dispatch({type:'goto',index:i})} className={'block w-full text-left p-2 mb-2 rounded-lg border text-sm '+(i===state.index?'border-emerald-600 bg-emerald-500/10':'border-slate-800')}><span className="text-xs text-slate-400">{i+1} · {slide.type}</span><span className="block break-words">{slide.question}</span></button>)}</aside>
 <div className={'grid gap-4 min-w-0 '+(phone?'lg:grid-cols-[minmax(0,1fr)_390px]':'')}><div className="min-w-0 space-y-3"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1">Slide {state.index+1}/{content.questions.length}</span><span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1">{data.participants.length} preview participants</span>{q.type!=='text'&&!explore&&<span className="rounded-full px-3 py-1 bg-slate-900 border border-slate-800">{liveResultsEnabled(q)?'Live results':'Results hidden until reveal'}</span>}{q.type!=='text'&&!explore&&<span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1" role="status">{data.completed}/{data.participants.length} completed</span>}{explore&&<span className="rounded-full px-3 py-1 bg-slate-900 border border-slate-800">Explore privately</span>}{state.samples.length>0&&<span className="text-xs px-2 py-1">14 or fewer generated demo responses</span>}</div>
 <div ref={stage} className="relative bg-slate-950 rounded-xl border border-slate-800 gm-rehearsal-stage"><SlideFrame><Stage key={state.visit} question={q} data={data} state={state}/>{q.type!=='text'&&slideSources(q)&&<footer className="gm-slide-sources mt-3">{slideSources(q)}</footer>}</SlideFrame>
 <div aria-hidden="true" className="pointer-events-none absolute bottom-4 right-5">{state.reactions.map((r,i)=><span key={r.id} className="gm-rehearsal-reaction absolute text-3xl" style={{right:i*12}}>{r.emoji}</span>)}</div>{fullscreen&&<div className="gm-fullscreen-controls flex gap-2 justify-center mt-4"><button className={button} onClick={()=>dispatch({type:'goto',index:state.index-1})}>Previous</button><button className={primary} disabled={done} onClick={()=>dispatch({type:'next'})}>{hidden?'Reveal next line':q.type!=='text'&&!explore&&!state.revealed?'Reveal results':'Next slide'}</button><button className={button} onClick={()=>document.exitFullscreen()}>Exit full screen</button></div>}</div>
 <div className="flex flex-wrap gap-2 items-center"><button className={button} disabled={state.index===0} onClick={()=>dispatch({type:'goto',index:state.index-1})}>Previous</button><button className={primary} disabled={done} onClick={()=>dispatch({type:'next'})}>{hidden?'Reveal next line':q.type!=='text'&&!explore&&!state.revealed?'Reveal results':'Next slide'} <ArrowRight size={14} className="inline"/></button>{q.type!=='text'&&!explore&&<><button className={button} disabled={state.revealed||state.duration===0} onClick={()=>dispatch({type:'pause'})}>{state.paused?<Play size={14} className="inline"/>:<Pause size={14} className="inline"/>} {state.paused?'Resume':'Pause'} {state.duration?state.remaining+'s':'Untimed'}</button><button className={button} disabled={q.type==='brain'&&q.brainView!=='sagittal-map'} onClick={()=>dispatch({type:'samples'})}>{state.samples.length?'Remove demo responses':'Add demo responses'}</button></>}<button className={button} onClick={()=>dispatch({type:'reset'})}><RotateCcw size={14} className="inline"/> Reset slide</button></div>
 <div className="flex flex-wrap items-center gap-3 text-sm"><span>👍 {data.thumbs.up}</span><span>👎 {data.thumbs.down}</span><button className="underline text-xs" onClick={()=>dispatch({type:'resetThumbs'})}>Reset check-in</button><span className="text-xs text-slate-400">← / → navigate · R reveal</span></div>{q.sourceNotes&&<details className="p-3 border border-slate-800 rounded-xl bg-slate-900 text-sm"><summary className="cursor-pointer">Private speaker notes</summary><p className="whitespace-pre-wrap pt-2">{q.sourceNotes}</p></details>}{state.qa.length>0&&<div className="p-3 border rounded-xl border-slate-800"><h3>Practice Q&A</h3>{state.qa.map(a=><p key={a.id} className="text-sm">{a.text} · {a.upvotes} votes</p>)}</div>}{error&&<p role="alert">{error}</p>}</div>
 {phone&&<aside className="min-w-0"><div className="flex items-center justify-between mb-2"><h2 className="font-medium">Student phone preview</h2><span className="text-xs text-slate-400">390 px</span></div><iframe ref={frame} title="Student phone preview" src="/editor-preview.html?participant-preview=1" className="w-full max-w-[402px] h-[720px] border-[6px] border-slate-700 rounded-[28px] bg-slate-950 mx-auto block"/><p className="mt-2 text-xs text-slate-400">Interactive local simulation. No QR code, real phone connection or saved student results.</p></aside>}</div></main></div></RehearsalProvider>;
}
export function PhoneRehearsal(){
 const [payload,setPayload]=useState(null),pending=useRef(new Map()),serial=useRef(0);
 useEffect(()=>{
  if(window.parent===window)return;
  const receive=e=>{if(e.origin!==location.origin||e.source!==window.parent||e.data?.channel!==CHANNEL)return;if(e.data.type==='state')setPayload(e.data);if(e.data.type==='ack'){const done=pending.current.get(e.data.id);if(done){pending.current.delete(e.data.id);done({success:e.data.success,error:e.data.success?'':'Submission unavailable. Try resetting the slide.'});}}};
  window.addEventListener('message',receive);window.parent.postMessage({channel:CHANNEL,type:'ready'},location.origin);
  return()=>{window.removeEventListener('message',receive);for(const done of pending.current.values())done({success:false,error:'Preview closed'});pending.current.clear();};
 },[]);
 function send(type,extra={}){
  if(!payload)return Promise.resolve({success:false,error:'Not ready'});
  const id=++serial.current;
  return new Promise(resolve=>{const timeout=setTimeout(()=>{pending.current.delete(id);resolve({success:false,error:'Preview did not respond'});},3000);pending.current.set(id,r=>{clearTimeout(timeout);resolve(r);});window.parent.postMessage({channel:CHANNEL,type:'action',id,action:{type,visit:payload.visit,...extra}},location.origin);});
 }
 if(!payload)return <div className="p-5 text-sm">Open Student phone from the presenter preview.</div>;
 const value={...payload.context,submitAnswer:response=>send('answer',{response}),submitCurve:response=>send('answer',{response}),submitSpatial:response=>send('answer',{response}),submitWordCloud:async word=>(await send('word',{word})).success,sendReaction:emoji=>send('reaction',{emoji,id:Date.now()+':'+serial.current}),submitQAQuestion:text=>send('qa',{text,id:Date.now()+':'+serial.current,timestamp:Date.now()}),upvoteQAQuestion:id=>send('upvote',{id}),toggleQAAnswered:()=>{}};
 return <RehearsalProvider value={value}><div className="min-h-screen bg-slate-950"><header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between"><strong className="font-serif">Gut &amp; Mind</strong><span className="text-xs text-slate-400">Participant 1 · Preview</span></header><main className="pb-20 gm-participant-content" key={payload.visit+':'+value.questionState}>{value.questionState==='revealed'&&value.currentQuestion.type!=='text'?<ParticipantResultScreen/>:<ParticipantQuestionScreen/>}</main></div></RehearsalProvider>;
}
