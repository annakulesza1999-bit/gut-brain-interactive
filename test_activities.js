import test from 'node:test';
import assert from 'node:assert/strict';
import {curveColors,curveIdentity,normalizeCurve,publicActivity,safeMedia,averageCurves,hpaStages} from './src/activities.js';
test('unique stable colors and labels for a class of fifteen',()=>{
 assert.equal(new Set(curveColors).size,15);
 for(let i=0;i<15;i++){assert.deepEqual(curveIdentity(i),curveIdentity(i));assert.equal(curveIdentity(i).label,'Curve '+(i+1));}
});
test('curve validation rejects malformed, reversed, and out-of-bounds inputs',()=>{
 assert.deepEqual(normalizeCurve([[0,.2],[.5,.9],[1,.3]]),[[0,.2],[.5,.9],[1,.3]]);
 for(const input of [null,[[0,0],[1,1]],[[0,0],[.5,.5],[.4,1]],[[0,0],[.5,2],[1,1]],[[0,0],[.01,1],[.02,0]]])assert.equal(normalizeCurve(input),null);
});
test('mean uses shared time axis and actual predictions',()=>{
 const a={points:[[0,.2],[.5,.4],[1,.6]]},b={points:[[0,.4],[.5,.6],[1,.8]]};
 const mean=averageCurves([a,b],3);
 assert.deepEqual(mean.map(p=>p.map(v=>+v.toFixed(5))),[[0,.3],[.5,.5],[1,.7]]);
 assert.deepEqual(averageCurves([]),[]);
});
test('sequence has five valid stages and public data excludes answers/reveals',()=>{
 assert.equal(hpaStages.length,5);
 for(const q of hpaStages){assert.ok(q.options[q.correctAnswer]);const p=publicActivity({...q,type:'sequence'});assert.equal(p.correctAnswer,undefined);assert.equal(p.afterPreset,undefined);}
});
test('media permits bounded image data only',()=>{
 assert.equal(safeMedia('https://example.com/image.gif'),'');
 assert.equal(safeMedia('data:image/svg+xml;base64,YQ=='),'');
 assert.equal(safeMedia('data:image/gif;base64,YQ=='),'data:image/gif;base64,YQ==');
});

import { timerSeconds, activityDuration, initialTextCount, textLines, reactionSummary } from './src/activities.js';
test('countdown supports session inheritance, zero and custom durations',()=>{
 assert.equal(timerSeconds(0),0);
 assert.equal(activityDuration({type:'curve'},75),75);
 assert.equal(activityDuration({type:'sequence',timerSeconds:45},30),45);
 assert.equal(activityDuration({type:'curve',timerSeconds:0},30),0);
 assert.equal(activityDuration({type:'text',timerSeconds:45},30),0);
 assert.equal(timerSeconds(9999),3600);
});
test('text reveal sends only visible lines to participant',()=>{
 const q={type:'text',body:'First\n\nSecond\nThird',revealMode:'step'};
 assert.equal(initialTextCount(q),0);
 assert.deepEqual(textLines(q),['First','Second','Third']);
 assert.deepEqual(publicActivity(q,1).visibleLines,['First']);
 assert.equal(publicActivity(q,1).body,undefined);
 assert.equal(publicActivity(q,1).textTotal,3);
 assert.equal(initialTextCount({...q,revealMode:'all'}),3);
});
test('latest thumb reaction counts once per participant',()=>{
 const votes={a:'👍',b:'👎'};
 votes.a='👍';assert.deepEqual(reactionSummary(votes),{up:1,down:1});
 votes.a='👎';assert.deepEqual(reactionSummary(votes),{up:0,down:2});
});

import {safeTextImages} from './src/activities.js';
test('text figures are bounded and notes remain private',()=>{const good='data:image/png;base64,YQ==';const q={type:'text',body:'Hello',sourceNotes:'private',textImages:[{media:good,alt:'Figure'},{media:'https://example.com/image.png',alt:'external'}]};assert.deepEqual(safeTextImages(q.textImages),[{media:good,alt:'Figure'}]);assert.equal(publicActivity(q).sourceNotes,undefined);assert.deepEqual(publicActivity(q).textImages,[{media:good,alt:'Figure'}]);});

import {curveReference,exampleCortisolReference} from './src/activities.js';
test('reference curve is validated and never included in pre-reveal question payload',()=>{const q={type:'curve',referenceCurve:exampleCortisolReference,referenceLabel:'Illustrative reference',referenceNote:'Not measurements'};assert.equal(curveReference(q).points.length,27);assert.equal(publicActivity(q).referenceCurve,undefined);assert.equal(curveReference({...q,referenceCurve:[[0,0],[1,1],[.5,.4]]}),null);});

import {slideSources,slideLayout} from './src/activities.js';
test('slide source footer is separate from revealable bullets, bounded and public',()=>{const q={type:'text',body:'One idea\nAnother idea',slideSources:'A study (2020)',slideLayout:'cover',sourceNotes:'private'};assert.deepEqual(textLines(q),['One idea','Another idea']);assert.equal(slideSources(q),'A study (2020)');assert.equal(publicActivity(q).slideSources,'A study (2020)');assert.equal(publicActivity(q).sourceNotes,undefined);assert.equal(slideLayout(q),'cover');assert.equal(slideSources({slideSources:'x'.repeat(3000)}).length,2500);});

import {parseSlideLine,shortDashes} from './src/slideText.js';
test('safe authored emphasis and line styles',()=>{assert.deepEqual(parseSlideLine('~ **Sample:** *N = 74* — adults'),{kind:'muted',tokens:[{kind:'bold',text:'Sample:'},{kind:'plain',text:' '},{kind:'italic',text:'N = 74'},{kind:'plain',text:' - adults'}]});assert.equal(parseSlideLine('> example').kind,'indent');assert.equal(parseSlideLine('<script>').tokens[0].text,'<script>');assert.equal(shortDashes('A — B'),'A - B');});

import {slideFigureLayout} from './src/activities.js';
test('wide figure mode is opt-in and survives the public slide payload',()=>{
 for(const layout of ['wide','large','normal']){const q={type:'text',body:'First point\nSecond point',figureLayout:layout,revealMode:'step',sourceNotes:'private'};assert.equal(slideFigureLayout(q),layout);assert.equal(publicActivity(q,1).figureLayout,layout);assert.deepEqual(publicActivity(q,1).visibleLines,['First point']);assert.equal(publicActivity(q,1).sourceNotes,undefined);}
 assert.equal(slideFigureLayout({figureLayout:'invalid'}),'normal');assert.equal(slideFigureLayout({}),'normal');
});
