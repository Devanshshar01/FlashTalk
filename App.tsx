import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, AlertCircle, MessageSquare, Keyboard, ListVideo, Menu, X, Terminal } from 'lucide-react';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import SmartTools from './components/SmartTools';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ModeConfig, ConnectionState, TranscriptMessage } from './types';

const MODES: ModeConfig[] = [
  {
    id: 'assistant',
    name: 'Velocity Assistant',
    description: 'Ultra-fast general purpose assistant for hands-free operation.',
    systemInstruction: 'You are Velocity, a super-fast, helpful voice assistant. You respond instantly and concisely. Your goal is to be efficient and precise.',
    voiceName: 'Kore'
  },
  {
    id: 'tutor',
    name: 'Language Tutor',
    description: 'Instant pronunciation feedback and conversation practice.',
    systemInstruction: 'You are a strict but helpful language tutor. Correct pronunciation errors immediately. If the user is speaking, listen carefully. If they make a mistake, stop them gently and correct it before moving on. Speak clearly.',
    voiceName: 'Puck'
  },
  {
    id: 'negotiator',
    name: 'Hard Negotiator',
    description: 'Simulate high-pressure negotiation scenarios in real-time.',
    systemInstruction: 'You are a tough negotiator in a business deal. You are hard to please, interrupt if the user is weak, and demand value. Do not give in easily.',
    voiceName: 'Fenrir'
  }
];

// Add minimal type definition for Wake Lock API since it might not be in standard TS lib yet
interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  release(): Promise<void>;
}

