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

  // Get best scores per user for this game, joining with profiles
  const { data, error } = await supabase
    .from('high_scores')
    .select(`
      user_id,
      score,
      metadata,
      profiles!inner (
        display_name
      )
    `)
    .eq('game_id', gameId)
    .order('score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json([]);
  }

  // Aggregate to get best score per user
  const userBests = new Map<string, {
    display_name: string;
    best_score: number;
    best_wave: number | null;
    best_level: number | null;
    total_plays: number;
  }>();

  data.forEach((entry) => {
    const userId = entry.user_id;
    // profiles comes as an array from the join, take the first one
    const profiles = entry.profiles as { display_name: string | null }[] | null;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    
    const displayName = profile?.display_name || 'Anonymous';
    
    // Extract wave and level from metadata
    const metadata = entry.metadata as Record<string, unknown> | null;
    const wave = metadata?.wave as number | undefined;
    const level = metadata?.level as number | undefined;
    
    if (!userBests.has(userId)) {
      userBests.set(userId, {
        display_name: displayName,
        best_score: entry.score,
        best_wave: wave ?? null,
        best_level: level ?? null,
        total_plays: 1,
      });
    } else {
      const existing = userBests.get(userId)!;
      existing.total_plays++;
      if (entry.score > existing.best_score) {
        existing.best_score = entry.score;
        // Update wave/level when we find a new best score
        if (wave !== undefined) existing.best_wave = Math.max(existing.best_wave ?? 0, wave);
        if (level !== undefined) existing.best_level = Math.max(existing.best_level ?? 0, level);
      } else {
        // Still track max wave/level even if not best score
        if (wave !== undefined && (existing.best_wave === null || wave > existing.best_wave)) {
          existing.best_wave = wave;
        }
        if (level !== undefined && (existing.best_level === null || level > existing.best_level)) {
          existing.best_level = level;
        }
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
