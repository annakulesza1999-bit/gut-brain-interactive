import React from 'react';
import { safeMedia } from '../../activities.js';
const labels={threat:'Perceived threat',sympathetic:'Rapid sympathetic activation',hypothalamus:'Hypothalamus',crh:'CRH → anterior pituitary',acth:'ACTH → adrenal cortex',cortisol:'Cortisol enters circulation',feedback:'Cortisol negative feedback'};
export default function SequenceMedia({media,preset,phase='before'}) {
 const src=safeMedia(media);
 if(src)return <img key={src+phase} src={src} alt={phase==='after'?'Correct biological event':'Biological event before prediction'} className="max-h-64 w-full object-contain rounded-xl bg-slate-900"/>;
 if(!labels[preset])return null;
 const n=['threat','sympathetic','hypothalamus','crh','acth','cortisol','feedback'].indexOf(preset);
 const path=n===3?'M180 65 L180 105':n===4?'M180 115 L180 182':n===5?'M180 188 Q285 185 292 130':n===6?'M180 185 Q36 155 150 55':n===1?'M180 55 Q280 70 282 130':'M140 45 L180 65';
 return <figure className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
 <svg viewBox="0 0 360 225" className="mx-auto w-full max-w-lg" role="img" aria-label={labels[preset]}>
 <rect width="360" height="225" rx="14" fill="#F6F5EF"/>
 <path d="M153 23 C119 12 104 40 122 58 C103 84 138 97 155 75 Q180 96 205 75 C222 97 257 84 238 58 C256 40 241 12 207 23 Q180 8 153 23Z" fill="#DDD2E5" stroke="#806A94" strokeWidth="1.5"/>
 <path d="M180 23 V79 M140 37 Q164 42 156 59 M220 37 Q196 42 204 59" stroke="#806A94" fill="none" strokeWidth="1.5"/>
 <circle cx="180" cy="65" r="7" fill={n>=2?'#718C7B':'#C9D0C6'}/><circle cx="180" cy="110" r="8" fill={n>=3?'#B58C6B':'#C9D0C6'}/>
 <path d="M180 75 V101 M180 118 V175" stroke="#A8B3A7" strokeWidth="1.5" strokeDasharray="4 4"/>
 <path d="M145 184 C129 169 117 189 129 205 C140 217 159 203 155 190Z M215 184 C231 169 243 189 231 205 C220 217 201 203 205 190Z" fill="#D8B9AC" stroke="#B58C6B"/>
 <path d="M130 184 Q140 163 151 184 M209 184 Q220 163 230 184" fill={n>=4?'#B58C6B':'#D9D0C1'} stroke="#B58C6B"/>
 <path d={path} fill="none" stroke="#718C7B" strokeWidth="2" strokeDasharray="4 3"/>
 <circle r="5" fill="#42634F"><animateMotion dur="2.4s" repeatCount="indefinite" path={path}/></circle>
 {n===0&&<path d="M74 25 L60 48 H74 L66 66 L93 38 H79 L87 25Z" fill="#B58C6B"/>}
 {n===1&&<path d="M275 105 Q260 95 255 112 Q251 128 275 143 Q299 128 295 112 Q290 95 275 105Z" fill="#A15F5F"/>}
 <g fontSize="10" fill="#34473E"><text x="192" y="67">Hypothalamus</text><text x="192" y="112">Pituitary</text><text x="180" y="220" textAnchor="middle">Adrenal glands</text></g>
 </svg><figcaption className="mt-2 text-sm font-medium">{labels[preset]}</figcaption></figure>;
}
export function SequenceHeading({question}){return <div className="text-sm text-slate-400 font-semibold">{question.sequenceTitle||'What happens next?'} · Stage {question.sequenceStep||1} / {question.sequenceTotal||1}</div>;}
