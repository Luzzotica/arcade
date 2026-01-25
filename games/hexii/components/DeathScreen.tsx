import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';
import './DeathScreen.css';

interface DeathScreenProps {
  onReturnToMenu: () => void;
}

export function DeathScreen({ onReturnToMenu }: DeathScreenProps) {
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);
  const reset = useGameStore((state) => state.reset);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleReturnToMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReturnToMenu = () => {
    audioManager.playSFX('ui-click');
    reset();
    onReturnToMenu();
  };
  
  const handleHover = () => {
    audioManager.playSFX('ui-hover');
  };

  return (
    <div className="death-overlay">
      <div className="death-panel">
        <h1 className="death-title">GAME OVER</h1>
        
        <div className="death-stats">
          <div className="death-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="death-stat">
            <span className="stat-label">Wave</span>
            <span className="stat-value">{wave}</span>
          </div>
          <div className="death-stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{level}</span>
          </div>
        </div>

        <button className="death-btn" onClick={handleReturnToMenu} onMouseEnter={handleHover}>
          RETURN TO MENU
        </button>

        <p className="death-hint">Press R to return to menu</p>
      </div>
    </div>
  );
}
