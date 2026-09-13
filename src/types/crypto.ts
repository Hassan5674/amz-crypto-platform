/**
 * Cryptographic Payment Gateway Types & Models
 * Compatible with official NOWPayments API v1 and multi-wallet standards
 */

export type CryptoWalletType =
  | 'METAMASK'
  | 'COINBASE'
  | 'BINANCE'
  | 'TRUST'
  | 'WALLETCONNECT'
  | 'OTHER';

export type CryptoDepositStatus =
  | 'WAITING'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'FINISHED'
  | 'FAILED'
  | 'EXPIRED'
  | 'PARTIALLY_PAID'
  | 'OVERPAID'
  | 'REFUNDED'
  | 'REVIEW_REQUIRED';

export type CryptoWithdrawalStatus =
  | 'PENDING_APPROVAL'
  | 'REQUESTED'
  | 'SECURITY_CHECK'
  | 'PROCESSING'
  | 'SUBMITTED'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REJECTED';

export interface CryptoCurrency {
  id: number;
  code: string;               // e.g. 'usdttrc20', 'usdterc20', 'usdtbsc', 'btc', 'eth', 'sol', 'trx'
  name: string;               // e.g. 'Tether USD (TRC20)', 'Bitcoin'
  symbol: string;             // e.g. 'USDT', 'BTC'
  network: string;            // e.g. 'TRC20', 'ERC20', 'BEP20', 'BTC', 'SOL'
  network_display: string;    // e.g. 'TRON (TRC20)', 'Ethereum (ERC20)'
  chain_id?: number | null;   // e.g. 1 for ETH, 56 for BSC, 137 for Polygon
  enable: boolean;
  deposit_available: boolean;
  withdrawal_available: boolean;
  wallet_regex?: string | null;
  extra_id_exists: boolean;   // Memo or destination tag required
  extra_id_regex?: string | null;
  min_amount: string;         // Minimum amount in crypto units or default
  max_amount?: string | null;
  priority: number;
  logo_url?: string | null;
  smart_contract?: string | null;
  // Dynamic minimum system fields (USD equivalents)
  min_deposit_usd?: string;
  min_withdrawal_usd?: string;
  provider_min_deposit_usd?: string;
  app_min_deposit_usd?: string;
  effective_min_deposit_usd?: string;
  provider_min_withdrawal_usd?: string;
  app_min_withdrawal_usd?: string;
  effective_min_withdrawal_usd?: string;
}

export interface CryptoAssetConfig {
  code: string;                      // e.g. 'usdttrc20'
  symbol: string;                    // e.g. 'USDT'
  name: string;                      // e.g. 'Tether USD'
  network: string;                   // e.g. 'TRC20'
  network_display: string;           // e.g. 'TRON (TRC20)'
  provider_min_deposit_usd: string;  // Live or verified provider minimum in USD (e.g. '12.45')
  app_min_deposit_usd: string;       // Admin configured application minimum in USD (e.g. '1.00')
  effective_min_deposit_usd: string; // Safe maximum of provider and app minimum (e.g. '12.45')
  provider_min_withdrawal_usd: string; // Provider withdrawal minimum in USD (e.g. '1.00')
  app_min_withdrawal_usd: string;    // Admin configured withdrawal minimum in USD (e.g. '1.00')
  effective_min_withdrawal_usd: string; // Safe maximum of provider and app minimum (e.g. '1.00')
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  network_fee_usd: string;           // Minimum base disbursement fee e.g. '0.20'
  withdrawal_fee_percent: string;    // e.g. '1.00' (1%)
  last_updated: string;
  source: 'LIVE_PROVIDER' | 'FALLBACK_VERIFIED' | 'ADMIN_CONFIG';
}

export interface WalletConnectionEntity {
  id: number;
  uuid: string;
  user_id: number;
  address: string;
  wallet_type: CryptoWalletType;
  chain_id: number | null;
  chain_name: string | null;
  session_token: string;
  is_active: boolean;
  connected_at: string;
  last_seen_at: string;
}

export interface PaymentOrderEntity {
  id: number;
  uuid: string;
  internal_payment_id: string; // e.g. "CRYPTO-DEP-20260908-XYZ"
  user_id: number;
  provider_payment_id: string; // NOWPayments payment_id
  wallet_address?: string | null;
  pay_currency: string;        // 'usdttrc20'
  pay_network: string;         // 'TRC20'
  price_currency: string;      // 'USD'
  price_amount: string;        // '100.00'
  expected_amount: string;     // Exact crypto amount to pay
  actually_paid: string;       // Verified amount received by provider
  payment_address: string;     // Official deposit address
  payin_extra_id?: string | null; // Memo / Destination Tag
  invoice_url?: string | null;
  status: CryptoDepositStatus;
  tx_hash?: string | null;
  ledger_transaction_id?: number | null;
  idempotency_key?: string | null;
  created_at: string;
  expires_at?: string | null;
  updated_at: string;
}

export interface PaymentEventEntity {
  id: number;
  order_id: number;
  event_type: string;
  provider_status: string;
  signature_verified: boolean;
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface CryptoPayoutOrderEntity {
  id: number;
  uuid: string;
  user_id: number;
  currency: string;
  network: string;
  destination_address: string;
  extra_id?: string | null;
  amount: string;
  fee_amount: string;
  net_amount: string;
  status: CryptoWithdrawalStatus;
  provider_payout_id?: string | null;
  tx_hash?: string | null;
  admin_notes?: string | null;
  disbursement_method?: 'AUTOMATED_API' | 'MANUAL';
  ledger_transaction_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDepositRequestDto {
  currency_code: string;       // e.g. 'usdttrc20'
  network: string;             // e.g. 'TRC20'
  amount: string;              // USD nominal or crypto amount
  wallet_address?: string;     // Connected wallet address
  wallet_type?: CryptoWalletType;
  idempotency_key?: string;
}

export interface CreateWithdrawalRequestDto {
  currency_code: string;
  network: string;
  destination_address: string;
  extra_id?: string;
  amount: string;
  password?: string;
  totp_code?: string;
}
