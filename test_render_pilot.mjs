// Synthetic production-configured server on ephemeral CI runner. No Render deployment or real data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {request} from 'node:http';
import {io} from 'socket.io-client';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const origin='https://synthetic-pilot.onrender.com',host=new URL(origin).host,secret=randomBytes(32).toString('hex');
test('production pilot fails closed and only admits authenticated sessions behind canonical HTTPS origin',{timeout:45000},async t=>{
 const port=await freePort(),url='http://127.0.0.1:'+port,headers={Host:host,Origin:origin,'X-Forwarded-Proto':'https'};
 const env={...process.env,NODE_ENV:'production',RENDER:'true',RENDER_EXTERNAL_URL:origin,PORT:String(port),GM_PRESENTER_SECRET:secret,GM_PILOT_ENABLED:'1'};
 delete env.GM_PILOT_TEST;
 for(const patch of [{GM_PILOT_ENABLED:''},{GM_PRESENTER_SECRET:''},{RENDER_EXTERNAL_URL:'http://synthetic-pilot.onrender.com'}]){
  const failed=spawn(process.execPath,['server/index.js'],{env:{...env,...patch},stdio:'ignore'});t.after(()=>failed.kill());const [code]=await once(failed,'exit');assert.notEqual(code,0);
 }
 const server=spawn(process.execPath,['server/index.js'],{env,stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());let output='';server.stderr.on('data',d=>output=(output+d).slice(-2000));
 function http(path,h=headers,method='GET'){return new Promise((resolve,reject)=>{const req=request(url+path,{headers:h,method,timeout:1000},res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',reject);req.end();});}
 let ready=false;for(let i=0;i<80;i++){try{if((await http('/healthz',{Host:host})).status===200){ready=true;break;}}catch{}if(server.exitCode!==null)break;await delay(100);}assert.ok(ready,output);
 assert.equal((await http('/healthz',{Host:host})).body,'ok');
 assert.equal((await http('/api/info',{Host:host})).status,403);
 assert.equal((await http('/api/info',{...headers,Origin:'https://evil.invalid'})).status,403);
 assert.equal((await http('/api/info',{...headers,Host:'evil.invalid'})).status,403);
 const info=await http('/api/info');assert.equal(info.status,200);assert.equal(JSON.parse(info.body).joinUrl,origin);assert.ok(info.headers['strict-transport-security']);assert.equal(info.headers['cache-control'],'no-store');
 assert.equal((await http('/api/reset',headers,'POST')).status,403);assert.equal((await http('/api/students')).status,403);assert.equal((await http('/api/questions')).status,403);
 assert.equal((await http('/')).status,200);
 const sockets=[];t.after(()=>sockets.forEach(s=>s.disconnect()));
 async function connect(extra=headers,expected='connect'){const s=io(url,{forceNew:true,reconnection:false,autoConnect:false,transports:['websocket'],extraHeaders:extra,timeout:5000});sockets.push(s);const ready=once(s,expected);s.connect();await ready;return s;}
 await connect({...headers,Origin:'https://evil.invalid'},'connect_error');await connect({...headers,'X-Forwarded-Proto':'http'},'connect_error');
 const presenter=await connect(),guest=await connect(),phones=await Promise.all(Array.from({length:30},()=>connect()));
 const ack=(s,event,data)=>s.timeout(8000).emitWithAck(event,data);
 const qs=[{id:1,type:'mcq',question:'Synthetic question',options:['Wrong','Right'],correctAnswer:1,timerSeconds:0,scoringMode:'simple'},{id:2,type:'mcq',question:'Second synthetic question',options:['Wrong','Right'],correctAnswer:1,timerSeconds:0,scoringMode:'simple'},{id:3,type:'text',question:'End',body:'Thank you.',options:[],correctAnswer:null,scoringMode:'simple'}];
 assert.equal((await ack(guest,'create_session',{customQuestions:qs,presenterSecret:'wrong'})).success,false);
 const created=await ack(presenter,'create_session',{customQuestions:qs,presenterSecret:secret,timerDuration:0});assert.ok(created.success,created.error);assert.equal(created.joinUrl,origin);
 const {sessionCode,inviteToken}=created;assert.equal((await ack(guest,'join_session',{sessionCode,nickname:'Guest'})).success,false);
 const joined=await Promise.all(phones.map((s,i)=>ack(s,'join_session',{sessionCode,nickname:'Tester '+i,inviteToken})));assert.ok(joined.every(r=>r.success));assert.equal(new Set(joined.map(r=>r.participant.id)).size,30);
 assert.ok(joined.every(r=>!('inviteToken'in r)&&!('trainerToken'in r)));assert.equal((await ack(guest,'get_session_state',{sessionCode})).success,false);
 const started=once(phones[0],'participant_question');presenter.emit('start_quiz',{sessionCode});const [q]=await started;assert.equal(q.correctAnswer,undefined);
 const submissions=await Promise.all(phones.map(s=>ack(s,'submit_answer',{sessionCode,questionIndex:0,selectedOption:1})));assert.ok(submissions.every(r=>r.success));
 const revealed=once(phones[0],'answer_revealed');presenter.emit('reveal_answer',{sessionCode});await revealed;
 const state=await ack(phones[0],'get_session_state',{sessionCode});assert.equal(state.participant.score,1);assert.equal(state.scorecard[0].points,1);assert.equal(state.inviteToken,undefined);
 assert.ok(!(await ack(guest,'join_session',{sessionCode,inviteToken,nickname:'Late guest'})).success);
 const arrived=once(phones[0],'participant_question');presenter.emit('next_question',{sessionCode,advance:true});await arrived;assert.ok((await Promise.all(phones.map(s=>ack(s,'submit_answer',{sessionCode,questionIndex:1,selectedOption:1})))).every(r=>r.success));let accidentalReveal=0;phones[0].on('answer_revealed',()=>accidentalReveal++);const next=once(phones[0],'participant_question');presenter.emit('next_question',{sessionCode,advance:true});const [end]=await next;assert.equal(end.index,2);assert.equal(accidentalReveal,0);assert.equal((await ack(phones[0],'get_session_state',{sessionCode})).participant.score,2);
 console.log('Verified restricted production startup, proxy policy and 30 authenticated clients using synthetic data, including silent scoring on skip.');
});