const App: React.FC = () => {
  const [view, setView] = useState<'live' | 'tools'>('live');
  const [activeMode, setActiveMode] = useState<ModeConfig>(MODES[0]);
  const [voiceName, setVoiceName] = useState<string>('Kore');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { connect, disconnect, connectionState, volume, error, transcript } = useLiveGemini(activeMode, voiceName);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  // Wake Lock and Scroll Effect
  useEffect(() => {
    // 1. Scroll Transcript
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // 2. Manage Wake Lock
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isConnected) {
        try {
          // @ts-ignore - Navigator.wakeLock is experimental
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.warn(`Wake Lock Error: ${err}`);
        }
      }
    };
    
    if (isConnected) {
      requestWakeLock();
    } else {
       if (wakeLockRef.current) {
         wakeLockRef.current.release().catch(() => {});
         wakeLockRef.current = null;
       }
    }

    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, [transcript, view, isConnected]); // Added view to deps to ensure lock behavior is consistent on switch

  // Keyboard Shortcut (Space to Toggle Mic)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && view === 'live' && !isSettingsOpen) {
        // Prevent scrolling if not focused on input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleToggleConnection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isSettingsOpen, isConnected, handleToggleConnection]); // Added handleToggleConnection

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* Background Gradient - Global for all views */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#020617] to-[#020617] pointer-events-none z-0" />

      {/* Settings Modal - Highest Z-Index */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        modes={MODES}
        activeMode={activeMode}
        onSelectMode={(mode) => {
          if (isConnected) disconnect();
          setActiveMode(mode);
          setVoiceName(mode.voiceName);
          setIsSettingsOpen(false);
        }}
        currentVoice={voiceName}
        onSelectVoice={(voice) => {
          if (isConnected) disconnect();
          setVoiceName(voice);
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 h-full flex flex-col max-w-md mx-auto md:max-w-full">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-6 shrink-0 z-50">
           {view === 'live' ? (
             <>
                <div className="w-10" /> {/* Spacer */}
                <h1 className="text-xl font-bold tracking-tight text-white/90 cursor-default">
                  Flash<span className="text-cyan-400">Talk</span>
                </h1>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 active:bg-white/10"
                >
                  <Settings className="w-6 h-6" />
                </button>
             </>
           ) : (
             <div className="flex items-center justify-between w-full">
               <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setView('live')} 
                    className="p-2 bg-slate-800/50 rounded-full hover:bg-slate-700 hover:text-white transition-all border border-white/5 shadow-lg active:scale-95"
                 >
                    <X className="w-5 h-5" />
                 </button>
                 <span className="font-semibold text-lg tracking-wide text-white">Smart Tools</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                   Pro
                 </div>
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 active:bg-white/10"
                 >
                    <Settings className="w-6 h-6" />
                 </button>
               </div>
             </div>
           )}
        </header>

        {/* Connection Error */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {view === 'live' ? (
          <>
            {/* Visualizer Area */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-20 z-0 pointer-events-none">
              <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
                <Visualizer volume={volume} isActive={isConnected} />
              </div>
              
              {/* Status Text */}
              <div className="mt-4 flex flex-col items-center gap-2 h-10">
                {isConnecting ? (
                  <span className="text-cyan-400 uppercase tracking-widest text-xs font-medium animate-pulse">
                    Connecting...
                  </span>
                ) : isConnected ? (
                  <span className="text-cyan-400 uppercase tracking-widest text-xs font-medium animate-pulse">
                    Listening
                  </span>
                ) : (
                  <span className="text-slate-500 uppercase tracking-widest text-xs font-medium">
                    Tap to Start
                  </span>
                )}
              </div>
            </div>

            {/* Transcript Card */}
            <div className="fixed bottom-[140px] left-4 right-4 h-[30vh] md:w-[600px] md:mx-auto bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-500 z-10 hover:border-white/20">
               <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/5">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                   <MessageSquare className="w-3 h-3" />
                   <span>Conversation</span>
                 </div>
                 <div className="flex gap-1.5 opacity-50">
                   <div className="w-2 h-2 rounded-full bg-red-500" />
                   <div className="w-2 h-2 rounded-full bg-yellow-500" />
                   <div className="w-2 h-2 rounded-full bg-green-500" />
                 </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
                 {transcript.length === 0 ? (
                   <div className="h-full flex items-center justify-center text-slate-600 text-sm italic font-light">
                     History will appear here...
                   </div>
                 ) : (
                   transcript.map((msg) => (
                     <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-md ${
                          msg.role === 'user' 
                            ? 'bg-slate-700/50 text-white rounded-br-sm border border-white/5' 
                            : 'bg-cyan-950/30 text-cyan-100 border border-cyan-500/10 rounded-bl-sm backdrop-blur-sm'
                        }`}>
                          {msg.text}
                          {msg.isPartial && <span className="inline-block w-1.5 h-3 ml-1 bg-cyan-400 animate-pulse align-middle" />}
                        </div>
                     </div>
                   ))
                 )}
                 <div ref={transcriptEndRef} />
               </div>
            </div>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent flex items-center justify-center gap-10 pb-4 z-20 pointer-events-auto">
               
               <button 
                 onClick={() => setView('tools')}
                 className="w-12 h-12 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg backdrop-blur-sm hover:scale-110 active:scale-95"
                 title="Smart Tools"
               >
                 <Keyboard className="w-5 h-5" />
               </button>

               <button
                 onClick={handleToggleConnection}
                 disabled={isConnecting}
                 className={`
                   group relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 z-10
                   ${isConnected 
                     ? 'bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)]' 
                     : 'bg-cyan-500 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] hover:scale-105'
                   }
                 `}
               >
                 {isConnecting ? (
                   <div className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                 ) : (
                   <>
                     {/* Multiple Ripples for Connected State */}
                     {isConnected && (
                       <>
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30" />
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20 delay-300" />
                        <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-pulse opacity-50" />
                       </>
                     )}
                     
                     <div className="relative z-10">
                        {isConnected ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                     </div>
                   </>
                 )}
               </button>

               <button 
                 onClick={() => setIsSettingsOpen(true)}
                 className="w-12 h-12 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg backdrop-blur-sm hover:scale-110 active:scale-95"
               >
                 <Menu className="w-5 h-5" />
               </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden relative animate-in slide-in-from-bottom-5 duration-500 fade-in z-10">
             <SmartTools />
          </div>
        )}

      </div>
    </div>
  );
};

export default App;