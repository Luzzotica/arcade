import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';

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
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[rgba(0,20,40,0.95)] backdrop-blur-[10px] flex justify-center items-center z-[200] animate-[fadeIn_0.5s_ease-out]">
      <div className="bg-gradient-to-br from-[rgba(20,40,60,0.95)] to-[rgba(10,30,50,0.98)] border-2 border-[rgba(50,150,255,0.4)] rounded-[20px] p-8 md:p-12 min-w-[320px] md:min-w-[500px] max-w-[600px] text-center shadow-[0_20px_80px_rgba(0,0,0,0.7),0_0_100px_rgba(50,150,255,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-center gap-5 mb-5">
          <span className="text-4xl md:text-5xl text-[#3296ff] drop-shadow-[0_0_30px_rgba(50,150,255,0.8)] animate-[rotate_10s_linear_infinite]">⬡</span>
          <h1 className="font-orbitron text-2xl md:text-3xl font-bold text-white m-0 tracking-[2px] md:tracking-[4px] drop-shadow-[0_0_30px_rgba(50,150,255,0.6),0_0_60px_rgba(50,150,255,0.3)] animate-[glow_2s_ease-in-out_infinite_alternate]">
            HEXAGON SUPREMACY
          </h1>
          <span className="text-4xl md:text-5xl text-[#3296ff] drop-shadow-[0_0_30px_rgba(50,150,255,0.8)] animate-[rotate_10s_linear_infinite]">⬡</span>
        </div>
        
        <p className="font-['Georgia',serif] text-sm md:text-base text-white/70 italic m-0 mb-8">
          The Septagon has fallen. Hexagonal perfection reigns supreme.
        </p>
        
        <div className="grid grid-cols-2 gap-5 mb-8 p-5 bg-black/30 rounded-xl border border-[rgba(50,150,255,0.2)]">
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Final Score</span>
            <span className="font-orbitron text-xl md:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{score.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Waves Survived</span>
            <span className="font-orbitron text-xl md:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{wave}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Level Reached</span>
            <span className="font-orbitron text-xl md:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{level}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-[10px] md:text-xs text-white/50 uppercase tracking-wide">Bosses Defeated</span>
            <span className="font-orbitron text-xl md:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{bossesDefeated}</span>
          </div>
        </div>

        <div className="mb-8 p-5 bg-[rgba(50,150,255,0.1)] rounded-lg border-l-[3px] border-[rgba(50,150,255,0.6)] text-left">
          <p className="font-orbitron text-xs text-[#3296ff] uppercase tracking-wide m-0 mb-3">Why Hexagons Are The Bestagons:</p>
          <ul className="m-0 pl-5 font-['Georgia',serif] text-xs md:text-sm text-white/80 leading-relaxed list-disc">
            <li className="mb-1">Maximum area with minimum perimeter</li>
            <li className="mb-1">120° angles distribute stress evenly</li>
            <li className="mb-1">Perfect tessellation with no wasted space</li>
            <li className="mb-1">6 neighbors vs 4 for squares</li>
            <li className="mb-1">Nature's choice: honeycombs, basalt columns, turtle shells</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <button 
            className="font-orbitron text-sm font-bold px-8 py-4 border-none rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] min-h-[44px] bg-gradient-to-r from-[#3296ff] to-[#0066cc] text-white shadow-[0_4px_20px_rgba(50,150,255,0.4)] hover:bg-gradient-to-r hover:from-[#44a8ff] hover:to-[#2288ee] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(50,150,255,0.5)] active:translate-y-0.5"
            onClick={handleContinue}
            onMouseEnter={handleHover}
          >
            CONTINUE PLAYING
          </button>
          <button 
            className="font-orbitron text-sm font-bold px-8 py-4 border border-white/20 rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] min-h-[44px] bg-white/10 text-white/70 hover:bg-white/20 hover:text-white hover:border-white/40 active:translate-y-0.5"
            onClick={handleReturnToMenu}
            onMouseEnter={handleHover}
          >
            RETURN TO MENU
          </button>
        </div>

        <p className="font-orbitron text-[10px] md:text-xs text-white/40 m-0">
          Continue to face increasingly difficult bosses for a higher score!
        </p>
      </div>
    </div>
  );
}
