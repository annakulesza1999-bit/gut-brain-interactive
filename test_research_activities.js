import test from 'node:test';
import assert from 'node:assert/strict';
import {researchTemplate,normalizeResearch,normalizeResearchResponse,researchProblem,publicResearch,revealResearch,scoreResearch,researchSummary} from './src/researchActivities.js';
test('ungraded graph template requires no invented study key',()=>{const q=researchTemplate('prediction','scatter');assert.equal(researchProblem(q),'');assert.equal(q.researchGraded,false);assert.equal(scoreResearch(q,{answers:[1],confidence:[70]}).pointsEarned,0);assert.equal(revealResearch(q).researchKey,null);});
test('graded graph poll validates answer key and response',()=>{const q={...researchTemplate(),researchGraded:true,researchCorrect:2,researchPoints:75};assert.equal(researchProblem(q),'');assert.equal(scoreResearch(q,{answers:[2],confidence:[85]}).pointsEarned,75);assert.equal(scoreResearch(q,{answers:[1],confidence:[90]}).pointsEarned,0);assert.equal(normalizeResearchResponse(q,{answers:[3],confidence:[90]}),null);assert.equal(normalizeResearchResponse(q,{answers:[2],confidence:[101]}),null);assert.deepEqual(normalizeResearchResponse(q,{answers:[2],confidence:[]}),{answers:[2],confidence:[null]});assert.ok(researchProblem({...q,researchCorrect:null}));});
test('claim classification partial credit, confidence independent',()=>{const q=researchTemplate('evidence');const a={answers:[0,0,0],confidence:[100,10,75]};assert.equal(scoreResearch(q,a).correctCount,2);assert.equal(scoreResearch(q,a).pointsEarned,67);assert.equal(scoreResearch(q,{...a,confidence:[0,0,0]}).pointsEarned,67);assert.equal(normalizeResearchResponse(q,{answers:[0],confidence:[90]}),null);});
test('public payload withholds explanations, answers and findings',()=>{const q={...researchTemplate('evidence'),researchFigure:'data:image/png;base64,YQ==',researchReveal:'secret',researchSource:'source'};const p=publicResearch(q);assert.ok(p.researchClaims.every(c=>!('answer' in c)&&!('reason' in c)));for(const k of ['researchCorrect','researchReveal','researchFigure','researchSource','researchPoints'])assert.equal(p[k],undefined);assert.equal(revealResearch(q).researchReveal,'secret');assert.equal(normalizeResearch({...q,researchFigure:'https://example.com/image.png'}).researchFigure,'');});
test('calibration reflects rated answers only, missing results not zero',()=>{const entries=[{response:{answers:[0],confidence:[90]}},{response:{answers:[1],confidence:[50]}},{response:{answers:[0],confidence:[]}}];const s=researchSummary(entries,[0],1,2);assert.deepEqual(s.rows[0].counts,[2,1]);assert.equal(s.rows[0].accuracy,2/3*100);assert.equal(s.ratedCount,2);assert.equal(s.meanConfidence,70);assert.equal(s.accuracy,50);assert.equal(s.bins[3].accuracy,100);assert.equal(researchSummary([],null,1,3).rows[0].accuracy,null);});

test('simple evidence accepts partial answers and optional confidence without fabricated ratings',()=>{
 const q={...researchTemplate('evidence'),scoringMode:'simple'};
 const partial={answers:[0,null,1],confidence:[null,null,70]};
 assert.deepEqual(normalizeResearchResponse(q,partial),partial);
 assert.deepEqual(normalizeResearchResponse(q,{answers:[0,null,null]}),{answers:[0,null,null],confidence:[null,null,null]});
 assert.equal(scoreResearch(q,partial).correctCount,1);
 assert.equal(normalizeResearchResponse(q,{answers:[null,null,null]}),null);
 assert.equal(normalizeResearchResponse(q,{answers:[0,null,2]}),null);
 assert.equal(normalizeResearchResponse(q,{answers:[0,null,1],confidence:[101,null,null]}),null);
 const summary=researchSummary([{response:partial},{response:{answers:[0,null,null],confidence:[null,null,null]}}],[0,1,0],3,2);
 assert.equal(summary.ratedCount,1);assert.equal(summary.rows[0].meanConfidence,null);assert.equal(summary.rows[1].count,0);
});

test('every prediction and classification supports untouched confidence, regardless of scoring mode',()=>{
 for(const mode of [undefined,'simple'])for(const graph of ['curve','scatter']){
  const q={...researchTemplate('prediction',graph),scoringMode:mode,researchGraded:true,researchCorrect:1};
  for(const response of [{answers:[1]},{answers:[1],confidence:[]},{answers:[1],confidence:[null]}]){
   const v=normalizeResearchResponse(q,response);assert.deepEqual(v,{answers:[1],confidence:[null]});assert.equal(scoreResearch(q,response).pointsEarned,100);assert.equal(researchSummary([{response:v}],[1],1,3).ratedCount,0);
  }
  assert.equal(normalizeResearchResponse(q,{answers:[null]}),null);
  assert.equal(normalizeResearchResponse(q,{answers:[1],confidence:[-1]}),null);
  for(const n of [0,50,100])assert.equal(researchSummary([{response:normalizeResearchResponse(q,{answers:[1],confidence:[n]})}],[1],1,3).ratedCount,1);
 }
 const q=researchTemplate('evidence');assert.deepEqual(normalizeResearchResponse(q,{answers:[0,1,0]}),{answers:[0,1,0],confidence:[null,null,null]});
 assert.equal(normalizeResearchResponse(q,{answers:[0,null,0]}),null);
});
