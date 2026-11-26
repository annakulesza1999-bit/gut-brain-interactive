// Versioned, portable presentation content. No dependency on React or storage.
export const FORMAT='gut-mind-presentation';
export const SCHEMA_VERSION=1;
export const HISTORY_LIMIT=10;
export const DEFAULT_SETTINGS={timerDuration:30,speedBonus:false,showTopic:false};
export const SUPPORTED_TYPES=['mcq','wordcloud','sequence','curve','text'];
const copy=value=>JSON.parse(JSON.stringify(value));
export const blankSlide=()=>({id:1,type:'text',question:'New presentation',body:'Add your first point here.',revealMode:'all',options:[],correctAnswer:null});
export function normalizeContent(input) {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid presentation.');
 if(input.schemaVersion!==undefined&&input.schemaVersion!==SCHEMA_VERSION)throw Error('This presentation uses a different format version. Keep the original file and use a compatible app version.');
 if(!Array.isArray(input.questions)||input.questions.length<1||input.questions.length>500)throw Error('A presentation must contain 1–500 slides.');
 const used=new Set();
 const questions=input.questions.map((q,i)=>{
   if(!q||typeof q!=='object'||Array.isArray(q)||typeof q.question!=='string')throw Error('Invalid slide '+(i+1));
   let id=q.id;
   if(!Number.isSafeInteger(id)||id<1||used.has(id)){id=1;while(used.has(id))id++;}
   used.add(id);
   return {...copy(q),id,type:q.type||'mcq'};
 });
 const title=typeof input.title==='string'?input.title.slice(0,160):'Untitled presentation';
 const settings={...DEFAULT_SETTINGS,...(input.settings&&typeof input.settings==='object'?copy(input.settings):{})};
 const duration=Number(settings.timerDuration);
 settings.timerDuration=Number.isFinite(duration)?Math.max(0,Math.min(3600,Math.round(duration))):30;
 return {...copy(input),schemaVersion:SCHEMA_VERSION,title,questions,settings};
}
export function readBackup(value,fallbackTitle='Imported presentation'){
 if(Array.isArray(value))return {content:normalizeContent({title:fallbackTitle,questions:value}),history:[]};
 if(!value||value.format!==FORMAT||value.schemaVersion!==SCHEMA_VERSION)throw Error('Unrecognized or newer presentation format. Original file was not modified.');
 const content=normalizeContent(value.content);
 const history=Array.isArray(value.history)?value.history.slice(-HISTORY_LIMIT).map(v=>({at:typeof v.at==='string'?v.at:new Date().toISOString(),label:String(v.label||'Imported version').slice(0,120),content:normalizeContent(v.content)})):[];
 return {content,history};
}
export function makeBackup(record){return {format:FORMAT,schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),content:normalizeContent(record.content),history:copy(record.history||[])};}
export function snapshot(history,content,label,at=new Date().toISOString()){
 const last=history[history.length-1];
 if(last&&JSON.stringify(last.content)===JSON.stringify(content))return history;
 return [...history,{at,label,content:normalizeContent(content)}].slice(-HISTORY_LIMIT);
}
export function launchProblem(content){
 for(const [i,q] of content.questions.entries()){
  if(!SUPPORTED_TYPES.includes(q.type||'mcq'))return 'Slide '+(i+1)+' uses an activity not supported by this app version. Its data is preserved.';
  if(['mcq','sequence'].includes(q.type||'mcq')&&(!Array.isArray(q.options)||q.options.length<2||!Number.isInteger(q.correctAnswer)||q.correctAnswer<0||q.correctAnswer>=q.options.length))return 'Check the answer choices and correct answer on slide '+(i+1)+'.';
 }
 return '';
}
