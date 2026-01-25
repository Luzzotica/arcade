'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '../auth-context';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  best_score: number;
  best_wave: number;
  best_level: number;
  total_plays: number;
}

interface PersonalStats {
  personal_best: {
    score: number;
    wave: number;
    level: number;
    play_time_seconds: number;
    achieved_at: string;
  } | null;
  rank: number | null;
  is_public: boolean;
}

export function useHighScores(gameId: string) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitScore = useCallback(
    async (
      score: number,
      wave: number,
      level: number,
      playTimeSeconds: number,
      sessionId?: string
    ) => {
      if (!user) {
        return { success: false, error: 'Must be logged in to submit scores' };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/scores/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: gameId,
            score,
            wave,
            level,
            play_time_seconds: playTimeSeconds,
            session_id: sessionId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to submit score');
          return { success: false, error: data.error };
        }

        return { success: true, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [gameId, user]
  );

  const getLeaderboard = useCallback(
    async (limit = 10): Promise<LeaderboardEntry[]> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/scores/${gameId}?limit=${limit}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch leaderboard');
          return [];
        }

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [gameId]
  );

  const getPersonalStats = useCallback(async (): Promise<PersonalStats | null> => {
    if (!user) return null;

    try {
      const response = await fetch(`/api/scores/${gameId}/personal`);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to fetch personal stats:', err);
      return null;
    }
  }, [gameId, user]);

  // Convenience methods that use getPersonalStats
  const getPersonalBest = useCallback(async () => {
    const stats = await getPersonalStats();
    return stats?.personal_best || null;
  }, [getPersonalStats]);

  const getUserRank = useCallback(async () => {
    const stats = await getPersonalStats();
    return stats?.rank || null;
  }, [getPersonalStats]);

  return {
    submitScore,
    getLeaderboard,
    getPersonalBest,
    getPersonalStats,
    getUserRank,
    loading,
    error,
  };
}
