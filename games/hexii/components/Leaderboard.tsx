import { useEffect, useState } from 'react';
import { useHighScores } from '@/lib/supabase/hooks';
import { useAuth } from '@/lib/supabase/auth-context';
import { createClient } from '@/lib/supabase/client';

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
      
      try {
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
      } catch (error) {
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, refreshKey, getLeaderboard, supabase]);

  if (loading) {
    return (
      <div className="mx-auto mt-10 w-full max-w-[500px] bg-gradient-to-br from-[rgba(26,26,46,0.95)] to-[rgba(20,20,40,0.98)] border-2 border-white/15 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(55,66,250,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h3 className="font-orbitron text-xs md:text-sm tracking-[3px] md:tracking-[6px] text-white/70 mb-5 text-center uppercase font-bold">LEADERBOARD</h3>
        <div className="font-orbitron text-xs text-white/40 text-center py-5">Loading...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="mx-auto mt-10 w-full max-w-[500px] bg-gradient-to-br from-[rgba(26,26,46,0.95)] to-[rgba(20,20,40,0.98)] border-2 border-white/15 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(55,66,250,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h3 className="font-orbitron text-xs md:text-sm tracking-[3px] md:tracking-[6px] text-white/70 mb-5 text-center uppercase font-bold">LEADERBOARD</h3>
        <div className="font-orbitron text-xs text-white/40 text-center py-5">No scores yet. Be the first!</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-[500px] bg-gradient-to-br from-[rgba(26,26,46,0.95)] to-[rgba(20,20,40,0.98)] border-2 border-white/15 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(55,66,250,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
      <h3 className="font-orbitron text-xs md:text-sm tracking-[3px] md:tracking-[6px] text-white/70 mb-5 text-center uppercase font-bold">LEADERBOARD</h3>
      <div className="flex flex-col gap-2 bg-black/40 border border-white/10 rounded-lg p-4 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:hover:bg-white/30">
        {leaderboard.map((entry) => {
          const isCurrentUser = currentUserDisplayName && 
            entry.display_name.toLowerCase() === currentUserDisplayName.toLowerCase();
          
          return (
            <div
              key={entry.rank}
              className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-md transition-all hover:bg-white/[0.05] font-orbitron ${isCurrentUser ? 'bg-[rgba(55,66,250,0.2)] border border-[rgba(55,66,250,0.4)] shadow-[0_0_10px_rgba(55,66,250,0.3)]' : ''}`}
            >
              <span className={`text-sm font-bold text-right ${isCurrentUser ? 'text-white/90' : 'text-white/60'}`}>#{entry.rank}</span>
              <span className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap ${isCurrentUser ? 'text-white font-bold' : 'text-white/90'}`}>{entry.display_name}</span>
              <span className={`text-sm font-bold text-right ${isCurrentUser ? 'text-[#ffb733]' : 'text-[#ffa502]'}`}>{entry.best_score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
