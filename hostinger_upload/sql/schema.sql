-- ==========================================================
-- APEX PLATFORM - PRODUCTION MYSQL SCHEMA FOR HOSTINGER
-- Target: MySQL 8.x / MariaDB 10.5+
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS & IDENTITY
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT '/avatars/default.png',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at DATETIME NULL,
    phone_verified_at DATETIME NULL,
    two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
    two_factor_secret VARCHAR(255) NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. EMAIL VERIFICATION & OTP CODES
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(191) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. WALLETS & LEDGER
CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    available_balance DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    locked_balance DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    investment_balance DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    staking_balance DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_currency (user_id, currency),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_ledgers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    wallet_id BIGINT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id VARCHAR(100) NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. INVESTMENT PLANS & USER INVESTMENTS
CREATE TABLE IF NOT EXISTS investment_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    return_rate DECIMAL(8,4) NOT NULL,
    duration_days INT NOT NULL,
    lock_period_days INT NOT NULL,
    min_amount DECIMAL(20,8) NOT NULL,
    max_amount DECIMAL(20,8) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_investments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id INT NOT NULL,
    principal_amount DECIMAL(20,8) NOT NULL,
    expected_return DECIMAL(20,8) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    matures_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES investment_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. STAKING POOLS
CREATE TABLE IF NOT EXISTS staking_pools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    reward_rate DECIMAL(8,4) NOT NULL,
    lock_period_days INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_stakes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    pool_id INT NOT NULL,
    staked_amount DECIMAL(20,8) NOT NULL,
    reward_earned DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES staking_pools(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. DEPOSITS & WITHDRAWALS
CREATE TABLE IF NOT EXISTS deposits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    provider VARCHAR(50) NOT NULL DEFAULT 'NOWPAYMENTS',
    provider_tx_id VARCHAR(191) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS withdrawals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    destination_address VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(120) NULL,
    user_email VARCHAR(191) NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED DATA FOR INVESTMENT PLANS AND STAKING POOLS
INSERT IGNORE INTO investment_plans (id, name, slug, description, return_rate, duration_days, lock_period_days, min_amount, max_amount, status) VALUES
(1, 'Secure Term Growth Note', 'secure-term-growth', 'Low-duration, fixed-return term note backed by senior corporate receivables.', 6.50, 30, 30, 100.00, 50000.00, 'ACTIVE'),
(2, 'Apex High-Yield Fixed Term', 'apex-high-yield', 'Medium-term growth vehicle optimized for capital appreciation.', 12.00, 90, 90, 500.00, 100000.00, 'ACTIVE'),
(3, 'Venture Alpha Fund', 'venture-alpha-fund', 'Long-term equity linked growth fund targeting strategic market opportunities.', 22.50, 180, 180, 1000.00, 250000.00, 'ACTIVE'),
(4, 'Quant Arbitrage Yield Note', 'quant-arbitrage', 'Short-to-medium duration institutional market-neutral statistical arbitrage strategy.', 8.75, 60, 60, 250.00, 75000.00, 'ACTIVE');

INSERT IGNORE INTO staking_pools (id, symbol, name, description, reward_rate, lock_period_days, status) VALUES
(1, 'ETH', 'Ethereum Validator Reserve', 'Institutional Ethereum proof-of-stake validator node delegation.', 4.20, 60, 'ACTIVE'),
(2, 'SOL', 'Solana High-Throughput Node', 'High-throughput cluster with low latency consensus yield.', 6.80, 30, 'ACTIVE'),
(3, 'USDC', 'USD Liquidity Reserve', 'Multi-audited stablecoin reserve with continuous compounding return.', 5.20, 90, 'ACTIVE'),
(4, 'BTC', 'Bitcoin Lightning Yield Vault', 'Non-custodial routing liquidity pool for network transactions.', 3.80, 45, 'ACTIVE');

SET FOREIGN_KEY_CHECKS = 1;
