// Explicitly illustrative teaching models; no clinical or physiological inference.
export const SIM_KINDS=['appraisal','recovery','microbiome'];
export const MICROBE_COLORS=['#718C7B','#9B88AA','#B58C6B','#527A91','#A06179','#68834C'];
const specs={
 appraisal:{title:'Demand versus coping',prompt:'An exam is approaching. Change the fictional person’s perceived demands and coping resources.',task:'Explore how changing resources can alter appraisal, even when demands stay the same.',fields:[['demand','Perceived demands',0,10,8],['control','Perceived control',0,10,3],['support','Social support',0,10,2],['prepared','Preparation',0,10,3]],note:'This is a conceptual comparison, not a validated stress scale or an equation from Lazarus and Folkman.'},
 recovery:{title:'Seven days of stress',prompt:'Explore what happens when stressors recur before a fictional person has recovered.',task:'Compare frequent versus infrequent stressors and faster versus slower recovery.',fields:[['frequency','Number of stressors',1,12,4],['recovery','Recovery speed',0,100,45]],note:'The simulated activation curve is not cortisol data or a clinical measure of allostatic load. Persistent activation illustrates one possible mechanism of cumulative burden.'},
 microbiome:{title:'Build a microbial community',prompt:'Create communities of fictional microbes, then compare richness and evenness.',task:'Try making two communities with the same richness but different evenness.',fields:[],note:'Microbial types are fictional. Diversity does not measure overall gut health or predict an individual’s stress response.'}
};
export const simSpec=kind=>specs[kind]||specs.appraisal;
export function defaultResponse(kind){
 if(kind==='microbiome')return {microbes:[0,0,1,1,2,2,3,3,4,4,5,5]};
 return Object.fromEntries(simSpec(kind).fields.map(([id,, , ,value])=>[id,value]));
}
export function normalizeSimulation(kind,value){
 if(!SIM_KINDS.includes(kind)||!value||typeof value!=='object'||Array.isArray(value))return null;
 if(kind==='microbiome'){
  const m=value.microbes;
  return Array.isArray(m)&&m.length===12&&m.every(x=>Number.isInteger(x)&&x>=0&&x<6)?{microbes:m.slice()}:null;
 }
 const result={};
 for(const [id,,min,max] of simSpec(kind).fields){
  if(!Number.isInteger(value[id])||value[id]<min||value[id]>max)return null;
  result[id]=value[id];
 }
 return result;
}
export function simulationConfig(q){
 const kind=SIM_KINDS.includes(q?.simKind)?q.simKind:'appraisal';
 return {simKind:kind,simTask:typeof q?.simTask==='string'?q.simTask.slice(0,2000):simSpec(kind).task,simInitial:normalizeSimulation(kind,q?.simInitial)||defaultResponse(kind)};
}
export function appraisalMetrics(v){
 const resources=(v.control+v.support+v.prepared)/3;
 return {resources,gap:v.demand-resources};
}
export function recoverySeries(v){
 const times=Array.from({length:141},(_,i)=>i/20);
 const stressors=Array.from({length:v.frequency},(_,i)=>.4+i*6.2/v.frequency);
 const decay=.25+v.recovery/35;
 const values=times.map(t=>[t,.8+stressors.reduce((sum,start)=>{const d=t-start;return sum+(d>=0?4.2*(1-Math.exp(-d*10))*Math.exp(-d*decay):0);},0)]);
 const exposure=values.slice(1).reduce((sum,p,i)=>sum+((p[1]+values[i][1])/2-.8)*.05,0);
 return {values,stressors,exposure};
}
export function diversityMetrics(microbes){
 const counts=Array.from({length:6},(_,i)=>microbes.filter(x=>x===i).length);
 const richness=counts.filter(n=>n>0).length;
 const shannon=-counts.reduce((sum,n)=>{const p=n/microbes.length;return sum+(n?p*Math.log(p):0);},0);
 return {counts,richness,shannon,evenness:richness>1?shannon/Math.log(richness):null};
}
export function simulationMetrics(kind,value){
 if(kind==='appraisal')return appraisalMetrics(value);
 if(kind==='recovery')return {exposure:recoverySeries(value).exposure};
 if(kind==='microbiome')return diversityMetrics(value.microbes);
 return {};
}
export function simulationSummary(kind,entries){
 const valid=entries.map(e=>normalizeSimulation(kind,e.response)).filter(Boolean);
 const metrics=valid.map(v=>simulationMetrics(kind,v));
 const keys=kind==='appraisal'?['resources','gap']:kind==='recovery'?['exposure']:['richness','shannon','evenness'];
 return {count:valid.length,means:Object.fromEntries(keys.map(k=>{const values=metrics.map(m=>m[k]).filter(Number.isFinite);return [k,values.length?values.reduce((a,b)=>a+b,0)/values.length:null];}))};
}
