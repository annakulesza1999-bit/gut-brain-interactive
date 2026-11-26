import test from 'node:test';
import assert from 'node:assert/strict';
import {wordFrequencies,layoutWords,fitCloudWords,cloudPageSize} from './src/wordCloudLayout.js';
import {liveResultsEnabled} from './src/activities.js';
test('frequency counts normalize case and spacing, including prototype property names',()=>{const stats=wordFrequencies([' Stress ','stress','RECOVERY','__proto__','constructor',{text:'recovery'}]);assert.equal(stats.length,4);assert.equal(stats.find(x=>x.key==='stress').count,2);assert.equal(stats.find(x=>x.key==='recovery').count,2);});
test('packed word layout is deterministic, in bounds and non-overlapping',()=>{const stats=wordFrequencies(['stress','stress','stress','coping','coping','appraisal','sleep','support','recovery','exercise','perceived control','gut–brain axis','preparation','cortisol','microbiome']);const measure=(text,size)=>text.length*size*.57;const a=layoutWords(stats,measure);assert.equal(a.length,stats.length);assert.deepEqual(a,layoutWords(stats,measure));assert.ok(a[0].size>a.at(-1).size);for(let i=0;i<a.length;i++){const x=a[i];assert.ok(x.x-x.w/2>=12&&x.x+x.w/2<=888&&x.y-x.h/2>=12&&x.y+x.h/2<=448);for(const y of a.slice(i+1))assert.ok(Math.abs(x.x-y.x)>=(x.w+y.w)/2+5||Math.abs(x.y-y.y)>=(x.h+y.h)/2+5);}});
test('existing slides default to live, explicit reveal overrides',()=>{assert.equal(liveResultsEnabled({}),true);assert.equal(liveResultsEnabled({resultsMode:'live'}),true);assert.equal(liveResultsEnabled({resultsMode:'reveal'}),false);});

test('flow cloud sizes fit a classroom page, including long and mixed-width responses',()=>{
 const measure=(word,size)=>[...word].reduce((w,ch)=>w+size*(ch==='W'||ch==='界'?1:.58),0);
 for(const width of [390,900,1200]){
  const size=cloudPageSize(width);
  const stats=wordFrequencies(Array.from({length:size},(_,i)=>'W'.repeat(30)+i).concat(['W'.repeat(30)+'0','W'.repeat(30)+'0']));
  const height=width===390?240:460;
  const a=fitCloudWords(stats,measure,width,height);
  assert.equal(a.fits,true);assert.equal(a.words.length,stats.length);assert.ok(a.height<=height-40);
  assert.ok(a.words[0].size>=a.words.at(-1).size);
  assert.deepEqual(a,fitCloudWords(stats,measure,width,height));
 }
 assert.equal(cloudPageSize(1200),15);
 assert.equal(cloudPageSize(390),6);
});

import {publicActivity,wordResponseLimit} from './src/activities.js';
import {startSlide,previewReducer} from './src/previewSession.js';
test('open-ended responses retain sentences, repeat answers and public format',()=>{
 const q={id:1,type:'wordcloud',wordcloudMode:'open',question:'Interpret the situation',timerSeconds:0};
 assert.equal(publicActivity(q).wordcloudMode,'open');assert.equal(wordResponseLimit(q),250);assert.equal(wordResponseLimit({type:'wordcloud'}),35);
 const deck={questions:[q]},sentence='Maybe they are sharing a joke unrelated to the presentation.';
 let state=startSlide(deck);for(let i=0;i<2;i++)state=previewReducer(deck,state,{type:'word',visit:state.visit,word:sentence});
 assert.deepEqual(state.words,[sentence,sentence]);const closed=previewReducer(deck,state,{type:'reveal'});assert.equal(previewReducer(deck,closed,{type:'word',visit:closed.visit,word:sentence}),closed);
});
