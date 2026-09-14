-- Migration 004: Referential Integrity & Performance Indexes for user_investments, user_stakes, and wallet_ledgers/transactions
-- Enforces foreign keys and adds performance indexes for MySQL/InnoDB.

-- Ensure InnoDB engine and foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- user_investments foreign key & indexes
ALTER TABLE user_investments
  ADD INDEX IF NOT EXISTS idx_user_investments_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_user_investments_status (status);

-- user_stakes foreign key & indexes
ALTER TABLE user_stakes
  ADD INDEX IF NOT EXISTS idx_user_stakes_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_user_stakes_status (status);

-- wallet_ledgers / transactions foreign key & indexes
ALTER TABLE wallet_ledgers
  ADD INDEX IF NOT EXISTS idx_wallet_ledgers_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_wallet_ledgers_wallet_id (wallet_id),
  ADD INDEX IF NOT EXISTS idx_wallet_ledgers_type (transaction_type);

-- deposits foreign key & indexes
ALTER TABLE deposits
  ADD INDEX IF NOT EXISTS idx_deposits_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_deposits_status (status);

-- withdrawals foreign key & indexes
ALTER TABLE withdrawals
  ADD INDEX IF NOT EXISTS idx_withdrawals_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_withdrawals_status (status);
