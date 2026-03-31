-- Add description column if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS description TEXT;
