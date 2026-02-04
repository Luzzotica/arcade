"use client";

import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { audioManager } from "../game/audio/AudioManager";
import { OptionsMenu } from "./OptionsMenu";

interface PauseMenuProps {
  onQuit: () => void;
}

export function PauseMenu({ onQuit }: PauseMenuProps) {
  const [showOptions, setShowOptions] = useState(false);
  const closePauseMenu = useGameStore((state) => state.closePauseMenu);
  const height = useGameStore((state) => state.height);
  const maxHeight = useGameStore((state) => state.maxHeight);
  const reset = useGameStore((state) => state.reset);

  const handleResume = () => {
    audioManager.playSFX("ui-click");
    closePauseMenu();
  };

  const handleRestart = () => {
    audioManager.playSFX("ui-click");
    reset();
    closePauseMenu();
    // Reload the scene
    window.location.reload();
  };

  const handleQuit = () => {
    audioManager.playSFX("ui-click");
    reset();
    onQuit();
  };

  const handleHover = () => {
    audioManager.playSFX("ui-hover");
  };

  const handleOptions = () => {
    audioManager.playSFX("ui-click");
    setShowOptions(true);
  };

  if (showOptions) {
    return <OptionsMenu onClose={() => setShowOptions(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-800/95 rounded-2xl p-8 border border-blue-200/20 shadow-2xl shadow-blue-500/10 min-w-[320px]">
        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-200 to-blue-400 bg-clip-text text-transparent">
          Paused
        </h2>

        {/* Stats */}
        <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/10">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-blue-200/60 uppercase tracking-wider">
                Current
              </div>
              <div className="text-2xl font-bold text-white">
                {height.toLocaleString()} ft
              </div>
            </div>
            <div>
              <div className="text-xs text-blue-200/60 uppercase tracking-wider">
                Best
              </div>
              <div className="text-2xl font-bold text-blue-300">
                {maxHeight.toLocaleString()} ft
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleResume}
            onMouseEnter={handleHover}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
          >
            Resume
          </button>
          <button
            onClick={handleOptions}
            onMouseEnter={handleHover}
            className="w-full py-3 px-6 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all border border-white/10"
          >
            Options
          </button>
          <button
            onClick={handleRestart}
            onMouseEnter={handleHover}
            className="w-full py-3 px-6 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all border border-white/10"
          >
            Restart
          </button>
          <button
            onClick={handleQuit}
            onMouseEnter={handleHover}
            className="w-full py-3 px-6 rounded-xl bg-transparent text-white/60 font-medium hover:text-white hover:bg-white/10 transition-all"
          >
            Quit to Menu
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-white/30 text-xs mt-6">
          Press ESC to resume
        </p>
      </div>
    </div>
  );
}
