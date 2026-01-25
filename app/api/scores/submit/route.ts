import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface SubmitScoreRequest {
  game_id: string;
  score: number;
  wave: number;
  level: number;
  play_time_seconds: number;
  session_id?: string;
}

export async function POST(request: Request) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in to submit scores' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body: SubmitScoreRequest = await request.json();

    if (!body.game_id || typeof body.score !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request - game_id and score are required' },
        { status: 400 }
      );
    }

    // Validate score values (basic sanity checks)
    if (body.score < 0 || body.score > 10000000) {
      return NextResponse.json(
        { error: 'Invalid score value' },
        { status: 400 }
      );
    }

    if (body.wave < 1 || body.wave > 1000) {
      return NextResponse.json(
        { error: 'Invalid wave value' },
        { status: 400 }
      );
    }

    if (body.level < 1 || body.level > 1000) {
      return NextResponse.json(
        { error: 'Invalid level value' },
        { status: 400 }
      );
    }

    // Use admin client to insert the score (bypasses RLS)
    const adminClient = createAdminClient();

    const { data, error: insertError } = await adminClient
      .from('high_scores')
      .insert({
        user_id: user.id,
        game_id: body.game_id,
        score: Math.floor(body.score),
        wave: Math.floor(body.wave),
        level: Math.floor(body.level),
        play_time_seconds: Math.floor(body.play_time_seconds || 0),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert high score:', insertError);
      return NextResponse.json(
        { error: 'Failed to save score' },
        { status: 500 }
      );
    }

    // Optionally update the game session with final stats
    if (body.session_id) {
      await adminClient
        .from('game_sessions')
        .update({
          ended_at: new Date().toISOString(),
          final_score: Math.floor(body.score),
          final_wave: Math.floor(body.wave),
          final_level: Math.floor(body.level),
        })
        .eq('id', body.session_id);
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Score submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
