// Pure validation and scoring shared by the client and the live session server.
export const bodyPath='M150 14 A24 24 0 1 1 149.99 62 A24 24 0 1 1 150 14 M137 62 L137 75 Q100 75 91 103 L69 193 Q68 213 85 213 Q95 212 99 196 L116 139 L117 190 L109 294 Q109 310 126 311 Q139 311 141 295 L150 216 L159 295 Q161 311 174 311 Q191 310 191 294 L183 190 L184 139 L201 196 Q205 212 215 213 Q232 213 231 193 L209 103 Q200 75 163 75 L163 62Z';
export function mapDimensions(q){
 if(q.mapImage&&Number.isFinite(q.mapWidth)&&Number.isFinite(q.mapHeight)&&q.mapWidth>0&&q.mapHeight>0&&q.mapWidth<=12000&&q.mapHeight<=12000)return [q.mapWidth,q.mapHeight];
 return [300,330];
}
export function normalizePoint(p){
 if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>1))return null;
 return p.map(x=>Math.round(x*10000)/10000);
}
export function pointDistance(a,b,q){
 const [w,h]=mapDimensions(q),unit=Math.min(w,h);
 return Math.hypot((a[0]-b[0])*w/unit,(a[1]-b[1])*h/unit);
}
export function validTarget(q){
 return !!normalizePoint(q.mapTarget)&&Number.isFinite(q.mapRadius)&&q.mapRadius>=.005&&q.mapRadius<=.5;
}
export function scoreMap(q,p){
 if(!q.mapGraded)return {isCorrect:null,pointsEarned:0};
 const correct=validTarget(q)&&!!normalizePoint(p)&&pointDistance(q.mapTarget,p,q)<=q.mapRadius+1e-9;
 const points=Math.min(1000,Math.max(0,Math.round(Number.isFinite(q.mapPoints)?q.mapPoints:100)));
 return {isCorrect:correct,pointsEarned:correct?points:0};
}
export function validPairs(q){
 const p=q.matchPairs;
 return Array.isArray(p)&&p.length>=2&&p.length<=10&&p.every(x=>x&&typeof x.left==='string'&&x.left.trim()&&typeof x.right==='string'&&x.right.trim())&&new Set(p.map(x=>x.left.trim())).size===p.length&&new Set(p.map(x=>x.right.trim())).size===p.length;
}
export function matchChoices(q){
 // Deterministic shuffle by slide id. Non-index identifiers prevent the public payload from exposing the mapping.
 const pairs=q.matchPairs||[];
 return pairs.map((p,i)=>({id:choiceId(q,i),text:p.right})).sort((a,b)=>a.id.localeCompare(b.id));
}
function choiceId(q,i){
 // Opaque per-slide choice labels are not a security boundary; server is the authority.
 let v=((Number(q.id)||1)*2654435761+(i+1)*1597334677)>>>0;
 v=Math.imul(v^(v>>>16),2246822507)>>>0;
 return v.toString(36);
}
export function normalizeMatch(q,response){
 if(!validPairs(q)||!Array.isArray(response)||response.length!==q.matchPairs.length)return null;
 const choices=new Set(matchChoices(q).map(c=>c.id));
 if(response.some(id=>typeof id!=='string'||!choices.has(id))||new Set(response).size!==response.length)return null;
 return response.slice();
}
export function scoreMatch(q,response){
 const valid=normalizeMatch(q,response);
 if(!valid)return {correctCount:0,total:q.matchPairs?.length||0,pointsEarned:0,isCorrect:false};
 const correctCount=valid.filter((id,i)=>id===choiceId(q,i)).length,total=valid.length;
 const max=Math.min(1000,Math.max(0,Math.round(Number.isFinite(q.matchPoints)?q.matchPoints:100)));
 return {correctCount,total,pointsEarned:Math.round(max*correctCount/total),isCorrect:correctCount===total};
}
export function matchKey(q){return (q.matchPairs||[]).map((_,i)=>choiceId(q,i));}
export const defaultPairs=[{left:'Vagus nerve',right:'Neural'},{left:'Gut hormones',right:'Endocrine'},{left:'Cytokines',right:'Immune'},{left:'SCFAs',right:'Metabolic'}];
