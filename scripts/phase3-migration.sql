-- =============================================================================
-- PHASE 3 DATABASE MIGRATION
-- Time-bounded transactions, Muxed accounts, SEP-24 anchor integration
-- =============================================================================

-- Add Phase 3 columns to existing transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS min_time BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_time BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS muxed_destination VARCHAR(100);

-- Create index for time-bounded transactions
CREATE INDEX IF NOT EXISTS idx_transactions_max_time ON transactions(max_time) WHERE max_time > 0;

-- =============================================================================
-- MUXED ACCOUNTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS muxed_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_address VARCHAR(56) NOT NULL,
    muxed_address VARCHAR(100) NOT NULL UNIQUE,
    muxed_id VARCHAR(20) NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, muxed_id)
);

-- Create indexes for muxed accounts
CREATE INDEX IF NOT EXISTS idx_muxed_accounts_user_id ON muxed_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_muxed_accounts_base_address ON muxed_accounts(base_address);
CREATE INDEX IF NOT EXISTS idx_muxed_accounts_muxed_address ON muxed_accounts(muxed_address);

-- =============================================================================
-- SEP-24 TRANSACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS sep24_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    asset_code VARCHAR(12) NOT NULL,
    amount DECIMAL(20, 7) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_user_transfer_start',
    anchor_domain VARCHAR(255) NOT NULL,
    interactive_url TEXT,
    stellar_transaction_id VARCHAR(64),
    external_transaction_id VARCHAR(255),
    more_info_url TEXT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for SEP-24 transactions
CREATE INDEX IF NOT EXISTS idx_sep24_transactions_user_id ON sep24_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sep24_transactions_transaction_id ON sep24_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sep24_transactions_status ON sep24_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sep24_transactions_type ON sep24_transactions(type);

-- =============================================================================
-- UPDATE TRIGGER FOR MUXED ACCOUNTS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_muxed_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS muxed_accounts_update_timestamp ON muxed_accounts;
CREATE TRIGGER muxed_accounts_update_timestamp
    BEFORE UPDATE ON muxed_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_muxed_accounts_timestamp();

-- =============================================================================
-- UPDATE TRIGGER FOR SEP-24 TRANSACTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_sep24_transactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Set completed_at when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sep24_transactions_update_timestamp ON sep24_transactions;
CREATE TRIGGER sep24_transactions_update_timestamp
    BEFORE UPDATE ON sep24_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_sep24_transactions_timestamp();

-- =============================================================================
-- VIEWS FOR REPORTING
-- =============================================================================

-- View for active time-bounded transactions
CREATE OR REPLACE VIEW active_time_bounded_transactions AS
SELECT 
    t.id,
    t.sender_id,
    t.recipient_public_key,
    t.amount,
    t.transaction_hash,
    t.min_time,
    t.max_time,
    t.memo,
    t.created_at,
    CASE 
        WHEN t.max_time = 0 THEN 'no_expiration'
        WHEN EXTRACT(EPOCH FROM NOW()) > t.max_time THEN 'expired'
        ELSE 'active'
    END AS expiration_status,
    CASE
        WHEN t.max_time > 0 THEN t.max_time - EXTRACT(EPOCH FROM NOW())
        ELSE NULL
    END AS seconds_until_expiration
FROM transactions t
WHERE t.type = 'time_bounded';

-- View for SEP-24 transaction summary
CREATE OR REPLACE VIEW sep24_transaction_summary AS
SELECT 
    user_id,
    type,
    asset_code,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM sep24_transactions
GROUP BY user_id, type, asset_code, status;

-- =============================================================================
-- SAMPLE DATA (FOR TESTING)
-- =============================================================================

-- Note: Run this section only in development/testing environments

-- Comment out in production
/*
-- Example time-bounded transaction (expires in 1 hour from now)
-- This is just a placeholder to show the structure
INSERT INTO transactions (sender_id, recipient_public_key, amount, type, transaction_hash, status, max_time, memo)
SELECT 1, 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 100.00, 'time_bounded', 
       'sample_hash_' || NOW()::TEXT, 'completed', 
       EXTRACT(EPOCH FROM NOW() + INTERVAL '1 hour'), 'Test time-bounded transaction'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);
*/

-- =============================================================================
-- GRANTS (adjust as needed for your database users)
-- =============================================================================

-- Grant permissions to your application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON muxed_accounts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sep24_transactions TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Phase 3 migration completed successfully!';
    RAISE NOTICE 'Tables created: muxed_accounts, sep24_transactions';
    RAISE NOTICE 'Columns added to transactions: min_time, max_time, muxed_destination';
    RAISE NOTICE 'Views created: active_time_bounded_transactions, sep24_transaction_summary';
END $$;
