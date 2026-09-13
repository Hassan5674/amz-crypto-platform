-- ====================================================================
-- APEXPLATFORM PHASE 2 DATABASE MIGRATION
-- Authentication, Session Management, Security Logging & RBAC Protection
-- ====================================================================

-- 1. Update users table for Phase 2 security features
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(64) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Sessions table enhancement
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    device_type VARCHAR(64) NOT NULL,
    location VARCHAR(128) DEFAULT 'United States',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 3. Email Verification Tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    code VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_verify_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verify_code ON email_verification_tokens(code);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id);

-- 4. Password Reset Tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);

-- 5. Two-Factor Authentication Secrets and Recovery Codes
CREATE TABLE IF NOT EXISTS two_factor_secrets (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(64) NOT NULL,
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_2fa_recovery_user ON two_factor_recovery_codes(user_id);

-- 6. Account Restrictions (Suspensions & Bans)
CREATE TABLE IF NOT EXISTS account_restrictions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SUSPEND', 'BAN', 'LOCK')),
    reason TEXT NOT NULL,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_restrictions_user ON account_restrictions(user_id);

-- 7. Login History & Device Audits
CREATE TABLE IF NOT EXISTS login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'CHALLENGED_2FA')),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    device_type VARCHAR(64) NOT NULL,
    location VARCHAR(128) DEFAULT 'United States',
    failure_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, created_at DESC);

-- 8. Enterprise Security Events (Audit Trail)
CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) DEFAULT NULL,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    target_type VARCHAR(64) DEFAULT NULL,
    target_id VARCHAR(64) DEFAULT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sec_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_sec_events_actor ON security_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_sec_events_created ON security_events(created_at DESC);
