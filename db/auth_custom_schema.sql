-- Custom Auth Schema Additions

-- 1. Profiles Table Updates
-- Stores OTPs, Verification Status, and Rate Limit Counters
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_otp TEXT,
ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_otp_last_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_otp_sent_count INT DEFAULT 0, -- Track daily sends
ADD COLUMN IF NOT EXISTS email_otp_attempts INT DEFAULT 0,    -- Track invalid attempts
ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,               -- Store ONLY the hash
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- 2. Bookings Table Updates
-- Idempotency flag to prevent duplicate emails
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Comments for usage:
-- email_otp_sent_count: Reset this to 0 if (now - email_otp_last_sent_at) > 24 hours in Backend Logic.
-- reset_token_hash: Use SHA-256 or bcrypt.
