'use client';

import { useRef, useCallback } from 'react';
import { createClient } from '../client';
import { useAuth } from '../auth-context';

export function useGameSession(gameId: string) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const supabase = createClient();

  const startSession = useCallback(async () => {
    startTimeRef.current = Date.now();

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user?.id || null,
          game_id: gameId,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to start game session:', error);
        return null;
      }

      sessionIdRef.current = data.id;
      return data.id;
    } catch (err) {
      console.error('Failed to start game session:', err);
      return null;
    }
  }, [gameId, user?.id, supabase]);

  const endSession = useCallback(
    async (finalScore: number, finalWave: number, finalLevel: number) => {
      if (!sessionIdRef.current) return;

      try {
        const { error } = await supabase
          .from('game_sessions')
          .update({
            ended_at: new Date().toISOString(),
            final_score: finalScore,
            final_wave: finalWave,
            final_level: finalLevel,
          })
          .eq('id', sessionIdRef.current);

        if (error) {
          console.error('Failed to end game session:', error);
        }
      } catch (err) {
        console.error('Failed to end game session:', err);
      }

      sessionIdRef.current = null;
      startTimeRef.current = null;
    },
    [supabase]
  );

  const getPlayTimeSeconds = useCallback(() => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  return {
    sessionId: sessionIdRef.current,
    startSession,
    endSession,
    getPlayTimeSeconds,
  };
}
