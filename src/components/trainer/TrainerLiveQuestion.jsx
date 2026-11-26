import SlideFrame from '../common/SlideFrame';
import '../../preview.css';
import {BrainResults} from '../common/BrainActivity';
import {ResearchResults} from '../common/ResearchActivity';
import {SimulationResults} from '../common/SimulationActivity';
import React, { useState } from 'react';
import {SpatialResults} from '../common/SpatialActivity';
import TextSlide from '../common/TextSlide';
import {isExploreSimulation} from '../../simulations.js';
import {textLines,liveResultsEnabled} from '../../activities.js';
import {CurveResults} from '../common/CurveActivity';
import SequenceMedia, {SequenceHeading} from '../common/SequenceMedia';
import { useQuiz } from '../../context/QuizContext';
import ProgressBar from '../common/ProgressBar';
import TimerDisplay from '../common/TimerDisplay';
import TrainerDistribution from './TrainerDistribution';
import TrainerLeaderboard from './TrainerLeaderboard';
import WordCloudDisplay from './WordCloudDisplay';
import QAModal from '../common/QAModal';
import { soundFX } from '../../services/soundEffects';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Eye, 
  ArrowRight, 
  Trophy, 
  Pause, 
  Play, 
  Users, 
  CheckCircle2, 
  HelpCircle,
  Maximize2,
  Tag,
  MessageSquare,
  Smartphone,
  Volume2,
  VolumeX,
  QrCode as QrIcon,
  X
} from 'lucide-react';

