import { useGameStore } from '../store/gameStore';
import './HUD.css';

export function HUD() {
  const hp = useGameStore((state) => state.hp);
  const maxHp = useGameStore((state) => state.maxHp);
  const shield = useGameStore((state) => state.shield);
  const maxShield = useGameStore((state) => state.maxShield);
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);
  const exp = useGameStore((state) => state.exp);
  const expToNextLevel = useGameStore((state) => state.expToNextLevel);

  const hpPercent = (hp / maxHp) * 100;
  const shieldPercent = maxShield > 0 ? (shield / maxShield) * 100 : 0;
  const expPercent = (exp / expToNextLevel) * 100;

  return (
    <>
      <div className="hud">
        <div className="hud-left">
          <div className="stat-bar hp-bar">
            <div className="bar-label">HP</div>
            <div className="bar-container">
              <div 
                className="bar-fill hp-fill" 
                style={{ width: `${hpPercent}%` }}
              />
              <div className="bar-text">{hp} / {maxHp}</div>
            </div>
          </div>
          
          {maxShield > 0 && (
            <div className="stat-bar shield-bar">
              <div className="bar-label">SHIELD</div>
              <div className="bar-container">
                <div 
                  className="bar-fill shield-fill" 
                  style={{ width: `${shieldPercent}%` }}
                />
                <div className="bar-text">{shield} / {maxShield}</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="hud-right">
          <div className="score">
            <span className="score-label">SCORE</span>
            <span className="score-value">{score.toLocaleString()}</span>
          </div>
          <div className="wave">
            <span className="wave-label">WAVE</span>
            <span className="wave-value">{wave}</span>
          </div>
        </div>
      </div>
      
      <div className="hud-bottom">
        <div className="exp-bar-bottom">
          <div className="bar-container exp-container">
            <div 
              className="bar-fill exp-fill" 
              style={{ width: `${expPercent}%` }}
            />
            <div className="bar-text">Level {level} - {exp} / {expToNextLevel}</div>
          </div>
        </div>
      </div>
    </>
  );
}
