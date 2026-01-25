import { useState, useCallback } from 'react';
import { audioManager } from '../game/audio/AudioManager';
import './OptionsMenu.css';

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
    <div className="options-overlay">
      <div className="options-panel">
        <h2 className="options-title">OPTIONS</h2>
        
        <div className="options-section">
          <h3 className="section-title">Audio</h3>
          
          <div className="option-row">
            <label htmlFor="master-volume" className="option-label">
              Master Volume
            </label>
            <div className="slider-container">
              <input
                type="range"
                id="master-volume"
                min="0"
                max="100"
                value={masterVolume}
                onChange={handleMasterVolumeChange}
                className="volume-slider"
              />
              <span className="volume-value">{masterVolume}%</span>
            </div>
          </div>
          
          <div className="option-row">
            <label htmlFor="music-volume" className="option-label">
              Music Volume
            </label>
            <div className="slider-container">
              <input
                type="range"
                id="music-volume"
                min="0"
                max="100"
                value={musicVolume}
                onChange={handleMusicVolumeChange}
                className="volume-slider"
              />
              <span className="volume-value">{musicVolume}%</span>
            </div>
          </div>
        </div>
        
        <button 
          className="options-btn options-btn-close" 
          onClick={handleClose}
          onMouseEnter={handleHover}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
