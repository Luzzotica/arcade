import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import './WaveAnnouncement.css';

export function WaveAnnouncement() {
  const wave = useGameStore((state) => state.wave);
  const showWaveAnnouncement = useGameStore((state) => state.showWaveAnnouncement);
  const setWaveAnnouncement = useGameStore((state) => state.setWaveAnnouncement);

  useEffect(() => {
    if (showWaveAnnouncement) {
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setWaveAnnouncement(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showWaveAnnouncement, setWaveAnnouncement]);

  if (!showWaveAnnouncement) return null;

  return (
    <div className="wave-announcement">
      <div className="wave-announcement-text">
        WAVE {wave}
      </div>
    </div>
  );
}
