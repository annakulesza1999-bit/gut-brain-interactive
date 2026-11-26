import React from 'react';
import {textLines,safeTextImages,safeSlideArtwork,slideSources,slideLayout} from '../../activities.js';
export default function TextSlide({question,visible=0,presenter=false}){
 const all=presenter?textLines(question):question.visibleLines||[],shown=presenter?all.slice(0,question.revealMode==='step'?visible:all.length):all,total=presenter?all.length:question.textTotal||all.length;
 const images=safeTextImages(question.textImages),art=safeSlideArtwork(question.slideArtwork),sources=slideSources(question),cover=slideLayout(question)==='cover';
 if(art)return <figure className="gm-artwork-wrap w-full overflow-hidden bg-slate-900"><img className="gm-slide-artwork w-full object-contain mx-auto max-h-[75vh]" src={art} alt={question.artworkAlt||question.question||'Imported slide artwork'}/></figure>;
 return <section className={'gm-text-slide '+(cover?'gm-cover-slide':'')}>
 <h1 className="gm-slide-title">{question.question}</h1>
 <div className={'gm-slide-body '+(presenter&&images.length&&shown.length?'gm-with-figures':'')}>
 {shown.length>0&&<ul className="gm-slide-bullets" aria-live="polite">{shown.map((line,i)=><li className={line.endsWith(':')&&line.length<85?'gm-subheading':''} key={i}><span>{line}</span></li>)}</ul>}
 {images.length>0&&<div className="gm-slide-figures">{images.map((image,i)=><figure key={i}><img src={image.media} alt={image.alt||'Slide figure '+(i+1)}/>{image.alt&&<figcaption>{image.alt}</figcaption>}</figure>)}</div>}
 </div>
 {sources&&<footer className="gm-slide-sources">{sources}</footer>}
 {question.revealMode==='step'&&<div className="gm-slide-progress">{shown.length}/{total} points revealed</div>}
 </section>;
}
