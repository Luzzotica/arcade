import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';
import './WinScreen.css';

interface WinScreenProps {
  onReturnToMenu: () => void;
}

export function WinScreen({ onReturnToMenu }: WinScreenProps) {
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);
  const bossesDefeated = useGameStore((state) => state.bossesDefeated);
  const reset = useGameStore((state) => state.reset);
  const setWinScreen = useGameStore((state) => state.setWinScreen);

  const handleContinue = () => {
    audioManager.playSFX('ui-click');
    // Close win screen and continue playing
    setWinScreen(false);
  };

  const handleReturnToMenu = () => {
    audioManager.playSFX('ui-click');
    reset();
    onReturnToMenu();
  };
  
  const handleHover = () => {
    audioManager.playSFX('ui-hover');
  };

  return (
    <div className="win-overlay">
      <div className="win-panel">
        <div className="win-header">
          <span className="win-hex">⬡</span>
          <h1 className="win-title">HEXAGON SUPREMACY</h1>
          <span className="win-hex">⬡</span>
        </div>
        
        <p className="win-subtitle">
          The Septagon has fallen. Hexagonal perfection reigns supreme.
        </p>
        
        <div className="win-stats">
          <div className="win-stat">
            <span className="stat-label">Final Score</span>
            <span className="stat-value score-value">{score.toLocaleString()}</span>
          </div>
          <div className="win-stat">
            <span className="stat-label">Waves Survived</span>
            <span className="stat-value">{wave}</span>
          </div>
          <div className="win-stat">
            <span className="stat-label">Level Reached</span>
            <span className="stat-value">{level}</span>
          </div>
          <div className="win-stat">
            <span className="stat-label">Bosses Defeated</span>
            <span className="stat-value">{bossesDefeated}</span>
          </div>
        </div>

        <div className="win-facts">
          <p className="fact-title">Why Hexagons Are The Bestagons:</p>
          <ul className="fact-list">
            <li>Maximum area with minimum perimeter</li>
            <li>120° angles distribute stress evenly</li>
            <li>Perfect tessellation with no wasted space</li>
            <li>6 neighbors vs 4 for squares</li>
            <li>Nature's choice: honeycombs, basalt columns, turtle shells</li>
          </ul>
        </div>

        <div className="win-actions">
          <button className="win-btn win-btn-continue" onClick={handleContinue} onMouseEnter={handleHover}>
            CONTINUE PLAYING
          </button>
          <button className="win-btn win-btn-menu" onClick={handleReturnToMenu} onMouseEnter={handleHover}>
            RETURN TO MENU
          </button>
        </div>

        <p className="win-hint">
          Continue to face increasingly difficult bosses for a higher score!
        </p>
      </div>
    </div>
  );
}
