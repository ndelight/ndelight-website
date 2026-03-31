-- Enable RLS
ALTER TABLE featured_events ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access
CREATE POLICY "Public can view featured_events"
ON featured_events FOR SELECT
TO public
USING (true);

-- Allow Admins (authenticated) to INSERT
CREATE POLICY "Admins can add featured_events"
ON featured_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow Admins (authenticated) to DELETE
CREATE POLICY "Admins can remove featured_events"
ON featured_events FOR DELETE
TO authenticated
USING (true);

-- Allow Admins (authenticated) to UPDATE (for reordering if needed)
CREATE POLICY "Admins can update featured_events"
ON featured_events FOR UPDATE
TO authenticated
USING (true);
