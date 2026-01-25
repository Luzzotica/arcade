import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';
import { OptionsMenu } from './OptionsMenu';
import './PauseMenu.css';

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
    <div className="pause-overlay">
      <div className="pause-panel">
        <h2 className="pause-title">PAUSED</h2>
        
        <div className="pause-stats">
          <div className="pause-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value score-value">{score.toLocaleString()}</span>
          </div>
          <div className="pause-stat">
            <span className="stat-label">Wave</span>
            <span className="stat-value">{wave}</span>
          </div>
          <div className="pause-stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{level}</span>
          </div>
        </div>

        <div className="pause-actions">
          <button className="pause-btn pause-btn-resume" onClick={handleResume} onMouseEnter={handleHover}>
            RESUME
          </button>
          <button className="pause-btn pause-btn-options" onClick={handleOptions} onMouseEnter={handleHover}>
            OPTIONS
          </button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit} onMouseEnter={handleHover}>
            QUIT TO MENU
          </button>
        </div>

        <p className="pause-hint">Press ESC to resume</p>
      </div>
    </div>
  );
}
