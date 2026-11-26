// Actual loopback Socket.IO integration test, using synthetic data only.
// Run after dependency installation. Does not launch a publicly accessible server.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {io} from 'socket.io-client';
import {defaultPairs,matchKey} from './src/spatialActivities.js';
import {researchTemplate} from './src/researchActivities.js';
import {brainTemplate} from './src/anatomyActivities.js';
import {defaultResponse} from './src/simulations.js';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function event(socket,name,predicate=()=>true){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(name,handler);reject(Error('Timed out waiting for '+name));},12000);
  function handler(data){if(!predicate(data))return;clearTimeout(timer);socket.off(name,handler);resolve(data);}
  socket.on(name,handler);
 });
}
async function ack(socket,name,payload){return socket.timeout(8000).emitWithAck(name,payload);}
async function port(){
 const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;
}

const N=Number(process.env.GM_TEST_CLIENTS||30);
assert.ok([15,30].includes(N),'Use 15 or 30 participants for the smoke test');
test('loopback session: '+N+' participants, all activity families, auth and private results', {timeout:120000}, async t=>{
 const p=await port(),url='http://127.0.0.1:'+p;
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,NODE_ENV:'test',PORT:String(p)},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output=(output+d).slice(-2000));child.stderr.on('data',d=>output=(output+d).slice(-2000));
 const sockets=[];
 t.after(()=>{for(const socket of sockets)socket.disconnect();child.kill();});
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(url+'/api/info',{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}if(child.exitCode!==null)break;await wait(100);}
 assert.ok(ready,'Server did not start: '+output);
 assert.equal((await fetch(url+'/api/students')).status,403);
 assert.equal((await fetch(url+'/api/reset',{method:'POST'})).status,403);
 async function connect(){const socket=io(url,{forceNew:true,reconnection:false,autoConnect:false,transports:['websocket']});sockets.push(socket);const connected=event(socket,'connect');socket.connect();await connected;return socket;}
 const presenter=await connect(),intruder=await connect(),students=await Promise.all(Array.from({length:N},connect));
 const questions=[
 {id:1,type:'text',question:'Text',body:'First\nSecond',revealMode:'step',options:[],correctAnswer:null},
 {id:2,type:'curve',question:'Curve',options:[],correctAnswer:null,timerSeconds:8},
 {id:3,type:'pointmap',question:'Map',mapGraded:false,options:[],correctAnswer:null,timerSeconds:0},
 {id:4,type:'matching',question:'Match',matchPairs:defaultPairs,matchPoints:100,options:[],correctAnswer:null,timerSeconds:0},
 {id:5,type:'simulation',simKind:'recovery',question:'Simulation',options:[],correctAnswer:null,timerSeconds:0},
 {id:6,...researchTemplate('evidence'),timerSeconds:0,resultsMode:'reveal'},
 {id:7,...brainTemplate(),timerSeconds:0},
 {id:8,type:'wordcloud',question:'Word',options:[],correctAnswer:null,timerSeconds:0},
 {id:9,type:'sequence',question:'Next event?',options:['A','B'],correctAnswer:1,beforePreset:'crh',afterPreset:'acth',timerSeconds:0},
 {id:10,type:'mcq',question:'Question',options:['A','B','C','D','E','F'],correctAnswer:5,timerSeconds:0},
 {id:11,type:'simulation',simKind:'recovery',simMode:'explore',question:'Private exploration',options:[],correctAnswer:null,timerSeconds:90},
 {id:12,type:'wordcloud',wordcloudMode:'open',question:'Open responses',options:[],correctAnswer:null,timerSeconds:0}
 ];
 const created=await ack(presenter,'create_session',{trainerName:'Synthetic presenter',customQuestions:questions,timerDuration:0,speedBonusEnabled:false});
 assert.ok(created.success,created.error);const sessionCode=created.sessionCode;
 const joined=await Promise.all(students.map(socket=>ack(socket,'join_session',{sessionCode})));for(const r of joined){assert.ok(r.success,r.error);assert.equal(r.participant.phone,'');}
 assert.equal(new Set(joined.map(r=>r.participant.id)).size,N);
 if(N===30){const overflow=await connect();const refused=await ack(overflow,'join_session',{sessionCode});assert.equal(refused.success,false);assert.equal(refused.error,'Session is full.');}
 assert.equal(new Set(joined.map(r=>r.participant.name)).size,N);
 assert.equal((await ack(intruder,'get_session_state',{sessionCode,role:'trainer'})).success,false);
 assert.equal((await ack(intruder,'reconnect_trainer',{sessionCode})).success,false);
 assert.equal((await ack(intruder,'get_session_state',{sessionCode,role:'participant'})).success,false);
 const started=event(presenter,'trainer_question',q=>q.index===0);presenter.emit('start_quiz',{sessionCode});await started;
 const first=event(students[0],'text_reveal_updated');presenter.emit('reveal_text_line',{sessionCode,questionIndex:0});assert.deepEqual((await first).visibleLines,['First']);
 const second=event(students[0],'text_reveal_updated');presenter.emit('next_question',{sessionCode});assert.deepEqual((await second).visibleLines,['First','Second']);
 async function advance(index){const arrived=event(presenter,'trainer_question',q=>q.index===index);presenter.emit('next_question',{sessionCode});await arrived;}
 async function reveal(index){const e=event(presenter,'answer_revealed',r=>r.questionIndex===index);presenter.emit('reveal_answer',{sessionCode});return e;}
 async function spatial(index,response){const a=await Promise.all(students.map(socket=>ack(socket,'submit_spatial',{sessionCode,questionIndex:index,response})));assert.ok(a.every(r=>r.success),JSON.stringify(a.filter(r=>!r.success)));}
 const participantLeaks=[];students[0].on('live_results',x=>participantLeaks.push(x));
 await advance(1);
 const liveCurve=event(presenter,'live_results',r=>r.questionIndex===1&&r.data.curves.length===N);
 const auto=event(presenter,'answer_revealed',r=>r.questionIndex===1);
 const curve=[[0,.1],[.5,.9],[1,.2]];
 assert.ok((await Promise.all(students.map(s=>ack(s,'submit_curve',{sessionCode,questionIndex:1,points:curve})))).every(r=>r.success));
 assert.equal((await ack(students[0],'submit_curve',{sessionCode,questionIndex:1,points:curve})).success,false);
 assert.equal((await liveCurve).data.curves.length,N);
 const curves=(await auto).curves;assert.equal(curves.length,N);assert.equal(new Set(curves.map(c=>c.color)).size,N);
 await advance(2);const liveMap=event(presenter,'live_results',r=>r.questionIndex===2&&r.data.mapResults.length===N);await spatial(2,[.5,.5]);const m=(await liveMap).data;assert.equal(m.mapTarget,undefined);assert.equal(m.mapResults[0].isCorrect,undefined);assert.ok((await reveal(2)).mapResults.every(r=>r.pointsEarned===0));
 await advance(3);const liveMatch=event(presenter,'live_results',r=>r.questionIndex===3&&r.data.matchResults.length===N);await spatial(3,matchKey(questions[3]));assert.equal((await liveMatch).data.matchKey,undefined);assert.ok((await reveal(3)).matchResults.every(r=>r.pointsEarned===100));
 await advance(4);const liveSim=event(presenter,'live_results',r=>r.questionIndex===4&&r.data.simulationResults.length===N);await spatial(4,defaultResponse('recovery'));assert.equal((await liveSim).data.simulationResults.length,N);assert.equal((await reveal(4)).simulationResults.length,N);
 await advance(5);let hiddenLeaks=0;const detectHidden=r=>{if(r.questionIndex===5)hiddenLeaks++;};presenter.on('live_results',detectHidden);await spatial(5,{answers:[0,1,0],confidence:[80,80,80]});assert.equal((await ack(presenter,'get_session_state',{sessionCode})).liveResults,null);assert.equal(hiddenLeaks,0);presenter.off('live_results',detectHidden);assert.ok((await reveal(5)).researchResults.every(r=>r.pointsEarned===100));
 await advance(6);const liveBrain=event(presenter,'live_results',r=>r.questionIndex===6&&r.data.brainResults.length===N);const pre=(await ack(students[0],'get_session_state',{sessionCode}));assert.equal(pre.brainFeedback,undefined);assert.equal(pre.currentQuestion.brainTargets,undefined);const wrong=await ack(students[0],'submit_spatial',{sessionCode,questionIndex:6,response:{nodeId:10,point:[0,0,0]}});assert.equal(wrong.brainFeedback.isCorrect,false);assert.equal(wrong.brainFeedback.response.nodeId,10);assert.ok(wrong.brainFeedback.brainTargets.includes(questions[6].brainTargets[0]));assert.equal((await ack(students[0],'get_session_state',{sessionCode})).brainFeedback.response.nodeId,10);assert.equal((await ack(students[1],'get_session_state',{sessionCode})).brainFeedback,undefined);const hits=await Promise.all(students.slice(1).map(s=>ack(s,'submit_spatial',{sessionCode,questionIndex:6,response:{nodeId:questions[6].brainTargets[0],point:[0,0,0]}})));assert.ok(hits.every(x=>x.brainFeedback.isCorrect));assert.equal((await liveBrain).data.brainTargets,undefined);assert.equal((await reveal(6)).brainResults.filter(r=>r.pointsEarned===100).length,N-1);
 await advance(7);
 const cloud=event(presenter,'live_results',r=>r.questionIndex===7&&r.data.words.length===N);
 assert.ok((await Promise.all(students.map((s,i)=>ack(s,'submit_word_cloud',{sessionCode,questionIndex:7,word:i%2?'stress':'recovery'})))).every(r=>r.success));
 assert.equal((await cloud).data.words.length,N);
 assert.equal((await ack(students[0],'submit_word_cloud',{sessionCode,questionIndex:7,word:'X'.repeat(36)})).success,false);
 assert.ok((await ack(students[0],'submit_word_cloud',{sessionCode,questionIndex:7,word:'coping'})).success);
 const wc=await reveal(7);assert.equal(wc.wordCloudWords.length,N+1);assert.equal(wc.wordCloudWords.filter(w=>w==='stress').length,N/2|0);assert.equal(wc.answeredCount,N);
 await advance(8);
 const state=await ack(students[0],'get_session_state',{sessionCode});assert.equal(state.currentQuestion.afterPreset,undefined);assert.equal(state.analytics,undefined);
 const thumbs=event(presenter,'thumbs_updated');students[0].emit('send_reaction',{sessionCode,emoji:'👍'});assert.equal((await thumbs).up,1);
 async function answer(index,selectedOption){const a=await Promise.all(students.map(s=>ack(s,'submit_answer',{sessionCode,questionIndex:index,selectedOption})));assert.ok(a.every(r=>r.success&&r.pointsEarned===undefined));}
 const liveChoice=event(presenter,'live_results',r=>r.questionIndex===8&&r.data.optionDist[1].count===N);await answer(8,1);assert.equal((await liveChoice).data.correctAnswer,undefined);assert.equal((await reveal(8)).afterPreset,'acth');
 await advance(9);
 assert.equal((await ack(intruder,'submit_answer',{sessionCode,questionIndex:9,selectedOption:5})).success,false);
 const before=await ack(students[0],'get_session_state',{sessionCode});assert.equal(before.currentQuestion.correctAnswer,undefined);assert.equal(before.analytics,undefined);
 await answer(9,5);
 const restored=await connect();const rr=await ack(restored,'get_session_state',{sessionCode,participantToken:joined[0].participantToken});assert.equal(rr.participant.id,joined[0].participant.id);assert.equal(rr.isAnswerSubmitted,true);assert.equal(rr.lastAnswerResult,undefined);
 const privateResult=event(restored,'private_answer_result',r=>r.questionIndex===9);await reveal(9);assert.equal((await privateResult).pointsEarned,100);
 await advance(10);const privateState=await ack(restored,'get_session_state',{sessionCode});assert.equal(privateState.currentQuestion.simMode,'explore');assert.equal(privateState.activeDuration,0);assert.equal((await ack(restored,'submit_spatial',{sessionCode,questionIndex:10,response:defaultResponse('recovery')})).success,false);
 await advance(11);
 const openState=await ack(students[1],'get_session_state',{sessionCode});assert.equal(openState.currentQuestion.wordcloudMode,'open');
 const sentence='They may be discussing something unrelated to the presentation.';
 const open=event(presenter,'live_results',r=>r.questionIndex===11&&r.data.words.length===N);
 assert.ok((await Promise.all(students.map(s=>ack(s,'submit_word_cloud',{sessionCode,questionIndex:11,word:sentence})))).every(r=>r.success));
 assert.equal((await open).data.words.length,N);assert.equal((await ack(students[1],'submit_word_cloud',{sessionCode,questionIndex:11,word:'X'.repeat(251)})).success,false);
 assert.ok((await ack(students[1],'submit_word_cloud',{sessionCode,questionIndex:11,word:sentence})).success);
 const openResult=await reveal(11);assert.equal(openResult.answeredCount,N);assert.equal(openResult.wordCloudWords.length,N+1);assert.ok(openResult.wordCloudWords.every(w=>w===sentence));
 assert.equal((await ack(students[1],'submit_word_cloud',{sessionCode,questionIndex:11,word:sentence})).success,false);
 const finalTrainer=event(presenter,'quiz_finished'),finalStudent=event(students[1],'quiz_finished');presenter.emit('next_question',{sessionCode});
 const result=await finalTrainer,student=await finalStudent;assert.equal(result.analytics.gradedQuestionCount,5);assert.equal(result.analytics.avgAccuracy,99);assert.equal(student.leaderboard.filter(r=>r.answers).length,1);assert.equal(student.analytics.questionAnalytics,undefined);
 assert.deepEqual(participantLeaks,[]);
 const newPresenter=await connect();const restore=await ack(newPresenter,'get_session_state',{sessionCode,trainerToken:created.trainerToken});assert.equal(restore.isTrainer,true);
});
