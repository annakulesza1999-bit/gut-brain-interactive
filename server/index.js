import {randomBytes} from 'node:crypto';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { curveIdentity, normalizeCurve, publicActivity, safeMedia, timerSeconds, activityDuration, textLines, initialTextCount, reactionSummary } from '../src/activities.js';

import {normalizePoint,scoreMap,normalizeMatch,scoreMatch,matchKey,validPairs,validTarget} from '../src/spatialActivities.js';

import {SIM_KINDS,normalizeSimulation,simulationConfig} from '../src/simulations.js';

import {normalizeResearch,normalizeResearchResponse,scoreResearch,revealResearch,researchProblem} from '../src/researchActivities.js';

import {normalizeBrain,normalizeBrainHit,brainProblem,scoreBrain,brainReveal} from '../src/anatomyActivities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary production guard until inherited access-control and privacy issues are fixed.
if(process.env.NODE_ENV==='production')throw new Error('Public deployment blocked: security hardening is incomplete. See SECURITY-REVIEW.md.');

const token=()=>randomBytes(32).toString('hex');
const matchesToken=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===64&&a===b;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 8 * 1024 * 1024,
  allowRequest: (req,done)=>{const origin=req.headers.origin;done(null,!origin||/^http:\/\/(localhost|127\.0\.0\.1):(3000|5173|[1-9][0-9]{3,4})$/.test(origin));}
});

const PORT = process.env.PORT || 3000;

app.use((req,res,next)=>{
  if(!['localhost','127.0.0.1'].includes(req.hostname))return res.status(403).json({error:'Local preview only'});
  if(req.headers.origin&&!/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(req.headers.origin))return res.status(403).json({error:'Local preview only'});
  next();
});
app.use(express.json({ limit: '10mb' }));

// Helper to detect local LAN IP
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = '127.0.0.1';

// Load initial questions
let defaultQuestions = [];
try {
  const questionsPath = path.join(__dirname, '../public/questions.json');
  if (fs.existsSync(questionsPath)) {
    defaultQuestions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  } else {
    const srcQuestionsPath = path.join(__dirname, '../src/data/questions.json');
    if (fs.existsSync(srcQuestionsPath)) {
      defaultQuestions = JSON.parse(fs.readFileSync(srcQuestionsPath, 'utf8'));
    }
  }
} catch (e) {
  console.error('Error loading default questions:', e);
}

// In-Memory Sessions Store (live running sessions)
const sessions = new Map();
const publicParticipant=p=>({id:p.id,name:p.name,phone:'',score:p.score,rank:p.currentRank,currentRank:p.currentRank,previousRank:p.previousRank,rankDelta:p.rankDelta,connected:p.connected});
const publicLeaderboard=(session,ownId=null)=>[...session.participants].sort((a,b)=>b.score-a.score).map(p=>({...publicParticipant(p),...(p.id===ownId?{answers:p.answers}:{} )}));
const participantFor=(session,socket)=>session?.participants.find(p=>p.socketId===socket.id&&p.connected);
function attachSocket(session,person,socket){
 const oldId=person?person.socketId:session.trainerSocketId;
 if(oldId&&oldId!==socket.id)io.sockets?.sockets?.get(oldId)?.leave(session.code);
 if(person){person.socketId=socket.id;person.connected=true;}else session.trainerSocketId=socket.id;
 socket.join(session.code);
}
function gradedQuestion(q){
 if(['curve','wordcloud','text','simulation'].includes(q.type))return false;
 if(q.type==='pointmap')return !!q.mapGraded;
 if(q.type==='research')return !!q.researchGraded;
 if(q.type==='brain')return !!q.brainGraded;
 return true;
}
function completionCount(session, index=session.currentQuestionIndex) {
 const q=session.questions[index];
 if(q?.type==='text')return 0;
 if(['pointmap','matching','simulation','research','brain'].includes(q?.type))return (session.spatialSubmissions?.[index]||[]).length;
 if(q?.type==='curve')return (session.curveSubmissions?.[index]||[]).length;
 if(q?.type==='wordcloud')return new Set((session.wordCloudSubmissions?.[index]||[]).map(x=>x.participantId).filter(Boolean)).size;
 return session.participants.filter(p=>p.answers[index]!==undefined).length;
}
function completionPayload(session) {return {questionIndex:session.currentQuestionIndex,answeredCount:completionCount(session),totalParticipants:session.participants.length};}
function textState(session){const q=session.questions[session.currentQuestionIndex];return {questionIndex:session.currentQuestionIndex,visibleLines:textLines(q).slice(0,session.textVisible||0),textTotal:textLines(q).length};}
function broadcastText(session){io.to(session.code).emit('text_reveal_updated',textState(session));}
function thumbsState(session){return {questionIndex:session.currentQuestionIndex,...reactionSummary(session.thumbVotes)};}
function spatialResults(session,index=session.currentQuestionIndex){const q=session.questions[index];if(!['pointmap','matching','simulation','research','brain'].includes(q?.type))return {};const entries=session.spatialSubmissions?.[index]||[];if(q.type==='brain')return {...brainReveal(q),brainResults:entries.map(({participantId,label,color,response,isCorrect,pointsEarned})=>({label,color,response,isCorrect,pointsEarned}))};if(q.type==='research')return {...revealResearch(q),researchResults:entries.map(({participantId,label,color,response,pointsEarned,correctCount,total,isCorrect})=>({label,color,response,pointsEarned,correctCount,total,isCorrect}))};if(q.type==='simulation')return {simulationResults:entries.map(({participantId,label,color,response})=>({label,color,response}))};return q.type==='pointmap'?{mapResults:entries.map(({participantId,...r})=>r),mapTarget:q.mapGraded?q.mapTarget:undefined,mapRadius:q.mapGraded?q.mapRadius:undefined}:{matchResults:entries.map(({participantId,...r})=>r),matchKey:matchKey(q)};}
function liveSnapshot(session){
 const i=session.currentQuestionIndex,q=session.questions[i];if(!q||q.resultsMode==='reveal'||q.type==='text')return null;
 const fields={pointmap:['mapResults','point'],matching:['matchResults','selection'],simulation:['simulationResults','response'],research:['researchResults','response'],brain:['brainResults','response']};
 if(q.type==='curve')return {curves:(session.curveSubmissions?.[i]||[]).map(({label,color,points})=>({label,color,points}))};
 if(q.type==='wordcloud')return {words:(session.wordCloudSubmissions?.[i]||[]).map(({text})=>text)};
 if(fields[q.type]){const [key,field]=fields[q.type];return {[key]:(session.spatialSubmissions?.[i]||[]).map(e=>({label:e.label,color:e.color,[field]:e[field]}))};}
 const n=completionCount(session,i);return {optionDist:(q.options||[]).map((_,j)=>{const count=session.participants.filter(p=>p.answers[i]?.selectedOption===j).length;return {count,pct:n?Math.round(count/n*100):0};})};
}
function publishLive(session){const data=liveSnapshot(session);if(data&&session.trainerSocketId)io.to(session.trainerSocketId).emit('live_results',{questionIndex:session.currentQuestionIndex,data});}
function resetActivityUI(session){session.textVisible=initialTextCount(session.questions[session.currentQuestionIndex]);session.thumbVotes={};}


