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

test('loopback session: 15 participants, all activity families, auth and private results', {timeout:90000}, async t=>{
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
 const presenter=await connect(),intruder=await connect(),students=await Promise.all(Array.from({length:15},connect));
 const questions=[
 {id:1,type:'text',question:'Text',body:'First\nSecond',revealMode:'step',options:[],correctAnswer:null},
 {id:2,type:'curve',question:'Curve',options:[],correctAnswer:null,timerSeconds:4},
 {id:3,type:'pointmap',question:'Map',mapGraded:false,options:[],correctAnswer:null,timerSeconds:0},
 {id:4,type:'matching',question:'Match',matchPairs:defaultPairs,matchPoints:100,options:[],correctAnswer:null,timerSeconds:0},
 {id:5,type:'simulation',simKind:'recovery',question:'Simulation',options:[],correctAnswer:null,timerSeconds:0},
 {id:6,...researchTemplate('evidence'),timerSeconds:0,resultsMode:'reveal'},
 {id:7,...brainTemplate(),timerSeconds:0},
 {id:8,type:'wordcloud',question:'Word',options:[],correctAnswer:null,timerSeconds:0},
 {id:9,type:'sequence',question:'Next event?',options:['A','B'],correctAnswer:1,beforePreset:'crh',afterPreset:'acth',timerSeconds:0},
 {id:10,type:'mcq',question:'Question',options:['A','B','C','D','E','F'],correctAnswer:5,timerSeconds:0}
 ];
 const created=await ack(presenter,'create_session',{trainerName:'Synthetic presenter',customQuestions:questions,timerDuration:0,speedBonusEnabled:false});
 assert.ok(created.success,created.error);const sessionCode=created.sessionCode;
 const joined=[];for(const socket of students){const r=await ack(socket,'join_session',{sessionCode});assert.ok(r.success,r.error);assert.equal(r.participant.phone,'');joined.push(r);}
 assert.equal(new Set(joined.map(r=>r.participant.name)).size,15);
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
 const liveCurve=event(presenter,'live_results',r=>r.questionIndex===1&&r.data.curves.length===15);
 const auto=event(presenter,'answer_revealed',r=>r.questionIndex===1);
 const curve=[[0,.1],[.5,.9],[1,.2]];
 assert.ok((await Promise.all(students.map(s=>ack(s,'submit_curve',{sessionCode,questionIndex:1,points:curve})))).every(r=>r.success));
 assert.equal((await ack(students[0],'submit_curve',{sessionCode,questionIndex:1,points:curve})).success,false);
 assert.equal((await liveCurve).data.curves.length,15);
 const curves=(await auto).curves;assert.equal(curves.length,15);assert.equal(new Set(curves.map(c=>c.color)).size,15);
 await advance(2);const liveMap=event(presenter,'live_results',r=>r.questionIndex===2&&r.data.mapResults.length===15);await spatial(2,[.5,.5]);const m=(await liveMap).data;assert.equal(m.mapTarget,undefined);assert.equal(m.mapResults[0].isCorrect,undefined);assert.ok((await reveal(2)).mapResults.every(r=>r.pointsEarned===0));
 await advance(3);const liveMatch=event(presenter,'live_results',r=>r.questionIndex===3&&r.data.matchResults.length===15);await spatial(3,matchKey(questions[3]));assert.equal((await liveMatch).data.matchKey,undefined);assert.ok((await reveal(3)).matchResults.every(r=>r.pointsEarned===100));
 await advance(4);const liveSim=event(presenter,'live_results',r=>r.questionIndex===4&&r.data.simulationResults.length===15);await spatial(4,defaultResponse('recovery'));assert.equal((await liveSim).data.simulationResults.length,15);assert.equal((await reveal(4)).simulationResults.length,15);
 await advance(5);let hiddenLeaks=0;const detectHidden=r=>{if(r.questionIndex===5)hiddenLeaks++;};presenter.on('live_results',detectHidden);await spatial(5,{answers:[0,1,0],confidence:[80,80,80]});assert.equal((await ack(presenter,'get_session_state',{sessionCode})).liveResults,null);assert.equal(hiddenLeaks,0);presenter.off('live_results',detectHidden);assert.ok((await reveal(5)).researchResults.every(r=>r.pointsEarned===100));
 await advance(6);const liveBrain=event(presenter,'live_results',r=>r.questionIndex===6&&r.data.brainResults.length===15);const pre=(await ack(students[0],'get_session_state',{sessionCode}));assert.equal(pre.brainFeedback,undefined);assert.equal(pre.currentQuestion.brainTargets,undefined);const wrong=await ack(students[0],'submit_spatial',{sessionCode,questionIndex:6,response:{nodeId:10,point:[0,0,0]}});assert.equal(wrong.brainFeedback.isCorrect,false);assert.equal(wrong.brainFeedback.response.nodeId,10);assert.ok(wrong.brainFeedback.brainTargets.includes(questions[6].brainTargets[0]));assert.equal((await ack(students[0],'get_session_state',{sessionCode})).brainFeedback.response.nodeId,10);assert.equal((await ack(students[1],'get_session_state',{sessionCode})).brainFeedback,undefined);const hits=await Promise.all(students.slice(1).map(s=>ack(s,'submit_spatial',{sessionCode,questionIndex:6,response:{nodeId:questions[6].brainTargets[0],point:[0,0,0]}})));assert.ok(hits.every(x=>x.brainFeedback.isCorrect));assert.equal((await liveBrain).data.brainTargets,undefined);assert.equal((await reveal(6)).brainResults.filter(r=>r.pointsEarned===100).length,14);
 await advance(7);
 for(const word of ['stress','recovery']){const liveWord=event(presenter,'live_results',r=>r.questionIndex===7&&r.data.words.includes(word));assert.ok((await ack(students[0],'submit_word_cloud',{sessionCode,questionIndex:7,word})).success);await liveWord;}
 const wc=await reveal(7);assert.deepEqual(wc.wordCloudWords,['stress','recovery']);assert.equal(wc.answeredCount,1);
 await advance(8);
 const state=await ack(students[0],'get_session_state',{sessionCode});assert.equal(state.currentQuestion.afterPreset,undefined);assert.equal(state.analytics,undefined);
 const thumbs=event(presenter,'thumbs_updated');students[0].emit('send_reaction',{sessionCode,emoji:'👍'});assert.equal((await thumbs).up,1);
 async function answer(index,selectedOption){const a=await Promise.all(students.map(s=>ack(s,'submit_answer',{sessionCode,questionIndex:index,selectedOption})));assert.ok(a.every(r=>r.success&&r.pointsEarned===undefined));}
 const liveChoice=event(presenter,'live_results',r=>r.questionIndex===8&&r.data.optionDist[1].count===15);await answer(8,1);assert.equal((await liveChoice).data.correctAnswer,undefined);assert.equal((await reveal(8)).afterPreset,'acth');
 await advance(9);
 assert.equal((await ack(intruder,'submit_answer',{sessionCode,questionIndex:9,selectedOption:5})).success,false);
 const before=await ack(students[0],'get_session_state',{sessionCode});assert.equal(before.currentQuestion.correctAnswer,undefined);assert.equal(before.analytics,undefined);
 await answer(9,5);
 const restored=await connect();const rr=await ack(restored,'get_session_state',{sessionCode,participantToken:joined[0].participantToken});assert.equal(rr.participant.id,joined[0].participant.id);assert.equal(rr.isAnswerSubmitted,true);assert.equal(rr.lastAnswerResult,undefined);
 const privateResult=event(restored,'private_answer_result',r=>r.questionIndex===9);await reveal(9);assert.equal((await privateResult).pointsEarned,100);
 const finalTrainer=event(presenter,'quiz_finished'),finalStudent=event(students[1],'quiz_finished');presenter.emit('next_question',{sessionCode});
 const result=await finalTrainer,student=await finalStudent;assert.equal(result.analytics.gradedQuestionCount,5);assert.equal(result.analytics.avgAccuracy,99);assert.equal(student.leaderboard.filter(r=>r.answers).length,1);assert.equal(student.analytics.questionAnalytics,undefined);
 assert.deepEqual(participantLeaks,[]);
 const newPresenter=await connect();const restore=await ack(newPresenter,'get_session_state',{sessionCode,trainerToken:created.trainerToken});assert.equal(restore.isTrainer,true);
});
