import { useEffect, useState } from 'react';
import { useHighScores } from '@/lib/supabase/hooks';
import { useAuth } from '@/lib/supabase/auth-context';
import { createClient } from '@/lib/supabase/client';
import './Leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  best_score: number;
  best_wave: number;
  best_level: number;
  total_plays: number;
}

interface LeaderboardProps {
  refreshKey?: number;
}

export function Leaderboard({ refreshKey }: LeaderboardProps) {
  const { user } = useAuth();
  const { getLeaderboard, getPersonalStats } = useHighScores('hexii');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch leaderboard
      const lb = await getLeaderboard(10);
      setLeaderboard(lb);

      // Get current user's display name for highlighting
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        
        setCurrentUserDisplayName(profile?.display_name || null);
      } else {
        setCurrentUserDisplayName(null);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user, refreshKey]);

  if (loading) {
    return (
      <div className="leaderboard-container">
        <h3 className="leaderboard-title">LEADERBOARD</h3>
        <div className="leaderboard-loading">Loading...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="leaderboard-container">
        <h3 className="leaderboard-title">LEADERBOARD</h3>
        <div className="leaderboard-empty">No scores yet. Be the first!</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h3 className="leaderboard-title">LEADERBOARD</h3>
      <div className="leaderboard-list">
        {leaderboard.map((entry) => {
          const isCurrentUser = currentUserDisplayName && 
            entry.display_name.toLowerCase() === currentUserDisplayName.toLowerCase();
          
          return (
            <div
              key={entry.rank}
              className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''}`}
            >
              <span className="leaderboard-rank">#{entry.rank}</span>
              <span className="leaderboard-name">{entry.display_name}</span>
              <span className="leaderboard-score">{entry.best_score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
