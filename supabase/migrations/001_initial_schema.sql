-- =============================================
-- HEXII ARCADE - Initial Database Schema
-- =============================================

-- Note: Using gen_random_uuid() which is built-in to PostgreSQL 13+
-- No extension needed

-- =============================================
-- PROFILES TABLE
-- Stores user profile information linked to auth.users
-- Profiles are PRIVATE by default - users must opt-in to public visibility
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for public profile queries
CREATE INDEX idx_profiles_is_public ON public.profiles(is_public) WHERE is_public = TRUE;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Anyone can view public profiles (for leaderboards)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Priority: display_name (from signup form) > full_name (OAuth) > name (OAuth) > email prefix
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- HIGH SCORES TABLE
-- Stores individual game scores for leaderboards
-- =============================================
CREATE TABLE IF NOT EXISTS public.high_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  wave INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 1,
  play_time_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for leaderboard queries
CREATE INDEX idx_high_scores_game_score ON public.high_scores(game_id, score DESC);
CREATE INDEX idx_high_scores_user_game ON public.high_scores(user_id, game_id);
CREATE INDEX idx_high_scores_created_at ON public.high_scores(created_at DESC);

-- Enable RLS
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;

-- High scores policies
-- Users can only VIEW high scores, not insert them directly
-- Scores are inserted via server-side function after game state validation
CREATE POLICY "High scores are viewable by everyone"
  ON public.high_scores FOR SELECT
  USING (true);

-- =============================================
-- GAME SESSIONS TABLE
-- Tracks analytics: play counts, session data
-- =============================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  game_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  final_score INTEGER,
  final_wave INTEGER,
  final_level INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for analytics
CREATE INDEX idx_game_sessions_game ON public.game_sessions(game_id);
CREATE INDEX idx_game_sessions_started_at ON public.game_sessions(started_at DESC);
CREATE INDEX idx_game_sessions_user ON public.game_sessions(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Game sessions policies (allows anonymous session tracking)
CREATE POLICY "Anyone can create game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own sessions"
  ON public.game_sessions FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Game sessions are viewable for analytics"
  ON public.game_sessions FOR SELECT
  USING (true);

-- =============================================
-- PURCHASES TABLE (for future use)
-- Tracks player purchases
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  stripe_payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user purchases
CREATE INDEX idx_purchases_user ON public.purchases(user_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Purchases policies (users can only VIEW their purchases, not create them)
-- Purchases are created server-side after payment verification
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);



-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
