-- Create the contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied'))
);

-- RLS Policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone (Anon) to insert (Send a message)
CREATE POLICY "Anyone can insert contact messages"
ON contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow Admins to view messages
CREATE POLICY "Admins can view contact messages"
ON contact_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
