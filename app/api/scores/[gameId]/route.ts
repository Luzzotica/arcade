import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

  const supabase = createAdminClient();

  // Get best scores per user for this game, joining with public profiles only
  // Using raw SQL for the aggregation
  const { data, error } = await supabase
    .from('high_scores')
    .select(`
      user_id,
      score,
      wave,
      level,
      profiles!inner (
        display_name,
        is_public
      )
    `)
    .eq('game_id', gameId)
    .eq('profiles.is_public', true)
    .order('score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate to get best score per user
  const userBests = new Map<string, {
    display_name: string;
    best_score: number;
    best_wave: number;
    best_level: number;
    total_plays: number;
  }>();

  data?.forEach((entry) => {
    const userId = entry.user_id;
    // profiles comes as an array from the join, take the first one
    const profiles = entry.profiles as { display_name: string | null; is_public: boolean }[] | null;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    const displayName = profile?.display_name || 'Anonymous';
    
    if (!userBests.has(userId)) {
      userBests.set(userId, {
        display_name: displayName,
        best_score: entry.score,
        best_wave: entry.wave,
        best_level: entry.level,
        total_plays: 1,
      });
    } else {
      const existing = userBests.get(userId)!;
      existing.total_plays++;
      if (entry.score > existing.best_score) {
        existing.best_score = entry.score;
      }
      if (entry.wave > existing.best_wave) {
        existing.best_wave = entry.wave;
      }
      if (entry.level > existing.best_level) {
        existing.best_level = entry.level;
      }
    }
  });

  // Sort by best score and apply limit
  const leaderboard = Array.from(userBests.values())
    .sort((a, b) => b.best_score - a.best_score)
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      display_name: entry.display_name,
      best_score: entry.best_score,
      best_wave: entry.best_wave,
      best_level: entry.best_level,
      total_plays: entry.total_plays,
    }));

  return NextResponse.json(leaderboard);
}