export default function TrainerLiveQuestion() {
  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    questionState,
    timeRemaining,
    timerDuration,activeDuration,textVisible,thumbs,resetThumbs,revealTextLine,
    showTopic,
    revealData,liveResults,
    liveAnswerCount,
    participants,
    leaderboard,
    sessionStatus,
    sessionCode,
    serverInfo,
    qaQuestions = [],
    wordCloudWords = [],
    revealAnswer,
    nextQuestion,
    jumpToQuestion,
    pauseQuiz,
    resumeQuiz,
    toggleTopicVisibility
  } = useQuiz();

  const [viewMode, setViewMode] = useState('question'); // 'question' | 'leaderboard'
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundFX.isMuted());

  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  const remoteUrl = `${serverInfo.joinUrl || window.location.origin}/?role=remote&session=${sessionCode}`;

  const handleOpenRemoteModal = () => {
    setIsRemoteModalOpen(true);
  };

  const optionLetters = ['A', 'B', 'C', 'D','E','F'];
  const optionColors = [
    { border: 'border-blue-500/40', bg: 'bg-blue-600', badge: 'bg-blue-600', text: 'text-blue-100' },
    { border: 'border-emerald-500/40', bg: 'bg-emerald-600', badge: 'bg-emerald-600', text: 'text-emerald-100' },
    { border: 'border-amber-500/40', bg: 'bg-amber-600', badge: 'bg-amber-600', text: 'text-amber-100' },
    { border: 'border-rose-500/40', bg: 'bg-rose-600', badge: 'bg-rose-600', text: 'text-rose-100' },
    { border: 'border-purple-500/40', bg: 'bg-purple-600', badge: 'bg-purple-600', text: 'text-purple-100' },
    { border: 'border-cyan-500/40', bg: 'bg-cyan-600', badge: 'bg-cyan-600', text: 'text-cyan-100' }
  ];

  const qSeed = (currentQuestion?.id || (currentQuestionIndex + 1)) * 7;
  const totalParticipantsCount = participants.length || liveAnswerCount.totalParticipants;
  const answeredCount = liveAnswerCount.answeredCount;
  const isRevealed = questionState === 'revealed' || questionState === 'closed';
  const showResults=isRevealed||liveResultsEnabled(currentQuestion),liveData=liveResults?.questionIndex===currentQuestionIndex?liveResults.data:null,result=isRevealed?revealData:showResults?liveData:null;
  const explore=isExploreSimulation(currentQuestion);
  const hasHiddenText=currentQuestion?.type==='text' && textVisible<textLines(currentQuestion).length;

  // Global Trainer Keyboard Shortcuts (Space/ArrowRight=Next, R=Reveal, L=Leaderboard, P=Pause/Resume, M=Mute, Q=Q&A)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName) || e.target.isContentEditable) return;

      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (hasHiddenText) revealTextLine(); else if (['curve','sequence','pointmap','matching','simulation','research','brain'].includes(currentQuestion?.type) && !explore && !isRevealed) revealAnswer(); else nextQuestion();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (hasHiddenText) revealTextLine(); else if (!isRevealed && currentQuestion?.type!=='text' && !explore) revealAnswer();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setViewMode(v => v === 'leaderboard' ? 'question' : 'leaderboard');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        sessionStatus === 'paused' ? resumeQuiz() : pauseQuiz();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setIsQAOpen(prev => !prev);
      } else if (e.key >= '1' && e.key <= '9') {
        const targetQ = parseInt(e.key, 10) - 1;
        if (targetQ < totalQuestions) {
          e.preventDefault();
          jumpToQuestion(targetQ);
        }
      }
    };

    if (!currentQuestion) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, hasHiddenText, revealTextLine, isRevealed, sessionStatus, totalQuestions, nextQuestion, revealAnswer, pauseQuiz, resumeQuiz, jumpToQuestion]);

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 animate-spin mx-auto mb-4 border-2 border-blue-500 border-t-transparent" />
        <h3 className="text-lg font-bold text-white">Loading Question...</h3>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      
      {/* Top Controls & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        
        {/* Left: Question Number & Tags */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            QUESTION {currentQuestionIndex + 1} / {totalQuestions}
          </span>
          <button
            type="button"
            onClick={toggleTopicVisibility}
            title="Click to toggle category visibility for participants"
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showTopic
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-300 hover:border-slate-600 line-through'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>{currentQuestion.category || 'General'}</span>
            <span className="text-[10px] opacity-75 font-normal">({showTopic ? 'Visible' : 'Hidden'})</span>
          </button>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            {currentQuestion.difficulty || 'Medium'}
          </span>
        </div>

        {/* Right: Timer & Live Submission Pill */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          
          {/* Live Q&A Button */}
          <button
            onClick={() => setIsQAOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Q&A</span>
            {qaQuestions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {qaQuestions.length}
              </span>
            )}
          </button>

          {/* Mentimote Mobile Remote Trigger */}
          <button
            onClick={handleOpenRemoteModal}
            title="Open Mentimote Mobile Remote"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Phone Remote</span>
          </button>

          {/* Audio FX Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Sound FX" : "Mute Sound FX"}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Live Responses Counter */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{participants.length} joined · {participants.filter(p=>p.connected).length} online</span>
            {currentQuestion.type!=='text'&&!explore&&<span className="ml-2">Completed:</span>}
            {currentQuestion.type!=='text'&&!explore&&<strong className="font-mono">{answeredCount}/{totalParticipantsCount}</strong>}
          </div>

          {/* Countdown Timer */}
          {!isRevealed && currentQuestion.type!=='text' && !explore && <TimerDisplay timeRemaining={timeRemaining} totalDuration={activeDuration} />}
          <div className="flex items-center gap-2 text-sm border border-slate-800 rounded-xl px-3 py-1.5" aria-label="Current check-in"><span>👍 {thumbs.up}</span><span>👎 {thumbs.down}</span><button className="text-xs underline" onClick={resetThumbs}>Reset</button></div>

          {/* Pause / Resume Button */}
          {sessionStatus === 'paused' ? (
            <button
              onClick={resumeQuiz}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              onClick={pauseQuiz}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

        </div>

      </div>

      {/* Main Presentation Area */}
      <SlideFrame>{viewMode === 'leaderboard' ? (
        <TrainerLeaderboard
          leaderboard={leaderboard}
          onClose={() => setViewMode('question')}
        />
      ) : currentQuestion.type==='brain'?<BrainResults key={currentQuestionIndex} question={currentQuestion} result={result} revealed={isRevealed} showResults={showResults} count={answeredCount}/> : currentQuestion.type==='research'?<ResearchResults key={currentQuestionIndex} question={currentQuestion} result={result} revealed={isRevealed} showResults={showResults} count={answeredCount}/> : currentQuestion.type==='simulation'? <SimulationResults key={currentQuestionIndex} question={currentQuestion} result={result} revealed={isRevealed} showResults={showResults} count={answeredCount}/> : ['pointmap','matching'].includes(currentQuestion.type) ? <SpatialResults key={currentQuestionIndex} question={currentQuestion} result={result} revealed={isRevealed} showResults={showResults} count={answeredCount}/> : currentQuestion.type === 'text' ? <TextSlide question={currentQuestion} visible={textVisible} presenter/> : currentQuestion.type === 'curve' ? <CurveResults key={currentQuestionIndex} question={currentQuestion} curves={result?.curves||[]} reference={result?.referenceCurve} revealed={isRevealed} showResults={showResults} count={answeredCount}/> : currentQuestion.type === 'wordcloud' ? (
        <WordCloudDisplay
          words={showResults?(liveData?.words||revealData?.wordCloudWords||wordCloudWords):[]}
          totalResponses={showResults?(liveData?.words||revealData?.wordCloudWords||wordCloudWords).length:0} hidden={!showResults}
        />
      ) : (
        <div className="space-y-6">
          
          {currentQuestion.type === 'sequence' && <div className="space-y-2"><SequenceHeading question={currentQuestion}/><SequenceMedia key={currentQuestionIndex+'-'+isRevealed} media={isRevealed?currentQuestion.afterMedia:currentQuestion.beforeMedia} preset={isRevealed?currentQuestion.afterPreset:currentQuestion.beforePreset} phase={isRevealed?'after':'before'}/></div>}
          {/* Large Question Card */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
              {currentQuestion.question}
            </h1>
          </div>

          {/* If Question is NOT revealed yet, show 4 large clean option cards */}
          {!isRevealed ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options?.map((opt, idx) => {
                const colorIndex = (idx + qSeed) % optionColors.length;
                const color = optionColors[colorIndex];
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border ${color.border} shadow-lg`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${color.badge} text-white flex items-center justify-center font-bold text-base shadow-md flex-shrink-0`}>
                      {optionLetters[idx]}
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-slate-100">
                      {opt}
                      {showResults&&<span className="block mt-2 text-sm text-slate-400">{liveData?.optionDist?.[idx]?.count||0} · {liveData?.optionDist?.[idx]?.pct||0}%<span className="block h-2 mt-1 rounded-full bg-slate-800"><span className="block h-2 rounded-full bg-[#CA8ADB] transition-all" style={{width:(liveData?.optionDist?.[idx]?.pct||0)+'%'}}/></span></span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Once Revealed, show Animated Distribution & Explanations */
            <TrainerDistribution
              revealData={revealData}
              currentQuestion={currentQuestion}
            />
          )}

        </div>
      )}

      </SlideFrame>
      {/* Trainer Bottom Control Panel */}
      <div className="mt-8 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        
        {/* Question Navigator Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {Array.from({ length: totalQuestions }).map((_, qIdx) => {
            const isActive = qIdx === currentQuestionIndex;
            const isCompleted = qIdx < currentQuestionIndex;

            return (
              <button
                key={qIdx}
                onClick={() => jumpToQuestion(qIdx)}
                title={`Jump to Question ${qIdx + 1}`}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 shadow-md shadow-blue-500/30'
                    : isCompleted
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-950 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {qIdx + 1}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          
          {/* Toggle Leaderboard */}
          <button
            onClick={() => setViewMode(viewMode === 'leaderboard' ? 'question' : 'leaderboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              viewMode === 'leaderboard'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{viewMode === 'leaderboard' ? 'Show Question' : 'Leaderboard'}</span>
          </button>

          {/* Reveal Answer (if not revealed) */}
          {!isRevealed && currentQuestion.type!=='text' && !explore && (
            <button
              onClick={revealAnswer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>{currentQuestion.type==='brain'?'Reveal locations':currentQuestion.type==='research'?'Reveal findings':currentQuestion.type==='simulation'?'Reveal simulations':currentQuestion.type==='curve'?'Reveal predictions':currentQuestion.type==='sequence'?'Reveal & animate':'Reveal Answer'}</span>
            </button>
          )}

          {/* Next Question / Finish */}
          <button
            onClick={hasHiddenText?revealTextLine:nextQuestion}
            disabled={['curve','sequence','pointmap','matching','simulation','research','brain'].includes(currentQuestion.type) && !explore && !isRevealed}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all transform hover:scale-105"
          >
            <span>{hasHiddenText?'Reveal next line':currentQuestionIndex + 1 >= totalQuestions ? 'Finish Quiz & Results' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Real-Time Floating Emojis Overlay on Projector Screen */}
      {/* Floating reactions are rendered once by Header. */}

      {/* Audience Q&A Modal */}
      <QAModal isOpen={isQAOpen} onClose={() => setIsQAOpen(false)} />

      {/* Mentimote Remote QR Modal */}
      {isRemoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative">
            <button
              onClick={() => setIsRemoteModalOpen(false)}
              type="button"
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white">Presenter Mobile Remote</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Scan with your phone to control slides, timer, and view speaker notes while walking the room!
            </p>

            <div className="bg-white p-3.5 rounded-2xl inline-block shadow-xl mb-4">
              <QRCodeSVG value={remoteUrl} size={190} level="H" includeMargin={true} />
            </div>

            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-all">
              {remoteUrl}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
