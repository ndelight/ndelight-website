CREATE TABLE IF NOT EXISTS email_verifications (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (though local server uses Service Role, it's good practice)
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role meant for backend only usage?
-- Actually, service role bypasses RLS. We can leave it restrictive.
