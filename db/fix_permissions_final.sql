-- Reset Policies to ensure clean state
DROP POLICY IF EXISTS "Public can view active influencers" ON influencers;
DROP POLICY IF EXISTS "Influencers can update own profile" ON influencers;
DROP POLICY IF EXISTS "Influencers can view own proile" ON influencers;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;

-- Enable RLS
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. INFLUENCERS TABLE POLICIES
-- Public Read Active
CREATE POLICY "public_read_active_influencers"
ON influencers FOR SELECT
USING (active = true);

-- Influencer Read Own (Pending or Active)
CREATE POLICY "influencer_read_own"
ON influencers FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Influencer Update Own
CREATE POLICY "influencer_update_own"
ON influencers FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 2. PROFILES TABLE POLICIES
-- Public Read Profiles (Required for joins)
CREATE POLICY "public_read_profiles"
ON profiles FOR SELECT
USING (true);

-- User Update Own Profile
CREATE POLICY "user_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);
