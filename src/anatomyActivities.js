import {atlasNodes} from './atlasNodes.js';
export const ATLAS_VERSION='brainproject-2929e94f521a8ddceab26bc100a98dc06b0da060';
export const BRAIN_VIEWS=['surface','medial-left','medial-right','deep'];
export const viewLabels={surface:'Whole brain · exterior','medial-left':'Left hemisphere · medial cutaway','medial-right':'Right hemisphere · medial cutaway',deep:'Internal structures · cortex hidden'};
const byId=new Map(atlasNodes.map(n=>[n.id,n]));
export function nodeVisible(n,view){
 if(!n)return false;
 const deepCortex=/hippocampus|dentate gyrus|subiculum|amygdal/i.test(n.label);
 if(view==='surface')return ['cortex','cerebellum','brainstem'].includes(n.category)&&!deepCortex;
 // The bulk telencephalic white-matter volume obscures the diencephalon; retain named tracts.
 if(n.label==='White matter of telencephalon'&&view!=='surface')return false;
 if(view==='deep')return ['diencephalon','deep_grey','white_matter','ventricles','brainstem'].includes(n.category)||deepCortex;
 if(view==='medial-left'||view==='medial-right')return n.side==='median'||n.side===(view==='medial-left'?'left':'right');
 return false;
}
export function normalizeBrain(q){
 const brainView=BRAIN_VIEWS.includes(q.brainView)?q.brainView:'surface';
 const brainTargets=Array.isArray(q.brainTargets)?[...new Set(q.brainTargets.filter(id=>Number.isInteger(id)&&nodeVisible(byId.get(id),brainView)))].slice(0,80):[];
 const brainAnchor=normalizeBrainHit({brainView},q.brainAnchor);
 const brainTolerance=Number.isFinite(q.brainTolerance)?Math.max(0,Math.min(.2,q.brainTolerance)):0;
 return {brainAtlas:ATLAS_VERSION,brainView,brainTargets,brainAnchor,brainTolerance,brainGraded:q.brainGraded!==false,brainFeedback:q.brainFeedback!==false,brainPoints:Number.isFinite(q.brainPoints)?Math.max(0,Math.min(1000,Math.round(q.brainPoints))):100,brainExplanation:typeof q.brainExplanation==='string'?q.brainExplanation.slice(0,3000):''};
}
export function normalizeBrainHit(q,hit){
 if(!hit||!Number.isInteger(hit.nodeId)||!nodeVisible(byId.get(hit.nodeId),q.brainView)||!Array.isArray(hit.point)||hit.point.length!==3||hit.point.some(x=>!Number.isFinite(x)||Math.abs(x)>3))return null;
 return {nodeId:hit.nodeId,point:hit.point.map(x=>Math.round(x*100000)/100000)};
}
export function brainProblem(q){
 if(q.brainAtlas&&q.brainAtlas!==ATLAS_VERSION)return 'This slide needs its original atlas version.';
 const c=normalizeBrain(q);
 if(c.brainGraded&&!c.brainTargets.length)return 'Select at least one accepted anatomical structure.';
 if(c.brainTolerance>0&&(!c.brainAnchor||!c.brainTargets.includes(c.brainAnchor.nodeId)))return 'Set a tolerance anchor on an accepted structure.';
 return '';
}
export function publicBrain(q){const c=normalizeBrain(q);return {brainAtlas:c.brainAtlas,brainView:c.brainView,brainGraded:c.brainGraded,brainFeedback:c.brainFeedback};}
export function scoreBrain(q,hit){
 const c=normalizeBrain(q),h=normalizeBrainHit(c,hit);
 if(!c.brainGraded)return {isCorrect:null,pointsEarned:0};
 const near=h&&c.brainAnchor&&c.brainTolerance>0&&Math.hypot(...h.point.map((v,i)=>v-c.brainAnchor.point[i]))<=c.brainTolerance;
 const correct=!!h&&(c.brainTargets.includes(h.nodeId)||!!near);
 return {isCorrect:correct,pointsEarned:correct?c.brainPoints:0};
}
export function brainReveal(q){const c=normalizeBrain(q);return {brainTargets:c.brainGraded?c.brainTargets:[],brainAnchor:c.brainGraded?c.brainAnchor:null,brainTolerance:c.brainGraded?c.brainTolerance:0,brainExplanation:c.brainExplanation};}
export function personalBrainFeedback(q,hit){const c=normalizeBrain(q),response=normalizeBrainHit(c,hit);if(!response||!c.brainFeedback||!c.brainGraded)return null;return {response,...scoreBrain(c,response),...brainReveal(c)};}
export function brainTemplate(){return {type:'brain',question:'Locate the hypothalamus.',brainAtlas:ATLAS_VERSION,brainView:'deep',brainTargets:atlasNodes.filter(n=>/hypothalamus/i.test(n.label)&&nodeVisible(n,'deep')).map(n=>n.id),brainGraded:true,brainPoints:100,brainTolerance:0,brainExplanation:'The hypothalamus initiates HPA-axis hormonal signaling by releasing CRH. The atlas shows gross anatomical subdivisions, not individual CRH neurons.',timerSeconds:90,options:[],correctAnswer:null};}
export const brainNode=id=>byId.get(id);
