-- ==========================================================
-- APEX PLATFORM - CRYPTO PAYMENT GATEWAY (PHASE 3)
-- Target: PostgreSQL 14+ / ANSI SQL
-- Schema for NOWPayments Integration & Multi-Wallet Infrastructure
-- ==========================================================

-- 1. Crypto Currencies (dynamic provider mapping)
CREATE TABLE IF NOT EXISTS crypto_currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    enable BOOLEAN NOT NULL DEFAULT TRUE,
    network VARCHAR(50) NOT NULL,
    smart_contract VARCHAR(255) NULL,
    wallet_regex VARCHAR(255) NULL,
    extra_id_exists BOOLEAN NOT NULL DEFAULT FALSE,
    extra_id_regex VARCHAR(255) NULL,
    min_amount NUMERIC(28, 8) NOT NULL DEFAULT 0,
    max_amount NUMERIC(28, 8) NULL,
    priority INT NOT NULL DEFAULT 100,
    logo_url VARCHAR(255) NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crypto_currencies_network ON crypto_currencies(network);
CREATE INDEX idx_crypto_currencies_code ON crypto_currencies(code);

-- 2. Wallet Connections (EVM, WalletConnect, mobile sessions)
CREATE TABLE IF NOT EXISTS wallet_connections (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(120) NOT NULL,
    wallet_type VARCHAR(40) NOT NULL CHECK (wallet_type IN ('METAMASK', 'COINBASE', 'BINANCE', 'TRUST', 'WALLETCONNECT', 'OTHER')),
    chain_id INT NULL,
    chain_name VARCHAR(80) NULL,
    session_token VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_connections_user_id ON wallet_connections(user_id);
CREATE INDEX idx_wallet_connections_address ON wallet_connections(address);

-- 3. Payment Orders (Deposit orders initiated through NOWPayments)
CREATE TABLE IF NOT EXISTS payment_orders (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    internal_payment_id VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_payment_id VARCHAR(100) NOT NULL UNIQUE,
    wallet_address VARCHAR(120) NULL,
    pay_currency VARCHAR(40) NOT NULL,
    pay_network VARCHAR(50) NOT NULL,
    price_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    price_amount NUMERIC(28, 8) NOT NULL,
    expected_amount NUMERIC(28, 8) NOT NULL,
    actually_paid NUMERIC(28, 8) NOT NULL DEFAULT 0,
    payment_address VARCHAR(255) NOT NULL,
    payin_extra_id VARCHAR(120) NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'WAITING' CHECK (status IN (
        'WAITING',
        'CONFIRMING',
        'CONFIRMED',
        'FINISHED',
        'FAILED',
        'EXPIRED',
        'PARTIALLY_PAID',
        'OVERPAID',
        'REFUNDED',
        'REVIEW_REQUIRED'
    )),
    tx_hash VARCHAR(255) NULL,
    ledger_transaction_id BIGINT NULL REFERENCES ledger_transactions(id),
    idempotency_key VARCHAR(120) NULL UNIQUE,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_provider_id ON payment_orders(provider_payment_id);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
CREATE INDEX idx_payment_orders_tx_hash ON payment_orders(tx_hash);

-- 4. Payment Events (IPN Callbacks & Status Audit Logs)
CREATE TABLE IF NOT EXISTS payment_events (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    event_type VARCHAR(60) NOT NULL,
    provider_status VARCHAR(40) NOT NULL,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_events_order_id ON payment_events(order_id);

-- 5. Blockchain Transactions (On-chain records verified by provider)
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NULL REFERENCES payment_orders(id) ON DELETE SET NULL,
    tx_hash VARCHAR(255) NOT NULL UNIQUE,
    network VARCHAR(50) NOT NULL,
    from_address VARCHAR(120) NULL,
    to_address VARCHAR(120) NOT NULL,
    amount NUMERIC(28, 8) NOT NULL,
    block_number BIGINT NULL,
    confirmations INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_blockchain_transactions_tx ON blockchain_transactions(tx_hash);

-- 6. Crypto Payout Orders (Withdrawals disbursed through NOWPayments)
CREATE TABLE IF NOT EXISTS crypto_payout_orders (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(40) NOT NULL,
    network VARCHAR(50) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    extra_id VARCHAR(120) NULL,
    amount NUMERIC(28, 8) NOT NULL,
    fee_amount NUMERIC(28, 8) NOT NULL DEFAULT 0,
    net_amount NUMERIC(28, 8) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
        'REQUESTED',
        'SECURITY_CHECK',
        'PROCESSING',
        'SUBMITTED',
        'CONFIRMING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'REFUNDED'
    )),
    provider_payout_id VARCHAR(100) NULL,
    tx_hash VARCHAR(255) NULL,
    ledger_transaction_id BIGINT NULL REFERENCES ledger_transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crypto_payout_orders_user_id ON crypto_payout_orders(user_id);
CREATE INDEX idx_crypto_payout_orders_status ON crypto_payout_orders(status);
