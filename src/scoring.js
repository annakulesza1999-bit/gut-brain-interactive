// Optional one-point classroom scoring. Legacy presentations keep their existing rules.
export const simpleScoring=q=>q?.scoringMode==='simple';
export const simpleSession=questions=>questions.some(simpleScoring);
export function scoringRule(q){
 if(!simpleScoring(q))return '';
 switch(q.type){
 case 'wordcloud':return '1 participation point for this activity';
 case 'pointmap':return q.mapGraded?'1 point for the correct location':'1 point for participating';
 case 'matching':return '1 point per correct match';
 case 'brain':return q.brainGraded===false?'Not graded':'1 point for the correct location';
 case 'research':return q.researchGraded===false?'Not graded':q.researchKind==='evidence'?'1 point per correct verdict':'1 point for the correct prediction';
 case 'mcq':case 'sequence':return '1 point for the correct answer';
 case 'curve':case 'simulation':return 'Not graded';
 default:return '';
 }
}
export function scoreWithPolicy(q,result={},count=1){
 if(!simpleScoring(q))return result;
 const rule=scoringRule(q);
 let points=0;
 if(q.type==='wordcloud')points=Number.isInteger(count)&&count>0?1:0;
 else if(q.type==='matching'||(q.type==='research'&&q.researchKind==='evidence'&&q.researchGraded!==false))points=Number.isInteger(result.correctCount)?Math.max(0,Math.min(result.total??result.correctCount,result.correctCount)):0;
 else if(q.type==='pointmap'&&!q.mapGraded)points=1;
 else if(rule&&rule!=='Not graded'&&result.isCorrect===true)points=1;
 return {...result,pointsEarned:points,basePoints:points,speedBonus:0};
}
export function sharedRanks(entries){
 const sorted=[...entries].sort((a,b)=>b.score-a.score);
 let rank=0,last;
 return sorted.map((p,i)=>{if(i===0||p.score!==last)rank=i+1;last=p.score;return {...p,currentRank:rank,rank};});
}
export function cleanNickname(value){
 if(typeof value!=='string')return '';
 const name=value.trim().replace(/\s+/gu,' ');
 return name&&name.length<=24&&!/[\p{C}]/u.test(name)?name:'';
}
