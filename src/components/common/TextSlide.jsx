import React from 'react';
import {textLines} from '../../activities.js';
export default function TextSlide({question,visible=0,presenter=false}){
 const all=presenter?textLines(question):question.visibleLines||[];
 const shown=presenter?all.slice(0,question.revealMode==='step'?visible:all.length):all;
 const total=presenter?all.length:question.textTotal||all.length;
 return <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-12 space-y-6 min-h-64">
 <h1 className="text-2xl sm:text-4xl">{question.question}</h1>
 <div className="space-y-5" aria-live="polite">{shown.map((line,i)=><div key={i} className="flex gap-3 items-start animate-fade-in text-base sm:text-xl leading-relaxed"><span className="text-emerald-700 mt-1">•</span><p>{line}</p></div>)}</div>
 {question.revealMode==='step'&&<p className="text-xs text-slate-400">{shown.length}/{total} points revealed</p>}
 </section>;
}
