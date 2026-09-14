-- Migration 004: Referential Integrity & Performance Indexes for user_investments, user_stakes, and wallet_ledgers/transactions
-- Enforces foreign keys and adds performance indexes for MySQL/InnoDB.

SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE user_investments
  ADD INDEX IF NOT EXISTS idx_user_investments_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_user_investments_status (status);

ALTER TABLE user_stakes
  ADD INDEX IF NOT EXISTS idx_user_stakes_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_user_stakes_status (status);

ALTER TABLE wallet_ledgers
  ADD INDEX IF NOT EXISTS idx_wallet_ledgers_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_wallet_ledgers_wallet_id (wallet_id),
  ADD INDEX IF NOT EXISTS idx_wallet_ledgers_type (transaction_type);

ALTER TABLE deposits
  ADD INDEX IF NOT EXISTS idx_deposits_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_deposits_status (status);

ALTER TABLE withdrawals
  ADD INDEX IF NOT EXISTS idx_withdrawals_user_id (user_id),
  ADD INDEX IF NOT EXISTS idx_withdrawals_status (status);
