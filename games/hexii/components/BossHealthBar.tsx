import { useGameStore } from '../store/gameStore';

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
    <div className="absolute top-0 left-0 right-0 flex justify-center pt-5 z-[100] pointer-events-none">
      <div className="flex flex-col items-center gap-2">
        <div className="w-[300px] md:w-[400px] h-6 md:h-[30px] bg-black/70 rounded-lg border-2 border-white/20 overflow-hidden relative shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div 
            className="h-full rounded-md transition-[width] duration-100 relative overflow-hidden shadow-[0_0_10px_rgba(255,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] after:content-[''] after:absolute after:top-0 after:left-0 after:right-0 after:bottom-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]"
            style={{ 
              width: `${healthPercent}%`,
              background: gradient,
            }}
          />
        </div>
        <div className="font-orbitron text-sm md:text-lg font-bold text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.5),0_2px_4px_rgba(0,0,0,0.8)] tracking-wide uppercase">
          BOSS HP: {Math.ceil(bossHp)}/{bossMaxHp} ({Math.ceil(healthPercent)}%)
        </div>
      </div>
    </div>
  );
}
