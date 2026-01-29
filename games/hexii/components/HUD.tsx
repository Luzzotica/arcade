import { useGameStore } from "../store/gameStore";
import { formatHealthForDisplay } from "../game/config/SynergyConfig";
import { usePresence } from "@/lib/supabase/hooks";

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
  const { currentGamePlayers } = usePresence("hexii");

  const hpPercent = (hp / maxHp) * 100;
  const shieldPercent = maxShield > 0 ? (shield / maxShield) * 100 : 0;
  const expPercent = (exp / expToNextLevel) * 100;

  // Calculate other players (excluding current player)
  // currentGamePlayers includes the current player, so subtract 1 to get others
  const totalPlayers = currentGamePlayers || 0;
  const otherPlayers = totalPlayers > 0 ? totalPlayers - 1 : 0;
  // Show if there are 2+ other players (meaning 3+ total players)
  const showOtherPlayers = otherPlayers >= 1;

  return (
    <>
      <div className="absolute top-0 left-0 right-0 flex justify-between p-3 md:p-5 pointer-events-none z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 md:gap-2.5">
            <div className="font-orbitron text-[10px] md:text-xs font-bold w-[50px] md:w-[60px] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              HP
            </div>
            <div className="relative w-[150px] md:w-[200px] h-4 md:h-5 bg-black/60 border-2 border-white/30 rounded overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff4757] to-[#ff6b81] shadow-[0_0_15px_rgba(255,71,87,0.6)] transition-[width] duration-200"
                style={{ width: `${hpPercent}%` }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-orbitron text-[9px] md:text-[11px] font-semibold text-white drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">
                {formatHealthForDisplay(hp, maxHp)}
              </div>
            </div>
          </div>

          {maxShield > 0 && (
            <div className="flex items-center gap-2 md:gap-2.5">
              <div className="font-orbitron text-[10px] md:text-xs font-bold w-[50px] md:w-[60px] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                SHIELD
              </div>
              <div className="relative w-[150px] md:w-[200px] h-4 md:h-5 bg-black/60 border-2 border-white/30 rounded overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#3742fa] to-[#5f27cd] shadow-[0_0_15px_rgba(55,66,250,0.6)] transition-[width] duration-200"
                  style={{ width: `${shieldPercent}%` }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-orbitron text-[9px] md:text-[11px] font-semibold text-white drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">
                  {formatHealthForDisplay(shield, maxShield)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col items-end">
            <span className="font-orbitron text-[8px] md:text-[10px] text-white/60 uppercase tracking-[1px] md:tracking-[2px]">
              SCORE
            </span>
            <span className="font-orbitron text-xl md:text-3xl font-bold text-[#ffa502] drop-shadow-[0_0_20px_rgba(255,165,2,0.6)]">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-orbitron text-[8px] md:text-[10px] text-white/60 uppercase tracking-[1px] md:tracking-[2px]">
              WAVE
            </span>
            <span className="font-orbitron text-lg md:text-2xl font-bold text-[#2ed573] drop-shadow-[0_0_20px_rgba(46,213,115,0.6)]">
              {wave}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex flex-col md:grid md:grid-cols-3 items-end p-3 md:p-5 pointer-events-none z-10">
        {/* Empty div for grid layout on desktop */}
        <div className="hidden md:block" />

        {/* XP bar - full width on mobile, centered on desktop */}
        <div className="flex items-center justify-center w-full md:w-auto md:mx-auto">
          <div className="relative w-full md:w-[400px] h-4 md:h-5 bg-black/60 border-2 border-white/30 rounded overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#4dd0e1] to-[#26c6da] shadow-[0_0_15px_rgba(77,208,225,0.6)] transition-[width] duration-200"
              style={{ width: `${expPercent}%` }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-orbitron text-[9px] md:text-[11px] font-semibold text-white drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]">
              Level {level} - {exp} / {expToNextLevel}
            </div>
          </div>
        </div>

        {/* Playing now indicator - above XP bar on mobile, right column on desktop */}
        <div className="flex justify-end w-full md:w-auto mb-2 md:mb-0">
          {showOtherPlayers && (
            <div className="font-orbitron flex items-center gap-2 text-[10px] md:text-xs text-white/60 tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#2ed573] shadow-[0_0_8px_#2ed573] animate-pulse" />
              {otherPlayers} other playing
            </div>
          )}
        </div>
      </div>
    </>
  );
}
