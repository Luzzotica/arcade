import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getBossName, getRandomDialogue, type BossShape } from '../game/data/BossDialogues';
import { audioManager } from '../game/audio/AudioManager';

// Shape symbols for each boss
const BOSS_SHAPES: Record<BossShape, string> = {
  CIRCLE: '●',
  TRIANGLE: '▲',
  SQUARE: '■',
  PENTAGON: '⬠',
  SEPTAGON: '⬡',
};


interface BossDialogueProps {
  onPanToPlayer?: () => void;
  onEngage?: () => void;
}

export function BossDialogue({ onPanToPlayer, onEngage }: BossDialogueProps) {
  const currentBossType = useGameStore((state) => state.currentBossType);
  const bossDialoguePhase = useGameStore((state) => state.bossDialoguePhase);
  const setBossDialoguePhase = useGameStore((state) => state.setBossDialoguePhase);
  
  const [dialogue, setDialogue] = useState<{ boss: string; player: string } | null>(null);
  const [displayedBossText, setDisplayedBossText] = useState('');
  const [displayedPlayerText, setDisplayedPlayerText] = useState('');
  const [bossTextComplete, setBossTextComplete] = useState(false);
  const [playerTextComplete, setPlayerTextComplete] = useState(false);
  
  // Pick random dialogue when boss type changes
  useEffect(() => {
    if (currentBossType) {
      const newDialogue = getRandomDialogue(currentBossType);
      setDialogue(newDialogue);
      setDisplayedBossText('');
      setDisplayedPlayerText('');
      setBossTextComplete(false);
      setPlayerTextComplete(false);
    }
  }, [currentBossType]);
  
  // Typewriter effect for boss text
  useEffect(() => {
    if (!dialogue || bossDialoguePhase !== 'boss_talking' || bossTextComplete) return;
    
    if (displayedBossText.length < dialogue.boss.length) {
      const timer = setTimeout(() => {
        setDisplayedBossText(dialogue.boss.slice(0, displayedBossText.length + 1));
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setBossTextComplete(true);
    }
  }, [dialogue, displayedBossText, bossDialoguePhase, bossTextComplete]);
  
  // Typewriter effect for player text
  useEffect(() => {
    if (!dialogue || bossDialoguePhase !== 'player_talking' || playerTextComplete) return;
    
    if (displayedPlayerText.length < dialogue.player.length) {
      const timer = setTimeout(() => {
        setDisplayedPlayerText(dialogue.player.slice(0, displayedPlayerText.length + 1));
      }, 25);
      return () => clearTimeout(timer);
    } else {
      setPlayerTextComplete(true);
    }
  }, [dialogue, displayedPlayerText, bossDialoguePhase, playerTextComplete]);
  
  // Handle continue button - pan back to player
  const handleContinue = useCallback(() => {
    audioManager.playSFX('ui-click');
    setBossDialoguePhase('pan_to_player');
    onPanToPlayer?.();
  }, [setBossDialoguePhase, onPanToPlayer]);
  
  // Handle engage button - start the fight
  const handleEngage = useCallback(() => {
    audioManager.playSFX('ui-click');
    setBossDialoguePhase(null);
    onEngage?.();
  }, [setBossDialoguePhase, onEngage]);
  
  const handleHover = useCallback(() => {
    audioManager.playSFX('ui-hover');
  }, []);
  
  // Skip to end of current text on click
  const handleSkip = useCallback(() => {
    if (!dialogue) return;
    
    if (bossDialoguePhase === 'boss_talking' && !bossTextComplete) {
      setDisplayedBossText(dialogue.boss);
      setBossTextComplete(true);
    } else if (bossDialoguePhase === 'player_talking' && !playerTextComplete) {
      setDisplayedPlayerText(dialogue.player);
      setPlayerTextComplete(true);
    }
  }, [dialogue, bossDialoguePhase, bossTextComplete, playerTextComplete]);
  
  if (!currentBossType || !dialogue) return null;
  
  const bossName = getBossName(currentBossType);
  const bossShape = BOSS_SHAPES[currentBossType];
  
  const bossShapeColors: Record<BossShape, string> = {
    CIRCLE: 'text-[#ff0000] drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]',
    TRIANGLE: 'text-[#ff4400] drop-shadow-[0_0_20px_rgba(255,68,0,0.8)]',
    SQUARE: 'text-[#ff8800] drop-shadow-[0_0_20px_rgba(255,136,0,0.8)]',
    PENTAGON: 'text-[#cc00ff] drop-shadow-[0_0_20px_rgba(204,0,255,0.8)]',
    SEPTAGON: 'text-[#ff0044] drop-shadow-[0_0_20px_rgba(255,0,68,0.8)]',
  };

  // Show indicator during camera pan to boss
  if (bossDialoguePhase === 'pan_to_boss') {
    return (
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-start items-center pt-20 pb-0 pointer-events-none z-[150]">
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.5s_ease-out] pointer-events-none">
          <span className={`text-6xl md:text-8xl animate-[pulse-scale_1s_ease-in-out_infinite,glow-boss_2s_ease-in-out_infinite] ${bossShapeColors[currentBossType]}`}>
            {bossShape}
          </span>
          <span className="font-orbitron text-lg md:text-xl font-bold text-white/90 uppercase tracking-[2px] md:tracking-[4px] drop-shadow-[0_0_15px_rgba(255,255,255,0.5),0_2px_8px_rgba(0,0,0,0.8)] animate-[textPulse_1s_ease-in-out_infinite]">
            {bossName} APPROACHING
          </span>
        </div>
      </div>
    );
  }
  
  // Show indicator during camera pan to player
  if (bossDialoguePhase === 'pan_to_player') {
    return (
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-start items-center pt-20 pb-0 pointer-events-none z-[150]">
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.5s_ease-out] pointer-events-none">
          <span className="text-6xl md:text-8xl text-[#3296ff] drop-shadow-[0_0_40px_rgba(50,150,255,0.8)] animate-[pulse-scale_1s_ease-in-out_infinite]">⬡</span>
          <span className="font-orbitron text-lg md:text-xl font-bold text-white/90 uppercase tracking-[2px] md:tracking-[4px] drop-shadow-[0_0_15px_rgba(255,255,255,0.5),0_2px_8px_rgba(0,0,0,0.8)] animate-[textPulse_1s_ease-in-out_infinite]">
            PREPARING FOR BATTLE
          </span>
        </div>
      </div>
    );
  }
  
  // Boss talking phase - RPG style at bottom
  if (bossDialoguePhase === 'boss_talking') {
    return (
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-end items-center pb-10 pointer-events-none z-[150]" onClick={handleSkip}>
        <div className="bg-gradient-to-t from-[rgba(20,10,10,0.95)] to-[rgba(10,5,5,0.98)] border-2 border-[rgba(255,50,50,0.5)] rounded-xl p-6 md:p-8 w-[90%] max-w-[800px] text-left pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(255,50,50,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] animate-[slideUp_0.4s_ease-out]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[rgba(255,50,50,0.3)]">
            <span className={`text-4xl animate-[pulse-scale_2s_ease-in-out_infinite] ${bossShapeColors[currentBossType]}`}>
              {bossShape}
            </span>
            <span className="font-orbitron text-lg md:text-xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{bossName}</span>
          </div>
          
          <div className="mb-4 px-4 py-3 rounded-md animate-[fadeIn_0.3s_ease-out] bg-[rgba(255,50,50,0.08)] border-l-[3px] border-[rgba(255,50,50,0.5)]">
            <div className="font-['Georgia',serif] text-base md:text-lg leading-relaxed text-[rgba(255,220,220,0.95)] italic min-h-[40px]">
              "{displayedBossText}"
              {!bossTextComplete && <span className="animate-[blink_0.5s_step-end_infinite] text-white">|</span>}
            </div>
          </div>
          
          <div className="flex justify-end items-center gap-4 mt-2">
            {!bossTextComplete && (
              <span className="font-orbitron text-[10px] text-white/40 m-0">Click to skip</span>
            )}
            {bossTextComplete && (
              <button 
                className="font-orbitron text-sm font-bold px-8 py-3 border-none rounded-md cursor-pointer uppercase tracking-[2px] transition-all min-h-[44px] bg-gradient-to-r from-[#ff4444] to-[#cc0000] text-white shadow-[0_4px_15px_rgba(255,68,68,0.4)] hover:bg-gradient-to-r hover:from-[#ff6666] hover:to-[#ff2222] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,68,68,0.5)] active:translate-y-0.5 animate-[fadeIn_0.3s_ease-out]"
                onClick={handleContinue}
                onMouseEnter={handleHover}
              >
                CONTINUE
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Player talking phase - RPG style at bottom
  if (bossDialoguePhase === 'player_talking') {
    return (
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-end items-center pb-10 pointer-events-none z-[150]" onClick={handleSkip}>
        <div className="bg-gradient-to-t from-[rgba(10,20,40,0.95)] to-[rgba(5,10,25,0.98)] border-2 border-[rgba(50,150,255,0.5)] rounded-xl p-6 md:p-8 w-[90%] max-w-[800px] text-left pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(50,150,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] animate-[slideUp_0.4s_ease-out]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[rgba(50,150,255,0.3)]">
            <span className="text-4xl text-[#3296ff] drop-shadow-[0_0_20px_rgba(50,150,255,0.8)] animate-[pulse-scale_2s_ease-in-out_infinite]">⬡</span>
            <span className="font-orbitron text-lg md:text-xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Defender</span>
          </div>
          
          <div className="mb-4 px-4 py-3 rounded-md animate-[fadeIn_0.3s_ease-out] bg-[rgba(50,150,255,0.08)] border-l-[3px] border-[rgba(50,150,255,0.5)]">
            <div className="font-['Georgia',serif] text-base md:text-lg leading-relaxed text-[rgba(220,235,255,0.95)] italic min-h-[40px]">
              "{displayedPlayerText}"
              {!playerTextComplete && <span className="animate-[blink_0.5s_step-end_infinite] text-white">|</span>}
            </div>
          </div>
          
          <div className="flex justify-end items-center gap-4 mt-2">
            {!playerTextComplete && (
              <span className="font-orbitron text-[10px] text-white/40 m-0">Click to skip</span>
            )}
            {playerTextComplete && (
              <button 
                className="font-orbitron text-sm font-bold px-8 py-3 border-none rounded-md cursor-pointer uppercase tracking-[2px] transition-all min-h-[44px] bg-gradient-to-r from-[#3296ff] to-[#0066cc] text-white shadow-[0_4px_15px_rgba(50,150,255,0.4)] hover:bg-gradient-to-r hover:from-[#55aaff] hover:to-[#3388ff] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(50,150,255,0.5)] active:translate-y-0.5 animate-[fadeIn_0.3s_ease-out]"
                onClick={handleEngage}
                onMouseEnter={handleHover}
              >
                ENGAGE
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}
