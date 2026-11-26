import {publicBrain} from './anatomyActivities.js';
import { publicResearch } from './researchActivities.js';
import { simulationConfig } from './simulations.js';
import { matchChoices } from './spatialActivities.js';
// Shared activity helpers (browser and server). Coordinates are normalized to [0,1].
export const curveColors = ['#0063A6','#176D70','#7C468C','#735E00','#407BA4','#A02E21','#496323','#2BA4A6','#81529B','#BC682D','#354D60','#6B853C','#B46BBF','#1E8B99','#96731D'];
export function curveIdentity(index) {
  const i = Math.max(0, Number.isInteger(index) ? index : 0);
  return { color: curveColors[i % curveColors.length], label: 'Curve ' + (i + 1) };
}
export function normalizeCurve(points) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 1000) return null;
  if (points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || v < 0 || v > 1))) return null;
  if (points.some((p,i) => i > 0 && p[0] < points[i-1][0])) return null;
  if (points[points.length-1][0] - points[0][0] < .05) return null;
  return points.map(p => p.map(v => Math.round(v*10000)/10000));
}
export function publicActivity(q, visible=initialTextCount(q)) {
  return {type:q.type || 'mcq', ...(q.type==='simulation'?simulationConfig(q):{}), ...(q.type==='research'?publicResearch(q):{}), ...(q.type==='brain'?publicBrain(q):{}), mapImage:q.type==='pointmap'?safeMedia(q.mapImage):undefined,mapWidth:q.mapWidth,mapHeight:q.mapHeight,mapGraded:q.mapGraded,matchLeft:q.type==='matching'?(q.matchPairs||[]).map(p=>p.left):undefined,matchChoices:q.type==='matching'?matchChoices(q):undefined, timerSeconds:q.timerSeconds, revealMode:q.revealMode, visibleLines:q.type==='text'?textLines(q).slice(0,visible):undefined, textTotal:q.type==='text'?textLines(q).length:undefined, slideSources:slideSources(q),slideLayout:slideLayout(q),figureLayout:slideFigureLayout(q),axisExplanation:typeof q.axisExplanation==='string'?q.axisExplanation.slice(0,400):undefined,textImages:q.type==='text'?safeTextImages(q.textImages):undefined, slideArtwork:q.type==='text'?safeSlideArtwork(q.slideArtwork):undefined, artworkAlt:q.type==='text'&&typeof q.artworkAlt==='string'?q.artworkAlt.slice(0,300):undefined, xLabel:q.xLabel, yLabel:q.yLabel, xTicks:q.xTicks, stressMarker:q.stressMarker, sequenceTitle:q.sequenceTitle, sequenceStep:q.sequenceStep, sequenceTotal:q.sequenceTotal, beforeMedia:q.beforeMedia, beforePreset:q.beforePreset,sequenceArtwork:q.type==='sequence'?safeSequenceArtwork(q.sequenceArtwork):undefined};
}
export function safeMedia(value) {
  if (typeof value !== 'string' || value.length > 500000) return '';
  if (/^data:image\/(gif|png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  return '';
}
export const hpaStages = [
 {question:'Which rapid response may follow a threat appraisal?',options:['Sympathetic nervous system activation','Microbial fermentation','Cortisol negative feedback'],correctAnswer:0,explanation:'Sympathetic activation rapidly mobilizes resources. HPA activation can overlap with this response.',beforePreset:'threat',afterPreset:'sympathetic'},
 {question:'Which hormone is released by the hypothalamus in the HPA axis?',options:['ACTH','CRH','Cortisol'],correctAnswer:1,explanation:'CRH signals to the anterior pituitary.',beforePreset:'hypothalamus',afterPreset:'crh'},
 {question:'What does the anterior pituitary release in response to CRH?',options:['ACTH','Insulin','Cortisol'],correctAnswer:0,explanation:'ACTH travels in the bloodstream to the adrenal cortex.',beforePreset:'crh',afterPreset:'acth'},
 {question:'Which hormone is released by the adrenal cortex in response to ACTH?',options:['Dopamine','CRH','Cortisol'],correctAnswer:2,explanation:'Cortisol supports adaptation and energy regulation.',beforePreset:'acth',afterPreset:'cortisol'},
 {question:'How does cortisol help regulate further HPA activity?',options:['Permanently activates CRH release','Provides negative feedback','Directly produces gut microbes'],correctAnswer:1,explanation:'Cortisol helps inhibit further CRH and ACTH release.',beforePreset:'cortisol',afterPreset:'feedback'}
];

/** Average only where all curves have data; linearly interpolate on a shared grid. */
export function averageCurves(curves, samples=101) {
  const valid = curves.map(c=>normalizeCurve(c.points)).filter(Boolean);
  if (!valid.length || !Number.isInteger(samples) || samples<2 || samples>501) return [];
  const left=Math.max(...valid.map(c=>c[0][0])),right=Math.min(...valid.map(c=>c[c.length-1][0]));
  if(right<=left)return [];
  return Array.from({length:samples},(_,i)=>{
    const x=left+(right-left)*i/(samples-1);
    const ys=valid.map(c=>{
      let j=c.findIndex(p=>p[0]>=x);
      if(j<=0)return j===0?c[0][1]:c[c.length-1][1];
      const a=c[j-1],b=c[j];
      return b[0]===a[0]?b[1]:a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
    });
    return [x,ys.reduce((a,b)=>a+b,0)/ys.length];
  });
}

export function timerSeconds(value, fallback=30) {
 const n=value===null||value===undefined||value===''?Number(fallback):Number(value);
 return Number.isFinite(n)?Math.min(3600,Math.max(0,Math.round(n))):30;
}
export function activityDuration(q, fallback=30) {
 return q?.type==='text'||(q?.type==='simulation'&&q.simMode==='explore')?0:timerSeconds(q?.timerSeconds,fallback);
}
export function textLines(q) {
 return (typeof q?.body==='string'?q.body:'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,100);
}
export function slideSources(q){return typeof q?.slideSources==='string'?q.slideSources.slice(0,2500):'';}
export function slideLayout(q){return q?.slideLayout==='cover'?'cover':'content';}
export function slideFigureLayout(q){return ['large','wide'].includes(q?.figureLayout)?q.figureLayout:'normal';}
export function initialTextCount(q) {
 return q?.type==='text'?(q.revealMode==='step'?0:textLines(q).length):0;
}
export function reactionSummary(votes={}) {
 const values=Object.values(votes);
 return {up:values.filter(x=>x==='👍').length,down:values.filter(x=>x==='👎').length};
}

/** Restrict figures to bounded local image data; speaker notes never enter the participant payload. */
export function safeSequenceArtwork(value){
 const body=safeMedia(value?.body),brain=safeMedia(value?.brain);
 return body&&brain?{body,brain}:undefined;
}
export function safeFigurePointers(value){
 if(!value||!Number.isFinite(value.aspect)||value.aspect<.25||value.aspect>4||!Array.isArray(value.groups))return undefined;
 const groups=value.groups.slice(0,12).map(g=>Array.isArray(g)?g.slice(0,5).filter(p=>Array.isArray(p)&&p.length>=2&&p.length<=8&&p.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>Number.isFinite(n)&&n>=0&&n<=1))):[]);
 return groups.some(g=>g.length)?{aspect:value.aspect,groups}:undefined;
}
export function safeTextImages(value){return Array.isArray(value)?value.slice(0,4).map(x=>({media:safeMedia(x?.media),alt:typeof x?.alt==='string'?x.alt.slice(0,300):'',...(x?.role==='qr'?{role:'qr'}:{}),...(safeFigurePointers(x?.pointers)?{pointers:safeFigurePointers(x.pointers)}:{})})).filter(x=>x.media):[];}

export const liveResultsEnabled=q=>q?.resultsMode!=='reveal';

// Artwork is lossless imported raster content, bounded independently from small activity media.
export function safeSlideArtwork(value){return typeof value==='string'&&value.length<=4200000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}

/** Reference is an authored comparison, never a participant answer. Only include after reveal. */
export function curveReference(q){const points=normalizeCurve(q?.referenceCurve);if(!points)return null;return {points,label:typeof q.referenceLabel==='string'&&q.referenceLabel.trim()?q.referenceLabel.trim().slice(0,120):'Reference curve',note:typeof q.referenceNote==='string'?q.referenceNote.slice(0,700):''};}
// Illustrative trace of the original teaching figure's Day 2 T1–T6 segment; no measured cortisol scale.
export const exampleCortisolReference=[[0,.2],[.0373,.2055],[.0761,.2055],[.1149,.2109],[.1537,.2218],[.191,.2382],[.2298,.2546],[.2686,.276],[.3075,.2983],[.3447,.3529],[.3835,.4185],[.4224,.484],[.4612,.5605],[.5,.6534],[.5373,.7571],[.5761,.8336],[.6149,.8555],[.6537,.8282],[.691,.7817],[.7298,.7298],[.7686,.6752],[.8075,.6206],[.8447,.566],[.8835,.5113],[.9224,.4595],[.9612,.4076],[1,.3557]];
