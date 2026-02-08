-- Phase 2 Migration: SEP-10, Sponsored Reserves, and Federation
-- Run this after the initial database setup

-- Table for tracking sponsorships
CREATE TABLE IF NOT EXISTS sponsorships (
    id SERIAL PRIMARY KEY,
    sponsor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sponsored_user_id INTEGER,
    sponsored_account_id VARCHAR(56),
    sponsorship_type VARCHAR(50) NOT NULL, -- 'account', 'trustline', 'fees'
    details JSONB,
    transaction_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT sponsorship_target CHECK (
        sponsored_user_id IS NOT NULL OR sponsored_account_id IS NOT NULL
    )
);

CREATE INDEX idx_sponsorships_sponsor ON sponsorships(sponsor_user_id);
CREATE INDEX idx_sponsorships_sponsored_user ON sponsorships(sponsored_user_id);
CREATE INDEX idx_sponsorships_sponsored_account ON sponsorships(sponsored_account_id);
CREATE INDEX idx_sponsorships_type ON sponsorships(sponsorship_type);
CREATE INDEX idx_sponsorships_created ON sponsorships(created_at DESC);

-- Table for custom federation names
CREATE TABLE IF NOT EXISTS federation_names (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    federation_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_federation_names_user ON federation_names(user_id);
CREATE INDEX idx_federation_names_name ON federation_names(federation_name);

-- Table for SEP-10 challenge tracking (optional, for production use)
CREATE TABLE IF NOT EXISTS sep10_challenges (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(56) NOT NULL,
    challenge_xdr TEXT NOT NULL,
    nonce VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sep10_challenges_account ON sep10_challenges(account_id);
CREATE INDEX idx_sep10_challenges_expires ON sep10_challenges(expires_at);
CREATE INDEX idx_sep10_challenges_nonce ON sep10_challenges(nonce);

-- Add any missing columns to users table if needed
DO $$ 
BEGIN
    -- Add verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='verified') THEN
        ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add organization column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='organization') THEN
        ALTER TABLE users ADD COLUMN organization VARCHAR(255);
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_sponsorships_updated_at ON sponsorships;
CREATE TRIGGER update_sponsorships_updated_at
    BEFORE UPDATE ON sponsorships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_federation_names_updated_at ON federation_names;
CREATE TRIGGER update_federation_names_updated_at
    BEFORE UPDATE ON federation_names
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- This creates a sample federation name for the first issuer
DO $$
DECLARE
    issuer_id INTEGER;
BEGIN
    -- Get the first issuer
    SELECT id INTO issuer_id FROM users WHERE role = 'issuer' LIMIT 1;
    
    IF issuer_id IS NOT NULL THEN
        -- Create sample federation name
        INSERT INTO federation_names (user_id, federation_name, created_at, updated_at)
        VALUES (issuer_id, 'issuer', NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON sponsorships TO edupass_user;
GRANT ALL PRIVILEGES ON federation_names TO edupass_user;
GRANT ALL PRIVILEGES ON sep10_challenges TO edupass_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edupass_user;

-- Verification queries
SELECT 'Sponsorships table created' as status, COUNT(*) as count FROM sponsorships;
SELECT 'Federation names table created' as status, COUNT(*) as count FROM federation_names;
SELECT 'SEP-10 challenges table created' as status, COUNT(*) as count FROM sep10_challenges;
