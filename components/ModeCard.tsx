import React from 'react';
import { ModeConfig } from '../types';

interface ModeCardProps {
  mode: ModeConfig;
  isSelected: boolean;
  onSelect: (mode: ModeConfig) => void;
  disabled: boolean;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode, isSelected, onSelect, disabled }) => {
  return (
    <button
      onClick={() => onSelect(mode)}
      disabled={disabled}
      className={`
        group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 w-full border
        ${isSelected 
          ? 'bg-slate-800 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]' 
          : 'bg-[#13161f] border-white/5 hover:border-slate-600 hover:bg-slate-800/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
            <h3 className={`text-base font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
            {mode.name}
            </h3>
            {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
        </div>
        
        <p className="text-sm text-slate-400 leading-relaxed">
          {mode.description}
        </p>
      </div>
      
      {/* Background Hover Effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 transition-opacity duration-300 ${!disabled && !isSelected && 'group-hover:opacity-100'}`} />
    </button>
  );
};

export default ModeCard;