// Helper to calculate scores, rankings and deltas
function updateSessionRankings(session) {
  const sorted = [...session.participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTimes = Object.values(a.answers).map(ans => ans.responseTimeMs || 30000);
    const bTimes = Object.values(b.answers).map(ans => ans.responseTimeMs || 30000);
    const aAvg = aTimes.length ? aTimes.reduce((s, v) => s + v, 0) / aTimes.length : 999999;
    const bAvg = bTimes.length ? bTimes.reduce((s, v) => s + v, 0) / bTimes.length : 999999;
    return aAvg - bAvg;
  });

  sorted.forEach((participant, idx) => {
    const newRank = idx + 1;
    participant.previousRank = participant.currentRank || newRank;
    participant.currentRank = newRank;
    participant.rankDelta = participant.previousRank - newRank;
  });
}

// Helper to compute session analytics
function calculateSessionAnalytics(session) {
  const totalQuestions = session.questions.length;
  const totalParticipants = session.participants.length;

  const questionAnalytics = session.questions.map((q, qIndex) => {
    let answeredCount = 0;
    let correctCount = 0;
    const optionCounts = Array.from({length: Math.max(4, q.options?.length || 0)}, () => 0);
    let totalResponseTime = 0;

    session.participants.forEach(p => {
      const ans = p.answers[qIndex];
      if (ans && ((ans.selectedOption !== null && ans.selectedOption !== undefined)||ans.spatial===true)) {
        answeredCount++;
        if (Number.isInteger(ans.selectedOption) && ans.selectedOption >= 0 && ans.selectedOption < optionCounts.length) {
          optionCounts[ans.selectedOption]++;
        }
        if (ans.isCorrect) correctCount++;
        totalResponseTime += (ans.responseTimeMs || 0);
      }
    });

    if (['curve','wordcloud','text','pointmap','matching','simulation','research','brain'].includes(q.type)) answeredCount = completionCount(session,qIndex);
    const notAnsweredCount = totalParticipants - answeredCount;
    const graded=gradedQuestion(q);
    const accuracyPct = graded&&totalParticipants>0 ? Math.round((correctCount / totalParticipants) * 100) : null;
    const avgResponseTimeMs = answeredCount > 0 ? Math.round(totalResponseTime / answeredCount) : 0;

    const optionDist = optionCounts.map(count => ({
      count,
      pct: totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0
    }));

    return {
      questionId: q.id,
      questionIndex: qIndex,
      question: q.question,
      category: q.category || 'General',
      difficulty: q.difficulty || 'Medium',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      totalParticipants,
      answeredCount,
      notAnsweredCount,
      correctCount,
      incorrectCount: (['curve','wordcloud','text','simulation'].includes(q.type)||(q.type==='pointmap'&&!q.mapGraded)||(q.type==='research'&&!q.researchGraded)||(q.type==='brain'&&!q.brainGraded)) ? 0 : answeredCount - correctCount,
      type: q.type || 'mcq',
      graded,
      accuracyPct,
      avgResponseTimeMs,
      optionCounts,
      optionDist
    };
  });

  // Category analytics
  const categoriesMap = {};
  questionAnalytics.filter(qa=>qa.graded).forEach(qa => {
    const cat = qa.category || 'General';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = {
        category: cat,
        totalQuestions: 0,
        totalAttempts: 0,
        totalCorrect: 0
      };
    }
    categoriesMap[cat].totalQuestions++;
    categoriesMap[cat].totalAttempts += qa.totalParticipants;
    categoriesMap[cat].totalCorrect += qa.correctCount;
  });

  const categoryAnalytics = Object.values(categoriesMap).map(cat => ({
    category: cat.category,
    totalQuestions: cat.totalQuestions,
    accuracyPct: cat.totalAttempts > 0 ? Math.round((cat.totalCorrect / cat.totalAttempts) * 100) : 0
  })).sort((a, b) => a.accuracyPct - b.accuracyPct);

  // Summary Metrics
  const scores = session.participants.map(p => p.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  const gradedQuestionCount=session.questions.filter(gradedQuestion).length;
  const totalPossibleAnswers = totalParticipants * gradedQuestionCount;
  let totalCorrectOverall = 0;
  session.participants.forEach(p => {
    Object.values(p.answers).forEach(a => {
      if (a.isCorrect) totalCorrectOverall++;
    });
  });
  const avgAccuracy = totalPossibleAnswers > 0 ? Math.round((totalCorrectOverall / totalPossibleAnswers) * 100) : null;

  return {
    totalQuestions,
    gradedQuestionCount,
    totalParticipants,
    avgScore,
    maxScore,
    minScore,
    avgAccuracy,
    questionAnalytics,
    categoryAnalytics,
    leaderboard: session.participants.map(p => ({
      id: p.id,
      studentId: p.studentId,
      phone: p.phone,
      name: p.name,
      score: p.score,
      currentRank: p.currentRank,
      previousRank: p.previousRank,
      rankDelta: p.rankDelta,
      connected: p.connected,
      answersCount: Object.keys(p.answers).length,
      answers: p.answers
    }))
  };
}

// REST API Endpoints
// Disable inherited profile and administrative APIs during the local preview.
app.use('/api',(req,res,next)=>{
 if(req.method==='GET'&&req.path==='/info')return next();
 if(req.method==='GET'&&req.path==='/trainers')return res.json({success:true,trainers:[]});
 if(req.method==='GET'&&req.path==='/active-sessions')return res.json({success:true,sessions:[]});
 return res.status(403).json({success:false,error:'Legacy data API disabled in local preview'});
});
app.get('/api/info', (req, res) => {
  res.json({
    status: 'ok',
    serverIp: localIp,
    port: PORT,
    activeSessions: sessions.size,
    joinUrl: `http://${localIp}:${PORT}`
  });
});

