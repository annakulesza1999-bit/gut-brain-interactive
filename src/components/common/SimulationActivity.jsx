import React,{useState,useMemo} from 'react';
import {useQuiz} from '../../context/QuizContext';
import {curveIdentity} from '../../activities.js';
import {SIM_KINDS,MICROBE_COLORS,simSpec,defaultResponse,normalizeSimulation,simulationConfig,appraisalMetrics,recoverySeries,diversityMetrics,simulationSummary} from '../../simulations.js';
const field='w-full p-2 rounded-lg border border-slate-700 bg-slate-950';
const panel='rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3';
const button='px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-xs disabled:opacity-40';
const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'-';
function useIdentity(){const {participants,participantName,participantPhone}=useQuiz();return curveIdentity(participants.findIndex(p=>(participantPhone&&p.phone===participantPhone)||p.name===participantName));}
function Control({label,value,min,max,onChange,disabled}){
 return <label className="block space-y-1"><span className="flex justify-between gap-2 text-sm"><span>{label}</span><strong className="font-mono">{value}</strong></span><input aria-label={label} type="range" className="w-full accent-[#005C99]" min={min} max={max} step="1" value={value} disabled={disabled} onChange={e=>onChange(+e.target.value)}/></label>;
}
function Metric({label,value}){return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-mono">{value}</p></div>;}
function AppraisalView({value}){
 const {resources,gap}=appraisalMetrics(value);
 return <div className="space-y-3">
 <svg viewBox="0 0 340 164" className="w-full" role="img" aria-label="Conceptual demand and resource balance">
 <path d="M170 68 L137 149 H203Z" fill="#C5D3DE"/>
 <g transform={'rotate('+Math.max(-24,Math.min(24,-gap*2.5))+' 170 68)'}>
 <path d="M48 68 H292" stroke="#032138" strokeWidth="3" strokeLinecap="round"/>
 <path d="M67 68 L42 123 H92Z M273 68 L248 123 H298Z" fill="none" stroke="#005C99" strokeWidth="1.2"/>
 <rect x="36" y={123-value.demand*5} width="62" height={value.demand*5} rx="3" fill="#FFDC4C"/>
 <rect x="242" y={123-resources*5} width="62" height={resources*5} rx="3" fill="#005C99"/>
 </g><g fontSize="11" textAnchor="middle"><text x="66" y="160" fill="#735E00">Demands</text><text x="273" y="160" fill="#005C99">Resources</text></g>
 </svg>
 <div className="grid grid-cols-2 gap-2"><Metric label="Perceived demand" value={fmt(value.demand,0)}/><Metric label="Illustrative resource index" value={fmt(resources,1)}/></div>
 <p className="text-sm font-medium">{gap>2?'Demands exceed the illustrated resources.':gap< -2?'Illustrated resources exceed demands.':'Demands and illustrated resources are relatively balanced.'}</p>
 </div>;
}
function RecoveryGraph({series,selected,events=[],fixedScale=false}){
 const eventTimes=events.length?events:(series.length===1?series[0].stressors||[]:series.find(s=>s.label===selected)?.stressors||[]);
 const W=318,H=154,X=37,Y=20;
 const top=Math.max(6,Math.ceil(Math.max(.8,...(fixedScale?recoverySeries({frequency:12,recovery:0}).values.map(p=>p[1]):[]),...series.flatMap(s=>s.values.map(p=>p[1])))/2)*2);
 const path=values=>values.map(([t,v],i)=>(i?'L':'M')+(X+t/7*W)+' '+(Y+H-v/top*H)).join(' ');
 return <svg viewBox="0 0 370 204" className="w-full" role="img" aria-label="Illustrative activation over seven days"><rect x={X} y={Y} width={W} height={H} fill="#FFFFFF" rx="3"/>
 {[0,.25,.5,.75,1].map(n=><g key={n}><line x1={X} x2={X+W} y1={Y+H-n*H} y2={Y+H-n*H} stroke="#DCE5EC" strokeWidth=".7"/><text x={X-5} y={Y+H-n*H+3} textAnchor="end" fontSize="8" fill="#354D60">{fmt(top*n,1)}</text></g>)}
 <path d={'M'+X+' '+Y+' V'+(Y+H)+' H'+(X+W)} fill="none" stroke="#354D60"/>
 <line x1={X} x2={X+W} y1={Y+H-.8/top*H} y2={Y+H-.8/top*H} stroke="#CA8ADB" strokeDasharray="3 4"/>
 {eventTimes.map((t,i)=><g key={i} data-stressor-marker="true" transform={'translate('+(X+t/7*W)+' 9)'}><title>{'Stressor '+(i+1)+' · day '+(t+1).toFixed(2)}</title><line y1="8" y2={H+11} stroke="#C49A2B" strokeWidth=".7" strokeDasharray="2 4" opacity=".45"/><path d="M1 -6 L-5 1 H-1 L-3 7 L6 -2 H2 L4 -6Z" fill="#FFDC4C" stroke="#7C5D12" strokeWidth=".8" strokeLinejoin="round"/></g>)}
 {series.map((s,i)=><path key={s.label||i} d={path(s.values)} fill="none" stroke={s.color||'#005C99'} strokeWidth={series.length===1||selected===s.label?1.8:.8} opacity={series.length===1||selected===s.label ? .95:selected ? .18:.45} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>)}
 <g fill="#354D60" fontSize="9" textAnchor="middle">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=><text key={day} x={X+(i+.5)*W/7} y="187">{day}</text>)}<text transform="translate(9 96) rotate(-90)">Activation (illustrative)</text><text x="196" y="201">Time</text></g></svg>;
}
function Microbe({type,index}){
 const c=MICROBE_COLORS[type];
 return <svg viewBox="0 0 44 44" className="w-full" aria-hidden="true">{type%3===0?<g transform={'rotate('+(index%2? -35:35)+' 22 22)'}><rect x="13" y="5" width="18" height="34" rx="9" fill={c}/><circle cx="20" cy="17" r="2" fill="#FFFFFF"/><circle cx="25" cy="25" r="2" fill="#FFFFFF"/></g>:type%3===1?<g><circle cx="22" cy="22" r="13" fill={c}/>{[0,60,120,180,240,300].map(n=><path key={n} d="M22 8 V3" transform={'rotate('+n+' 22 22)'} stroke={c} strokeWidth="2" strokeLinecap="round"/>)}</g>:<path d="M8 32 C4 12 23 6 25 21 S39 39 36 13" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round"/>}<text x="38" y="42" fontSize="9" textAnchor="end" fill="#032138">{type+1}</text></svg>;
}
function MicrobeView({value,onChange,disabled=false,compact=false}){
 const d=diversityMetrics(value.microbes);
 return <div className="space-y-3"><div className={'grid gap-1 '+(compact?'grid-cols-12':'grid-cols-6')}>{value.microbes.map((type,i)=>onChange?<button key={i} type="button" disabled={disabled} className="rounded-lg border border-slate-800 bg-slate-950 p-1" aria-label={'Microbe '+(i+1)+', type '+(type+1)+', change type'} onClick={()=>onChange({microbes:value.microbes.map((n,j)=>i===j?(n+1)%6:n)})}><Microbe type={type} index={i}/></button>:<div key={i}><Microbe type={type} index={i}/></div>)}</div>
 <div className="flex h-3 overflow-hidden rounded-full" aria-label="Relative abundances">{d.counts.map((n,i)=>n>0&&<div key={i} style={{width:n/12*100+'%',background:MICROBE_COLORS[i]}} title={'Type '+(i+1)+': '+n+'/12'}/>)}</div>
 <div className="grid grid-cols-3 gap-2"><Metric label="Richness" value={d.richness}/><Metric label="Shannon H′" value={fmt(d.shannon)}/><Metric label="Evenness" value={fmt(d.evenness)}/></div>
 {onChange&&<div className="flex gap-2 flex-wrap"><button type="button" disabled={disabled} className={button} onClick={()=>onChange(defaultResponse('microbiome'))}>Even community</button><button type="button" disabled={disabled} className={button} onClick={()=>onChange({microbes:[0,0,0,0,0,0,0,1,2,3,4,5]})}>Uneven community</button></div>}</div>;
}
function Model({kind,value,onChange,disabled,explore=false}){
 const spec=simSpec(kind);
 return <div className={'space-y-4 '+(explore?'gm-explore-model':'')}>{kind!=='microbiome'&&<div className="space-y-4 gm-model-controls">{spec.fields.map(([id,label,min,max])=><Control key={id} label={label} min={min} max={max} value={value[id]} disabled={disabled||!onChange} onChange={v=>onChange?.({...value,[id]:v})}/>)}</div>}
 <div className="gm-model-visual space-y-3">{kind==='appraisal'?<AppraisalView value={value}/>:kind==='recovery'?<><RecoveryGraph series={[recoverySeries(value)]} events={recoverySeries(value).stressors} fixedScale={explore}/><p className="text-xs text-slate-400"><span className="inline-block text-[#8A6813] font-bold mr-1">⚡</span> Yellow marker = a stressor occurs</p><Metric label="Illustrative activation above baseline (area × days)" value={fmt(recoverySeries(value).exposure,1)}/></>:<MicrobeView value={value} onChange={onChange} disabled={disabled}/>}</div></div>;
}
export function SimulationEditor({question,update}){
 const cfg=simulationConfig(question),spec=simSpec(cfg.simKind);
 return <section className={panel}><h3 className="font-semibold">Simulation settings</h3><label className="block text-sm">Model<select className={field} value={cfg.simKind} onChange={e=>{const kind=e.target.value;update({simKind:kind,simInitial:defaultResponse(kind),simTask:simSpec(kind).task});}}>{SIM_KINDS.map(kind=><option key={kind} value={kind}>{simSpec(kind).title}</option>)}</select></label>
 <label className="block text-sm">Participation mode<select className={field} value={cfg.simMode} onChange={e=>update({simMode:e.target.value,...(e.target.value==='explore'?{timerSeconds:0}:{})})}><option value="submit">Submit a scenario to the group</option><option value="explore">Explore privately - no submissions or timer</option></select></label>
 <label className="block text-sm">Student task<textarea rows="3" className={field} value={cfg.simTask} onChange={e=>update({simTask:e.target.value})}/></label><p className="text-xs text-slate-400">Adjust the starting conditions below; every student starts with these values. The model equations and ranges are fixed teaching examples.</p><Model kind={cfg.simKind} value={cfg.simInitial} onChange={simInitial=>update({simInitial})}/><p className="text-xs text-slate-400">{spec.note}</p></section>;
}
export function SimulationExplorer({question,presenter=false}){
 const cfg=simulationConfig(question),spec=simSpec(cfg.simKind),[value,setValue]=useState(cfg.simInitial);
 return <section className="gm-simulation-explorer space-y-4 p-4"><h2 className="text-2xl">{question.question}</h2><p className="text-sm">{cfg.simTask}</p><p className="text-xs text-slate-400">{presenter?'Presenter demonstration - change these sliders to illustrate the model.':'Explore at your own pace. Nothing is submitted.'}</p><Model kind={cfg.simKind} value={value} onChange={setValue} explore/><div className="flex gap-3 items-center"><button type="button" className={button} onClick={()=>setValue(cfg.simInitial)}>Reset sliders</button><span className="text-xs text-slate-400">{spec.note}</span></div></section>;
}
export function SimulationInput({question}){return question.simMode==='explore'?<SimulationExplorer key={question.id} question={question}/>:<SimulationSubmission question={question}/>;}
function SimulationSubmission({question}){
 const cfg=simulationConfig(question),spec=simSpec(cfg.simKind),me=useIdentity(),{submitSpatial,isAnswerSubmitted,sessionStatus,questionState}=useQuiz();
 const [value,setValue]=useState(cfg.simInitial),[pending,setPending]=useState(false),[error,setError]=useState('');
 const disabled=pending||isAnswerSubmitted||sessionStatus!=='running'||questionState!=='active';
 return <section className="space-y-4 pb-8"><h2 className="text-xl">{question.question}</h2><p className="text-sm">{cfg.simTask}</p><div className="flex gap-2 items-center text-xs"><span style={{background:me.color}} className="w-4 h-4 rounded-full"/>Your participant color · #{me.label.split(' ')[1]}</div>
 <div className={panel}><Model kind={cfg.simKind} value={value} onChange={setValue} disabled={disabled}/></div>
 <p className="text-xs text-slate-400">{spec.note}</p>{isAnswerSubmitted?<p className="font-medium">Submitted - waiting for reveal.</p>:<div className="flex gap-2"><button type="button" className={button} disabled={disabled} onClick={()=>setValue(cfg.simInitial)}>Reset</button><button type="button" className="flex-1 rounded-xl p-3 bg-emerald-600 text-white disabled:opacity-40" disabled={disabled} onClick={async()=>{setPending(true);setError('');try{const r=await submitSpatial(value);if(!r.success)setError(r.error);}finally{setPending(false);}}}>{pending?'Submitting…':'Submit my scenario'}</button></div>}{error&&<p role="alert" className="text-rose-700">{error}</p>}</section>;
}
function AppraisalResults({entries}){
 return <div className="space-y-3">{entries.map(e=>{const r=appraisalMetrics(e.response);return <div key={e.label} className="grid grid-cols-[48px_1fr_1fr] items-center gap-2 text-xs"><span style={{color:e.color}}>#{e.label.split(' ')[1]}</span><div><div>Demand {e.response.demand}</div><div className="h-2 bg-slate-800 rounded-full"><div className="h-2 rounded-full bg-[#FFDC4C]" style={{width:e.response.demand*10+'%'}}/></div></div><div><div>Resources {fmt(r.resources,1)}</div><div className="h-2 bg-slate-800 rounded-full"><div className="h-2 rounded-full bg-[#005C99]" style={{width:r.resources*10+'%'}}/></div></div></div>})}</div>;
}
export function SimulationResults(props){return props.question.simMode==='explore'?<SimulationExplorer key={props.question.id} question={props.question} presenter={!props.participant}/>:<SimulationSubmissionResults {...props}/>;}
function SimulationSubmissionResults({question,result,revealed,showResults=revealed,count,participant=false}){
 const cfg=simulationConfig(question),spec=simSpec(cfg.simKind),me=useIdentity(),[highlight,setHighlight]=useState('');
 const entries=useMemo(()=>(result?.simulationResults||[]).filter(e=>normalizeSimulation(cfg.simKind,e.response)),[result,cfg.simKind]);
 const summary=simulationSummary(cfg.simKind,entries),mine=entries.find(e=>e.label===me.label),chosen=entries.find(e=>e.label===(highlight|| (participant?me.label:'')));
 return <section className={panel}><h2 className="text-2xl">{question.question}</h2><p className="text-sm">{cfg.simTask}</p><p className="text-xs text-slate-400">{showResults?entries.length+' submissions':(count||0)+' submitted · hidden until reveal'}</p>
 {!showResults?<Model kind={cfg.simKind} value={cfg.simInitial} disabled/>:entries.length===0?<p>No submissions yet.</p>:<>
 {cfg.simKind==='appraisal'?<><div className="grid grid-cols-2 gap-2"><Metric label="Mean resources (illustrative)" value={fmt(summary.means.resources,1)}/><Metric label="Mean demand − resources" value={fmt(summary.means.gap,1)}/></div><AppraisalResults entries={entries}/></>:cfg.simKind==='recovery'?<><RecoveryGraph series={entries.map(e=>({...recoverySeries(e.response),label:e.label,color:e.color}))} selected={chosen?.label}/><p className="text-xs text-slate-400">⚡ Yellow markers identify stressor times for the selected curve. Select a participant to inspect their events.</p><Metric label="Mean simulated activation area above baseline" value={fmt(summary.means.exposure,1)}/></>:<><div className="grid grid-cols-3 gap-2"><Metric label="Mean richness" value={fmt(summary.means.richness,1)}/><Metric label="Mean Shannon H′" value={fmt(summary.means.shannon)}/><Metric label="Mean evenness" value={fmt(summary.means.evenness)}/></div><div className="grid sm:grid-cols-2 gap-3">{entries.map(e=><div key={e.label} className="p-2 border rounded-xl border-slate-800" style={chosen?.label===e.label?{borderColor:e.color,borderWidth:2}:undefined}><p className="text-xs font-medium mb-2" style={{color:e.color}}>#{e.label.split(' ')[1]} {mine?.label===e.label&&participant?'(you)':''}</p><MicrobeView value={e.response} compact/></div>)}</div></>}
 <div className="flex flex-wrap gap-2">{entries.map(e=><button type="button" className={button} key={e.label} onClick={()=>setHighlight(h=>h===e.label?'':e.label)} aria-pressed={chosen?.label===e.label}><span className="inline-block w-3 h-3 rounded-full mr-1" style={{background:e.color}}/>#{e.label.split(' ')[1]}{participant&&mine?.label===e.label?' (you)':''}</button>)}</div>
 {chosen&&cfg.simKind!=='microbiome'&&<div className={panel}><h3 className="font-medium">Selected scenario · #{chosen.label.split(' ')[1]}</h3><Model kind={cfg.simKind} value={chosen.response} disabled/></div>}
 </>}
 <p className="text-xs text-slate-400">{spec.note} No points are awarded for these exploratory activities.</p></section>;
}
