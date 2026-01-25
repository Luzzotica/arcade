import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getBossName, getRandomDialogue, type BossShape } from '../game/data/BossDialogues';
import { audioManager } from '../game/audio/AudioManager';
import './BossDialogue.css';

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
  
  // Show indicator during camera pan to boss
  if (bossDialoguePhase === 'pan_to_boss') {
    return (
      <div className="boss-dialogue-overlay pan-phase">
        <div className="boss-incoming">
          <span className={`boss-shape-large boss-shape-${currentBossType.toLowerCase()}`}>
            {bossShape}
          </span>
          <span className="boss-incoming-text">{bossName} APPROACHING</span>
        </div>
      </div>
    );
  }
  
  // Show indicator during camera pan to player
  if (bossDialoguePhase === 'pan_to_player') {
    return (
      <div className="boss-dialogue-overlay pan-phase">
        <div className="boss-incoming">
          <span className="player-icon-large">⬡</span>
          <span className="boss-incoming-text">PREPARING FOR BATTLE</span>
        </div>
      </div>
    );
  }
  
  // Boss talking phase - RPG style at bottom
  if (bossDialoguePhase === 'boss_talking') {
    return (
      <div className="boss-dialogue-overlay" onClick={handleSkip}>
        <div className="boss-dialogue-panel" onClick={(e) => e.stopPropagation()}>
          <div className="boss-header">
            <span className={`boss-shape boss-shape-${currentBossType.toLowerCase()}`}>
              {bossShape}
            </span>
            <span className="boss-name">{bossName}</span>
          </div>
          
          <div className="dialogue-text boss-text">
            "{displayedBossText}"
            {!bossTextComplete && <span className="typing-cursor">|</span>}
          </div>
          
          <div className="dialogue-actions">
            {!bossTextComplete && (
              <span className="dialogue-hint">Click to skip</span>
            )}
            {bossTextComplete && (
              <button className="dialogue-btn" onClick={handleContinue} onMouseEnter={handleHover}>
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
      <div className="boss-dialogue-overlay" onClick={handleSkip}>
        <div className="boss-dialogue-panel player-panel" onClick={(e) => e.stopPropagation()}>
          <div className="boss-header player-header">
            <span className="player-shape">⬡</span>
            <span className="boss-name">Defender</span>
          </div>
          
          <div className="dialogue-text player-text">
            "{displayedPlayerText}"
            {!playerTextComplete && <span className="typing-cursor">|</span>}
          </div>
          
          <div className="dialogue-actions">
            {!playerTextComplete && (
              <span className="dialogue-hint">Click to skip</span>
            )}
            {playerTextComplete && (
              <button className="dialogue-btn engage-btn" onClick={handleEngage} onMouseEnter={handleHover}>
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
