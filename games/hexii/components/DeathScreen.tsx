import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';
import { useAuth } from '@/lib/supabase/auth-context';
import { useHighScores } from '@/lib/supabase/hooks';
import { AuthModal } from '@/components/auth/AuthModal';

interface DeathScreenProps {
  onReturnToMenu: () => void;
  playTimeSeconds: number;
}

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  best_score: number;
  best_wave: number;
  best_level: number;
  total_plays: number;
}

export function DeathScreen({ onReturnToMenu, playTimeSeconds }: DeathScreenProps) {
  const score = useGameStore((state) => state.score);
  const wave = useGameStore((state) => state.wave);
  const level = useGameStore((state) => state.level);
  const reset = useGameStore((state) => state.reset);

  const { user } = useAuth();
  const { submitScore, getLeaderboard, getPersonalBest, getUserRank } = useHighScores('hexii');
  const showAuthModal = useGameStore((state) => state.showAuthModal);
  const setAuthModal = useGameStore((state) => state.setAuthModal);
  
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Auto-submit score if logged in
  useEffect(() => {
    if (user && !hasSubmittedRef.current && score > 0) {
      hasSubmittedRef.current = true;
      handleSubmitScore();
    }
  }, [user, score]);

  // Fetch leaderboard
  useEffect(() => {
    const fetchData = async () => {
      const [lb, pb, rank] = await Promise.all([
        getLeaderboard(5),
        getPersonalBest(),
        getUserRank(),
      ]);
      setLeaderboard(lb);
      if (pb) {
        setPersonalBest(pb.score);
        setIsNewHighScore(score > pb.score);
      } else if (user) {
        setIsNewHighScore(true);
      }
      setUserRank(rank);
    };
    fetchData();
  }, [scoreSubmitted]);

  const handleSubmitScore = async () => {
    if (!user || submitting || scoreSubmitted) return;
    
    setSubmitting(true);
    const { success } = await submitScore(score, wave, level, playTimeSeconds);
    setSubmitting(false);
    
    if (success) {
      setScoreSubmitted(true);
      // Refresh data
      const [lb, rank] = await Promise.all([getLeaderboard(5), getUserRank()]);
      setLeaderboard(lb);
      setUserRank(rank);
    }
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
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[rgba(20,0,0,0.6)] backdrop-blur-sm flex justify-center items-center z-[200] animate-[fadeIn_0.4s_ease-out]">
      <div className="bg-gradient-to-br from-[rgba(40,10,10,0.95)] to-[rgba(30,5,5,0.98)] border-2 border-[rgba(255,71,87,0.3)] rounded-2xl p-8 md:p-12 min-w-[320px] md:min-w-[400px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_60px_rgba(255,71,87,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h1 className="font-orbitron text-3xl md:text-5xl font-bold text-[#ff4757] m-0 mb-8 tracking-[4px] md:tracking-[8px] drop-shadow-[0_0_30px_rgba(255,71,87,0.8),0_0_60px_rgba(255,71,87,0.4)]">
          GAME OVER
        </h1>
        
        {isNewHighScore && user && (
          <div className="font-orbitron text-base md:text-lg font-bold text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] mb-4 animate-[pulse-scale_1s_ease-in-out_infinite]">
            NEW HIGH SCORE!
          </div>
        )}
        
        <div className="flex justify-center gap-8 md:gap-10 mb-8 md:mb-10 p-5 bg-black/40 rounded-lg border border-[rgba(255,71,87,0.2)]">
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-xs text-white/50 uppercase tracking-wide">Score</span>
            <span className="font-orbitron text-2xl md:text-3xl font-bold text-[#ffa502] drop-shadow-[0_0_10px_rgba(255,165,2,0.5)]">{score.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-xs text-white/50 uppercase tracking-wide">Wave</span>
            <span className="font-orbitron text-2xl md:text-3xl font-bold text-[#ffa502] drop-shadow-[0_0_10px_rgba(255,165,2,0.5)]">{wave}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-orbitron text-xs text-white/50 uppercase tracking-wide">Level</span>
            <span className="font-orbitron text-2xl md:text-3xl font-bold text-[#ffa502] drop-shadow-[0_0_10px_rgba(255,165,2,0.5)]">{level}</span>
          </div>
        </div>

        {personalBest !== null && (
          <div className="font-orbitron text-sm text-white/60 mb-5">
            Personal Best: {personalBest.toLocaleString()}
            {userRank && <span className="text-[#3742fa]"> (Rank #{userRank})</span>}
          </div>
        )}

        {!user && (
          <button 
            className="font-orbitron text-base font-bold px-10 py-4 border-none rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] mb-6 min-h-[44px] bg-gradient-to-r from-[#3742fa] to-[#5a67fa] text-white shadow-[0_4px_20px_rgba(55,66,250,0.4)] hover:bg-gradient-to-r hover:from-[#5a67fa] hover:to-[#7c86fa] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(55,66,250,0.5)] active:translate-y-0.5"
            onClick={() => setAuthModal(true)}
            onMouseEnter={handleHover}
          >
            SIGN IN TO SAVE SCORE
          </button>
        )}

        {user && !scoreSubmitted && !hasSubmittedRef.current && (
          <button 
            className="font-orbitron text-base font-bold px-10 py-4 border-none rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] mb-6 min-h-[44px] bg-gradient-to-r from-[#2ed573] to-[#7bed9f] text-white shadow-[0_4px_20px_rgba(46,213,115,0.4)] hover:bg-gradient-to-r hover:from-[#7bed9f] hover:to-[#2ed573] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(46,213,115,0.5)] active:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmitScore}
            onMouseEnter={handleHover}
            disabled={submitting}
          >
            {submitting ? 'SAVING...' : 'SAVE SCORE'}
          </button>
        )}

        {scoreSubmitted && (
          <div className="font-orbitron text-sm text-[#2ed573] mb-5">Score saved to leaderboard!</div>
        )}

        {leaderboard.length > 0 && (
          <div className="mb-6 p-4 bg-black/40 rounded-lg border border-[rgba(55,66,250,0.2)]">
            <h3 className="font-orbitron text-sm text-white/70 uppercase tracking-[1px] md:tracking-[2px] m-0 mb-3">Top Scores</h3>
            <div className="flex flex-col gap-2">
              {leaderboard.map((entry) => (
                <div 
                  key={entry.rank} 
                  className="flex items-center gap-3 px-3 py-2 bg-white/[0.05] rounded-md font-orbitron text-xs"
                >
                  <span className="text-white/50 w-[30px]">#{entry.rank}</span>
                  <span className="flex-1 text-white overflow-hidden text-ellipsis whitespace-nowrap">{entry.display_name}</span>
                  <span className="text-[#ffa502] font-bold">{entry.best_score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          className="font-orbitron text-base font-bold px-10 py-4 border-none rounded-lg cursor-pointer transition-all w-full uppercase tracking-[2px] mb-6 min-h-[44px] bg-gradient-to-r from-[#ff4757] to-[#ff6b81] text-white shadow-[0_4px_20px_rgba(255,71,87,0.4)] hover:bg-gradient-to-r hover:from-[#ff5f6d] hover:to-[#ff7f93] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(255,71,87,0.5)] active:translate-y-0.5"
          onClick={handleReturnToMenu}
          onMouseEnter={handleHover}
        >
          RETURN TO MENU
        </button>
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setAuthModal(false)} />
      )}
    </div>
  );
}
