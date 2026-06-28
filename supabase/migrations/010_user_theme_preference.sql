-- Add theme_preference column to public.profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system';

-- Add check constraint safely using a DO block to prevent error if already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_theme_preference_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_theme_preference_check
    CHECK (theme_preference IN ('light', 'dark', 'system'));
  END IF;
END $$;

-- Backfill existing rows with 'system' where null
UPDATE public.profiles SET theme_preference = 'system' WHERE theme_preference IS NULL;
