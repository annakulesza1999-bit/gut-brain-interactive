import React from 'react';
import {textLines,safeTextImages} from '../../activities.js';
export default function TextSlide({question,visible=0,presenter=false}){
 const all=presenter?textLines(question):question.visibleLines||[];
 const shown=presenter?all.slice(0,question.revealMode==='step'?visible:all.length):all;
 const total=presenter?all.length:question.textTotal||all.length;
 const images=safeTextImages(question.textImages);
 return <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-10 space-y-6 min-h-64">
 <h1 className="text-2xl sm:text-4xl font-serif">{question.question}</h1>
 <div className={'grid gap-6 '+(presenter&&images.length&&shown.length?'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]':'')}>
 <div className="space-y-5 min-w-0" aria-live="polite">{shown.map((line,i)=><div key={i} className="flex gap-3 items-start animate-fade-in text-base sm:text-lg leading-relaxed"><span className="text-emerald-700 mt-1">•</span><p className="break-words min-w-0">{line}</p></div>)}</div>
 {images.length>0&&<div className="space-y-3 min-w-0">{images.map((image,i)=><figure key={i} className="rounded-xl border border-slate-800 bg-white p-2"><img src={image.media} alt={image.alt||'Slide figure '+(i+1)} className="block w-full max-h-[60vh] object-contain mx-auto"/>{image.alt&&<figcaption className="text-xs text-slate-500 mt-1">{image.alt}</figcaption>}</figure>)}</div>}
 </div>
 {question.revealMode==='step'&&<p className="text-xs text-slate-400">{shown.length}/{total} points revealed</p>}
 </section>;
}
