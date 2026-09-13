-- ==========================================================
-- APEX PLATFORM - PRODUCTION DATABASE FOUNDATION (PHASE 1)
-- Target: PostgreSQL 14+ / ANSI SQL
-- Designed for modular extension into Phase 2 & 3
-- ==========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ==========================================================
-- 1. USERS & IDENTITY
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email CITEXT NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT '/avatars/default.png',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BANNED', 'LOCKED')),
    email_verified_at TIMESTAMPTZ NULL,
    phone_verified_at TIMESTAMPTZ NULL,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- ==========================================================
-- 2. USER PROFILES
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    country VARCHAR(3) NOT NULL DEFAULT 'USA',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    date_of_birth DATE NULL,
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state_province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_country ON user_profiles(country);

-- ==========================================================
-- 3. RBAC: ROLES, PERMISSIONS, ROLE_PERMISSIONS, USER_ROLES
-- ==========================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ==========================================================
-- 4. SESSIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_metadata VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ==========================================================
-- 5. NOTIFICATIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, read_at);

-- ==========================================================
-- 6. SUPPORT TICKETS & MESSAGES
-- ==========================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS support_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);

-- ==========================================================
-- 7. AUDIT LOGS
-- ==========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NULL,
    description TEXT NOT NULL,
    ip_metadata VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==========================================================
-- 8. SYSTEM SETTINGS
-- ==========================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'STRING' CHECK (type IN ('STRING', 'BOOLEAN', 'NUMBER', 'JSON')),
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 9. CMS: CONTENT PAGES & ANNOUNCEMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS content_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_content_pages_slug ON content_pages(slug);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'EXPIRED')),
    publish_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 10. INVESTMENT PLANS (Basic Structure - No Profit Calculations)
-- ==========================================================
CREATE TABLE IF NOT EXISTS investment_plans (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    min_amount NUMERIC(18, 4) NOT NULL,
    max_amount NUMERIC(18, 4) NOT NULL,
    duration_days INT NOT NULL,
    target_return_indicator VARCHAR(50) NOT NULL, -- Non-promissory disclosure placeholder
    risk_level VARCHAR(30) NOT NULL CHECK (risk_level IN ('CONSERVATIVE', 'MODERATE', 'DYNAMIC')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'UPCOMING')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 11. GAMES (Basic Structure - No Betting / Outcomes Yet)
-- ==========================================================
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    thumbnail VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'COMING_SOON')),
    rtp_indicator VARCHAR(30) NOT NULL DEFAULT 'Informational',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 12. REFERRALS (Basic Structure - No Commissions Yet)
-- ==========================================================
CREATE TABLE IF NOT EXISTS referrals (
    id BIGSERIAL PRIMARY KEY,
    referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUALIFIED', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- ==========================================================
-- 13. PREPARED FUTURE SCHEMAS (WALLETS, STAKING, TRANSACTIONS)
-- Note: Intentionally prepared with no execution logic in Phase 1
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_investments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES investment_plans(id),
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    start_date TIMESTAMPTZ NULL,
    end_date TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staking_pools (
    id SERIAL PRIMARY KEY,
    asset_symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(60) NOT NULL,
    lockup_days INT NOT NULL,
    min_stake NUMERIC(18, 8) NOT NULL,
    max_stake NUMERIC(18, 8) NOT NULL,
    estimated_apr_indicator VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
