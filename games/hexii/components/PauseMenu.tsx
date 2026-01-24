import { useGameStore } from '../store/gameStore';
import './PauseMenu.css';

interface PauseMenuProps {
  onQuit: () => void;
}

export function PauseMenu({ onQuit }: PauseMenuProps) {
  const closePauseMenu = useGameStore((state) => state.closePauseMenu);
  const reset = useGameStore((state) => state.reset);
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);

  const handleResume = () => {
    closePauseMenu();
  };

  const handleRestart = () => {
    // Get current core color before reset
    const ship = useGameStore.getState().ship;
    const coreHex = ship['0,0'];
    const coreColor = coreHex?.color || 'RED';
    
    reset();
    useGameStore.getState().initializeShip(coreColor);
    closePauseMenu();
  };

  const handleQuit = () => {
    reset();
    onQuit();
  };

  return (
    <div className="pause-overlay">
      <div className="pause-panel">
        <h2 className="pause-title">PAUSED</h2>
        
        <div className="pause-stats">
          <div className="pause-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score.toLocaleString()}</span>
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
          <button className="pause-btn pause-btn-resume" onClick={handleResume}>
            RESUME
          </button>
          <button className="pause-btn pause-btn-restart" onClick={handleRestart}>
            RESTART
          </button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>
            QUIT TO MENU
          </button>
        </div>

        <p className="pause-hint">Press ESC to resume</p>
      </div>
    </div>
  );
}
