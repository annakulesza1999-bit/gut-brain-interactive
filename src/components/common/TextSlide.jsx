import React from 'react';
import {parseSlideLine,shortDashes} from '../../slideText.js';
function SlideLine({line,index,numbered}){const p=parseSlideLine(line),classes={heading:'gm-subheading',muted:'gm-muted-line',sample:'gm-sample-line',indent:'gm-indent-line',bullet:''};return <li className={(classes[p.kind]||'')+(numbered?' gm-numbered-line':'')}>{numbered&&<span className="gm-pointer-number">{index+1}</span>}<span>{p.tokens.map((t,i)=>t.kind==='bold'?<strong key={i}>{t.text}</strong>:t.kind==='italic'?<em key={i}>{t.text}</em>:<React.Fragment key={i}>{t.text}</React.Fragment>)}</span></li>;}
import {textLines,safeTextImages,safeSlideArtwork,slideSources,slideLayout,slideFigureLayout} from '../../activities.js';
export default function TextSlide({question,visible=0,presenter=false}){
 const all=presenter?textLines(question):question.visibleLines||[],shown=presenter?all.slice(0,question.revealMode==='step'?visible:all.length):all,total=presenter?all.length:question.textTotal||all.length;
 const images=safeTextImages(question.textImages),art=safeSlideArtwork(question.slideArtwork),sources=slideSources(question),cover=slideLayout(question)==='cover';
 const numbered=images.some(x=>x.pointers);
 const requested=slideFigureLayout(question);
 // Wide layout is intended for one principal figure, optionally accompanied by a small QR code.
 const wide=requested==='wide'&&images.filter(x=>x.role!=='qr').length===1&&images.filter(x=>x.role==='qr').length<=1;
 const figureClass=wide?'gm-figure-wide'+(total>3?' gm-wide-dense':total>2?' gm-wide-medium':''):requested==='large'?'gm-figure-led':'';
 if(art)return <figure className="gm-artwork-wrap w-full overflow-hidden bg-slate-900"><img className="gm-slide-artwork w-full object-contain mx-auto max-h-[75vh]" src={art} alt={question.artworkAlt||question.question||'Imported slide artwork'}/></figure>;
 return <section className={'gm-text-slide '+(cover?'gm-cover-slide':'')}>
 <h1 className="gm-slide-title">{shortDashes(question.question)}</h1>
 <div className={'gm-slide-body '+(presenter&&images.length&&(shown.length||numbered)?'gm-with-figures ':'')+(numbered?'gm-pointer-layout ':'')+figureClass}>
 {(shown.length>0||numbered)&&<ul className="gm-slide-bullets" aria-live="polite">{shown.map((line,i)=><SlideLine line={line} key={i} index={i} numbered={numbered}/>)}</ul>}
 {images.length>0&&<div className={'gm-slide-figures '+(images.some(x=>x.role==='qr')?'gm-has-qr':images.length>1?'gm-multiple-figures':'')}>{images.map((image,i)=><figure className={image.role==='qr'?'gm-qr':''} key={i}>{image.pointers?<PointerFigure image={image} visible={shown.length}/>:<img src={image.media} alt={image.alt||'Slide figure '+(i+1)}/>}{image.alt&&<figcaption>{shortDashes(image.alt)}</figcaption>}</figure>)}</div>}
 </div>
 {sources&&<footer className="gm-slide-sources">{shortDashes(sources)}</footer>}
 {question.revealMode==='step'&&<div className="gm-slide-progress">{shown.length}/{total} points revealed</div>}
 </section>;
}

function PointerFigure({image,visible}){
 const {aspect,groups}=image.pointers,W=1000*aspect,H=1000;
 return <svg className="gm-annotated-figure" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={image.alt||'Annotated teaching figure'}>
 <image href={image.media} width={W} height={H}/>
 {groups.slice(0,visible).map((paths,i)=><g key={i} data-pointer-index={i} fill="#0063A6" stroke="#0063A6">
 {paths.map((points,j)=>{const a=points[0],b=points.at(-1);return <g key={j}><polyline points={points.map(([x,y])=>`${x*W},${y*H}`).join(' ')} fill="none" strokeWidth="3.8" strokeLinejoin="round" strokeLinecap="round"/><circle cx={b[0]*W} cy={b[1]*H} r="6" stroke="white" strokeWidth="1.5"/>{j===0&&<g><circle cx={a[0]*W} cy={a[1]*H} r="15" stroke="white" strokeWidth="2"/><text x={a[0]*W} y={a[1]*H} fill="white" stroke="none" textAnchor="middle" dominantBaseline="central" fontSize="19" fontWeight="700">{i+1}</text></g>}</g>})}
 </g>)}
 </svg>;
}
