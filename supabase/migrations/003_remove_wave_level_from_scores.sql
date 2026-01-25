-- =============================================
-- Remove wave and level columns from high_scores
-- These are game-specific and should be in metadata
-- =============================================

-- Migrate existing data to metadata before dropping columns (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'high_scores' 
    AND column_name = 'wave'
  ) THEN
    UPDATE public.high_scores
    SET metadata = COALESCE(metadata, '{}'::jsonb) || 
      jsonb_build_object(
        'wave', wave,
        'level', level
      )
    WHERE wave IS NOT NULL OR level IS NOT NULL;
  END IF;
END $$;

-- Drop the columns if they exist
ALTER TABLE public.high_scores
  DROP COLUMN IF EXISTS wave,
  DROP COLUMN IF EXISTS level;
