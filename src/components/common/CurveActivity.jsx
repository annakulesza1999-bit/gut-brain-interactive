import React,{useState,useRef,useId} from 'react';
import {useQuiz} from '../../context/QuizContext';
import {curveIdentity,normalizeCurve,averageCurves} from '../../activities.js';
const X=50,Y=20,W=310,H=185;
const line=points=>points.map(([x,y],i)=>(i?'L':'M')+(X+x*W)+' '+(Y+(1-y)*H)).join(' ');
function Graph({question,children,svgRef,...handlers}){
 const ticks=(question.xTicks||'Before,0,15,30,45,60').split(',').slice(0,10);
 const marker=question.stressMarker;
 const id=useId();
 return <svg ref={svgRef} {...handlers} viewBox="0 0 380 250" className="w-full rounded-xl border border-slate-800" style={{background:'#FFFEFA',touchAction:svgRef?'none':undefined}} aria-label="Prediction graph">
 <defs><clipPath id={id}><rect x={X} y={Y} width={W} height={H}/></clipPath></defs>
 {[0,.2,.4,.6,.8,1].map(t=><line key={t} x1={X} y1={Y+t*H} x2={X+W} y2={Y+t*H} stroke="#DFE4DB" strokeWidth=".6"/>)}
 <path d={'M'+X+' '+Y+' V'+(Y+H)+' H'+(X+W)} fill="none" stroke="#64736A"/>
 {Number.isFinite(marker)&&marker>=0&&marker<=1&&<g><line x1={X+marker*W} x2={X+marker*W} y1={Y} y2={Y+H} stroke="#B58C6B" strokeDasharray="3 4"/><text x={X+marker*W} y="14" textAnchor="middle" fontSize="9" fill="#805726">Event</text></g>}
 <g clipPath={'url(#'+id+')'}>{children}</g>
 <g fill="#526258" fontSize="9" textAnchor="middle">{ticks.map((t,i)=><text key={i} x={X+i*W/Math.max(1,ticks.length-1)} y="221">{t.trim()}</text>)}<text x="205" y="240">{question.xLabel||'Time'}</text><text transform="translate(15 112) rotate(-90)">{question.yLabel||'Response'}</text></g>
 </svg>;
}
function useIdentity(){const {participants,participantName,participantPhone}=useQuiz();return curveIdentity(participants.findIndex(p=>(participantPhone&&p.phone===participantPhone)||p.name===participantName));}
export function CurveInput({question}){
 const {submitCurve,isAnswerSubmitted,sessionStatus}=useQuiz();const identity=useIdentity();
 const [points,setPoints]=useState([]),[pending,setPending]=useState(false),[error,setError]=useState('');
 const svg=useRef(null),working=useRef([]),pointer=useRef(null);
 const point=e=>{const p=svg.current.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.current.getScreenCTM().inverse());return [Math.max(0,Math.min(1,(q.x-X)/W)),Math.max(0,Math.min(1,1-(q.y-Y)/H))];};
 const disabled=pending||isAnswerSubmitted||sessionStatus!=='running';
 const stop=e=>{if(pointer.current===e.pointerId)pointer.current=null;};
 const update=p=>{working.current=p;setPoints(p);};
 return <section className="space-y-4"><h2 className="text-xl">{question.question}</h2><p className="text-sm">Draw from left to right with your finger or mouse. Your color stays the same on the shared display.</p>
 <div className="flex items-center gap-2 text-sm"><span style={{background:identity.color}} className="w-4 h-4 rounded-full"/>{identity.label} · Your color</div>
 <Graph question={question} svgRef={svg} onPointerDown={e=>{if(disabled||pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;svg.current.setPointerCapture(e.pointerId);update([point(e)]);setError('');}} onPointerMove={e=>{if(pointer.current!==e.pointerId||disabled)return;const p=point(e),prev=working.current,last=prev[prev.length-1];if(p[0]<last[0]||prev.length>=1000)return;update([...prev,p]);}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
 <path d={line(points)} stroke={identity.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity=".9" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
 </Graph>
 {isAnswerSubmitted?<p className="text-center font-semibold">Prediction submitted. Waiting for the presenter.</p>:<div className="flex gap-2"><button disabled={disabled} onClick={()=>{update([]);setError('')}} className="flex-1 border border-slate-700 rounded-xl p-3">Clear</button><button disabled={disabled||!normalizeCurve(points)} onClick={async()=>{setPending(true);setError('');const result=await submitCurve(points);if(!result.success)setError(result.error);setPending(false);}} className="flex-1 bg-emerald-600 text-white rounded-xl p-3 disabled:opacity-40">{pending?'Submitting…':'Submit prediction'}</button></div>}
 {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</section>;
}
export function CurveResults({question,curves=[],revealed,showResults=revealed,count,participant=false}){
 const identity=useIdentity();const [opacity,setOpacity]=useState(.28),[width,setWidth]=useState(.8),[highlight,setHighlight]=useState(''),[showAverage,setShowAverage]=useState(false);
 const selected=participant?identity.label:highlight;
 const average=React.useMemo(()=>showAverage?averageCurves(curves):[],[showAverage,curves]);
 return <section className="space-y-4 p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl"><h2 className="text-2xl">{question.question}</h2>
 <p className="text-sm text-slate-400">{showResults?curves.length+' predictions':count+' predictions submitted · hidden until reveal'}</p>
 <Graph question={question}>{showResults&&curves.map(c=><path key={c.label} d={line(c.points)} stroke={c.color} strokeWidth={width} vectorEffect="non-scaling-stroke" opacity={selected===c.label?Math.max(opacity,.85):opacity} fill="none" strokeLinecap="round" strokeLinejoin="round"><title>{c.label}</title></path>)}{showResults&&showAverage&&average.length>1&&<path d={line(average)} stroke="#34473E" strokeWidth="1.7" strokeDasharray="5 3" fill="none" vectorEffect="non-scaling-stroke"><title>Mean of submitted predictions</title></path>}</Graph>
 {showResults&&<div className="flex flex-wrap gap-2">{curves.map(c=><button type="button" disabled={participant} key={c.label} onClick={()=>setHighlight(h=>h===c.label?'':c.label)} aria-pressed={selected===c.label} className="text-xs px-2 py-1 border border-slate-700 rounded-lg" style={{borderColor:selected===c.label?c.color:undefined}}><span style={{background:c.color}} className="inline-block w-3 h-3 rounded-full mr-1"/>{c.label}{participant&&c.label===identity.label?' (you)':''}</button>)}</div>}
 {showResults&&!participant&&<div className="flex flex-wrap gap-5 text-xs"><label>Opacity {Math.round(opacity*100)}% <input type="range" min=".05" max=".8" step=".05" value={opacity} onChange={e=>setOpacity(+e.target.value)}/></label><label>Line width {width.toFixed(1)} px <input type="range" min=".3" max="2" step=".1" value={width} onChange={e=>setWidth(+e.target.value)}/></label><label className="flex items-center gap-2"><input type="checkbox" checked={showAverage} onChange={e=>setShowAverage(e.target.checked)}/> Group mean</label></div>}
 {showResults&&showAverage&&<p className="text-xs text-slate-400">Dashed line: mean of submitted predictions over the shared time range (not measured cortisol).</p>}
 </section>;
}
