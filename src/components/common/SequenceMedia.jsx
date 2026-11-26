import React,{useId,useEffect,useRef,useState} from 'react';
import {safeMedia} from '../../activities.js';
const stages={
 threat:{title:'A potential threat is appraised',caption:'The brain interprets the situation. Which rapid physiological response may follow?',focus:'brain'},
 sympathetic:{title:'Sympathetic activation',caption:'Neural signals rapidly increase heart rate and breathing and mobilize energy. HPA activity can overlap.',focus:'sympathetic'},
 hypothalamus:{title:'The hypothalamus initiates hormonal signaling',caption:'The hypothalamus is located deep in the brain, directly above the pituitary. Predict its next signal.',focus:'hypothalamus'},
 crh:{title:'CRH reaches the anterior pituitary',caption:'Corticotropin-releasing hormone travels through the local pituitary portal circulation.',focus:'crh'},
 acth:{title:'ACTH travels to the adrenal cortex',caption:'The anterior pituitary releases ACTH into the blood. It reaches the adrenal glands above the kidneys.',focus:'acth'},
 cortisol:{title:'Cortisol enters circulation',caption:'The adrenal cortex releases cortisol, which acts on tissues throughout the body.',focus:'cortisol'},
 feedback:{title:'Negative feedback',caption:'Cortisol helps inhibit further CRH and ACTH release at the hypothalamus and pituitary.',focus:'feedback'}
};
export default function SequenceMedia({media,preset,phase='before'}){
 const uid=useId().replace(/:/g,''),src=safeMedia(media),stage=stages[preset],host=useRef(null),[compact,setCompact]=useState(false);
 useEffect(()=>{if(!host.current)return;const ro=new ResizeObserver(([e])=>setCompact(e.contentRect.width<550));ro.observe(host.current);return()=>ro.disconnect();},[preset,src]);
 if(src)return <img key={src+phase} src={src} alt={phase==='after'?'Correct biological event':'Biological event before prediction'} className="gm-sequence-upload max-h-[440px] w-full object-contain rounded-xl bg-slate-900"/>;
 if(!stage)return null;
 const n=Object.keys(stages).indexOf(preset),neural=preset==='sympathetic',headFocus=['hypothalamus','crh','feedback'].includes(preset);
 const sage='#507A65',plum='#79648D',ochre='#B07855',ink='#34473E',muted='#87988D';
 const body='M218 83 Q197 87 190 109 L188 124 Q152 130 139 148 Q126 166 119 213 L107 273 Q105 286 116 291 Q128 293 132 280 L153 222 L162 194 L168 251 Q161 293 177 325 L175 436 Q175 454 190 454 Q203 454 206 440 L226 350 L246 440 Q249 454 263 454 Q278 454 278 436 L275 325 Q292 292 284 251 L290 194 L299 222 L320 280 Q324 293 336 291 Q347 286 344 273 L332 213 Q325 166 313 148 Q300 130 264 124 L262 109 Q255 87 234 83 Z';
 function line(d,color,width=2,dash){return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash}/>;}
 function motion(d,color){return <g>{line(d,color,3,'7 5')}<circle r="5" fill={color}><animateMotion dur="2.6s" repeatCount="indefinite" path={d}/></circle></g>;}
 return <figure ref={host} className="gm-hpa-figure rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
 <svg viewBox={compact?"0 0 410 980":"0 0 820 490"} className="block mx-auto w-full max-w-[920px]" role="img" aria-label={stage.title+': '+stage.caption}>
 <defs><linearGradient id={uid+'skin'} x1="0" x2="1" y1="0" y2=".6"><stop offset="0" stopColor="#F4E6DA"/><stop offset="1" stopColor="#E7D5C7"/></linearGradient><marker id={uid+'arrow'} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill={muted}/></marker></defs>
 <rect width={compact?410:820} height={compact?980:490} rx="14" fill="#FFFEFA"/>
 <g fontFamily="Arial, sans-serif" fill={ink}>
 <text x="24" y="27" fontSize="12" fontWeight="700" letterSpacing="2">BODY OVERVIEW</text>
 {!compact&&<path d="M410 20 V465" stroke="#E1E5DD"/>}
 <path d={body} fill={'url(#'+uid+'skin)'} stroke="#BCA99A" strokeWidth="1.5"/>
 <ellipse cx="226" cy="61" rx="37" ry="48" fill={'url(#'+uid+'skin)'} stroke="#BCA99A" strokeWidth="1.5"/>
 {/* head cutaway, spinal cord, and simplified internal organs; not to scale */}
 <path d="M202 40 Q210 25 225 30 Q243 23 254 38 Q265 54 252 65 Q244 72 231 69 Q216 76 202 63 Q193 54 202 40Z" fill="#D6BDC5" stroke="#A98799" strokeWidth="1.5"/>
 <path d="M212 36 Q208 47 219 52 M236 34 Q244 43 234 50 M223 31 L223 61 M246 51 Q239 63 228 62" fill="none" stroke="#B997AA" strokeWidth="1.5"/>
 <circle cx="226" cy="64" r="4" fill={headFocus||n===0?sage:'#BCA6B5'}/>
 <circle cx="226" cy="72" r="3" fill={n>=3?ochre:'#D0B9A5'}/>
 <path d="M226 81 C227 110 226 153 226 211 L226 274" stroke="#BAADA0" strokeWidth="4" fill="none" strokeLinecap="round"/>
 <path d="M223 145 C208 125 181 137 177 157 Q167 190 183 206 Q195 213 211 195 L220 170Z M230 145 C245 125 272 137 276 157 Q286 190 270 206 Q258 213 242 195 L233 170Z" fill={neural?'#D8B3B4':'#E3C9C5'} stroke="#C1A1A0" strokeWidth="1.2"/>
 <path d="M227 167 Q239 151 252 163 Q269 179 247 197 L227 214 Q203 190 207 178 Q211 163 227 167Z" fill={neural?'#A65F67':'#C99394'} stroke="#B77D82" strokeWidth="1.5"/>
 <path d="M201 232 C179 221 168 242 176 262 Q184 278 198 266 Q211 257 201 247Z M251 232 C273 221 284 242 276 262 Q268 278 254 266 Q241 257 251 247Z" fill="#C68E81" stroke="#A16D62" strokeWidth="1.3"/>
 <path d="M174 230 Q186 211 203 229 Q189 223 174 230Z M249 229 Q266 211 278 230 Q263 223 249 229Z" fill={n>=4?ochre:'#D5BE9F'} stroke="#AA8D70" strokeWidth="1.2"/>
 <path d="M225 214 V235 Q206 240 201 247 M225 235 Q247 240 251 247 M225 235 V303" fill="none" stroke="#C29496" strokeWidth="3" strokeLinecap="round"/>
 {neural&&<>{motion('M226 69 L226 143 Q223 165 235 180',sage)}{motion('M226 105 L226 143 Q200 146 192 172',sage)}{motion('M226 143 Q252 146 263 172',sage)}</>}
 {preset==='acth'&&motion('M226 72 C230 105 236 140 237 180 C235 208 220 222 190 225',plum)}
 {preset==='cortisol'&&<>{motion('M190 225 Q225 229 227 202 L227 176 Q208 137 227 90',ochre)}{motion('M266 225 Q229 238 226 298 L206 380',ochre)}</>}
 {preset==='feedback'&&motion('M190 225 Q226 225 228 175 L226 73',sage)}
 {/* labels and leader lines */}
 <g fontSize="13" fill={ink} stroke="none">
 {line('M198 51 L158 45 H73',muted,1.3)}<text x="73" y="40">Brain</text>
 {line('M221 101 L151 106 H61',muted,1.3)}<text x="61" y="101">Spinal cord</text>
 {line('M181 164 L139 150 H35',muted,1.3)}<text x="35" y="145">Lungs</text>
 {line('M246 180 L288 169 H360',muted,1.3)}<text x="362" y="165" textAnchor="end">Heart</text>
 {line('M276 224 L304 214 H383',muted,1.3)}<text x="385" y="209" textAnchor="end">Adrenal glands</text>
 {line('M278 253 L311 259 H381',muted,1.3)}<text x="383" y="274" textAnchor="end">Kidneys</text>
 {line('M227 290 L143 314 H43',muted,1.3)}<text x="43" y="309">Bloodstream</text>
 </g>
 <g transform={compact?"translate(-410 490)":undefined}><text x="459" y="27" fontSize="12" fontWeight="700" letterSpacing="2">MAGNIFIED BRAIN REGION</text>
 {/* medial schematic: large central inset with clearly separated hypothalamus and pituitary */}
 <path d="M507 156 C493 95 539 59 599 59 C665 43 740 80 757 129 C779 189 748 237 698 260 Q683 280 681 316 Q653 311 644 280 Q621 266 605 244 Q558 257 530 219 Q512 196 507 156Z" fill="#E4CAC4" stroke="#B68E87" strokeWidth="2"/>
 <path d="M549 174 Q530 118 591 101 Q646 80 693 125 Q710 141 710 163 Q681 140 641 143 Q596 132 574 169Z" fill="#F6EBDE" stroke="#BCA99A" strokeWidth="2"/>
 <path d="M576 168 Q603 140 641 149 Q670 152 677 177 Q649 187 616 179 L591 186Z" fill="#C6A5B6" stroke="#AA8C9E" strokeWidth="1.3"/>
 <path d="M645 183 Q675 193 664 217 L648 236 L647 268 Q633 265 631 243 L613 218 Q603 204 609 186Z" fill="#CEB399" stroke="#AE977D" strokeWidth="1.3"/>
 <path d="M595 181 Q614 176 629 188 L620 207 Q608 213 595 204Z" fill={headFocus||n>=2?sage:'#C7B5B4'} stroke="#8E827F" strokeWidth="1.3"/>
 <path d="M610 205 L610 229" stroke="#9D8175" strokeWidth="4" strokeLinecap="round"/>
 <ellipse cx="608" cy="237" rx="15" ry="10" fill={n>=3?ochre:'#D2B9A9'} stroke="#9F8271" strokeWidth="1.4"/>
 <path d="M609 238 L609 249" stroke="#BA8D7E" strokeWidth="1"/>
 {preset==='crh'&&motion('M609 196 L609 215 L609 237',sage)}
 {preset==='acth'&&motion('M608 237 L578 269 L529 291',plum)}
 {preset==='feedback'&&<>{motion('M532 290 C535 247 552 190 599 195',sage)}{motion('M535 290 Q565 255 596 237',sage)}</>}
 <g fontSize="13.5">
 {line('M601 194 L549 186 H462',muted,1.3)}<text x="461" y="180">Hypothalamus</text>
 {line('M621 238 L680 242 H799',muted,1.3)}<text x="799" y="237" textAnchor="end">Anterior pituitary</text>
 {line('M660 165 L717 154 H799',muted,1.3)}<text x="799" y="148" textAnchor="end">Thalamus</text>
 {line('M655 275 L696 290 H799',muted,1.3)}<text x="799" y="285" textAnchor="end">Brainstem</text>
 <text x="462" y="320" fontSize="11" fill="#65766A">Simplified medial schematic · structures not to scale</text>
 </g>
 <rect x="440" y="345" width="360" height="121" rx="15" fill="#EEF1E9" stroke="#D7DFD1"/>
 <text x="458" y="365" fontSize="11" fontWeight="700" letterSpacing="1.2" fill={sage}>{phase==='before'?'CURRENT EVENT — PREDICT THE NEXT STEP':'EVENT REVEALED'}</text>
 <text x="458" y="389" fontSize="16" fontWeight="700">{stage.title.length>42?stage.title.slice(0,42)+'…':stage.title}</text>
 <foreignObject x="458" y="399" width="324" height="58"><div xmlns="http://www.w3.org/1999/xhtml" style={{fontFamily:'Arial,sans-serif',fontSize:'13px',lineHeight:'1.4',color:ink}}>{stage.caption}</div></foreignObject>
 </g></g></svg><figcaption className="px-4 pb-3 text-xs text-slate-400">Teaching schematic: organ positions and signaling routes are simplified; neural and endocrine responses can overlap.</figcaption></figure>;
}
export function SequenceHeading({question}){return <div className="text-sm text-slate-400 font-semibold">{question.sequenceTitle||'What happens next?'} · Stage {question.sequenceStep||1} / {question.sequenceTotal||1}</div>;}
