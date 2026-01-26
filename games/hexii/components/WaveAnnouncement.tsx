import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

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
    <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center pointer-events-none z-[50]">
      <div className="font-orbitron text-3xl md:text-5xl lg:text-6xl font-bold text-[#ffa502] drop-shadow-[0_0_10px_rgba(255,165,2,0.4)] tracking-[4px] md:tracking-[8px] animate-[waveAnnouncementFade_2s_ease-out_forwards]">
        WAVE {wave}
      </div>
    </div>
  );
}
