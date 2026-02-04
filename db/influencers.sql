-- Add discount_percent column to existing table
ALTER TABLE influencers 
ADD COLUMN IF NOT EXISTS discount_percent int DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- Ensure RLS is active
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

-- Re-apply Policies (Drop first to avoid errors if they exist)
DROP POLICY IF EXISTS "Public can view active influencer codes" ON influencers;
DROP POLICY IF EXISTS "Influencers can update own profile" ON influencers;
DROP POLICY IF EXISTS "Influencers can insert own record" ON influencers;

-- 1. Public can read ONLY specific columns (code, discount, active)
-- Note: Supabase/Postgres RLS is row-based. To restrict columns for anon:
REVOKE SELECT ON influencers FROM anon;
GRANT SELECT (code, discount_percent, active) ON influencers TO anon;

-- Policy to allow row access (standard RLS still needed for row filtering)
CREATE POLICY "Public can view active influencer codes"
  ON influencers FOR SELECT
  TO anon
  USING ( active = true );

-- Authenticated users (like the influencer themselves) still need full access to their own row
GRANT SELECT ON influencers TO authenticated;

-- Allow influencers to read their own row
CREATE POLICY "Influencers can view own details"
  ON influencers FOR SELECT
  TO authenticated
  USING ( auth.uid() = id );

-- 2. Influencers can update their own profile
CREATE POLICY "Influencers can update own profile"
  ON influencers FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

-- 3. Influencers can insert their own record (for dashboard auto-creation)
CREATE POLICY "Influencers can insert own record"
  ON influencers FOR INSERT
  WITH CHECK ( auth.uid() = id );
