-- =============================================================================
-- Phase 1: Advanced Features Database Migration
-- Adds tables for: Account Authorizations, Clawbacks, Multi-signature
-- =============================================================================

-- Table: account_authorizations
-- Tracks which accounts are authorized to hold EDUPASS credits
CREATE TABLE IF NOT EXISTS account_authorizations (
  id SERIAL PRIMARY KEY,
  account_public_key VARCHAR(56) NOT NULL,
  authorized_by INTEGER REFERENCES users(id),
  authorized_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revocation_reason TEXT,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'authorized', -- authorized, revoked, pending
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_active_authorization UNIQUE (account_public_key, status)
);

-- Indexes for performance
CREATE INDEX idx_account_authorizations_public_key ON account_authorizations(account_public_key);
CREATE INDEX idx_account_authorizations_status ON account_authorizations(status);
CREATE INDEX idx_account_authorizations_authorized_by ON account_authorizations(authorized_by);

-- Table: clawbacks
-- Tracks all clawback operations for audit trail
CREATE TABLE IF NOT EXISTS clawbacks (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id),
  from_account_public_key VARCHAR(56),
  amount DECIMAL(20, 7) NOT NULL,
  reason TEXT NOT NULL,
  clawed_back_by INTEGER NOT NULL REFERENCES users(id),
  transaction_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_clawback_amount CHECK (amount > 0)
);

-- Indexes
CREATE INDEX idx_clawbacks_from_user ON clawbacks(from_user_id);
CREATE INDEX idx_clawbacks_clawed_back_by ON clawbacks(clawed_back_by);
CREATE INDEX idx_clawbacks_created_at ON clawbacks(created_at DESC);
CREATE INDEX idx_clawbacks_transaction_hash ON clawbacks(transaction_hash);

-- Table: account_signers
-- Tracks multi-signature setup for accounts
CREATE TABLE IF NOT EXISTS account_signers (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES users(id),
  signer_public_key VARCHAR(56) NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  added_by INTEGER NOT NULL REFERENCES users(id),
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMP,
  removed_by INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, removed
  CONSTRAINT valid_signer_weight CHECK (weight >= 0 AND weight <= 255),
  CONSTRAINT unique_active_signer UNIQUE (account_id, signer_public_key, status)
);

-- Indexes
CREATE INDEX idx_account_signers_account_id ON account_signers(account_id);
CREATE INDEX idx_account_signers_signer_key ON account_signers(signer_public_key);
CREATE INDEX idx_account_signers_status ON account_signers(status);

-- Table: pending_multisig_transactions
-- Tracks pending multi-signature transactions awaiting approval
CREATE TABLE IF NOT EXISTS pending_multisig_transactions (
  id SERIAL PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id),
  transaction_xdr TEXT NOT NULL,
  transaction_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, signed, submitted, failed
  signatures_required INTEGER DEFAULT 2,
  signatures_collected INTEGER DEFAULT 0,
  submitted_hash VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  submitted_at TIMESTAMP,
  CONSTRAINT valid_signatures CHECK (signatures_collected <= signatures_required)
);

-- Indexes
CREATE INDEX idx_pending_multisig_created_by ON pending_multisig_transactions(created_by);
CREATE INDEX idx_pending_multisig_status ON pending_multisig_transactions(status);
CREATE INDEX idx_pending_multisig_hash ON pending_multisig_transactions(transaction_hash);

-- Table: multisig_signatures
-- Tracks individual signatures on multi-sig transactions
CREATE TABLE IF NOT EXISTS multisig_signatures (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES pending_multisig_transactions(id),
  signer_id INTEGER REFERENCES users(id),
  signer_public_key VARCHAR(56) NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_multisig_signature UNIQUE (transaction_id, signer_public_key)
);

-- Indexes
CREATE INDEX idx_multisig_signatures_transaction ON multisig_signatures(transaction_id);
CREATE INDEX idx_multisig_signatures_signer ON multisig_signatures(signer_id);

-- =============================================================================
-- Add new columns to existing tables
-- =============================================================================

-- Add freeze/authorization status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_authorized BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS frozen_reason TEXT;

-- Add clawback flag to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS clawback_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS clawback_amount DECIMAL(20, 7);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS clawback_date TIMESTAMP;

-- =============================================================================
-- Create views for easier querying
-- =============================================================================

-- View: active_authorizations
CREATE OR REPLACE VIEW active_authorizations AS
SELECT 
  aa.*,
  u.name as user_name,
  u.email as user_email,
  i.name as authorized_by_name
FROM account_authorizations aa
LEFT JOIN users u ON u.stellar_public_key = aa.account_public_key
LEFT JOIN users i ON i.id = aa.authorized_by
WHERE aa.status = 'authorized';

-- View: recent_clawbacks
CREATE OR REPLACE VIEW recent_clawbacks AS
SELECT 
  c.*,
  u.name as from_user_name,
  u.email as from_user_email,
  i.name as clawed_back_by_name
FROM clawbacks c
LEFT JOIN users u ON u.id = c.from_user_id
LEFT JOIN users i ON i.id = c.clawed_back_by
ORDER BY c.created_at DESC;

-- View: active_signers
CREATE OR REPLACE VIEW active_signers AS
SELECT 
  s.*,
  u.name as account_name,
  u.email as account_email,
  u.stellar_public_key as account_public_key
FROM account_signers s
JOIN users u ON u.id = s.account_id
WHERE s.status = 'active';

-- =============================================================================
-- Grant permissions
-- =============================================================================

-- Grant access to new tables (adjust user as needed)
GRANT SELECT, INSERT, UPDATE ON account_authorizations TO edupass_user;
GRANT SELECT, INSERT ON clawbacks TO edupass_user;
GRANT SELECT, INSERT, UPDATE ON account_signers TO edupass_user;
GRANT SELECT, INSERT, UPDATE ON pending_multisig_transactions TO edupass_user;
GRANT SELECT, INSERT ON multisig_signatures TO edupass_user;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edupass_user;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE account_authorizations IS 'Tracks account authorization status for AUTH_REQUIRED asset';
COMMENT ON TABLE clawbacks IS 'Audit trail of all clawback operations';
COMMENT ON TABLE account_signers IS 'Multi-signature signers configuration';
COMMENT ON TABLE pending_multisig_transactions IS 'Multi-sig transactions awaiting signatures';
COMMENT ON TABLE multisig_signatures IS 'Individual signatures on multi-sig transactions';

COMMENT ON COLUMN account_authorizations.status IS 'Current authorization status: authorized, revoked, pending';
COMMENT ON COLUMN clawbacks.reason IS 'Reason for clawback (fraud, expired, etc.)';
COMMENT ON COLUMN account_signers.weight IS 'Signing weight (1-255) for multi-sig threshold';
COMMENT ON COLUMN pending_multisig_transactions.transaction_xdr IS 'Stellar transaction in XDR format';

-- =============================================================================
-- Insert initial data (if needed)
-- =============================================================================

-- Example: Authorize the issuer account
INSERT INTO account_authorizations (account_public_key, authorized_by, reason, status)
SELECT 
  '${ISSUER_PUBLIC_KEY}' as account_public_key,
  id as authorized_by,
  'Issuer account - auto-authorized' as reason,
  'authorized' as status
FROM users 
WHERE role = 'issuer' 
LIMIT 1
ON CONFLICT (account_public_key, status) DO NOTHING;

-- =============================================================================
-- Migration complete
-- =============================================================================

SELECT 'Phase 1 database migration completed successfully!' as message;
