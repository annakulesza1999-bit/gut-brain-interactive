import React, { useState, useEffect } from 'react';
import { useQuiz } from '../../context/QuizContext';
import { soundFX } from '../../services/soundEffects';
import {
  Presentation,
  Smartphone,
  ArrowRight,
  Sparkles,
  Trophy,
  Zap,
  Wifi,
  Cloud,
  MessageSquare,
  Shield,
  CheckCircle2,
  Lock,
  QrCode,
  Flame,
  Volume2
} from 'lucide-react';

export default function RoleSelection({ onSelectRole }) {
  const { joinSession, errorMessage, setErrorMessage } = useQuiz();
  
  // Instant Quick-Join Form State
  const [quickCode, setQuickCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('code') || localStorage.getItem('dw_session_code') || '';
    }
    return '';
  });
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState('participant'); // 'participant' | 'trainer'

  // Interactive Live Reaction Demo on Landing Page
  const [demoEmoji, setDemoEmoji] = useState(null);

  const handleTestEmoji = (emoji) => {
    soundFX.playPop();
    setDemoEmoji(emoji);
    setTimeout(() => setDemoEmoji(null), 500);
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!quickCode.trim()) {
      setErrorMessage('Please enter the session code.');
      return;
    }

    setIsJoining(true);
    joinSession({
      code: quickCode.toUpperCase().trim()
    }, (res) => {
      setIsJoining(false);
      if (res && res.success) {
        soundFX.playCorrect();
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-14 animate-fade-in select-none">
      
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-10 sm:mb-14 border-b border-slate-800 pb-10">
        <div className="md:col-span-8">
          <p className="gm-kicker mb-4">Interactive learning studio</p>
          <h1 className="gm-hero-title text-slate-100 mb-5">Learning through<br /> curiosity.</h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">A shared space for live questions, thoughtful discussion and collaborative discovery. Join a session or lead your own.</p>
          <div className="flex flex-wrap gap-2 mt-6 text-xs text-slate-400">
            <span className="border border-slate-700 rounded-full px-3 py-1.5">Live polls</span>
            <span className="border border-slate-700 rounded-full px-3 py-1.5">Word clouds</span>
            <span className="border border-slate-700 rounded-full px-3 py-1.5">Audience Q&amp;A</span>
          </div>
        </div>
        <div className="hidden md:flex md:col-span-4 items-center justify-center">
          <svg viewBox="0 0 250 230" className="w-full max-w-xs" aria-hidden="true">
            <circle cx="125" cy="115" r="106" fill="#E7EBE1" />
            <circle cx="125" cy="115" r="87" fill="none" stroke="#B6C6B3" strokeWidth="1" strokeDasharray="3 5" />
            <path d="M111 46 C84 28 62 55 75 78 C53 94 70 118 93 113 C100 135 122 124 125 110 C128 124 150 135 157 113 C180 118 197 94 175 78 C188 55 166 28 139 46 Q125 30 111 46Z" fill="#D9CDDF" stroke="#806A94" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M125 43 V109 M92 58 Q116 60 109 79 M78 89 Q101 83 105 102 M158 58 Q134 60 141 79 M172 89 Q149 83 145 102" stroke="#806A94" fill="none" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M125 120 C126 133 149 129 153 143 M125 120 C124 133 101 129 97 143" stroke="#718C7B" strokeWidth="2" fill="none" strokeDasharray="3 4"/>
            <path d="M88 148 Q88 138 99 138 H151 Q162 138 162 148 V181 Q162 192 151 192 H137 V171 H144 V153 H106 V166 H128 V179 H99 Q88 179 88 168Z" stroke="#567662" strokeWidth="2.3" fill="#C7D8C8" strokeLinejoin="round"/>
            <circle cx="58" cy="134" r="5" fill="#B58C6B" /><circle cx="193" cy="133" r="5" fill="#9B88AA" /><circle cx="125" cy="208" r="4" fill="#718C7B"/>
          </svg>
        </div>
      </section>
      
      {/* Main Interactive Bento / Join Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left 7 Cols: Instant Join Card (Student Focused) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Join Live Session</h2>
                  <p className="text-xs text-slate-400">Enter code to vote, answer questions & react</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                Participant
              </span>
            </div>

            {/* Error notice if any */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-semibold animate-shake">
                {errorMessage}
              </div>
            )}

            {/* Quick Join Form */}
            <form onSubmit={handleQuickJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Session code
                </label>
                <input
                  type="text"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DW-7764"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-700 font-mono text-lg font-semibold placeholder-slate-600 outline-none uppercase tracking-wider"
                  required
                />
              </div>

              <p className="text-sm text-slate-400">Join anonymously. You'll receive a participant number and your own color.</p>

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-2xl text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{isJoining ? 'Connecting...' : 'Join session'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Quick micro-interaction tester */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Try a reaction:</span>
            <div className="flex items-center gap-1.5">
              {['❤️', '🔥', '🎉', '💡'].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleTestEmoji(em)}
                  className={`p-1 text-base rounded-lg hover:bg-slate-800 transition-transform ${demoEmoji === em ? 'scale-125' : ''}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Presenter studio */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Presenter studio</h2>
                  <p className="text-xs text-slate-400">Create and lead a live session</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                Host
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Create questions, invite your audience, and guide a live discussion with instant responses.
            </p>

            <div className="space-y-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Speed Bonus Scoring:</span>
                <span className="text-emerald-400 font-bold">100 + up to 50 pts</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Phone Remote Support:</span>
                <span className="text-blue-400 font-bold">Available</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectRole('trainer')}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Presentation className="w-4 h-4" />
            <span>Open presenter studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
