
import React from 'react';
import { X, User, Zap, MessageSquare, Mic } from 'lucide-react';
import { ModeConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modes: ModeConfig[];
  activeMode: ModeConfig;
  onSelectMode: (mode: ModeConfig) => void;
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  modes, 
  activeMode, 
  onSelectMode,
  currentVoice,
  onSelectVoice
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Content */}
      <div 
        className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[201]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h2 className="text-lg font-semibold text-white tracking-wide">Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">Assistant Persona</h3>
            <div className="space-y-3">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onSelectMode(mode)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                    activeMode.id === mode.id 
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'bg-slate-800/40 border-transparent hover:bg-slate-800/80 hover:border-white/5'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${activeMode.id === mode.id ? 'bg-cyan-500 text-white' : 'bg-slate-700/50 text-slate-400'}`}>
                    {mode.id === 'assistant' && <Zap className="w-5 h-5" />}
                    {mode.id === 'tutor' && <MessageSquare className="w-5 h-5" />}
                    {mode.id === 'negotiator' && <User className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <div className={`font-medium mb-1 ${activeMode.id === mode.id ? 'text-cyan-400' : 'text-slate-200'}`}>
                      {mode.name}
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed font-light">
                      {mode.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">Voice Preference</h3>
             <div className="grid grid-cols-2 gap-3">
               {VOICES.map((voice) => (
                 <button
                   key={voice}
                   onClick={() => onSelectVoice(voice)}
                   className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                     currentVoice === voice
                       ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                       : 'bg-slate-800/40 text-slate-400 border-transparent hover:bg-slate-800/60'
                   }`}
                 >
                   <div className={`w-2 h-2 rounded-full ${currentVoice === voice ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-slate-600'}`} />
                   <span>{voice}</span>
                 </button>
               ))}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
