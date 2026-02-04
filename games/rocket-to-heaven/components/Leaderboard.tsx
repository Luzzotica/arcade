"use client";

import { useEffect, useState } from "react";
import { useHighScores } from "@/lib/supabase/hooks";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  best_score: number;
  total_plays: number;
}

interface LeaderboardProps {
  refreshKey?: number;
}

export function Leaderboard({ refreshKey }: LeaderboardProps) {
  const { user } = useAuth();
  const { getLeaderboard } = useHighScores("rocket-to-heaven");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const lb = await getLeaderboard(10);
        setLeaderboard(lb);

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
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
      <div className="mx-auto mt-8 w-full max-w-[500px] bg-black/30 backdrop-blur-sm border border-blue-200/20 rounded-2xl p-6">
        <h3 className="text-sm tracking-widest text-blue-200/70 mb-5 text-center uppercase font-bold">
          HIGHEST ALTITUDES
        </h3>
        <div className="text-xs text-white/40 text-center py-5">Loading...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="mx-auto mt-8 w-full max-w-[500px] bg-black/30 backdrop-blur-sm border border-blue-200/20 rounded-2xl p-6">
        <h3 className="text-sm tracking-widest text-blue-200/70 mb-5 text-center uppercase font-bold">
          HIGHEST ALTITUDES
        </h3>
        <div className="text-xs text-white/40 text-center py-5">
          No scores yet. Be the first to ascend!
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-[500px] bg-black/30 backdrop-blur-sm border border-blue-200/20 rounded-2xl p-6">
      <h3 className="text-sm tracking-widest text-blue-200/70 mb-5 text-center uppercase font-bold">
        HIGHEST ALTITUDES
      </h3>
      <div className="flex flex-col gap-2 bg-black/40 border border-white/10 rounded-lg p-4 max-h-[300px] overflow-y-auto">
        {leaderboard.map((entry) => {
          const isCurrentUser =
            currentUserDisplayName &&
            entry.display_name.toLowerCase() ===
              currentUserDisplayName.toLowerCase();

          return (
            <div
              key={entry.rank}
              className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-md transition-all hover:bg-white/[0.05] ${isCurrentUser ? "bg-blue-500/20 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : ""}`}
            >
              <span
                className={`text-sm font-bold text-right ${isCurrentUser ? "text-white/90" : "text-white/60"}`}
              >
                #{entry.rank}
              </span>
              <span
                className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap ${isCurrentUser ? "text-white font-bold" : "text-white/90"}`}
              >
                {entry.display_name}
              </span>
              <span
                className={`text-sm font-bold text-right ${isCurrentUser ? "text-blue-300" : "text-blue-400"}`}
              >
                {entry.best_score.toLocaleString()} ft
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
