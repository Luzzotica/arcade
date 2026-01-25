import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const supabase = createAdminClient();

  // Get game sessions for this game
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('started_at, ended_at, final_score')
    .eq('game_id', gameId);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  let totalSessions = 0;
  let sessionsToday = 0;
  let sessionsThisWeek = 0;
  let totalPlayTime = 0;
  let totalScore = 0;
  let sessionsWithScore = 0;

  sessions?.forEach((session) => {
    totalSessions++;
    const startedAt = new Date(session.started_at);
    
    if (startedAt >= today) sessionsToday++;
    if (startedAt >= weekAgo) sessionsThisWeek++;
    
    if (session.ended_at) {
      const playTime = (new Date(session.ended_at).getTime() - startedAt.getTime()) / 1000;
      totalPlayTime += playTime;
    }
    
    if (session.final_score !== null) {
      totalScore += session.final_score;
      sessionsWithScore++;
    }
  });

  // Get unique players count
  const { data: uniquePlayerData } = await supabase
    .from('high_scores')
    .select('user_id')
    .eq('game_id', gameId);
  
  const uniquePlayers = new Set(uniquePlayerData?.map(d => d.user_id)).size;

  // Get public players count
  const { data: publicPlayerData } = await supabase
    .from('high_scores')
    .select(`
      user_id,
      profiles!inner (is_public)
    `)
    .eq('game_id', gameId)
    .eq('profiles.is_public', true);
  
  const publicPlayers = new Set(publicPlayerData?.map(d => d.user_id)).size;

  return NextResponse.json({
    game_id: gameId,
    total_sessions: totalSessions,
    sessions_today: sessionsToday,
    sessions_this_week: sessionsThisWeek,
    avg_play_time_seconds: totalSessions > 0 ? totalPlayTime / totalSessions : 0,
    avg_final_score: sessionsWithScore > 0 ? totalScore / sessionsWithScore : 0,
    unique_players: uniquePlayers,
    public_leaderboard_players: publicPlayers,
  });
}
