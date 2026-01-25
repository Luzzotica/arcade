-- =============================================
-- REALTIME PRESENCE SETUP
-- Enable realtime for presence tracking
-- =============================================

-- Enable realtime for the tables we want to track
-- Note: You also need to enable this in the Supabase dashboard:
-- Database > Replication > Enable for desired tables

-- Create a presence_state table for tracking online users
-- This is optional - Supabase Presence can work without a table
-- But having one allows us to query historical presence data
CREATE TABLE IF NOT EXISTS public.presence_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id TEXT,
  status TEXT NOT NULL DEFAULT 'online',
  last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_presence_log_last_seen ON public.presence_log(last_seen DESC);
CREATE INDEX idx_presence_log_game ON public.presence_log(game_id) WHERE game_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.presence_log ENABLE ROW LEVEL SECURITY;

-- Presence policies
CREATE POLICY "Presence is viewable by everyone"
  ON public.presence_log FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON public.presence_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence records"
  ON public.presence_log FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to clean up old presence records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM public.presence_log
  WHERE last_seen < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REALTIME PUBLICATION
-- Add tables to realtime publication
-- =============================================

-- Enable realtime for high_scores (for live leaderboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.high_scores;

-- Enable realtime for game_sessions (for live player count)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
