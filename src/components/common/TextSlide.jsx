import React from 'react';
import {parseSlideLine,shortDashes} from '../../slideText.js';
function SlideLine({line}){const p=parseSlideLine(line),classes={heading:'gm-subheading',muted:'gm-muted-line',indent:'gm-indent-line',bullet:''};return <li className={classes[p.kind]}><span>{p.tokens.map((t,i)=>t.kind==='bold'?<strong key={i}>{t.text}</strong>:t.kind==='italic'?<em key={i}>{t.text}</em>:<React.Fragment key={i}>{t.text}</React.Fragment>)}</span></li>;}
import {textLines,safeTextImages,safeSlideArtwork,slideSources,slideLayout} from '../../activities.js';
export default function TextSlide({question,visible=0,presenter=false}){
 const all=presenter?textLines(question):question.visibleLines||[],shown=presenter?all.slice(0,question.revealMode==='step'?visible:all.length):all,total=presenter?all.length:question.textTotal||all.length;
 const images=safeTextImages(question.textImages),art=safeSlideArtwork(question.slideArtwork),sources=slideSources(question),cover=slideLayout(question)==='cover';
 if(art)return <figure className="gm-artwork-wrap w-full overflow-hidden bg-slate-900"><img className="gm-slide-artwork w-full object-contain mx-auto max-h-[75vh]" src={art} alt={question.artworkAlt||question.question||'Imported slide artwork'}/></figure>;
 return <section className={'gm-text-slide '+(cover?'gm-cover-slide':'')}>
 <h1 className="gm-slide-title">{shortDashes(question.question)}</h1>
 <div className={'gm-slide-body '+(presenter&&images.length&&shown.length?'gm-with-figures ':'')+(question.figureLayout==='large'?'gm-figure-led':'')}>
 {shown.length>0&&<ul className="gm-slide-bullets" aria-live="polite">{shown.map((line,i)=><SlideLine line={line} key={i}/>)}</ul>}
 {images.length>0&&<div className={'gm-slide-figures '+(images.some(x=>x.role==='qr')?'gm-has-qr':images.length>1?'gm-multiple-figures':'')}>{images.map((image,i)=><figure className={image.role==='qr'?'gm-qr':''} key={i}><img src={image.media} alt={image.alt||'Slide figure '+(i+1)}/>{image.alt&&<figcaption>{shortDashes(image.alt)}</figcaption>}</figure>)}</div>}
 </div>
 {sources&&<footer className="gm-slide-sources">{shortDashes(sources)}</footer>}
 {question.revealMode==='step'&&<div className="gm-slide-progress">{shown.length}/{total} points revealed</div>}
 </section>;
}
