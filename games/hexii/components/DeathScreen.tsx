import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { audioManager } from '../game/audio/AudioManager';
import { useAuth } from '@/lib/supabase/auth-context';
import { useHighScores } from '@/lib/supabase/hooks';
import { AuthModal } from '@/components/auth/AuthModal';
import './DeathScreen.css';

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
  
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleReturnToMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReturnToMenu = () => {
    audioManager.playSFX('ui-click');
    reset();
    onReturnToMenu();
  };
  
  const handleHover = () => {
    audioManager.playSFX('ui-hover');
  };

  return (
    <div className="death-overlay">
      <div className="death-panel">
        <h1 className="death-title">GAME OVER</h1>
        
        {isNewHighScore && user && (
          <div className="new-high-score">NEW HIGH SCORE!</div>
        )}
        
        <div className="death-stats">
          <div className="death-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="death-stat">
            <span className="stat-label">Wave</span>
            <span className="stat-value">{wave}</span>
          </div>
          <div className="death-stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{level}</span>
          </div>
        </div>

        {personalBest !== null && (
          <div className="personal-best">
            Personal Best: {personalBest.toLocaleString()}
            {userRank && <span className="rank"> (Rank #{userRank})</span>}
          </div>
        )}

        {!user && (
          <button 
            className="death-btn sign-in-btn" 
            onClick={() => setShowAuthModal(true)}
            onMouseEnter={handleHover}
          >
            SIGN IN TO SAVE SCORE
          </button>
        )}

        {user && !scoreSubmitted && !hasSubmittedRef.current && (
          <button 
            className="death-btn submit-btn" 
            onClick={handleSubmitScore}
            onMouseEnter={handleHover}
            disabled={submitting}
          >
            {submitting ? 'SAVING...' : 'SAVE SCORE'}
          </button>
        )}

        {scoreSubmitted && (
          <div className="score-saved">Score saved to leaderboard!</div>
        )}

        {leaderboard.length > 0 && (
          <div className="mini-leaderboard">
            <h3>Top Scores</h3>
            <div className="leaderboard-list">
              {leaderboard.map((entry) => (
                <div 
                  key={entry.rank} 
                  className="leaderboard-entry"
                >
                  <span className="lb-rank">#{entry.rank}</span>
                  <span className="lb-name">{entry.display_name}</span>
                  <span className="lb-score">{entry.best_score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="death-btn" onClick={handleReturnToMenu} onMouseEnter={handleHover}>
          RETURN TO MENU
        </button>

        <p className="death-hint">Press R to return to menu</p>
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
