import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreWithPolicy,scoringRule,sharedRanks,cleanNickname} from './src/scoring.js';
import {startSlide,previewReducer,previewData} from './src/previewSession.js';
import {publicActivity} from './src/activities.js';
const q=(type,extra={})=>({id:1,type,question:type,scoringMode:'simple',options:[],...extra});
test('simple scoring, no speed bonuses, ties and preserved legacy rules',()=>{
 assert.equal(scoreWithPolicy(q('wordcloud'),{},3).pointsEarned,3);
 assert.equal(scoreWithPolicy(q('pointmap',{mapGraded:false}),{isCorrect:null}).pointsEarned,1);
 for(const type of ['mcq','sequence','matching','brain','research']){assert.equal(scoreWithPolicy(q(type),{isCorrect:true,pointsEarned:100}).pointsEarned,1);assert.equal(scoreWithPolicy(q(type),{isCorrect:false,pointsEarned:50}).pointsEarned,0);}
 assert.equal(scoreWithPolicy(q('curve'),{isCorrect:true}).pointsEarned,0);assert.equal(scoreWithPolicy(q('simulation'),{isCorrect:true}).pointsEarned,0);
 assert.equal(scoreWithPolicy({type:'mcq'},{pointsEarned:100}).pointsEarned,100);
 assert.deepEqual(sharedRanks([{score:2},{score:1},{score:2},{score:0}]).map(p=>p.currentRank),[1,1,3,4]);
 assert.equal(cleanNickname('  Blue  Fox '),'Blue Fox');assert.equal(cleanNickname('x'.repeat(25)),'');
 assert.equal(publicActivity(q('wordcloud')).scoringMode,'simple');assert.equal(scoringRule(q('curve')),'Not graded');
});
test('preview accumulates participation and revealed correct answers without duplicate points on navigation',()=>{
 const deck={questions:[q('wordcloud'),q('mcq',{id:2,options:['A','B'],correctAnswer:1}),q('curve',{id:3}),q('pointmap',{id:4,mapGraded:false})]};
 let s=startSlide(deck),act=(type,extra={})=>{s=previewReducer(deck,s,{type,visit:s.visit,...extra})},score=()=>previewData(deck,s).scoreParticipants.find(p=>p.id==='preview-0').score;
 act('nickname',{nickname:'Blue Fox'});act('word',{word:'one'});act('word',{word:'two'});assert.equal(score(),2);
 act('reveal');act('reveal');assert.equal(score(),2);act('goto',{index:1});assert.equal(score(),2);act('answer',{response:1});assert.equal(score(),2);act('reveal');assert.equal(score(),3);
 act('goto',{index:2});act('answer',{response:[[0,0],[.5,1],[1,.2]]});act('reveal');assert.equal(score(),3);
 act('goto',{index:3});act('answer',{response:[.5,.5]});assert.equal(score(),4);act('reveal');assert.equal(score(),4);
 act('goto',{index:0});assert.equal(score(),4);assert.equal(previewData(deck,s).nickname,'Blue Fox');act('reset');assert.equal(score(),2);
});
