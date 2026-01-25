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
    .select('score, metadata, play_time_seconds, created_at')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  // Get user's profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  let rank = null;
  if (personalBest) {
    // Get all users' best scores and count how many are higher
    const { data: allScores } = await adminClient
      .from('high_scores')
      .select(`
        user_id,
        score,
        profiles!inner (display_name)
      `)
      .eq('game_id', gameId);

    if (allScores) {
      // Get best score per user
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

  // Extract wave and level from metadata
  const metadata = personalBest?.metadata as Record<string, unknown> | null;
  const wave = metadata?.wave as number | undefined;
  const level = metadata?.level as number | undefined;

  return NextResponse.json({
    personal_best: personalBest ? {
      score: personalBest.score,
      wave: wave ?? null,
      level: level ?? null,
      play_time_seconds: personalBest.play_time_seconds,
      achieved_at: personalBest.created_at,
    } : null,
    rank,
    display_name: profile?.display_name || null,
  });
}
