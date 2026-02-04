"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { GAME_CONSTANTS, GAME_WIDTH } from "../game/config";
import { usePresence } from "@/lib/supabase/hooks";

export function HUD() {
  const height = useGameStore((state) => state.height);
  const maxHeight = useGameStore((state) => state.maxHeight);
  const graceOrbs = useGameStore((state) => state.graceOrbs);
  const hasNearMissBoost = useGameStore((state) => state.hasNearMissBoost);
  const [playableAreaLeft, setPlayableAreaLeft] = useState(0);
  const { currentGamePlayers } = usePresence("rocket-to-heaven");

  // Calculate other players (excluding current player)
  const totalPlayers = currentGamePlayers || 0;
  const otherPlayers = totalPlayers > 0 ? totalPlayers - 1 : 0;
  const showOtherPlayers = otherPlayers >= 1;

  // Calculate playable area position (centered)
  useEffect(() => {
    const updatePlayableArea = () => {
      if (typeof window !== "undefined") {
        const left = (window.innerWidth - GAME_WIDTH) / 2;
        setPlayableAreaLeft(left);
      }
    };

    updatePlayableArea();
    window.addEventListener("resize", updatePlayableArea);
    return () => window.removeEventListener("resize", updatePlayableArea);
  }, []);

  // Calculate progress percentage to heaven
  const progress = Math.min(100, (height / GAME_CONSTANTS.HEAVEN_HEIGHT) * 100);

  // Format height for display
  const formatHeight = (h: number) => {
    if (h >= 1000) {
      return `${(h / 1000).toFixed(1)}k`;
    }
    return h.toString();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none">
      {/* Top bar - positioned relative to playable area */}
      <div
        className="flex justify-between items-start p-4"
        style={{ left: `${playableAreaLeft}px`, width: `${GAME_WIDTH}px` }}
      >
        {/* Height display */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
          <div className="text-xs text-amber-200/60 uppercase tracking-wider mb-1">
            Altitude
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">
            {formatHeight(height)}
            <span className="text-lg text-amber-200/80 ml-1">ft</span>
          </div>
          <div className="text-xs text-white/40 mt-1">
            Best: {formatHeight(maxHeight)} ft
          </div>
        </div>
      </div>

      {/* Grace orbs display - positioned in top right corner of screen */}
      <div className="fixed top-4 right-4 bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
        <div className="text-xs text-amber-200/60 uppercase tracking-wider mb-2">
          Grace
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                i < graceOrbs
                  ? "bg-gradient-to-br from-amber-300 to-amber-500 border-amber-200 shadow-lg shadow-amber-500/50"
                  : "bg-black/20 border-white/20"
              }`}
            >
              {i < graceOrbs && (
                <div className="w-3 h-3 rounded-full bg-white/80" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar to heaven - centered in playable area */}
      <div
        className="absolute top-4 w-48"
        style={{
          left: `${playableAreaLeft + GAME_WIDTH / 2}px`,
          transform: "translateX(-50%)",
        }}
      >
        <div className="text-center text-xs text-amber-200/60 uppercase tracking-wider mb-2">
          Journey to Heaven
        </div>
        <div className="h-2 bg-black/30 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-xs text-white/60 mt-1">
          {progress.toFixed(1)}%
        </div>
      </div>

      {/* Near miss boost indicator - centered in playable area */}
      {hasNearMissBoost && (
        <div
          className="absolute top-32 animate-pulse"
          style={{
            left: `${playableAreaLeft + GAME_WIDTH / 2}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-amber-400/40">
            <div className="text-amber-300 text-sm font-bold uppercase tracking-wider">
              ✨ Boost Active ✨
            </div>
          </div>
        </div>
      )}

      {/* Controls hint (desktop only) - positioned relative to playable area */}
      <div
        className="fixed bottom-4 text-white/30 text-xs hidden md:block"
        style={{ left: `${playableAreaLeft + 16}px` }}
      >
        <div>A/D or ←/→ to move</div>
        <div>Space or W to jump</div>
        <div>ESC to pause</div>
      </div>

      {/* Others ascending indicator - bottom right of playable area */}
      {showOtherPlayers && (
        <div
          className="fixed bottom-4 text-white/60 text-xs tracking-wide"
          style={{
            left: `${playableAreaLeft + GAME_WIDTH - 16}px`,
            transform: "translateX(-100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
            <span>
              {otherPlayers} other{otherPlayers !== 1 ? "s" : ""} ascending
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
