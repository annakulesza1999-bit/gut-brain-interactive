// Rehearsal state is ephemeral, never written into the saved presentation.
import {activityDuration,initialTextCount,textLines,publicActivity,curveIdentity,normalizeCurve,reactionSummary,curveReference,openResponses,wordResponseLimit} from './activities.js';
import {normalizePoint,normalizeMatch,scoreMap,scoreMatch,matchKey} from './spatialActivities.js';
import {normalizeSimulation,defaultResponse,isExploreSimulation} from './simulations.js';
import {normalizeResearchResponse,normalizeResearch,scoreResearch,revealResearch} from './researchActivities.js';
import {SAGITTAL_VIEW,sagittalHit} from './sagittalRegions.js';
import {normalizeBrainHit,scoreBrain,brainReveal,personalBrainFeedback} from './anatomyActivities.js';
export function startSlide(deck,index=0,visit=1){
 const q=deck.questions[index],duration=activityDuration(q,deck.settings?.timerDuration??30);
 return {index,visit,duration,remaining:duration,paused:false,revealed:false,visible:initialTextCount(q),response:null,words:[],samples:[],thumb:'',reactions:[],qa:[]};
}
export function normalizePreviewResponse(q,response){
 switch(q.type){
 case 'curve':return normalizeCurve(response);
 case 'pointmap':return normalizePoint(response);
 case 'matching':return normalizeMatch(q,response);
 case 'simulation':return normalizeSimulation(q.simKind,response);
 case 'research':return normalizeResearchResponse(q,response);
 case 'brain':return normalizeBrainHit(q,response);
 case 'text':case 'wordcloud':return null;
 default:return Number.isInteger(response)&&response>=0&&response<(q.options||[]).length?response:null;
 }
}
export function participantEntry(i){return {id:'preview-'+i,name:'Participant '+(i+1),phone:'',connected:true,score:0,currentRank:i+1};}
function score(q,response){
 if(q.type==='pointmap')return scoreMap(q,response);
 if(q.type==='matching')return scoreMatch(q,response);
 if(q.type==='research')return scoreResearch(q,response);
 if(q.type==='brain')return scoreBrain(q,response);
 if(['curve','wordcloud','simulation','text'].includes(q.type))return {pointsEarned:0,isCorrect:null};
 const isCorrect=response===q.correctAnswer;return {isCorrect,pointsEarned:isCorrect?100:0,basePoints:isCorrect?100:0,speedBonus:0};
}
export function sampleResponses(q){
 // Brain coordinates must be picked on the actual mesh; do not fabricate them.
 if((q.type==='brain'&&q.brainView!==SAGITTAL_VIEW)||q.type==='text')return [];
 const candidates=Array.from({length:14},(_,j)=>{
  const i=j+1;let response;
  switch(q.type){
  case 'brain':{const points=[[460,420],[540,370],[360,577],[550,570],[720,555],[410,495],[490,420]];const [x,y]=points[j%points.length];response=sagittalHit(x/1000,y/1104);break;}
  case 'curve':response=Array.from({length:31},(_,k)=>{const x=k/30;return [x,Math.min(.98,.12+(0.35+(i%6)*.07)*Math.exp(-((x-(.42+(i%4)*.06))**2)/(.035+(i%5)*.009)))];});break;
  case 'pointmap':if(q.mapImage)response=[.15+(i%5)*.16,.22+(i%4)*.18];else response=[.46+(i%4)*.025,.36+(i%5)*.045];break;
  case 'matching':{const k=matchKey(q);response=i%3===0?k.slice(1).concat(k.slice(0,1)):k;break;}
  case 'simulation':{response=defaultResponse(q.simKind);if(q.simKind==='appraisal')response={demand:i%8+3,control:i%7+2,support:i%6+3,prepared:i%8+1};if(q.simKind==='recovery')response={frequency:i%9+1,recovery:(i*17)%101};if(q.simKind==='microbiome')response={microbes:response.microbes.map((x,j)=>j<i%8?i%6:x)};break;}
  case 'research':{const r=normalizeResearch(q),n=r.researchKind==='prediction'?1:r.researchClaims.length,limit=r.researchKind==='prediction'?r.researchOptions.length:2;response={answers:Array.from({length:n},(_,k)=>(i+k)%Math.max(1,limit)),confidence:r.researchConfidence?Array.from({length:n},(_,k)=>50+((i+k)*10)%51):[]};break;}
  case 'wordcloud':if(openResponses(q))return {i,response:['They could be discussing something unrelated.','Maybe they found a joke funny.','They might be reacting to my presentation.','Perhaps they are nervous too.','They may be laughing at a message.','They might have a question.','I cannot know what they are thinking.','They could be encouraging one another.','Maybe they did not understand a point.','They might be distracted.','They could be planning something.','They may be sharing an observation.','They could be laughing at a message.','Maybe nothing to do with me.'][j]};return {i,response:['stress','recovery','appraisal','support','stress','coping','sleep','perceived control','stress','social support','gut symptoms','uncertainty','recovery','attention'][j]};
  default:response=i%Math.max(1,q.options?.length||0);
  }
  return {i,response:normalizePreviewResponse(q,response)};
 });return candidates.filter(x=>x.response!==null);
}
export function previewReducer(deck,state,action){
 const q=deck.questions[state.index];
 switch(action.type){
 case 'goto':return Number.isInteger(action.index)&&action.index>=0&&action.index<deck.questions.length?startSlide(deck,action.index,state.visit+1):state;
 case 'next':if(q.type==='text'&&state.visible<textLines(q).length)return {...state,visible:state.visible+1};if(q.type!=='text'&&!isExploreSimulation(q)&&!state.revealed)return {...state,revealed:true,paused:false};return previewReducer(deck,state,{type:'goto',index:state.index+1});
 case 'reveal':if(isExploreSimulation(q))return state;return q.type==='text'?{...state,visible:Math.min(textLines(q).length,state.visible+1)}:{...state,revealed:true,paused:false};
 case 'pause':return {...state,paused:!state.paused};
 case 'tick':if(state.paused||state.revealed||state.duration===0)return state;return {...state,remaining:Math.max(0,state.remaining-1),revealed:state.remaining<=1};
 case 'reset':return startSlide(deck,state.index,state.visit+1);
 case 'samples':if(isExploreSimulation(q))return state;return {...state,samples:state.samples.length?[]:sampleResponses(q)};
 case 'answer':{if(isExploreSimulation(q)||action.visit!==state.visit||state.paused||state.revealed||state.response!==null)return state;const response=normalizePreviewResponse(q,action.response);return response===null?state:{...state,response};}
 case 'word':return action.visit===state.visit&&q.type==='wordcloud'&&!state.paused&&!state.revealed&&typeof action.word==='string'&&action.word.trim()&&state.words.length<10?{...state,words:[...state.words,action.word.trim().slice(0,wordResponseLimit(q))]}:state;
 case 'reaction':return action.visit===state.visit&&['👍','👎','❤️','👏','💡','🎉'].includes(action.emoji)?{...state,thumb:['👍','👎'].includes(action.emoji)?action.emoji:state.thumb,reactions:[...state.reactions.slice(-5),{id:action.id,emoji:action.emoji}]}:state;
 case 'resetThumbs':return {...state,thumb:'',reactions:[]};
 case 'qa':return action.visit===state.visit&&typeof action.text==='string'&&action.text.trim()&&state.qa.length<20?{...state,qa:[...state.qa,{id:action.id,text:action.text.trim().slice(0,500),authorName:'Anonymous',timestamp:action.timestamp,upvotes:0,answered:false}]}:state;
 case 'upvote':return {...state,qa:state.qa.map(x=>x.id===action.id?{...x,upvotes:x.upvotes?0:1}:x)};
 default:return state;
 }
}
export function previewData(deck,state){
 const q=deck.questions[state.index],own=q.type==='wordcloud'?state.words.length>0:state.response!==null;
 const rows=[...(own?[{i:0,response:q.type==='wordcloud'?state.words[0]:state.response}]:[]),...state.samples];
 const participants=[participantEntry(0),...state.samples.map(x=>participantEntry(x.i))];
 const entries=rows.map(({i,response})=>({...curveIdentity(i),response,...score(q,response)}));
 const words=[...state.words,...(q.type==='wordcloud'?state.samples.map(x=>x.response):[])];
 const reveal={correctAnswer:q.correctAnswer,explanation:q.explanation,afterMedia:q.afterMedia,afterPreset:q.afterPreset,optionDist:(q.options||[]).map((_,i)=>({count:rows.filter(r=>r.response===i).length,pct:rows.length?Math.round(rows.filter(r=>r.response===i).length/rows.length*100):0}))};
 if(q.type==='curve'){reveal.curves=entries.map(e=>({...e,points:e.response}));reveal.referenceCurve=curveReference(q);}
 if(q.type==='pointmap')Object.assign(reveal,{mapResults:entries.map(e=>({...e,point:e.response})),mapTarget:q.mapGraded?q.mapTarget:null,mapRadius:q.mapRadius});
 if(q.type==='matching')Object.assign(reveal,{matchResults:entries.map(e=>({...e,selection:e.response})),matchKey:matchKey(q)});
 if(q.type==='simulation')reveal.simulationResults=entries;
 if(q.type==='research')Object.assign(reveal,revealResearch(q),{researchResults:entries});
 if(q.type==='brain')Object.assign(reveal,brainReveal(q),{brainResults:entries});
 const publicEntries=rows.map(({i,response})=>({...curveIdentity(i),response}));
 const live={optionDist:reveal.optionDist};
 if(q.type==='curve')live.curves=publicEntries.map(e=>({label:e.label,color:e.color,points:e.response}));
 if(q.type==='pointmap')live.mapResults=publicEntries.map(e=>({label:e.label,color:e.color,point:e.response}));
 if(q.type==='matching')live.matchResults=publicEntries.map(e=>({label:e.label,color:e.color,selection:e.response}));
 if(q.type==='simulation')live.simulationResults=publicEntries;
 if(q.type==='research')live.researchResults=publicEntries;
 if(q.type==='brain')live.brainResults=publicEntries;
 const ownScore=own&&state.revealed&&q.type!=='wordcloud'?score(q,state.response):null;
 const question={id:q.id,question:q.question,options:q.options||[],category:q.category,difficulty:q.difficulty,...publicActivity(q,state.visible)};
 return {question,participants,words,completed:rows.length,own,live,reveal:state.revealed?reveal:null,ownScore,brainFeedback:q.type==='brain'&&own?personalBrainFeedback(q,state.response):null,thumbs:reactionSummary(state.thumb?{preview:state.thumb}:{})};
}
