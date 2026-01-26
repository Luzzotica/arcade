import { useState, useCallback } from 'react';
import { audioManager } from '../game/audio/AudioManager';

interface OptionsMenuProps {
  onClose: () => void;
}

export function OptionsMenu({ onClose }: OptionsMenuProps) {
  const [masterVolume, setMasterVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(40); // Default is 0.4
  
  const handleMasterVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setMasterVolume(value);
    audioManager.setMasterVolume(value / 100);
  }, []);
  
  const handleMusicVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setMusicVolume(value);
    audioManager.setMusicVolume(value / 100);
  }, []);
  
  const handleClose = useCallback(() => {
    audioManager.playSFX('ui-click');
    onClose();
  }, [onClose]);
  
  const handleHover = useCallback(() => {
    audioManager.playSFX('ui-hover');
  }, []);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-gradient-to-br from-[rgba(30,30,50,0.95)] to-[rgba(20,20,35,0.98)] border-2 border-white/10 rounded-2xl p-8 md:p-10 min-w-[320px] md:min-w-[400px] max-w-[500px] shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="font-orbitron text-center text-2xl md:text-3xl font-bold text-white m-0 mb-6 uppercase tracking-[2px] md:tracking-[4px] drop-shadow-[0_0_20px_rgba(100,200,255,0.5)]">OPTIONS</h2>
        
        <div className="mb-6">
          <h3 className="font-orbitron text-sm font-bold text-white/60 m-0 mb-4 uppercase tracking-wide border-b border-white/10 pb-2">Audio</h3>
          
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="master-volume" className="font-orbitron text-base text-white/90">
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
                className="w-[120px] md:w-[150px] h-1.5 appearance-none bg-white/10 rounded outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-[#64c8ff] [&::-webkit-slider-thumb]:to-[#4080ff] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(100,200,255,0.5)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:hover:shadow-[0_0_20px_rgba(100,200,255,0.8)] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-[#64c8ff] [&::-moz-range-thumb]:to-[#4080ff] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(100,200,255,0.5)]"
              />
              <span className="text-sm text-white/70 min-w-[45px] text-right font-mono">{masterVolume}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="music-volume" className="font-orbitron text-base text-white/90">
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
                className="w-[120px] md:w-[150px] h-1.5 appearance-none bg-white/10 rounded outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-[#64c8ff] [&::-webkit-slider-thumb]:to-[#4080ff] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(100,200,255,0.5)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:hover:shadow-[0_0_20px_rgba(100,200,255,0.8)] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-[#64c8ff] [&::-moz-range-thumb]:to-[#4080ff] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(100,200,255,0.5)]"
              />
              <span className="text-sm text-white/70 min-w-[45px] text-right font-mono">{musicVolume}%</span>
            </div>
          </div>
        </div>
        
        <button 
          className="font-orbitron block w-full px-6 py-3.5 text-base font-bold uppercase tracking-[2px] border-none rounded-lg cursor-pointer transition-all mt-2 min-h-[44px] bg-gradient-to-br from-[rgba(100,200,255,0.2)] to-[rgba(64,128,255,0.3)] text-[#64c8ff] border border-[rgba(100,200,255,0.3)] hover:bg-gradient-to-br hover:from-[rgba(100,200,255,0.3)] hover:to-[rgba(64,128,255,0.4)] hover:shadow-[0_0_20px_rgba(100,200,255,0.3)] hover:-translate-y-0.5 active:translate-y-0"
          onClick={handleClose}
          onMouseEnter={handleHover}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
