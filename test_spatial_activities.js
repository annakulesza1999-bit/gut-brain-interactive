import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePoint,pointDistance,scoreMap,validTarget,validPairs,matchChoices,matchKey,normalizeMatch,scoreMatch,defaultPairs} from './src/spatialActivities.js';
import {publicActivity} from './src/activities.js';
test('point normalization rejects invalid data',()=>{
 assert.deepEqual(normalizePoint([.123456,.8]),[.1235,.8]);
 for(const x of [null,[0],[-.1,.2],[.2,1.1],[NaN,.2],['0',.2]])assert.equal(normalizePoint(x),null);
});
test('target distance respects original image aspect ratio',()=>{
 const q={mapImage:'image',mapWidth:600,mapHeight:300,mapTarget:[.5,.5],mapRadius:.1,mapGraded:true,mapPoints:75};
 assert.ok(validTarget(q));assert.ok(Math.abs(pointDistance([.5,.5],[.55,.5],q)-.1)<1e-8);
 assert.deepEqual(scoreMap(q,[.55,.5]),{isCorrect:true,pointsEarned:75});
 assert.deepEqual(scoreMap(q,[.56,.5]),{isCorrect:false,pointsEarned:0});
 assert.deepEqual(scoreMap({...q,mapGraded:false},[.8,.8]),{isCorrect:null,pointsEarned:0});
});
test('match scoring supports partial credit and rejects repeated or unknown choices',()=>{
 const q={id:5,matchPairs:defaultPairs,matchPoints:100};
 assert.ok(validPairs(q));const key=matchKey(q);
 assert.equal(new Set(matchChoices(q).map(c=>c.id)).size,4);
 assert.equal(scoreMatch(q,key).pointsEarned,100);
 assert.equal(scoreMatch(q,[key[1],key[0],key[2],key[3]]).pointsEarned,50);
 assert.equal(normalizeMatch(q,[key[0],key[0],key[2],key[3]]),null);
 assert.equal(normalizeMatch(q,['bad',key[1],key[2],key[3]]),null);
 assert.equal(validPairs({...q,matchPairs:[{left:'a',right:'x'},{left:'b',right:'x'}]}),false);
});
test('public activity payload excludes target and matching key',()=>{
 const p=publicActivity({type:'pointmap',mapGraded:true,mapTarget:[.2,.3],mapRadius:.1});
 assert.equal(p.mapTarget,undefined);assert.equal(p.mapRadius,undefined);
 const m=publicActivity({type:'matching',id:2,matchPairs:defaultPairs});
 assert.equal(m.matchPairs,undefined);assert.equal(m.matchKey,undefined);assert.equal(m.matchChoices.length,4);
});
