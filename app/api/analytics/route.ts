import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Get analytics for all games
export async function GET() {
  const supabase = createAdminClient();

  // Get all game sessions
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('game_id, started_at, ended_at, final_score');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Aggregate by game
  const gameStats = new Map<string, {
    total_sessions: number;
    sessions_today: number;
    sessions_this_week: number;
    total_play_time: number;
    total_score: number;
    sessions_with_score: number;
  }>();

  sessions?.forEach((session) => {
    const gameId = session.game_id;
    if (!gameStats.has(gameId)) {
      gameStats.set(gameId, {
        total_sessions: 0,
        sessions_today: 0,
        sessions_this_week: 0,
        total_play_time: 0,
        total_score: 0,
        sessions_with_score: 0,
      });
    }

    const stats = gameStats.get(gameId)!;
    stats.total_sessions++;
    
    const startedAt = new Date(session.started_at);
    if (startedAt >= today) stats.sessions_today++;
    if (startedAt >= weekAgo) stats.sessions_this_week++;
    
    if (session.ended_at) {
      const playTime = (new Date(session.ended_at).getTime() - startedAt.getTime()) / 1000;
      stats.total_play_time += playTime;
    }
    
    if (session.final_score !== null) {
      stats.total_score += session.final_score;
      stats.sessions_with_score++;
    }
  });

  const games = Array.from(gameStats.entries()).map(([gameId, stats]) => ({
    game_id: gameId,
    total_sessions: stats.total_sessions,
    sessions_today: stats.sessions_today,
    sessions_this_week: stats.sessions_this_week,
    avg_play_time_seconds: stats.total_sessions > 0 ? stats.total_play_time / stats.total_sessions : 0,
    avg_final_score: stats.sessions_with_score > 0 ? stats.total_score / stats.sessions_with_score : 0,
  }));

  // Get total unique players across all games
  const { count: totalPlayers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get total scores submitted
  const { count: totalScores } = await supabase
    .from('high_scores')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    games,
    total_players: totalPlayers || 0,
    total_scores: totalScores || 0,
  });
}
