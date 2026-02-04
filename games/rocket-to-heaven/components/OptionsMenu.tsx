"use client";

import { useState, useCallback, useEffect } from "react";
import { audioManager } from "../game/audio/AudioManager";
import { musicManager } from "@/lib/audio/MusicManager";

interface OptionsMenuProps {
  onClose: () => void;
}

export function OptionsMenu({ onClose }: OptionsMenuProps) {
  const [masterVolume, setMasterVolume] = useState(() =>
    Math.round(musicManager.getMasterVolume() * 100),
  );
  const [musicVolume, setMusicVolume] = useState(() =>
    Math.round(musicManager.getMusicVolume() * 100),
  );

  const handleMasterVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      setMasterVolume(value);
      musicManager.setMasterVolume(value / 100);
      audioManager.setMasterVolume(value / 100);
    },
    [],
  );

  const handleMusicVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      setMusicVolume(value);
      musicManager.setMusicVolume(value / 100);
    },
    [],
  );

  const handleClose = useCallback(() => {
    audioManager.playSFX("ui-click");
    onClose();
  }, [onClose]);

  const handleHover = useCallback(() => {
    audioManager.playSFX("ui-hover");
  }, []);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-2xl p-8 border border-amber-200/20 shadow-2xl shadow-amber-500/10 min-w-[320px] md:min-w-[400px] max-w-[500px]">
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
          OPTIONS
        </h2>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-amber-200/60 m-0 mb-4 uppercase tracking-wide border-b border-white/10 pb-2">
            Audio
          </h3>

          <div className="flex items-center justify-between mb-4">
            <label htmlFor="master-volume" className="text-base text-white/90">
              Master Volume
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                id="master-volume"
                min="0"
                max="100"
                value={masterVolume}
                onChange={handleMasterVolumeChange}
                className="w-[120px] md:w-[150px] h-1.5 appearance-none bg-white/10 rounded outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-amber-400 [&::-webkit-slider-thumb]:to-amber-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(251,191,36,0.5)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:hover:shadow-[0_0_20px_rgba(251,191,36,0.8)] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-amber-400 [&::-moz-range-thumb]:to-amber-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              />
              <span className="text-sm text-white/70 min-w-[45px] text-right font-mono">
                {masterVolume}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <label htmlFor="music-volume" className="text-base text-white/90">
              Music Volume
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                id="music-volume"
                min="0"
                max="100"
                value={musicVolume}
                onChange={handleMusicVolumeChange}
                className="w-[120px] md:w-[150px] h-1.5 appearance-none bg-white/10 rounded outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-amber-400 [&::-webkit-slider-thumb]:to-amber-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(251,191,36,0.5)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:hover:shadow-[0_0_20px_rgba(251,191,36,0.8)] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-amber-400 [&::-moz-range-thumb]:to-amber-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              />
              <span className="text-sm text-white/70 min-w-[45px] text-right font-mono">
                {musicVolume}%
              </span>
            </div>
          </div>
        </div>

        <button
          className="block w-full px-6 py-3.5 text-base font-bold uppercase tracking-[2px] border-none rounded-lg cursor-pointer transition-all mt-2 min-h-[44px] bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:-translate-y-0.5 active:translate-y-0"
          onClick={handleClose}
          onMouseEnter={handleHover}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
