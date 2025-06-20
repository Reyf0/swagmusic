-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create an index on is_admin for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Update existing profiles to set is_admin to false
UPDATE profiles SET is_admin = false WHERE is_admin IS NULL;

-- Instructions:
-- 1. Go to your Supabase dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to SQL Editor
-- 4. Paste this SQL and run it
-- 5. This will add the is_admin field to your profiles table