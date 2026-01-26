import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';
import { OptionsMenu } from './OptionsMenu';

interface PauseMenuProps {
  onQuit: () => void;
}

export function PauseMenu({ onQuit }: PauseMenuProps) {
  const [showOptions, setShowOptions] = useState(false);
  const closePauseMenu = useGameStore((state) => state.closePauseMenu);
  const reset = useGameStore((state) => state.reset);
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);

  const handleResume = () => {
    audioManager.playSFX('ui-click');
    closePauseMenu();
  };

  const handleQuit = () => {
    audioManager.playSFX('ui-click');
    reset();
    onQuit();
  };
  
  const handleOptions = () => {
    audioManager.playSFX('ui-click');
    setShowOptions(true);
  };
  
  const handleHover = () => {
    audioManager.playSFX('ui-hover');
  };

  if (showOptions) {
    return <OptionsMenu onClose={() => setShowOptions(false)} />;
  }

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[rgba(10,10,20,0.9)] backdrop-blur-sm flex justify-center items-center z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-gradient-to-br from-[rgba(30,30,50,0.95)] to-[rgba(20,20,35,0.98)] border-2 border-white/15 rounded-2xl p-8 md:p-10 min-w-[300px] md:min-w-[350px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(100,100,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-white m-0 mb-6 tracking-[3px] md:tracking-[6px] drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">PAUSED</h2>
        
        <div className="flex justify-center gap-6 md:gap-8 mb-8 p-4 bg-black/30 rounded-lg">
          <div className="flex flex-col items-center gap-1">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Score</span>
            <span className="font-orbitron text-lg md:text-2xl font-bold text-white">{score.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Wave</span>
            <span className="font-orbitron text-lg md:text-2xl font-bold text-white">{wave}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Level</span>
            <span className="font-orbitron text-lg md:text-2xl font-bold text-white">{level}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button 
            className="font-orbitron text-sm font-bold px-8 py-3.5 border-none rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] min-h-[44px] bg-gradient-to-r from-[#2ed573] to-[#1abc9c] text-white shadow-[0_4px_20px_rgba(46,213,115,0.4)] hover:bg-gradient-to-r hover:from-[#3ae374] hover:to-[#26d9a4] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(46,213,115,0.5)] active:translate-y-0.5"
            onClick={handleResume}
            onMouseEnter={handleHover}
          >
            RESUME
          </button>
          <button 
            className="font-orbitron text-sm font-bold px-8 py-3.5 border-none rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] min-h-[44px] bg-gradient-to-r from-[#3742fa] to-[#5352ed] text-white shadow-[0_4px_20px_rgba(55,66,250,0.4)] hover:bg-gradient-to-r hover:from-[#4850ff] hover:to-[#6665f0] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(55,66,250,0.5)] active:translate-y-0.5"
            onClick={handleOptions}
            onMouseEnter={handleHover}
          >
            OPTIONS
          </button>
          <button 
            className="font-orbitron text-sm font-bold px-8 py-3.5 border border-white/20 rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] min-h-[44px] bg-white/10 text-white/70 hover:bg-[rgba(255,71,87,0.3)] hover:text-white hover:border-[#ff4757] active:translate-y-0.5"
            onClick={handleQuit}
            onMouseEnter={handleHover}
          >
            QUIT TO MENU
          </button>
        </div>

        <p className="font-orbitron text-[10px] md:text-xs text-white/40 m-0">Press ESC to resume</p>
      </div>
    </div>
  );
}
