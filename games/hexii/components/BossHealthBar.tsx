import { useGameStore } from '../store/gameStore';
import './BossHealthBar.css';

export function BossHealthBar() {
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);

  if (bossHp === null || bossMaxHp === null) {
    return null;
  }

  const healthPercent = Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100));
  
  // Color based on health percentage
  let fillColor = '#ff0000'; // Red
  if (healthPercent > 50) {
    fillColor = '#ff0000'; // Red for >50%
  } else if (healthPercent > 25) {
    fillColor = '#ff8800'; // Orange for 25-50%
  } else {
    fillColor = '#ff0000'; // Red for <25%
  }
  
  // Gradient based on health
  const gradient = healthPercent > 50 
    ? 'linear-gradient(90deg, #ff0000, #ff4444)' 
    : healthPercent > 25 
    ? 'linear-gradient(90deg, #ff8800, #ffaa44)' 
    : 'linear-gradient(90deg, #ff0000, #ff4444)';

  return (
    <div className="boss-health-bar-container">
      <div className="boss-health-bar">
        <div className="boss-health-bar-bg">
          <div 
            className="boss-health-bar-fill"
            style={{ 
              width: `${healthPercent}%`,
              background: gradient,
            }}
          />
        </div>
        <div className="boss-health-bar-text">
          BOSS HP: {Math.ceil(bossHp)}/{bossMaxHp} ({Math.ceil(healthPercent)}%)
        </div>
      </div>
    </div>
  );
}
