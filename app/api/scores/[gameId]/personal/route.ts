import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get user's personal best
  const { data: personalBest } = await adminClient
    .from('high_scores')
    .select('score, wave, level, play_time_seconds, created_at')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  // Get user's profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_public, display_name')
    .eq('id', user.id)
    .single();

  let rank = null;
  if (profile?.is_public && personalBest) {
    // Get all public users' best scores and count how many are higher
    const { data: allScores } = await adminClient
      .from('high_scores')
      .select(`
        user_id,
        score,
        profiles!inner (is_public)
      `)
      .eq('game_id', gameId)
      .eq('profiles.is_public', true);

    if (allScores) {
      // Get best score per public user
      const userBests = new Map<string, number>();
      allScores.forEach((s) => {
        const current = userBests.get(s.user_id) || 0;
        if (s.score > current) {
          userBests.set(s.user_id, s.score);
        }
      });

      // Count users with higher scores
      let higherCount = 0;
      userBests.forEach((score) => {
        if (score > personalBest.score) higherCount++;
      });
      rank = higherCount + 1;
    }
  }

  return NextResponse.json({
    personal_best: personalBest ? {
      score: personalBest.score,
      wave: personalBest.wave,
      level: personalBest.level,
      play_time_seconds: personalBest.play_time_seconds,
      achieved_at: personalBest.created_at,
    } : null,
    rank,
    is_public: profile?.is_public || false,
    display_name: profile?.display_name || null,
  });
}