app.get('/api/questions', (req, res) => {
  res.json(defaultQuestions);
});

app.post('/api/questions', (req, res) => {
  try {
    const { questions } = req.body;
    if (Array.isArray(questions) && questions.length > 0) {
      defaultQuestions = questions;
      res.json({ success: true, count: questions.length });
    } else {
      res.status(400).json({ error: 'Invalid questions array' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trainer Profile & Active Sessions Endpoints
app.get('/api/trainers', (req, res) => {
  res.json({ success: true, trainers: db.getAllTrainers() });
});

app.delete('/api/trainers/:id', (req, res) => {
  const deleted = db.deleteTrainer(req.params.id);
  res.json({ success: deleted, trainers: db.getAllTrainers() });
});

app.get('/api/active-sessions', (req, res) => {
  const active = [];
  sessions.forEach((s) => {
    active.push({
      code: s.code,
      trainerName: s.trainerName,
      status: s.status,
      participantsCount: s.participants ? s.participants.length : 0,
      currentQuestionIndex: s.currentQuestionIndex || 0,
      totalQuestions: s.questions ? s.questions.length : 20,
      timerDuration: s.timerDuration || 30,
      showTopic: s.showTopic || false,
      speedBonusEnabled: s.speedBonusEnabled !== undefined ? s.speedBonusEnabled : true
    });
  });
  res.json({ success: true, sessions: active });
});

// Student Profile Endpoints
app.get('/api/students', (req, res) => {
  res.json(db.getAllStudents());
});

app.get('/api/student/:phoneOrId', (req, res) => {
  const profile = db.getStudentFullProfile(req.params.phoneOrId);
  if (!profile) {
    return res.status(404).json({ error: 'Student profile not found' });
  }
  res.json(profile);
});

app.put('/api/student/:phoneOrId', (req, res) => {
  const updated = db.updateStudentProfile(req.params.phoneOrId, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Also update live sessions if participant is currently active
  sessions.forEach(session => {
    const p = session.participants.find(x => x.phone === updated.phone || x.studentId === updated.id);
    if (p) {
      if (req.body.name) p.name = req.body.name.trim();
      io.to(session.code).emit('participants_updated', {
        participants: session.participants.map(item => ({ id: item.id, name: item.name, score: item.score, rank: item.currentRank, phone: item.phone, connected: item.connected })),
        count: session.participants.length
      });
    }
  });

  res.json({ success: true, student: updated });
});

// Clear all active sessions (Reset DB)
app.post('/api/reset', (req, res) => {
  sessions.forEach(s => {
    if (s.timerInterval) clearInterval(s.timerInterval);
  });
  sessions.clear();
  io.emit('sessions_cleared');
  console.log('[DB Reset] All active live quiz sessions cleared.');
  res.json({ success: true, message: 'All live quiz sessions cleared successfully.' });
});

// Socket.io Real-time Event Handling
io.on('connection', (socket) => {

  // Trainer creates a session
  socket.on('create_session', ({ trainerName, sessionCode, timerDuration = 30, speedBonusEnabled = true, showTopic = false, customQuestions = null }, callback) => {
    try {
      const code = (typeof sessionCode==='string'&&sessionCode?sessionCode:'GM-'+randomBytes(3).toString('hex')).toUpperCase().trim();
      if(!/^[A-Z0-9-]{4,12}$/.test(code)||sessions.has(code)||sessions.size>=30)return callback&&callback({success:false,error:'Session code unavailable or local session limit reached.'});
      const questionSet = ((customQuestions && customQuestions.length > 0) ? customQuestions : defaultQuestions).map(q => ({...q, beforeMedia: safeMedia(q.beforeMedia), afterMedia: safeMedia(q.afterMedia),mapImage:safeMedia(q.mapImage),...(q.type==='simulation'?simulationConfig(q):{}),...(q.type==='research'?normalizeResearch(q):{})}));
      if(questionSet.some(q=>q.type==='brain'&&brainProblem(q)))return callback&&callback({success:false,error:'Check anatomy activity settings before presenting.'});
      for(const q of questionSet)if(q.type==='brain')Object.assign(q,normalizeBrain(q));
      if(questionSet.some(q=>q.type==='research'&&researchProblem(q)))return callback&&callback({success:false,error:'Check research activity settings before presenting.'});

      const newSession = {
        code,
        trainerName: trainerName || 'Trainer',
        trainerSocketId: socket.id,
        trainerToken:token(),
        status: 'ready',
        timerDuration: timerSeconds(timerDuration),
        speedBonusEnabled: Boolean(speedBonusEnabled),
        showTopic: Boolean(showTopic),
        currentQuestionIndex: 0,
        questionState: 'active',
        questionStartTime: null,
        timeRemaining: timerSeconds(timerDuration),
        timerInterval: null,
        questions: questionSet,
        participants: [],
        completedQuestions: [],
        qaQuestions: [],
        wordCloudSubmissions: {},
        curveSubmissions: {},
        spatialSubmissions:{},
        textVisible:0,
        thumbVotes:{}
      };

      sessions.set(code, newSession);
      socket.join(code);

      // Local preview: do not persist presenter or participant identities.

      console.log(`[Session Created] Code: ${code} by ${newSession.trainerName} with ${questionSet.length} questions (ShowTopic: ${newSession.showTopic})`);

      if (callback) {
        callback({
          success: true,
          sessionCode: code,
          trainerToken:newSession.trainerToken,
          localIp,
          port: PORT,
          joinUrl: `http://${localIp}:${PORT}`,
          session: {
            code,
            trainerName: newSession.trainerName,
            status: newSession.status,
            timerDuration: newSession.timerDuration,
            speedBonusEnabled: newSession.speedBonusEnabled,
            showTopic: newSession.showTopic,
            totalQuestions: newSession.questions.length,
            participantsCount: 0,
            participants: []
          }
        });
      }
    } catch (e) {
      if (callback) callback({ success: false, error: e.message });
    }
  });

  // Trainer reconnects to an existing active session
  socket.on('reconnect_trainer', ({ sessionCode, trainerName, trainerToken }, callback) => {
    try {
      const code = (sessionCode || '').toUpperCase().trim();
      const session = sessions.get(code);
      if (!session) {
        return callback && callback({ success: false, error: 'Session not found or is no longer active.' });
      }

      if(session.trainerSocketId!==socket.id&&!matchesToken(session.trainerToken,trainerToken))return callback&&callback({success:false,error:'Presenter authentication required.'});
      attachSocket(session,null,socket);

      console.log(`[Trainer Reconnected] Session ${code} reconnected by trainer: ${session.trainerName}`);

      const analytics = calculateSessionAnalytics(session);
      const currQ = session.questions[session.currentQuestionIndex];

      let answeredCount = 0;
      session.participants.forEach(p => {
        // Completion is calculated below by activity type.
      });

      const participantList = session.participants.map(p => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        score: p.score,
        rank: p.currentRank,
        connected: p.connected
      }));

      const payload = {
        success: true,
        sessionCode: code,
        trainerName: session.trainerName,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        questionState: session.questionState,
        timeRemaining: session.timeRemaining,
        timerDuration: session.timerDuration,
        activeDuration: activityDuration(session.questions[session.currentQuestionIndex],session.timerDuration),
        activityUI: {textVisible:session.textVisible||0,thumbs:thumbsState(session)},
        speedBonusEnabled: session.speedBonusEnabled,
        showTopic: session.showTopic !== undefined ? session.showTopic : false,
        totalQuestions: session.questions.length,
        participantsCount: session.participants.length,
        participants: participantList,
        completedQuestions: session.completedQuestions,
        currentQuestion: currQ ? { index: session.currentQuestionIndex, total: session.questions.length, ...currQ } : null,
        liveAnswerCount: {
          answeredCount: completionCount(session),
          totalParticipants: session.participants.length
        },
        liveResults:liveSnapshot(session),
        analytics
      };

      if (currQ && session.questionState === 'revealed') {
        const qa=analytics.questionAnalytics[session.currentQuestionIndex];
        payload.revealData={...qa,...spatialResults(session),curves:currQ.type==='curve'?(session.curveSubmissions?.[session.currentQuestionIndex]||[]).map(({participantId,...curve})=>curve):undefined,afterMedia:currQ.afterMedia,afterPreset:currQ.afterPreset,leaderboard:publicLeaderboard(session).slice(0,10)};
      }
      if (callback) callback(payload);
    } catch (e) {
      if (callback) callback({ success: false, error: e.message });
    }
  });

  // Trainer toggles topic / category visibility live
  socket.on('toggle_topic_visibility', ({ sessionCode }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) {
      if (callback) callback({ success: false, error: 'Session not found' });
      return;
    }

    session.showTopic = !session.showTopic;
    console.log(`[Topic Toggle] Session ${sessionCode} showTopic is now: ${session.showTopic}`);

    io.to(session.code).emit('topic_visibility_changed', {
      showTopic: session.showTopic
    });

    if (callback) {
      callback({ success: true, showTopic: session.showTopic });
    }
  });

  // Anonymous per-session identities. No student accounts, real names or phone numbers.
  socket.on('join_session', ({sessionCode,participantToken}={},callback)=>{
    const reply=typeof callback==='function'?callback:()=>{};
    if(typeof sessionCode!=='string')return reply({success:false,error:'Enter a session code.'});
    const code=sessionCode.toUpperCase().trim(),session=sessions.get(code);
    if(!session)return reply({success:false,error:'Session not found.'});
    let p=participantFor(session,socket);
    if(!p&&participantToken)p=session.participants.find(x=>matchesToken(x.token,participantToken));
    if(!p&&participantToken)return reply({success:false,error:'This saved participation has expired. Join again.'});
    const resumed=!!p;
    if(!p){
      if(session.participants.length>=30)return reply({success:false,error:'Session is full.'});
      const number=session.participants.length+1;
      p={id:'p-'+randomBytes(12).toString('hex'),token:token(),name:'Participant '+number,phone:'',score:0,previousRank:number,currentRank:number,rankDelta:0,connected:true,socketId:socket.id,answers:{}};
      session.participants.push(p);
    }
    attachSocket(session,p,socket);
    updateSessionRankings(session);
    const participantList=session.participants.map(publicParticipant);
    io.to(code).emit('participants_updated',{participants:participantList,count:participantList.length});
    const q=session.questions[session.currentQuestionIndex],ans=p.answers[session.currentQuestionIndex];
    const submitted=!!ans||['curveSubmissions','spatialSubmissions'].some(k=>(session[k]?.[session.currentQuestionIndex]||[]).some(e=>e.participantId===p.id));
    reply({success:true,resumed,sessionCode:code,participantToken:p.token,participant:publicParticipant(p),sessionStatus:session.status,currentQuestionIndex:session.currentQuestionIndex,currentQuestion:session.status==='ready'?null:{index:session.currentQuestionIndex,total:session.questions.length,id:q.id,question:q.question,options:q.options,category:q.category,difficulty:q.difficulty,...publicActivity(q,session.textVisible)},questionState:session.questionState,timeRemaining:session.timeRemaining,timerDuration:session.timerDuration,activeDuration:activityDuration(q,session.timerDuration),activityUI:{textVisible:session.textVisible||0,thumbs:thumbsState(session)},speedBonusEnabled:session.speedBonusEnabled,totalQuestions:session.questions.length,participants:participantList,selectedOption:ans?.selectedOption??null,isAnswerSubmitted:submitted});
  });

  // Trainer starts the quiz
  socket.on('start_quiz', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;

    session.status = 'running';
    session.currentQuestionIndex = 0;
    session.questionState = 'active';
    session.questionStartTime = Date.now();
    resetActivityUI(session);
    startTimer(session);

    const q = session.questions[0];
    const participantQuestion = {
      index: 0,
      total: session.questions.length,
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      category: q.category,
          ...publicActivity(q,session.textVisible)
    };

    const trainerQuestion = {
      index: 0,
      total: session.questions.length,
      ...q
    };

    io.to(session.code).emit('quiz_started', {
      sessionStatus: 'running',
      currentQuestionIndex: 0,
      totalQuestions: session.questions.length,
      timerDuration: session.timerDuration,
      activeDuration: session.timeRemaining,
      activityUI:{textVisible:session.textVisible||0,thumbs:thumbsState(session)},
      question: participantQuestion
    });

    socket.emit('trainer_question', trainerQuestion);
    io.to(session.code).except(session.trainerSocketId).emit('participant_question', participantQuestion);
  });

  // Timer runner
  function startTimer(session) {
    if (session.timerInterval) clearInterval(session.timerInterval);
    session.timerInterval = null;
    session.timeRemaining = activityDuration(session.questions[session.currentQuestionIndex], session.timerDuration);
    if (session.timeRemaining <= 0) return;

    session.timerInterval = setInterval(() => {
      if (session.status === 'paused') return;

      session.timeRemaining--;
      io.to(session.code).emit('timer_tick', { timeRemaining: session.timeRemaining });

      if (session.timeRemaining <= 0) {
        clearInterval(session.timerInterval);
        session.timerInterval = null;
        autoCloseQuestion(session);
      }
    }, 1000);
  }

  function autoCloseQuestion(session) {
    if(session.questionState==='revealed')return;
    session.questionState = 'revealed';
    const index=session.currentQuestionIndex,q0=session.questions[index];
    if(['pointmap','matching','research','brain'].includes(q0?.type))for(const entry of session.spatialSubmissions?.[index]||[]){const p=session.participants.find(p=>p.id===entry.participantId);if(!p||p.answers[index])continue;const result=q0.type==='pointmap'?scoreMap(q0,entry.point):q0.type==='research'?scoreResearch(q0,entry.response):q0.type==='brain'?scoreBrain(q0,entry.response):scoreMatch(q0,entry.selection);Object.assign(entry,result);p.score+=result.pointsEarned;p.answers[index]={...result,selectedOption:null,spatial:true,responseTimeMs:entry.responseTimeMs};}
    if(['mcq','sequence'].includes(q0?.type||'mcq'))for(const p of session.participants){
      const ans=p.answers[index];if(!ans?.pending)continue;
      const isCorrect=ans.selectedOption===q0.correctAnswer,duration=activityDuration(q0,session.timerDuration),basePoints=isCorrect?100:0;
      const speedBonus=isCorrect&&q0.type!=='sequence'&&session.speedBonusEnabled&&duration>0?Math.round(Math.max(0,1-ans.responseTimeMs/(duration*1000))*50):0;
      Object.assign(ans,{pending:false,isCorrect,basePoints,speedBonus,pointsEarned:basePoints+speedBonus});p.score+=ans.pointsEarned;
    }
    updateSessionRankings(session);
    for(const p of session.participants){const ans=p.answers[index];if(ans&&p.connected)io.to(p.socketId).emit('private_answer_result',{questionIndex:index,...ans,currentScore:p.score});}
    const analytics = calculateSessionAnalytics(session);
    const currQA = analytics.questionAnalytics[session.currentQuestionIndex];
    const q = session.questions[session.currentQuestionIndex];

    io.to(session.code).emit('answer_revealed', {
      questionIndex: session.currentQuestionIndex,
      ...spatialResults(session),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      optionDist: currQA.optionDist,
      curves: q.type === 'curve' ? (session.curveSubmissions?.[session.currentQuestionIndex] || []).map(({participantId,...curve})=>curve) : undefined,
      afterMedia: q.type === 'sequence' ? q.afterMedia : undefined,
      afterPreset: q.type === 'sequence' ? q.afterPreset : undefined,
      answeredCount: currQA.answeredCount,
      notAnsweredCount: currQA.notAnsweredCount,
      correctCount: currQA.correctCount,
      accuracyPct: currQA.accuracyPct,
      leaderboard: publicLeaderboard(session).slice(0,10)
    });
  }

  // Participant submits an answer
  socket.on('submit_answer', ({ sessionCode, participantName, participantPhone, questionIndex, selectedOption, responseTimeMs }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session) return callback && callback({ success: false, error: 'Session not found' });

    if (session.status!=='running'||session.questionState !== 'active') {
      return callback && callback({ success: false, error: 'Question is already closed.' });
    }

    const participant = participantFor(session,socket);
    if (!participant) return callback && callback({ success: false, error: 'Participant not found' });

    if (participant.answers[questionIndex] !== undefined) {
      return callback && callback({ success: false, error: 'Answer already submitted.' });
    }

    const q = session.questions[questionIndex];
    if (questionIndex !== session.currentQuestionIndex || !q || ['curve','text','wordcloud','pointmap','matching','simulation','research','brain'].includes(q.type) || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= (q.options?.length || 0)) return callback && callback({success:false,error:'Invalid or inactive question.'});
    const duration=activityDuration(q,session.timerDuration);
    const elapsed=duration>0?Math.max(0,duration-session.timeRemaining)*1000:Math.max(0,Date.now()-session.questionStartTime);
    participant.answers[questionIndex]={selectedOption,responseTimeMs:elapsed,pending:true};
    
    let answeredCount = 0;
    session.participants.forEach(p => {
      if (p.answers[questionIndex] !== undefined) answeredCount++;
    });

    io.to(session.code).emit('live_answer_count', {
      questionIndex,
      answeredCount: completionCount(session),
      totalParticipants: session.participants.length
    });

    publishLive(session);
    if (callback) {
      callback({
        success: true,
        selectedOption
      });
    }

    if (answeredCount === session.participants.length && session.participants.length > 0) {
      io.to(session.code).emit('all_participants_answered', { questionIndex });
    }
  });

  // Curves remain server-side until the presenter reveals the activity.
  socket.on('submit_spatial', ({sessionCode,questionIndex,response}={},callback)=>{
    const reply=typeof callback==='function'?callback:()=>{};
    const session=sessions.get(sessionCode);
    if(!session||session.status!=='running'||session.questionState!=='active'||questionIndex!==session.currentQuestionIndex)return reply({success:false,error:'This activity is closed.'});
    const q=session.questions[questionIndex],index=session.participants.findIndex(p=>p.socketId===socket.id&&p.connected);
    if(index<0||!['pointmap','matching','simulation','research','brain'].includes(q?.type))return reply({success:false,error:'Join the active session first.'});
    const participantId=session.participants[index].id,entries=(session.spatialSubmissions||={})[questionIndex]||=[];
    if(entries.some(r=>r.participantId===participantId))return reply({success:false,error:'Already submitted.'});
    const value=q.type==='pointmap'?normalizePoint(response):q.type==='simulation'?normalizeSimulation(q.simKind,response):q.type==='research'?normalizeResearchResponse(q,response):q.type==='brain'?normalizeBrainHit(q,response):normalizeMatch(q,response);
    if(!value||(q.type==='pointmap'&&q.mapGraded&&!validTarget(q)))return reply({success:false,error:'Invalid response or target configuration.'});
    entries.push({participantId,...curveIdentity(index),...(q.type==='pointmap'?{point:value}:['simulation','research','brain'].includes(q.type)?{response:value}:{selection:value}),responseTimeMs:Math.max(0,Date.now()-(session.questionStartTime||Date.now()))});
    reply({success:true});io.to(session.code).emit('live_answer_count',completionPayload(session));publishLive(session);
  });
  socket.on('submit_curve', ({sessionCode, questionIndex, points} = {}, callback) => {
    const reply = typeof callback === 'function' ? callback : () => {};
    const session = sessions.get(sessionCode);
    if (!session || session.status !== 'running' || session.questionState !== 'active' || questionIndex !== session.currentQuestionIndex || session.questions[questionIndex]?.type !== 'curve') return reply({success:false,error:'This drawing activity is not open.'});
    const index = session.participants.findIndex(p => p.socketId === socket.id && p.connected);
    if (index < 0) return reply({success:false,error:'Please join the session first.'});
    const normalized = normalizeCurve(points);
    if (!normalized) return reply({success:false,error:'Draw a curve from left to right.'});
    const participantId = session.participants[index].id;
    const entries = (session.curveSubmissions ||= {})[questionIndex] ||= [];
    if (entries.some(c=>c.participantId===participantId)) return reply({success:false,error:'Prediction already submitted.'});
    entries.push({participantId,...curveIdentity(index),points:normalized});
    reply({success:true});
    io.to(session.code).emit('live_answer_count',{questionIndex,answeredCount:entries.length,totalParticipants:session.participants.length});publishLive(session);
  });

  socket.on('reset_thumbs', ({sessionCode}={}) => {
    const session=sessions.get(sessionCode);
    if(!session||session.trainerSocketId!==socket.id)return;
    session.thumbVotes={};
    io.to(session.code).emit('thumbs_updated',thumbsState(session));
  });
  socket.on('reveal_text_line', ({sessionCode,questionIndex}={}) => {
    const session=sessions.get(sessionCode);
    if(!session||session.trainerSocketId!==socket.id||session.currentQuestionIndex!==questionIndex)return;
    const q=session.questions[questionIndex];
    if(q?.type!=='text')return;
    session.textVisible=Math.min(textLines(q).length,(session.textVisible||0)+1);
    broadcastText(session);
  });
  // Trainer manually reveals the answer
  socket.on('reveal_answer', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id || session.questionState!=='active') return;
    const q=session.questions[session.currentQuestionIndex];
    if(q?.type==='text'){if(socket.id===session.trainerSocketId){session.textVisible=Math.min(textLines(q).length,(session.textVisible||0)+1);broadcastText(session);}return;}

    if (session.timerInterval) {
      clearInterval(session.timerInterval);
      session.timerInterval = null;
    }

    autoCloseQuestion(session);
  });

  // Trainer shows Leaderboard
  socket.on('show_leaderboard', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;

    updateSessionRankings(session);
    const analytics = calculateSessionAnalytics(session);

    io.to(session.code).emit('display_leaderboard', {
      leaderboard: publicLeaderboard(session).slice(0,10),
      allParticipants: publicLeaderboard(session)
    });
  });

  // Trainer proceeds to Next Question
  socket.on('next_question', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;

    const current=session.questions[session.currentQuestionIndex];
    if(current?.type==='text' && (session.textVisible||0)<textLines(current).length){if(socket.id===session.trainerSocketId){session.textVisible++;broadcastText(session);}return;}
    if(current?.type!=='text'&&session.questionState==='active'){if(socket.id===session.trainerSocketId){if(session.timerInterval)clearInterval(session.timerInterval);session.timerInterval=null;autoCloseQuestion(session);}return;}
    if (!session.completedQuestions.includes(session.currentQuestionIndex)) {
      session.completedQuestions.push(session.currentQuestionIndex);
    }

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      session.status = 'finished';
      session.questionState = 'closed';
      if (session.timerInterval) clearInterval(session.timerInterval);

      updateSessionRankings(session);
      const finalAnalytics = calculateSessionAnalytics(session);

      console.log(`[Quiz Finished] Session ${sessionCode} completed. Recording in permanent DB...`);

      // Keep classroom responses in memory only. Presenter receives full report; each student receives only their own answers.
      io.to(session.trainerSocketId).emit('quiz_finished',{analytics:finalAnalytics,leaderboard:[...finalAnalytics.leaderboard].sort((a,b)=>b.score-a.score)});
      for(const p of session.participants)if(p.connected)io.to(p.socketId).emit('quiz_finished',{analytics:{totalQuestions:finalAnalytics.totalQuestions,gradedQuestionCount:finalAnalytics.gradedQuestionCount},leaderboard:publicLeaderboard(session,p.id)});
    } else {
      session.currentQuestionIndex = nextIndex;
      session.questionState = 'active';
      session.questionStartTime = Date.now();
      resetActivityUI(session);
      startTimer(session);

      const q = session.questions[nextIndex];
      const participantQuestion = {
        index: nextIndex,
        total: session.questions.length,
        id: q.id,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
        category: q.category,
          ...publicActivity(q,session.textVisible)
      };

      const trainerQuestion = {
        index: nextIndex,
        total: session.questions.length,
        ...q
      };

      io.to(session.code).emit('question_changed', {
        currentQuestionIndex: nextIndex,
        totalQuestions: session.questions.length,
        activeDuration:session.timeRemaining,activityUI:{textVisible:session.textVisible||0,thumbs:thumbsState(session)}
      });

      io.to(session.trainerSocketId).emit('trainer_question', trainerQuestion);
      io.to(session.code).except(session.trainerSocketId).emit('participant_question', participantQuestion);
    }
  });

  // Trainer jumps directly to a specific question
  socket.on('jump_to_question', ({ sessionCode, questionIndex }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;
    if (!Number.isInteger(questionIndex)||questionIndex < 0 || questionIndex >= session.questions.length) return;

    session.currentQuestionIndex = questionIndex;
    session.questionState = 'active';
    session.questionStartTime = Date.now();
    resetActivityUI(session);
    startTimer(session);

    const q = session.questions[questionIndex];
    const participantQuestion = {
      index: questionIndex,
      total: session.questions.length,
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      category: q.category,
          ...publicActivity(q,session.textVisible)
    };

    const trainerQuestion = {
      index: questionIndex,
      total: session.questions.length,
      ...q
    };

    io.to(session.code).emit('question_changed', {
      currentQuestionIndex: questionIndex,
      totalQuestions: session.questions.length,
      activeDuration:session.timeRemaining,activityUI:{textVisible:session.textVisible||0,thumbs:thumbsState(session)}
    });

    io.to(session.trainerSocketId).emit('trainer_question', trainerQuestion);
    io.to(session.code).except(session.trainerSocketId).emit('participant_question', participantQuestion);
  });

  // Pause quiz
  socket.on('pause_quiz', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;

    session.status = 'paused';
    io.to(session.code).emit('quiz_paused', { message: 'Quiz paused by trainer.' });
  });

  // Resume quiz
  socket.on('resume_quiz', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;

    session.status = 'running';
    io.to(session.code).emit('quiz_resumed');
  });

  // Reset / Restart session
  socket.on('restart_quiz', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id) return;

    if (session.timerInterval) clearInterval(session.timerInterval);

    session.status = 'ready';
    session.currentQuestionIndex = 0;
    session.questionState = 'active';
    session.completedQuestions = [];
    session.curveSubmissions = {};
    session.spatialSubmissions = {};
    session.wordCloudSubmissions = {};
    resetActivityUI(session);

    session.participants.forEach(p => {
      p.score = 0;
      p.previousRank = 1;
      p.currentRank = 1;
      p.rankDelta = 0;
      p.answers = {};
    });

    const participantList = session.participants.map(p => ({ id: p.id, name: p.name, phone: p.phone, score: p.score, rank: p.currentRank, connected: p.connected }));

    io.to(session.code).emit('quiz_restarted', {
      sessionStatus: 'ready',
      participantsCount: session.participants.length,
      participants: participantList
    });
  });

  // Real-Time Floating Emoji Reactions
  socket.on('send_reaction', ({ sessionCode, emoji }={}) => {
    const session = sessions.get(sessionCode);
    const allowed=['❤️','👍','👎','🔥','👏','💡','🎉','🚀','😂'];
    if (!session || !allowed.includes(emoji)) return;
    const participant=session.participants.find(p=>p.socketId===socket.id&&p.connected);
    if(!participant && socket.id!==session.trainerSocketId)return;
    const now=Date.now();
    if(now-(socket.data.lastReaction||0)<300)return;
    socket.data.lastReaction=now;
    if(participant && ['👍','👎'].includes(emoji)){
      (session.thumbVotes||={})[participant.id]=emoji;
      io.to(session.code).emit('thumbs_updated',thumbsState(session));
    }
    io.to(session.code).emit('reaction_received', {
      id: now+'-'+Math.random(),emoji,senderName:'Anonymous',timestamp:now
    });
  });

  // Live Audience Q&A - Submit Question
  const handleQASubmit = ({ sessionCode, text, authorName, authorPhone }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session || (!participantFor(session,socket)&&session.trainerSocketId!==socket.id)||typeof text!=='string'||!text.trim()||text.length>500||(session.qaQuestions||[]).length>=100) return callback && callback({ success: false, error: 'Session or text invalid' });

    if (!session.qaQuestions) session.qaQuestions = [];

    const newQA = {
      id: `qa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: text.trim(),
      authorName: 'Anonymous',
      authorPhone: '',
      upvotes: 0,
      upvotedBy: [],
      answered: false,
      timestamp: Date.now()
    };

    session.qaQuestions.push(newQA);
    io.to(session.code).emit('qa_questions_updated', { qaQuestions: session.qaQuestions });

    if (callback) callback({ success: true, question: newQA });
  };

  socket.on('submit_qa_question', handleQASubmit);
  socket.on('post_qa_question', handleQASubmit);

  // Live Audience Q&A - Upvote Question
  socket.on('upvote_qa_question', ({ sessionCode, questionId, userPhone }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session || !session.qaQuestions) return callback && callback({ success: false });
    const participant=participantFor(session,socket);if(!participant&&session.trainerSocketId!==socket.id)return callback&&callback({success:false});
    const q = session.qaQuestions.find(item => item.id === questionId);
    if (q) {
      const userKey = participant?.id || 'presenter';
      if (!q.upvotedBy) q.upvotedBy = [];

      if (!q.upvotedBy.includes(userKey)) {
        q.upvotedBy.push(userKey);
        q.upvotes = (q.upvotes || 0) + 1;
      } else {
        q.upvotedBy = q.upvotedBy.filter(k => k !== userKey);
        q.upvotes = Math.max(0, (q.upvotes || 0) - 1);
      }

      io.to(session.code).emit('qa_questions_updated', { qaQuestions: session.qaQuestions });
      if (callback) callback({ success: true, upvotes: q.upvotes });
    }
  });

  // Live Audience Q&A - Toggle / Mark Answered
  const handleQAToggleAnswered = ({ sessionCode, questionId, answered }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id || !session.qaQuestions) return callback && callback({ success: false });

    const q = session.qaQuestions.find(item => item.id === questionId);
    if (q) {
      q.answered = answered !== undefined ? Boolean(answered) : !q.answered;
      io.to(session.code).emit('qa_questions_updated', { qaQuestions: session.qaQuestions });
      if (callback) callback({ success: true, answered: q.answered });
    }
  };

  socket.on('toggle_qa_answered', handleQAToggleAnswered);
  socket.on('mark_qa_answered', handleQAToggleAnswered);

  // Live Audience Q&A - Delete Question
  socket.on('delete_qa_question', ({ sessionCode, questionId }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session || session.trainerSocketId!==socket.id || !session.qaQuestions) return callback && callback({ success: false });

    session.qaQuestions = session.qaQuestions.filter(item => item.id !== questionId);
    io.to(session.code).emit('qa_questions_updated', { qaQuestions: session.qaQuestions });
    if (callback) callback({ success: true });
  });

  // Live Word Cloud Submission
  const handleWordCloudSubmit = ({ sessionCode, word, questionIndex, participantPhone }, callback) => {
    const session = sessions.get(sessionCode);
    if (!session || typeof word!=='string' || !word.trim() || word.trim().length>35 || session.questionState!=='active' || session.status!=='running') return callback && callback({ success: false });
    const participant=session.participants.find(p=>p.socketId===socket.id&&p.connected);
    if(!participant)return callback&&callback({success:false});

    if (!session.wordCloudSubmissions) session.wordCloudSubmissions = {};
    const qIdx = questionIndex !== undefined ? questionIndex : session.currentQuestionIndex;
    if(qIdx!==session.currentQuestionIndex || session.questions[qIdx]?.type!=='wordcloud')return callback&&callback({success:false});

    if (!session.wordCloudSubmissions[qIdx]) {
      session.wordCloudSubmissions[qIdx] = [];
    }

    if(session.wordCloudSubmissions[qIdx].filter(e=>e.participantId===participant.id).length>=10)return callback&&callback({success:false});
    session.wordCloudSubmissions[qIdx].push({
      text: word.trim(),
      participantId:participant.id,
      timestamp: Date.now()
    });

    const currentWords = session.wordCloudSubmissions[qIdx].map(({text,timestamp})=>({text,timestamp}));
    io.to(session.code).emit('live_answer_count',completionPayload(session));

    publishLive(session);
    if(callback)callback({success:true});

  };

  socket.on('submit_word_cloud', handleWordCloudSubmit);
  socket.on('submit_word', handleWordCloudSubmit);

  // Request live session state
  socket.on('get_session_state', ({ sessionCode, trainerToken, participantToken }={}, callback) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = sessions.get(code);
    if (!session) return callback && callback({ success: false, error: 'Session not active' });

    const isTrainer=socket.id===session.trainerSocketId||matchesToken(session.trainerToken,trainerToken);
    const participantObj=isTrainer?null:(participantFor(session,socket)||session.participants.find(p=>matchesToken(p.token,participantToken)));
    if(!isTrainer&&!participantObj)return callback&&callback({success:false,error:'Session authentication required.'});
    attachSocket(session,participantObj,socket);
    const participantList = session.participants.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      score: p.score,
      rank: p.currentRank,
      connected: p.connected
    }));

    io.to(code).emit('participants_updated', {
      participants: participantList,
      count: session.participants.length
    });

    const analytics = calculateSessionAnalytics(session);
    const currQ = session.questions[session.currentQuestionIndex];

    let answeredCount = 0;
    session.participants.forEach(p => {
      // Completion is calculated below by activity type.
    });

    const payload = {
      success: true,
      isTrainer,
      sessionCode: session.code,
      trainerName: session.trainerName,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      questionState: session.questionState,
      timeRemaining: session.timeRemaining,
      timerDuration: session.timerDuration,
      activeDuration: activityDuration(session.questions[session.currentQuestionIndex],session.timerDuration),
      activityUI: {textVisible:session.textVisible||0,thumbs:thumbsState(session)},
      speedBonusEnabled: session.speedBonusEnabled,
      showTopic: session.showTopic !== undefined ? session.showTopic : false,
      totalQuestions: session.questions.length,
      participantsCount: session.participants.length,
      participants: participantList,
      completedQuestions: session.completedQuestions,
      liveAnswerCount: {
        answeredCount: completionCount(session),
        totalParticipants: session.participants.length
      },
      qaQuestions: session.qaQuestions || [],
      liveResults:isTrainer?liveSnapshot(session):undefined,
      wordCloudWords: session.questionState==='revealed'?(session.wordCloudSubmissions?.[session.currentQuestionIndex] || []).map(({text,timestamp})=>({text,timestamp})):[],
      analytics:isTrainer?analytics:session.status==='finished'?{totalQuestions:analytics.totalQuestions,gradedQuestionCount:analytics.gradedQuestionCount,leaderboard:publicLeaderboard(session,participantObj.id)}:undefined
    };

    if (currQ) {
      if (isTrainer) {
        payload.currentQuestion = { index: session.currentQuestionIndex, total: session.questions.length, ...currQ };
      } else {
        payload.currentQuestion = {
          index: session.currentQuestionIndex,
          total: session.questions.length,
          id: currQ.id,
          question: currQ.question,
          options: currQ.options,
          difficulty: currQ.difficulty,
          category: currQ.category,
          ...publicActivity(currQ,session.textVisible)
        };
      }
    }

    if (participantObj) {
      payload.participant = publicParticipant(participantObj);
      payload.isAnswerSubmitted=false;
      if (['pointmap','matching','simulation','research','brain'].includes(currQ?.type)) payload.isAnswerSubmitted=(session.spatialSubmissions?.[session.currentQuestionIndex]||[]).some(c=>c.participantId===participantObj.id);
      if (currQ?.type === 'curve') payload.isAnswerSubmitted = (session.curveSubmissions?.[session.currentQuestionIndex] || []).some(c=>c.participantId===participantObj.id);
      const ans = participantObj.answers[session.currentQuestionIndex];
      if (ans) {
        payload.selectedOption = ans.selectedOption;
        payload.isAnswerSubmitted = true;
        if(session.questionState==='revealed'||session.status==='finished')payload.lastAnswerResult=ans;
      }
    }

    if (session.questionState === 'revealed' && currQ) {
      const currQA = analytics.questionAnalytics[session.currentQuestionIndex];
      payload.revealData = {
        ...spatialResults(session),
        wordCloudWords:(session.wordCloudSubmissions?.[session.currentQuestionIndex]||[]).map(({text})=>text),
        questionIndex: session.currentQuestionIndex,
        correctAnswer: currQ.correctAnswer,
        curves: currQ.type === 'curve' ? (session.curveSubmissions?.[session.currentQuestionIndex] || []).map(({participantId,...curve})=>curve) : undefined,
        afterMedia: currQ.type === 'sequence' ? currQ.afterMedia : undefined,
        afterPreset: currQ.type === 'sequence' ? currQ.afterPreset : undefined,
        explanation: currQ.explanation,
        optionDist: currQA.optionDist,
        answeredCount: currQA.answeredCount,
        notAnsweredCount: currQA.notAnsweredCount,
        correctCount: currQA.correctCount,
        accuracyPct: currQA.accuracyPct,
        leaderboard: publicLeaderboard(session).slice(0,10)
      };
    }

    if (callback) callback(payload);
  });

  // Explicit leave removes membership without a reconnect race. Tokens can restore the same identity.
  socket.on('leave_session',()=>{
    for(const session of sessions.values()){
      if(session.trainerSocketId===socket.id){session.trainerSocketId=null;socket.leave(session.code);}
      const p=participantFor(session,socket);
      if(p){p.connected=false;p.socketId=null;socket.leave(session.code);io.to(session.code).emit('participants_updated',{participants:session.participants.map(publicParticipant),count:session.participants.length});}
    }
  });
  // Disconnect handler
  socket.on('disconnect', () => {
    sessions.forEach(session => {
      const p = session.participants.find(x => x.socketId === socket.id);
      if (p) {
        p.connected = false;
        io.to(session.code).emit('participants_updated', {
          participants: session.participants.map(item => ({ id: item.id, name: item.name, phone: item.phone, score: item.score, rank: item.currentRank, connected: item.connected })),
          count: session.participants.length
        });
      }
    });
  });
});

// Serve frontend build if dist folder exists
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`  DIGI WARRIORS LOCAL-FIRST QUIZ ENGINE RUNNING!       `);
  console.log(`  Local URL:        http://localhost:${PORT}           `);
  console.log(`  Wi-Fi/LAN Join:   http://${localIp}:${PORT}          `);
  console.log(`=======================================================`);
});
