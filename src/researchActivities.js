// Version-independent research activity data and pure scoring helpers.
export const GRAPH_TYPES=['none','curve-low','curve-same','curve-high','scatter-negative','scatter-flat','scatter-positive','image'];
export const CLAIM_LABELS=['Supported by the evidence','Not established by the evidence'];
const str=(v,max=2000)=>typeof v==='string'?v.slice(0,max):'';
const media=v=>typeof v==='string'&&v.length<=500000&&/^data:image\/(gif|png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)?v:'';
export function researchTemplate(kind='prediction',graph='curve'){
 const scatter=graph==='scatter';
 if(kind==='evidence')return {type:'research',researchKind:'evidence',question:'Which conclusions are supported by the evidence?',researchContext:'Imagine an observational study finds an association between two variables. It does not randomly assign an intervention.',researchConfidence:true,researchPoints:100,researchGraded:true,researchClaims:[{text:'The variables were associated in the sample.',answer:0,reason:'The observed association is what the study directly reports.'},{text:'Changing one variable necessarily changes the other.',answer:1,reason:'An observational association alone cannot establish causation.'},{text:'Other variables may help explain the association.',answer:0,reason:'Potential confounding remains an alternative explanation.'}],researchOptions:[],researchCorrect:null,researchReveal:'Discuss what additional design or evidence would strengthen a causal claim.',researchSource:'Fictional teaching example',timerSeconds:90,options:[],correctAnswer:null};
 return {type:'research',researchKind:'prediction',question:scatter?'Predict the direction of the association.':'Predict the experimental result.',researchContext:'Choose a hypothesis before seeing the findings. Edit this example to match your study.',researchConfidence:true,researchPoints:100,researchGraded:false,researchOptions:scatter?[{label:'Negative association',graph:'scatter-negative'},{label:'No clear association',graph:'scatter-flat'},{label:'Positive association',graph:'scatter-positive'}]:[{label:'Lower response',graph:'curve-low'},{label:'Similar response',graph:'curve-same'},{label:'Higher response',graph:'curve-high'}],researchCorrect:null,researchClaims:[],researchX:scatter?'Predictor':'Time',researchY:scatter?'Outcome':'Response',researchGroup:'Intervention',researchComparison:'Comparison',researchReveal:'',researchSource:'',timerSeconds:60,options:[],correctAnswer:null};
}
export function normalizeResearch(q){
 const kind=q.researchKind==='evidence'?'evidence':'prediction';
 const options=Array.isArray(q.researchOptions)?q.researchOptions.slice(0,6).map(o=>({label:str(o?.label,180),graph:GRAPH_TYPES.includes(o?.graph)?o.graph:'none',image:media(o?.image)})):[];
 const claims=Array.isArray(q.researchClaims)?q.researchClaims.slice(0,12).map(c=>({text:str(c?.text),answer:c?.answer===0||c?.answer===1?c.answer:null,reason:str(c?.reason)})):[];
 return {researchKind:kind,researchContext:str(q.researchContext,5000),researchConfidence:q.researchConfidence!==false,researchGraded:q.researchGraded!==false,researchPoints:Number.isFinite(q.researchPoints)?Math.max(0,Math.min(1000,Math.round(q.researchPoints))):100,researchOptions:options,researchClaims:claims,researchCorrect:Number.isInteger(q.researchCorrect)?q.researchCorrect:null,researchX:str(q.researchX,70)||'X',researchY:str(q.researchY,70)||'Y',researchGroup:str(q.researchGroup,80)||'Intervention',researchComparison:str(q.researchComparison,80)||'Comparison',researchReveal:str(q.researchReveal,5000),researchFigure:media(q.researchFigure),researchFigureAlt:str(q.researchFigureAlt,300),researchSource:str(q.researchSource,1000)};
}
export function researchProblem(q){
 const r=normalizeResearch(q);
 if(r.researchKind==='prediction'){
  if(r.researchOptions.length<2||r.researchOptions.some(o=>!o.label.trim()||(o.graph==='image'&&!o.image)))return 'Add at least two labeled options and their required images.';
  if(r.researchGraded&&(r.researchCorrect===null||r.researchCorrect<0||r.researchCorrect>=r.researchOptions.length))return 'Set the correct option or turn off grading.';
 }else{
  if(r.researchClaims.length<2||r.researchClaims.some(c=>!c.text.trim()))return 'Add at least two complete statements.';
  if(r.researchGraded&&r.researchClaims.some(c=>c.answer===null))return 'Set an evidence verdict for each statement or turn off grading.';
 }
 return '';
}
export function publicResearch(q){
 const r=normalizeResearch(q);
 return {researchKind:r.researchKind,researchContext:r.researchContext,researchConfidence:r.researchConfidence,researchGraded:r.researchGraded,researchOptions:r.researchOptions,researchClaims:r.researchClaims.map(c=>({text:c.text})),researchX:r.researchX,researchY:r.researchY,researchGroup:r.researchGroup,researchComparison:r.researchComparison};
}
export function normalizeResearchResponse(q,value){
 if(!value||typeof value!=='object'||Array.isArray(value)||researchProblem(q))return null;
 const r=normalizeResearch(q),n=r.researchKind==='prediction'?1:r.researchClaims.length,limit=r.researchKind==='prediction'?r.researchOptions.length:2;
 if(!Array.isArray(value.answers)||value.answers.length!==n||value.answers.some(a=>!Number.isInteger(a)||a<0||a>=limit))return null;
 let confidence=[];
 if(r.researchConfidence){
  if(!Array.isArray(value.confidence)||value.confidence.length!==n||value.confidence.some(c=>!Number.isInteger(c)||c<0||c>100))return null;
  confidence=value.confidence.slice();
 }
 return {answers:value.answers.slice(),confidence};
}
export function researchKey(q){
 const r=normalizeResearch(q);
 if(!r.researchGraded)return null;
 return r.researchKind==='prediction'?[r.researchCorrect]:r.researchClaims.map(c=>c.answer);
}
export function scoreResearch(q,response){
 const r=normalizeResearch(q),v=normalizeResearchResponse(q,response),key=researchKey(q);
 if(!v||!key)return {isCorrect:null,correctCount:null,total:v?.answers.length||0,pointsEarned:0};
 const correctCount=v.answers.filter((a,i)=>a===key[i]).length;
 return {isCorrect:correctCount===key.length,correctCount,total:key.length,pointsEarned:Math.round(r.researchPoints*correctCount/key.length)};
}
export function revealResearch(q){
 const r=normalizeResearch(q);
 return {researchKey:researchKey(q),researchReasons:r.researchClaims.map(c=>c.reason),researchReveal:r.researchReveal,researchFigure:r.researchFigure,researchFigureAlt:r.researchFigureAlt,researchSource:r.researchSource};
}
export function researchSummary(entries,key,n,choiceCount){
 const rows=Array.from({length:n},(_,i)=>{
  const valid=entries.filter(e=>Number.isInteger(e.response?.answers?.[i])&&e.response.answers[i]>=0&&e.response.answers[i]<choiceCount);
  const confidence=valid.map(e=>e.response.confidence?.[i]).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);
  return {count:valid.length,counts:Array.from({length:choiceCount},(_,a)=>valid.filter(e=>e.response.answers[i]===a).length),accuracy:key&&valid.length?valid.filter(e=>e.response.answers[i]===key[i]).length/valid.length*100:null,meanConfidence:confidence.length?confidence.reduce((a,b)=>a+b,0)/confidence.length:null};
 });
 const rated=[];
 if(key)for(const e of entries)for(let i=0;i<n;i++){const c=e.response?.confidence?.[i],a=e.response?.answers?.[i];if(Number.isFinite(c)&&c>=0&&c<=100&&Number.isInteger(a)&&a>=0&&a<choiceCount)rated.push({confidence:c,correct:a===key[i]});}
 const bins=[[0,49],[50,69],[70,89],[90,100]].map(([low,high])=>{const v=rated.filter(x=>x.confidence>=low&&x.confidence<=high);return {low,high,count:v.length,meanConfidence:v.length?v.reduce((s,x)=>s+x.confidence,0)/v.length:null,accuracy:v.length?v.filter(x=>x.correct).length/v.length*100:null};});
 return {rows,bins,ratedCount:rated.length,meanConfidence:rated.length?rated.reduce((s,x)=>s+x.confidence,0)/rated.length:null,accuracy:rated.length?rated.filter(x=>x.correct).length/rated.length*100:null};
}
