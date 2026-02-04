-- Enable RLS on influencers table
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC READ ACCESS (For Homepage/Booking)
-- Allow anyone (anon + authenticated) to read ACTIVE influencers only.
CREATE POLICY "Public can view active influencers"
ON influencers
FOR SELECT
USING (active = true);

-- 2. INFLUENCER UPDATE ACCESS (Self)
-- Allow influencer to update their own profile (e.g. instagram link)
CREATE POLICY "Influencers can update own profile"
ON influencers
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 3. INFLUENCER READ OWN (Even if not active yet)
-- Allow influencer to see their own row even if active=false (e.g. in dashboard)
CREATE POLICY "Influencers can view own proile"
ON influencers
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. PUBLIC READ PROFILE (Needed for join)
-- Allow public to read basic profile info (full_name) to display in Influencer cards
CREATE POLICY "Public can view profiles"
ON profiles
FOR SELECT
USING (true); -- BE CAREFUL: This exposes all profiles. Better to limit columns? 
-- Supabase RLS is row-based not column based. 
-- We can restrict this if needed, but for now 'profiles' usually needs to be readable if we show names.
