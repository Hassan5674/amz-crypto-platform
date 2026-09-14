import {
  User,
  UserProfile,
  Role,
  Permission,
  RolePermission,
  UserRole,
  UserSession,
  NotificationItem,
  SupportTicket,
  SupportMessage,
  AuditLog,
  SystemSetting,
  ContentPage,
  Announcement,
  InvestmentPlan,
  InvestmentPlanVersion,
  UserInvestment,
  InvestmentEvent,
  GameItem,
  StakingPool,
  ReferralData,
  EmailVerificationToken,
  PasswordResetToken,
  TwoFactorSecret,
  AccountRestriction,
  LoginHistoryEntry,
  Wallet,
  LedgerAccount,
  LedgerTransaction,
  LedgerEntry,
  ManualAdjustmentRequest,
  WithdrawalRequest,
  WithdrawalDestination
} from '../types/index.js';
import { SecurityAuditLog } from '../types/games.js';
import {
  WalletConnectionEntity,
  PaymentOrderEntity,
  PaymentEventEntity,
  CryptoPayoutOrderEntity,
  CryptoAssetConfig
} from '../types/crypto.js';
import { generateSecureToken, hashToken, generateNumericOtp, hashPassword } from './security.js';
import fs from 'fs';
import path from 'path';

class DataStore {
  constructor() {
    this.loadState();
  }

  public saveState() {
    try {
      const dir = path.join(process.cwd(), 'config');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const state = {
        stakingPoolEntities: this.stakingPoolEntities,
        stakingPoolVersions: this.stakingPoolVersions,
        userStakes: this.userStakes,
        depositBonusTiers: this.depositBonusTiers,
        affiliateCommissionRules: this.affiliateCommissionRules,
        userBonuses: this.userBonuses
      };
      fs.writeFileSync(path.join(dir, 'datastore_state.json'), JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save datastore state:', e);
    }
  }

  public loadState() {
    try {
      const stateFile = path.join(process.cwd(), 'config', 'datastore_state.json');
      if (fs.existsSync(stateFile)) {
        const raw = fs.readFileSync(stateFile, 'utf-8');
        const state = JSON.parse(raw);
        if (state.stakingPoolEntities) this.stakingPoolEntities = state.stakingPoolEntities;
        if (state.stakingPoolVersions) this.stakingPoolVersions = state.stakingPoolVersions;
        if (state.userStakes) this.userStakes = state.userStakes;
        if (state.depositBonusTiers) this.depositBonusTiers = state.depositBonusTiers;
        if (state.affiliateCommissionRules) this.affiliateCommissionRules = state.affiliateCommissionRules;
        if (state.userBonuses) this.userBonuses = state.userBonuses;
      }
    } catch (e) {
      console.error('Failed to load datastore state:', e);
    }
  }
  // Phase 3 Double-Entry Financial Ledger Datastores
  public wallets: Wallet[] = [];
  public ledgerAccounts: LedgerAccount[] = [];
  public ledgerTransactions: LedgerTransaction[] = [];
  public ledgerEntries: LedgerEntry[] = [];
  public manualAdjustments: ManualAdjustmentRequest[] = [];
  public withdrawalRequests: WithdrawalRequest[] = [];
  public securityAuditLogs: SecurityAuditLog[] = [
    {
      id: 1,
      user_id: 1,
      bet_id: 1,
      game_id: 1,
      action: 'SPIN',
      game_seed: 'b4a5c8932ef871b7642194aef943b7829a4301fcbc879a613d9876fa543210ef',
      server_seed: 'b4a5c8932ef871b7642194aef943b7829a4301fcbc879a613d9876fa543210ef',
      server_seed_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      client_seed: 'client_entropy_user1_alpha',
      nonce: 104,
      outcome_result: 'WIN (Natural 21)',
      final_payout: '150.00',
      payout: '150.00',
      round_timestamp: '2026-09-12T19:40:00Z',
      timestamp: '2026-09-12T19:40:00Z'
    },
    {
      id: 2,
      user_id: 1,
      bet_id: 2,
      game_id: 2,
      action: 'SPIN',
      game_seed: '41c7b8e91029384756abcdef0123456789abcdef0123456789abcdef01234567',
      server_seed: '41c7b8e91029384756abcdef0123456789abcdef0123456789abcdef01234567',
      server_seed_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      client_seed: 'client_entropy_user1_beta',
      nonce: 105,
      outcome_result: 'Crashed @ 3.45x (Cashed @ 2.50x)',
      final_payout: '250.00',
      payout: '250.00',
      round_timestamp: '2026-09-12T20:15:00Z',
      timestamp: '2026-09-12T20:15:00Z'
    },
    {
      id: 3,
      user_id: 2,
      bet_id: 3,
      game_id: 3,
      action: 'SPIN',
      game_seed: '876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9',
      server_seed: '876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9',
      server_seed_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      client_seed: 'client_seed_admin_gamma',
      nonce: 106,
      outcome_result: '3 Gems Cleared (1.82x)',
      final_payout: '91.00',
      payout: '91.00',
      round_timestamp: '2026-09-12T21:02:00Z',
      timestamp: '2026-09-12T21:02:00Z'
    },
    {
      id: 4,
      user_id: 1,
      bet_id: 4,
      game_id: 4,
      action: 'SPIN',
      game_seed: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      server_seed: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      server_seed_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
      client_seed: 'client_seed_user1_delta',
      nonce: 107,
      outcome_result: 'LOSS (Dealer 20 vs 18)',
      final_payout: '0.00',
      payout: '0.00',
      round_timestamp: '2026-09-12T21:30:00Z',
      timestamp: '2026-09-12T21:30:00Z'
    },
    {
      id: 5,
      user_id: 3,
      bet_id: 5,
      game_id: 5,
      action: 'SPIN',
      game_seed: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      server_seed: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      server_seed_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      client_seed: 'client_seed_investor_epsilon',
      nonce: 108,
      outcome_result: 'WIN (7-7-7 Jackpot 25.00x)',
      final_payout: '1250.00',
      payout: '1250.00',
      round_timestamp: '2026-09-13T02:10:00Z',
      timestamp: '2026-09-13T02:10:00Z'
    }
  ];
  public walletConnections: WalletConnectionEntity[] = [];
  public paymentOrders: PaymentOrderEntity[] = [];
  public paymentEvents: PaymentEventEntity[] = [];
  public cryptoPayoutOrders: CryptoPayoutOrderEntity[] = [];
  public cryptoAssetConfigs: CryptoAssetConfig[] = [
    {
      code: 'usdttrc20',
      symbol: 'USDT',
      name: 'Tether USD',
      network: 'TRC20',
      network_display: 'TRON (TRC20)',
      provider_min_deposit_usd: '12.45',
      app_min_deposit_usd: '1.00',
      effective_min_deposit_usd: '12.45',
      provider_min_withdrawal_usd: '5.00',
      app_min_withdrawal_usd: '5.00',
      effective_min_withdrawal_usd: '5.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '1.00',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'usdtbsc',
      symbol: 'USDT',
      name: 'Tether USD',
      network: 'BEP20',
      network_display: 'BNB Smart Chain (BEP20)',
      provider_min_deposit_usd: '0.44',
      app_min_deposit_usd: '0.44',
      effective_min_deposit_usd: '0.44',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'usdterc20',
      symbol: 'USDT',
      name: 'Tether USD',
      network: 'ERC20',
      network_display: 'Ethereum (ERC20)',
      provider_min_deposit_usd: '1.46',
      app_min_deposit_usd: '1.46',
      effective_min_deposit_usd: '1.46',
      provider_min_withdrawal_usd: '2.00',
      app_min_withdrawal_usd: '2.00',
      effective_min_withdrawal_usd: '2.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '1.50',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'usdc',
      symbol: 'USDC',
      name: 'USD Coin',
      network: 'ERC20',
      network_display: 'Ethereum (ERC20)',
      provider_min_deposit_usd: '1.45',
      app_min_deposit_usd: '1.45',
      effective_min_deposit_usd: '1.45',
      provider_min_withdrawal_usd: '2.00',
      app_min_withdrawal_usd: '2.00',
      effective_min_withdrawal_usd: '2.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '1.50',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      network: 'BTC',
      network_display: 'Bitcoin Native (BTC)',
      provider_min_deposit_usd: '1.32',
      app_min_deposit_usd: '1.32',
      effective_min_deposit_usd: '1.32',
      provider_min_withdrawal_usd: '1.50',
      app_min_withdrawal_usd: '1.50',
      effective_min_withdrawal_usd: '1.50',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.50',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'eth',
      symbol: 'ETH',
      name: 'Ethereum',
      network: 'ETH',
      network_display: 'Ethereum Native (ETH)',
      provider_min_deposit_usd: '0.67',
      app_min_deposit_usd: '0.67',
      effective_min_deposit_usd: '0.67',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.50',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'sol',
      symbol: 'SOL',
      name: 'Solana',
      network: 'SOL',
      network_display: 'Solana Native (SOL)',
      provider_min_deposit_usd: '0.55',
      app_min_deposit_usd: '0.55',
      effective_min_deposit_usd: '0.55',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'trx',
      symbol: 'TRX',
      name: 'TRON',
      network: 'TRC20',
      network_display: 'TRON Native (TRX)',
      provider_min_deposit_usd: '0.42',
      app_min_deposit_usd: '0.42',
      effective_min_deposit_usd: '0.42',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'ltc',
      symbol: 'LTC',
      name: 'Litecoin',
      network: 'LTC',
      network_display: 'Litecoin Native (LTC)',
      provider_min_deposit_usd: '0.38',
      app_min_deposit_usd: '0.38',
      effective_min_deposit_usd: '0.38',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'doge',
      symbol: 'DOGE',
      name: 'Dogecoin',
      network: 'DOGE',
      network_display: 'Dogecoin Native (DOGE)',
      provider_min_deposit_usd: '1.44',
      app_min_deposit_usd: '1.44',
      effective_min_deposit_usd: '1.44',
      provider_min_withdrawal_usd: '1.50',
      app_min_withdrawal_usd: '1.50',
      effective_min_withdrawal_usd: '1.50',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'xrp',
      symbol: 'XRP',
      name: 'Ripple',
      network: 'XRP',
      network_display: 'XRP Ledger',
      provider_min_deposit_usd: '0.35',
      app_min_deposit_usd: '0.35',
      effective_min_deposit_usd: '0.35',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'ada',
      symbol: 'ADA',
      name: 'Cardano',
      network: 'ADA',
      network_display: 'Cardano Native (ADA)',
      provider_min_deposit_usd: '0.71',
      app_min_deposit_usd: '0.71',
      effective_min_deposit_usd: '0.71',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'bch',
      symbol: 'BCH',
      name: 'Bitcoin Cash',
      network: 'BCH',
      network_display: 'Bitcoin Cash Native',
      provider_min_deposit_usd: '0.40',
      app_min_deposit_usd: '0.40',
      effective_min_deposit_usd: '0.40',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'bnbbsc',
      symbol: 'BNB',
      name: 'BNB',
      network: 'BEP20',
      network_display: 'BNB Smart Chain (BEP20)',
      provider_min_deposit_usd: '0.37',
      app_min_deposit_usd: '0.37',
      effective_min_deposit_usd: '0.37',
      provider_min_withdrawal_usd: '1.00',
      app_min_withdrawal_usd: '1.00',
      effective_min_withdrawal_usd: '1.00',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    },
    {
      code: 'matic',
      symbol: 'MATIC',
      name: 'Polygon',
      network: 'MATIC',
      network_display: 'Polygon POS (MATIC)',
      provider_min_deposit_usd: '1.17',
      app_min_deposit_usd: '1.00',
      effective_min_deposit_usd: '1.17',
      provider_min_withdrawal_usd: '1.20',
      app_min_withdrawal_usd: '1.20',
      effective_min_withdrawal_usd: '1.20',
      deposit_enabled: true,
      withdrawal_enabled: true,
      network_fee_usd: '0.20',
      withdrawal_fee_percent: '1.00',
      last_updated: '2026-09-08T12:00:00Z',
      source: 'LIVE_PROVIDER'
    }
  ];
  public withdrawalDestinations: WithdrawalDestination[] = [
    {
      id: 1,
      uuid: 'dest_uuid_001',
      user_id: 4,
      type: 'bank_account',
      currency: 'USD',
      provider: 'Chase Bank NA',
      display_name: 'Checking Account (...4891)',
      masked_identifier: '****4891',
      verification_status: 'VERIFIED',
      is_default: true,
      created_at: '2025-03-05T10:10:00Z',
      updated_at: '2025-03-05T10:10:00Z',
      verified_at: '2025-03-05T10:15:00Z',
      disabled_at: null
    }
  ];

  // Phase 6 Investment Plan Engine Datastores
  public investmentPlans: InvestmentPlan[] = [
    {
      id: 1,
      public_id: 'plan_secure_30',
      name: 'Secure Term Growth Note',
      slug: 'secure-term-growth',
      description: 'Low-duration, fixed-return term note backed by senior secured corporate receivables and short-term debt instruments.',
      image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      currency: 'USD',
      current_version_id: 1,
      status: 'ACTIVE',
      display_order: 1,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 2,
      public_id: 'plan_apex_90',
      name: 'Apex High-Yield Fixed Term',
      slug: 'apex-high-yield',
      description: 'Medium-term growth vehicle optimized for capital appreciation with fixed quarterly return accruals.',
      image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
      currency: 'USD',
      current_version_id: 2,
      status: 'ACTIVE',
      display_order: 2,
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z'
    },
    {
      id: 3,
      public_id: 'plan_venture_180',
      name: 'Venture Alpha Fund',
      slug: 'venture-alpha-fund',
      description: 'Long-term equity linked growth fund targeting strategic market opportunities with structured maturity releases.',
      image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      currency: 'USD',
      current_version_id: 3,
      status: 'ACTIVE',
      display_order: 3,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z'
    }
  ];

  public investmentPlanVersions: InvestmentPlanVersion[] = [
    {
      id: 1,
      plan_id: 1,
      version_number: 1,
      minimum_amount: '100.00',
      maximum_amount: '50000.00',
      duration: 30,
      duration_unit: 'DAYS',
      lock_period: 30,
      return_model: 'FIXED_RATE',
      return_rate: '6.50',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: true,
      early_exit_fee: '1.00',
      early_exit_rules: 'Early exit permitted after 10 days with a 1.00% fee on accrued return.',
      auto_renew_allowed: true,
      fees_structure: { entry_fee_pct: '0.00' },
      risk_level: 'CONSERVATIVE',
      risk_disclosure: 'Capital is subject to market and credit risks. Returns are modeled according to contractual fixed rates but are not insured by government deposit schemes.',
      terms_text: 'Standard term note agreement v1. Principal locked for 30 calendar days.',
      effective_from: '2025-01-10T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 2,
      plan_id: 2,
      version_number: 1,
      minimum_amount: '500.00',
      maximum_amount: '100000.00',
      duration: 90,
      duration_unit: 'DAYS',
      lock_period: 90,
      return_model: 'FIXED_RATE',
      return_rate: '12.00',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: true,
      early_exit_fee: '2.50',
      early_exit_rules: 'Early exit permitted with 2.50% fee on accrued returns.',
      auto_renew_allowed: true,
      fees_structure: { entry_fee_pct: '0.00' },
      risk_level: 'MODERATE',
      risk_disclosure: 'Medium volatility asset allocation. Past performance is not indicative of future results.',
      terms_text: 'Apex High-Yield Terms v1.',
      effective_from: '2025-01-15T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-01-15T00:00:00Z'
    },
    {
      id: 3,
      plan_id: 3,
      version_number: 1,
      minimum_amount: '1000.00',
      maximum_amount: '250000.00',
      duration: 180,
      duration_unit: 'DAYS',
      lock_period: 180,
      return_model: 'FIXED_RATE',
      return_rate: '22.00',
      return_frequency: 'ON_MATURITY',
      early_exit_allowed: false,
      early_exit_fee: '0.00',
      early_exit_rules: 'Early exit is strictly not allowed for this plan.',
      auto_renew_allowed: false,
      fees_structure: { entry_fee_pct: '0.50' },
      risk_level: 'DYNAMIC',
      risk_disclosure: 'High growth venture allocation. Principal is locked for the entire 180-day term without early redemption rights.',
      terms_text: 'Venture Alpha Fund Agreement v1.',
      effective_from: '2025-02-01T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-02-01T00:00:00Z'
    }
  ];

  public userInvestments: UserInvestment[] = [];
  public investmentEvents: InvestmentEvent[] = [];

  public users: User[] = [
    {
      id: 1,
      uuid: 'u-syedhadi-001',
      name: 'Syed Hadi',
      username: 'syedhadi',
      email: 'syedhadi6795@gmail.com',
      phone: '+1 555 019 2831',
      password_hash: hashPassword('ApexAdmin2026!'),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2026-09-01T00:00:00Z',
      phone_verified_at: '2026-09-01T00:00:00Z',
      two_factor_enabled: false,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      last_login_at: '2026-09-09T12:00:00Z'
    },
    {
      id: 2,
      uuid: 'u-admin-002',
      name: 'Apex Administrator',
      username: 'admin',
      email: 'admin@apexplatform.com',
      phone: '+1 555 010 0001',
      password_hash: hashPassword('ApexAdmin2026!'),
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2026-09-01T00:00:00Z',
      phone_verified_at: '2026-09-01T00:00:00Z',
      two_factor_enabled: false,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      last_login_at: '2026-09-09T10:00:00Z'
    },
    {
      id: 3,
      uuid: 'u-investor-003',
      name: 'Institutional Investor',
      username: 'investor',
      email: 'investor@apexplatform.com',
      phone: '+1 555 010 0002',
      password_hash: hashPassword('DemoSecure123!'),
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2026-09-01T00:00:00Z',
      phone_verified_at: null,
      two_factor_enabled: false,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      last_login_at: '2026-09-08T18:00:00Z'
    },
    {
      id: 4,
      uuid: 'u-cutepari-004',
      name: 'Cute Pari',
      username: 'cutepari',
      email: 'cutepari886@gmail.com',
      phone: '+1 555 019 8888',
      password_hash: hashPassword('ApexAdmin2026!'),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2026-09-01T00:00:00Z',
      phone_verified_at: '2026-09-01T00:00:00Z',
      two_factor_enabled: false,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      last_login_at: '2026-09-13T12:00:00Z'
    }
  ];
  public profiles: UserProfile[] = [
    {
      id: 1,
      user_id: 1,
      country: 'United States',
      timezone: 'America/New_York',
      language: 'en',
      date_of_birth: '1992-05-15',
      address_line1: '100 Wall Street',
      address_line2: 'Suite 2400',
      city: 'New York',
      state_province: 'NY',
      postal_code: '10005',
      profile_metadata: { role_title: 'Platform Owner & Super Administrator' }
    },
    {
      id: 2,
      user_id: 2,
      country: 'United States',
      timezone: 'America/New_York',
      language: 'en',
      date_of_birth: '1988-11-20',
      address_line1: '100 Wall Street',
      address_line2: 'Floor 18',
      city: 'New York',
      state_province: 'NY',
      postal_code: '10005',
      profile_metadata: { role_title: 'Operations Director' }
    },
    {
      id: 3,
      user_id: 3,
      country: 'United Kingdom',
      timezone: 'Europe/London',
      language: 'en',
      date_of_birth: '1990-03-12',
      address_line1: '25 Bank Street',
      address_line2: 'Canary Wharf',
      city: 'London',
      state_province: 'London',
      postal_code: 'E14 5JP',
      profile_metadata: { tier: 'Institutional VIP' }
    }
  ];

  public roles: Role[] = [
    { id: 1, name: 'SUPER_ADMIN', description: 'Full administrative authority across all modules.', created_at: '2025-01-01T00:00:00Z' },
    { id: 2, name: 'ADMIN', description: 'Daily operations, user management, and compliance oversight.', created_at: '2025-01-01T00:00:00Z' },
    { id: 3, name: 'SUPPORT', description: 'Customer tickets, communication, and basic verification.', created_at: '2025-01-01T00:00:00Z' },
    { id: 4, name: 'FINANCE', description: 'Deposits, withdrawals, ledger audits, and financial reporting.', created_at: '2025-01-01T00:00:00Z' },
    { id: 5, name: 'INVESTMENT_MANAGER', description: 'Management of investment products, limits, and timelines.', created_at: '2025-01-01T00:00:00Z' },
    { id: 6, name: 'GAME_MANAGER', description: 'Management of games lobby, maintenance status, and configurations.', created_at: '2025-01-01T00:00:00Z' },
    { id: 7, name: 'CONTENT_MANAGER', description: 'CMS pages, terms, announcements, and FAQs.', created_at: '2025-01-01T00:00:00Z' },
    { id: 8, name: 'USER', description: 'Registered portal participant with standard dashboard capabilities.', created_at: '2025-01-01T00:00:00Z' }
  ];

  public permissions: Permission[] = [
    { id: 1, name: 'users.view', category: 'users', description: 'View user list and account details' },
    { id: 2, name: 'users.edit', category: 'users', description: 'Edit profile metadata and properties' },
    { id: 3, name: 'users.suspend', category: 'users', description: 'Place user account in suspended status' },
    { id: 4, name: 'users.ban', category: 'users', description: 'Permanently revoke platform access' },
    { id: 5, name: 'deposits.view', category: 'finance', description: 'Inspect deposit requests and histories' },
    { id: 6, name: 'deposits.manage', category: 'finance', description: 'Approve or reject manual deposit flows' },
    { id: 7, name: 'withdrawals.view', category: 'finance', description: 'Inspect withdrawal queues' },
    { id: 8, name: 'withdrawals.manage', category: 'finance', description: 'Review and confirm withdrawal approvals' },
    { id: 9, name: 'investment_plans.view', category: 'investments', description: 'View investment plan catalogue' },
    { id: 10, name: 'investment_plans.create', category: 'investments', description: 'Design and publish new investment plans' },
    { id: 11, name: 'investment_plans.edit', category: 'investments', description: 'Modify thresholds, durations, and terms' },
    { id: 12, name: 'investment_plans.disable', category: 'investments', description: 'Retire plans from public availability' },
    { id: 13, name: 'games.view', category: 'games', description: 'Inspect games catalogue' },
    { id: 14, name: 'games.manage', category: 'games', description: 'Toggle game availability and maintenance' },
    { id: 15, name: 'support.view', category: 'support', description: 'Read customer service tickets' },
    { id: 16, name: 'support.manage', category: 'support', description: 'Reply to, escalate, and resolve tickets' },
    { id: 17, name: 'reports.view', category: 'reports', description: 'Access operational analytics' },
    { id: 18, name: 'reports.export', category: 'reports', description: 'Download CSV and JSON analytical digests' },
    { id: 19, name: 'settings.view', category: 'settings', description: 'View system environment parameters' },
    { id: 20, name: 'settings.edit', category: 'settings', description: 'Change system settings and maintenance switches' },
    { id: 21, name: 'admins.view', category: 'admins', description: 'Inspect administrator directory' },
    { id: 22, name: 'admins.create', category: 'admins', description: 'Provision new staff access' },
    { id: 23, name: 'admins.edit', category: 'admins', description: 'Update administrative access assignments' },
    { id: 24, name: 'admins.disable', category: 'admins', description: 'Revoke administrator authorization' },
    // Phase 3 Financial Double-Entry Ledger & Governance Permissions
    { id: 25, name: 'wallet.view', category: 'finance', description: 'View personal wallet balances and status' },
    { id: 26, name: 'transactions.view', category: 'finance', description: 'View personal financial transaction ledger' },
    { id: 27, name: 'transactions.view_admin', category: 'finance', description: 'Inspect full enterprise double-entry transaction journals' },
    { id: 28, name: 'financial_reports.view', category: 'finance', description: 'View aggregate institutional ledger balance reports' },
    { id: 29, name: 'financial_reconciliation.view', category: 'finance', description: 'Run and view automated 9-point double-entry reconciliations' },
    { id: 30, name: 'financial_adjustments.request', category: 'finance', description: 'Submit manual financial adjustment requests' },
    { id: 31, name: 'financial_adjustments.approve', category: 'finance', description: 'Authorize and post manual ledger adjustments' }
  ];

  public userRoles: UserRole[] = [
    // Syed Hadi (Owner/SuperAdmin)
    { user_id: 1, role_id: 1 },
    { user_id: 1, role_id: 2 },
    { user_id: 1, role_id: 8 },
    // Apex Administrator
    { user_id: 2, role_id: 1 },
    { user_id: 2, role_id: 2 },
    // Institutional Investor
    { user_id: 3, role_id: 8 }
  ];

  public rolePermissions: RolePermission[] = [
    // Super Admin has all 1..31
    ...Array.from({ length: 31 }, (_, i) => ({ role_id: 1, permission_id: i + 1 })),
    // Admin (role_id 2)
    { role_id: 2, permission_id: 1 },
    { role_id: 2, permission_id: 2 },
    { role_id: 2, permission_id: 3 },
    { role_id: 2, permission_id: 5 },
    { role_id: 2, permission_id: 7 },
    { role_id: 2, permission_id: 9 },
    { role_id: 2, permission_id: 13 },
    { role_id: 2, permission_id: 15 },
    { role_id: 2, permission_id: 16 },
    { role_id: 2, permission_id: 17 },
    { role_id: 2, permission_id: 19 },
    { role_id: 2, permission_id: 25 },
    { role_id: 2, permission_id: 26 },
    { role_id: 2, permission_id: 27 },
    { role_id: 2, permission_id: 28 },
    { role_id: 2, permission_id: 29 },
    { role_id: 2, permission_id: 30 },
    // Finance (role_id 4)
    { role_id: 4, permission_id: 1 },
    { role_id: 4, permission_id: 5 },
    { role_id: 4, permission_id: 6 },
    { role_id: 4, permission_id: 7 },
    { role_id: 4, permission_id: 8 },
    { role_id: 4, permission_id: 17 },
    { role_id: 4, permission_id: 18 },
    { role_id: 4, permission_id: 25 },
    { role_id: 4, permission_id: 26 },
    { role_id: 4, permission_id: 27 },
    { role_id: 4, permission_id: 28 },
    { role_id: 4, permission_id: 29 },
    { role_id: 4, permission_id: 30 },
    { role_id: 4, permission_id: 31 },
    // Standard User (role_id 8)
    { role_id: 8, permission_id: 25 },
    { role_id: 8, permission_id: 26 }
  ];

  public sessions: UserSession[] = [];
  public notifications: NotificationItem[] = [];
  public supportTickets: SupportTicket[] = [];
  public supportMessages: SupportMessage[] = [];
  public auditLogs: AuditLog[] = [];

  public systemSettings: SystemSetting[] = [
    { id: 1, key: 'platform_name', value: 'ApexPlatform', type: 'STRING', description: 'Primary public title and brand label', updated_at: '2026-09-01T00:00:00Z' },
    { id: 2, key: 'maintenance_mode', value: 'false', type: 'BOOLEAN', description: 'Global switch to route traffic to maintenance view', updated_at: '2026-09-07T13:50:00Z' },
    { id: 3, key: 'registration_allowed', value: 'true', type: 'BOOLEAN', description: 'Allows public registration of new member accounts', updated_at: '2026-09-01T00:00:00Z' },
    { id: 4, key: 'max_failed_logins', value: '5', type: 'NUMBER', description: 'Consecutive failed login threshold before account lock', updated_at: '2026-09-01T00:00:00Z' },
    { id: 5, key: 'phase_mode', value: 'PHASE_1_FOUNDATION', type: 'STRING', description: 'System stage guard: real money operations disabled', updated_at: '2026-09-01T00:00:00Z' }
  ];

  public contentPages: ContentPage[] = [
    {
      id: 1,
      slug: 'about-us',
      title: 'About ApexPlatform',
      content: 'ApexPlatform is an institutional digital infrastructure designed for capital governance, verifiable entertainment modules, and multi-tier organizational operations.',
      status: 'PUBLISHED',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2026-02-15T00:00:00Z'
    },
    {
      id: 2,
      slug: 'risk-disclosure',
      title: 'Risk Disclosure Notice',
      content: 'Digital asset participation and automated systems involve significant operational, market, and technological risks. Past performance indicators are non-guaranteed estimates.',
      status: 'PUBLISHED',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2026-02-15T00:00:00Z'
    }
  ];

  public announcements: Announcement[] = [
    {
      id: 1,
      title: 'Phase 1 System Architecture Live',
      content: 'The core platform architecture, database schemas, RBAC foundation, and public interface have been deployed for architecture inspection.',
      status: 'PUBLISHED',
      publish_at: '2026-09-07T00:00:00Z',
      expires_at: null
    },
    {
      id: 2,
      title: 'Scheduled Audit & Compliance Inspection',
      content: 'System administration modules are undergoing regular authorization matrix verification.',
      status: 'PUBLISHED',
      publish_at: '2026-09-05T00:00:00Z',
      expires_at: '2026-10-01T00:00:00Z'
    }
  ];

  public stakingPoolEntities: import('../types/staking.js').StakingPool[] = [
    {
      id: 1,
      public_id: 'pool_usd_yield',
      name: 'USD High-Yield Liquidity Staking',
      slug: 'usd-high-yield-liquidity',
      description: 'Institutional USD yield pool generating fixed daily reward distributions with guaranteed dollar principal settlement.',
      asset: 'USD',
      currency: 'USD',
      current_version_id: 1,
      status: 'ACTIVE',
      display_order: 1,
      max_pool_capacity: '1000000.00000000',
      current_utilization: '142000.00000000',
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 2,
      public_id: 'pool_usd_apex',
      name: 'USD Apex 30-Day Growth Staking',
      slug: 'usd-apex-growth',
      description: 'Optimized 30-day fixed term USD delegator staking with high annual percentage yields and daily compounding.',
      asset: 'USD',
      currency: 'USD',
      current_version_id: 2,
      status: 'ACTIVE',
      display_order: 2,
      max_pool_capacity: '5000000.00000000',
      current_utilization: '1284500.00000000',
      created_by: 1,
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z'
    },
    {
      id: 3,
      public_id: 'pool_usd_flexible',
      name: 'USD Flexible Daily Cash Staking',
      slug: 'usd-flexible-daily',
      description: 'Short-duration, flexible liquidity USD staking pool with instant daily compounding and no lock penalty.',
      asset: 'USD',
      currency: 'USD',
      current_version_id: 3,
      status: 'ACTIVE',
      display_order: 3,
      max_pool_capacity: '10000000.00000000',
      current_utilization: '2150000.00000000',
      created_by: 1,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z'
    }
  ];

  public stakingPoolVersions: import('../types/staking.js').StakingPoolVersion[] = [
    {
      id: 1,
      pool_id: 1,
      version_number: 1,
      reward_model: 'FIXED_RATE',
      reward_rate: '12.50',
      reward_frequency: 'DAILY',
      minimum_stake: '10.00000000',
      maximum_stake: '25000.00000000',
      lock_period_days: 60,
      cooldown_period_days: 7,
      early_unstake_allowed: true,
      early_unstake_fee: '2.00',
      compound_enabled: true,
      claim_enabled: true,
      unstake_enabled: true,
      terms_version: 1,
      disclosure_version: 1,
      effective_from: '2025-01-10T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 2,
      pool_id: 2,
      version_number: 1,
      reward_model: 'FIXED_RATE',
      reward_rate: '18.00',
      reward_frequency: 'DAILY',
      minimum_stake: '50.00000000',
      maximum_stake: '50000.00000000',
      lock_period_days: 30,
      cooldown_period_days: 3,
      early_unstake_allowed: true,
      early_unstake_fee: '1.50',
      compound_enabled: true,
      claim_enabled: true,
      unstake_enabled: true,
      terms_version: 1,
      disclosure_version: 1,
      effective_from: '2025-01-15T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-01-15T00:00:00Z'
    },
    {
      id: 3,
      pool_id: 3,
      version_number: 1,
      reward_model: 'FIXED_RATE',
      reward_rate: '8.50',
      reward_frequency: 'DAILY',
      minimum_stake: '5.00000000',
      maximum_stake: '100000.00000000',
      lock_period_days: 15,
      cooldown_period_days: 1,
      early_unstake_allowed: true,
      early_unstake_fee: '1.00',
      compound_enabled: true,
      claim_enabled: true,
      unstake_enabled: true,
      terms_version: 1,
      disclosure_version: 1,
      effective_from: '2025-02-01T00:00:00Z',
      effective_until: null,
      created_by: 1,
      created_at: '2025-02-01T00:00:00Z'
    }
  ];

  public userStakes: import('../types/staking.js').UserStake[] = [];
  public stakingRewardAccruals: import('../types/staking.js').StakingRewardAccrual[] = [];
  public stakingEvents: import('../types/staking.js').StakingEvent[] = [];

  // Phase 8 Referral, Affiliate & Bonus Datastores
  public referralCodes: import('../types/referral.js').ReferralCode[] = [
    {
      id: 1,
      user_id: 4,
      code: 'SARAH2026',
      status: 'ACTIVE',
      campaign_id: 1,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
      expires_at: null
    }
  ];
  public referralRelationships: import('../types/referral.js').ReferralRelationship[] = [];
  public affiliateCommissionRules: import('../types/referral.js').AffiliateCommissionRule[] = [
    {
      id: 1,
      name: 'Deposit Affiliate Commission',
      event_type: 'FIRST_DEPOSIT_CONFIRMED',
      calculation_type: 'PERCENTAGE',
      rate: '10.00',
      fixed_amount: '0.00',
      minimum_event_amount: '10.00',
      maximum_commission: '500.00',
      currency: 'USD',
      status: 'ACTIVE',
      version: 1,
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 2,
      name: 'Gaming Wager Referral Commission',
      event_type: 'WAGER_SETTLED',
      calculation_type: 'PERCENTAGE',
      rate: '2.50',
      fixed_amount: '0.00',
      minimum_event_amount: '1.00',
      maximum_commission: '250.00',
      currency: 'USD',
      status: 'ACTIVE',
      version: 1,
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    },
    {
      id: 3,
      name: 'Staking Delegation Referral Commission',
      event_type: 'STAKE_COMMITTED',
      calculation_type: 'PERCENTAGE',
      rate: '3.00',
      fixed_amount: '0.00',
      minimum_event_amount: '10.00',
      maximum_commission: '300.00',
      currency: 'USD',
      status: 'ACTIVE',
      version: 1,
      created_by: 1,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    }
  ];
  public affiliateCommissions: import('../types/referral.js').AffiliateCommission[] = [];

  // Admin Configurable Deposit Bonus Tiers
  public depositBonusTiers: Array<{
    id: number;
    name: string;
    min_deposit: string;
    max_deposit?: string;
    bonus_amount: string;
    bonus_type: 'FIXED' | 'PERCENTAGE';
    status: 'ACTIVE' | 'INACTIVE';
    description: string;
    created_at: string;
  }> = [
    {
      id: 1,
      name: 'Deposit $100 -> Get $10 Bonus',
      min_deposit: '100.00',
      max_deposit: '199.99',
      bonus_amount: '10.00',
      bonus_type: 'FIXED',
      status: 'ACTIVE',
      description: 'Deposit $100 - $199.99 to get an instant $10.00 cash bonus credited directly to your wallet.',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: 'Deposit $200 -> Get $30 Bonus',
      min_deposit: '200.00',
      max_deposit: '499.99',
      bonus_amount: '30.00',
      bonus_type: 'FIXED',
      status: 'ACTIVE',
      description: 'Deposit $200 - $499.99 to receive an instant $30.00 cash bonus.',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 3,
      name: 'Deposit $500 -> Get $100 Bonus',
      min_deposit: '500.00',
      max_deposit: '999.99',
      bonus_amount: '100.00',
      bonus_type: 'FIXED',
      status: 'ACTIVE',
      description: 'Deposit $500 - $999.99 to receive an instant $100.00 cash bonus.',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 4,
      name: 'VIP High Roller Deposit $1,000+ -> Get $250 Bonus',
      min_deposit: '1000.00',
      max_deposit: undefined,
      bonus_amount: '250.00',
      bonus_type: 'FIXED',
      status: 'ACTIVE',
      description: 'Deposit $1,000 or more to receive a premier $250.00 deposit bonus.',
      created_at: '2025-01-01T00:00:00Z'
    }
  ];

  public bonusCampaigns: import('../types/referral.js').BonusCampaign[] = [
    {
      id: 1,
      name: 'Welcome Sign-up Bonus',
      code: 'WELCOME25',
      description: 'Promotional sign-up bonus credit for verified institutional clients.',
      bonus_type: 'WELCOME_BONUS',
      reward_type: 'FIXED',
      amount: '25.00',
      currency: 'USD',
      minimum_qualifying_amount: '100.00',
      maximum_bonus: '25.00',
      total_budget: '10000.00',
      awarded_budget: '250.00',
      start_date: '2025-01-01T00:00:00Z',
      end_date: '2026-12-31T23:59:59Z',
      status: 'ACTIVE',
      terms_version: 1,
      created_by: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  ];
  public userBonuses: import('../types/referral.js').UserBonus[] = [];

  // Phase 9-15 Games & Compliance Datastores
  public gameEntities: import('../types/games.js').GameEntity[] = [
    {
      id: 1,
      slug: 'blackjack',
      name: 'Blackjack',
      display_name: 'Classic 21 Blackjack',
      description: 'Beat the dealer by getting hand closer to 21 without busting. Includes Hit, Stand, Double Down, Split, and Insurance.',
      category: 'CARDS',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '0.50',
      configured_rtp_pct: '99.50',
      min_allowed_rtp: '95.00',
      max_allowed_rtp: '99.80',
      max_multiplier: '2.5x',
      thumbnail_url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Spade',
      sort_order: 1,
      is_featured: true,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 2,
      slug: 'crash',
      name: 'Crash',
      display_name: 'Aviator Curve Crash',
      description: 'Watch the rocket ascent multiplier climb in real-time. Cash out before the rocket crashes to secure your multiplied winnings!',
      category: 'CRASH',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '2500.00',
      house_edge_pct: '2.00',
      configured_rtp_pct: '98.00',
      min_allowed_rtp: '94.00',
      max_allowed_rtp: '99.00',
      max_multiplier: '1000.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      icon_name: 'TrendingUp',
      sort_order: 2,
      is_featured: true,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 3,
      slug: 'mines',
      name: 'Mines',
      display_name: 'Neon Minesweeper',
      description: 'Uncover gems across the grid while dodging hidden mines. Every safe crystal increases your cashout multiplier exponentially.',
      category: 'CASUAL',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '1.50',
      configured_rtp_pct: '98.50',
      min_allowed_rtp: '94.00',
      max_allowed_rtp: '99.50',
      max_multiplier: '10000.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Bomb',
      sort_order: 3,
      is_featured: true,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 4,
      slug: 'slots',
      name: 'Slots',
      display_name: 'Neon 777 Video Slots',
      description: 'Classic 5-reel / 3-row slot machine with neon cherries, lucky sevens, diamonds, payline evaluation, and volatility selection.',
      category: 'SLOTS',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '1000.00',
      house_edge_pct: '3.50',
      configured_rtp_pct: '96.50',
      min_allowed_rtp: '92.00',
      max_allowed_rtp: '98.50',
      max_multiplier: '2500.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Cherry',
      sort_order: 4,
      is_featured: true,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 5,
      slug: 'dice',
      name: 'Dice',
      display_name: 'Quantum Dice',
      description: 'High-precision cryptographic dice roll. Adjust the win probability slider from 1% to 98% with instant transparent odds.',
      category: 'DICE',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '1.00',
      configured_rtp_pct: '99.00',
      min_allowed_rtp: '95.00',
      max_allowed_rtp: '99.50',
      max_multiplier: '99.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Dice5',
      sort_order: 5,
      is_featured: true,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 6,
      slug: 'coinflip',
      name: 'Coin Flip',
      display_name: 'Binary Coin Flip',
      description: 'Flip the two-sided golden coin for instant double payouts or build consecutive win streak multipliers.',
      category: 'CASUAL',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '1.50',
      configured_rtp_pct: '98.50',
      min_allowed_rtp: '95.00',
      max_allowed_rtp: '99.50',
      max_multiplier: '32.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Coins',
      sort_order: 6,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 7,
      slug: 'roulette',
      name: 'European Roulette',
      display_name: 'European Grand Roulette',
      description: 'Authentic 37-pocket single-zero European wheel with complete betting layout and provably fair cryptographic RNG.',
      category: 'ROULETTE',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '2.70',
      configured_rtp_pct: '97.30',
      min_allowed_rtp: '94.00',
      max_allowed_rtp: '98.50',
      max_multiplier: '36.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Disc',
      sort_order: 7,
      is_featured: true,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 8,
      slug: 'limbo',
      name: 'Limbo',
      display_name: 'Limbo Rocket',
      description: 'Set your target multiplier and watch the rocket blast off. Instant single-click high-multiplier potential.',
      category: 'CRASH',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '2500.00',
      house_edge_pct: '1.50',
      configured_rtp_pct: '98.50',
      min_allowed_rtp: '94.00',
      max_allowed_rtp: '99.00',
      max_multiplier: '1000.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1517976487507-5b3b4b45f47c?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Rocket',
      sort_order: 8,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 9,
      slug: 'hilo',
      name: 'Hi-Lo',
      display_name: 'Hi-Lo Card Ladder',
      description: 'Predict whether the next card will be Higher, Lower, or Same. Build sequential streaks to escalate your payout multiplier!',
      category: 'CARDS',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '3000.00',
      house_edge_pct: '2.00',
      configured_rtp_pct: '98.00',
      min_allowed_rtp: '94.00',
      max_allowed_rtp: '99.00',
      max_multiplier: '50.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1541278107931-e006523892df?w=600&auto=format&fit=crop&q=80',
      icon_name: 'ArrowUpDown',
      sort_order: 9,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 10,
      slug: 'baccarat',
      name: 'Baccarat',
      display_name: 'Punto Banco Baccarat',
      description: 'Bet on Player, Banker, or Tie in this classic table game. Natural 8s and 9s, tableau drawing rules, and 0.95x Banker commission.',
      category: 'TABLE',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '1.06',
      configured_rtp_pct: '98.94',
      min_allowed_rtp: '95.00',
      max_allowed_rtp: '99.20',
      max_multiplier: '8.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Crown',
      sort_order: 10,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 11,
      slug: 'dragontiger',
      name: 'Dragon Tiger',
      display_name: 'Dragon Tiger Duel',
      description: 'Rapid two-card showdown. Bet on Dragon or Tiger; the single card with the higher value wins instantly!',
      category: 'CARDS',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '3.73',
      configured_rtp_pct: '96.27',
      min_allowed_rtp: '92.00',
      max_allowed_rtp: '98.00',
      max_multiplier: '8.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Flame',
      sort_order: 11,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 12,
      slug: 'keno',
      name: 'Keno',
      display_name: 'Cyber Keno 80',
      description: 'Pick 1 to 10 lucky numbers on the 80-ball matrix. 20 winning balls are drawn in a neon hopper with tiered match multipliers.',
      category: 'CASUAL',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '1000.00',
      house_edge_pct: '4.00',
      configured_rtp_pct: '96.00',
      min_allowed_rtp: '92.00',
      max_allowed_rtp: '98.00',
      max_multiplier: '1000.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Grid',
      sort_order: 12,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 13,
      slug: 'sicbo',
      name: 'Sic Bo',
      display_name: 'Sic Bo Ancient Dice',
      description: 'Three dice shaken in a glass dome. Bet on Small (4-10), Big (11-17), Specific Triples, Doubles, and Total Sums.',
      category: 'DICE',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '2.78',
      configured_rtp_pct: '97.22',
      min_allowed_rtp: '93.00',
      max_allowed_rtp: '98.50',
      max_multiplier: '180.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Dice3',
      sort_order: 13,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 14,
      slug: 'tower',
      name: 'Tower',
      display_name: 'Neon Tower Climb',
      description: 'Climb 9 rows of glowing platforms. Pick safe tiles on each tier to ascend higher and multiply your potential cashout.',
      category: 'CASUAL',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '2000.00',
      house_edge_pct: '2.00',
      configured_rtp_pct: '98.00',
      min_allowed_rtp: '94.00',
      max_allowed_rtp: '99.00',
      max_multiplier: '100.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Building2',
      sort_order: 14,
      is_featured: false,
      is_new: true,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 15,
      slug: 'videopoker',
      name: 'Video Poker',
      display_name: 'Jacks or Better Video Poker',
      description: 'Classic 5-card draw video poker. Hold your best cards and redraw for winning hands from Jacks or Better to Royal Flush.',
      category: 'CARDS',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '1000.00',
      house_edge_pct: '0.46',
      configured_rtp_pct: '99.54',
      min_allowed_rtp: '95.00',
      max_allowed_rtp: '99.80',
      max_multiplier: '250.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Gamepad2',
      sort_order: 15,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 16,
      slug: 'threecardpoker',
      name: 'Three Card Poker',
      display_name: '3 Card Poker & Pair Plus',
      description: 'Fast-paced poker showdown with just 3 cards. Beat the dealer with Queen-high or better, and win big on Pair Plus side bets!',
      category: 'TABLE',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '3000.00',
      house_edge_pct: '2.01',
      configured_rtp_pct: '97.99',
      min_allowed_rtp: '93.00',
      max_allowed_rtp: '98.80',
      max_multiplier: '40.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1541278107931-e006523892df?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Layers',
      sort_order: 16,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 17,
      slug: 'scratchcards',
      name: 'Scratch Cards',
      display_name: 'Neon Scratchers',
      description: 'Scratch virtual foil surfaces to reveal hidden symbols. Match 3 symbols or special bonus multipliers for instant prizes!',
      category: 'CASUAL',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '500.00',
      house_edge_pct: '3.50',
      configured_rtp_pct: '96.50',
      min_allowed_rtp: '92.00',
      max_allowed_rtp: '98.00',
      max_multiplier: '500.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Sparkles',
      sort_order: 17,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 18,
      slug: 'war',
      name: 'Casino War',
      display_name: 'Casino War Clash',
      description: 'The ultimate high card duel. Match the dealer’s rank? Surrender half your bet or Go to War for a 3.8x double-down victory!',
      category: 'CARDS',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '5000.00',
      house_edge_pct: '2.88',
      configured_rtp_pct: '97.12',
      min_allowed_rtp: '93.00',
      max_allowed_rtp: '98.50',
      max_multiplier: '3.80x',
      thumbnail_url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80',
      icon_name: 'ShieldAlert',
      sort_order: 18,
      is_featured: false,
      is_new: false,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 19,
      slug: 'tictactoe',
      name: 'Tic Tac Toe',
      display_name: 'Neon Tic-Tac-Toe',
      description: 'Match 3 in a row vs the AI on the neon 3x3 grid. Choose Easy, Medium, or Hard AI difficulty for escalated payout multipliers!',
      category: 'CASUAL',
      status: 'ACTIVE',
      currency: 'USD',
      min_bet: '1.00',
      max_bet: '1000.00',
      house_edge_pct: '2.50',
      configured_rtp_pct: '97.50',
      min_allowed_rtp: '93.00',
      max_allowed_rtp: '98.50',
      max_multiplier: '5.00x',
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      icon_name: 'Cpu',
      sort_order: 19,
      is_featured: false,
      is_new: true,
      sound_enabled: true,
      mobile_available: true,
      desktop_available: true,
      current_version: 1,
      created_at: '2025-01-01T00:00:00Z'
    }
  ];

  public gameRtpAuditLogs: Array<{
    id: number;
    game_slug: string;
    game_name: string;
    previous_rtp: string;
    new_rtp: string;
    previous_house_edge: string;
    new_house_edge: string;
    admin_id: number;
    admin_email: string;
    reason: string;
    created_at: string;
  }> = [
    {
      id: 1,
      game_slug: 'roulette',
      game_name: 'European Roulette',
      previous_rtp: '97.00',
      new_rtp: '97.30',
      previous_house_edge: '3.00',
      new_house_edge: '2.70',
      admin_id: 1,
      admin_email: 'compliance@apexplatform.internal',
      reason: 'Standard European single-zero statistical model calibration (ISO/IEC 17025 certification)',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 2,
      game_slug: 'blackjack',
      game_name: 'Classic 21 Blackjack',
      previous_rtp: '99.00',
      new_rtp: '99.28',
      previous_house_edge: '1.00',
      new_house_edge: '0.72',
      admin_id: 1,
      admin_email: 'compliance@apexplatform.internal',
      reason: '3:2 Natural payout adjustment and dealer soft-17 stand rules validation',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 3,
      game_slug: 'crash',
      game_name: 'Rocket Crash',
      previous_rtp: '98.50',
      new_rtp: '99.00',
      previous_house_edge: '1.50',
      new_house_edge: '1.00',
      admin_id: 1,
      admin_email: 'admin@apexplatform.internal',
      reason: 'Mathematical volatility smoothing for micro-stakes multiplier curve',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ];

  public gameRounds: import('../types/games.js').GameRound[] = [];
  public gameBets: import('../types/games.js').GameBet[] = [
    {
      id: 1,
      public_reference: 'BET-20260910-A91C',
      user_id: 1,
      round_id: 101,
      game_id: 1,
      game_version: 1,
      currency: 'USD',
      selection: 'RED',
      stake: '25.00',
      multiplier: '2.00',
      potential_payout: '50.00',
      actual_payout: '50.00',
      status: 'WON',
      ledger_transaction_id: 801,
      payout_ledger_transaction_id: 802,
      idempotency_key: 'bet_init_1',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      settled_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 2,
      public_reference: 'BET-20260911-F42B',
      user_id: 1,
      round_id: 102,
      game_id: 2,
      game_version: 1,
      currency: 'USD',
      selection: 'HAND-WIN',
      stake: '50.00',
      multiplier: '2.50',
      potential_payout: '125.00',
      actual_payout: '125.00',
      status: 'WON',
      ledger_transaction_id: 803,
      payout_ledger_transaction_id: 804,
      idempotency_key: 'bet_init_2',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      settled_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 3,
      public_reference: 'BET-20260912-7E81',
      user_id: 1,
      round_id: 103,
      game_id: 3,
      game_version: 1,
      currency: 'USD',
      selection: '2.40x',
      stake: '20.00',
      multiplier: '0.00',
      potential_payout: '48.00',
      actual_payout: '0.00',
      status: 'LOST',
      ledger_transaction_id: 805,
      payout_ledger_transaction_id: null,
      idempotency_key: 'bet_init_3',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      settled_at: new Date(Date.now() - 1800000).toISOString()
    }
  ];
  public gameDisputes: import('../types/games.js').GameDispute[] = [];
  public userResponsibleGamingLimits: Array<{ user_id: number; self_excluded: boolean; daily_wager_limit: string | null }> = [];


  public stakingPools: StakingPool[] = [
    {
      id: 1,
      asset_symbol: 'USD',
      asset_name: 'USD Prime Yield Pool',
      lockup_days: 30,
      min_stake: 50.0,
      max_stake: 25000.0,
      estimated_apr_indicator: '6.8% (Daily Compounded)',
      status: 'ACTIVE',
      total_staked_indicator: '$480,000 USD'
    },
    {
      id: 2,
      asset_symbol: 'USD',
      asset_name: 'USD High-Yield Liquidity Reserve',
      lockup_days: 60,
      min_stake: 100.0,
      max_stake: 50000.0,
      estimated_apr_indicator: '9.4% (Daily Compounded)',
      status: 'ACTIVE',
      total_staked_indicator: '$1,250,000 USD'
    },
    {
      id: 3,
      asset_symbol: 'USD',
      asset_name: 'USD Institutional Growth Vault',
      lockup_days: 90,
      min_stake: 500.0,
      max_stake: 100000.0,
      estimated_apr_indicator: '12.5% (Daily Compounded)',
      status: 'ACTIVE',
      total_staked_indicator: '$3,600,000 USD'
    }
  ];

  public games: GameItem[] = [
    {
      id: 1,
      slug: 'classic-dice',
      name: 'Quantum Dice',
      category: 'PROBABILISTIC',
      description: 'Provably fair deterministic dice protocol with verifiable seed verification.',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '98.5% (Configured Model)'
    },
    {
      id: 2,
      slug: 'coin-flip',
      name: 'Binary Coin Flip',
      category: 'PROBABILISTIC',
      description: 'High-speed two-state probabilistic simulation with instant cryptographic verification.',
      thumbnail: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '98.0% (Configured Model)'
    },
    {
      id: 3,
      slug: 'red-black',
      name: 'Roulette Red / Black',
      category: 'PROBABILISTIC',
      description: 'Color-based European single-zero probabilistic sector distribution.',
      thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=400&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '97.3% (Standard Sector)'
    },
    {
      id: 4,
      slug: 'number-game',
      name: 'Apex Number Matrix',
      category: 'STRATEGY',
      description: 'Multi-tiered grid matrix selection with combinatorial multiplier structures.',
      thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '96.8% (Configured Model)'
    },
    {
      id: 5,
      slug: 'european-roulette',
      name: 'European Roulette',
      category: 'PROBABILISTIC',
      description: 'Authentic 37-pocket European roulette wheel with 35:1 straight-up payouts and provably fair cryptographic RNG.',
      thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=400&auto=format&fit=crop&q=80',
      status: 'AVAILABLE',
      rtp_indicator: '97.3% (European Wheel)'
    }
  ];

  public referrals: ReferralData = {
    referral_code: 'APEX-SJ882',
    referral_link: 'https://apexplatform.internal/register?ref=APEX-SJ882',
    total_referred: 7,
    active_referred: 5,
    referral_tier: 'Level 1 Ambassador (Demo)',
    referred_users: [
      { id: 201, username: 'crypto_trader99', joined_at: '2026-08-10T12:00:00Z', status: 'Active' },
      { id: 202, username: 'jordan_b', joined_at: '2026-08-14T09:30:00Z', status: 'Active' },
      { id: 203, username: 'nexus_capital', joined_at: '2026-08-22T15:45:00Z', status: 'Active' },
      { id: 204, username: 'clara_m', joined_at: '2026-08-29T18:10:00Z', status: 'Active' },
      { id: 205, username: 'kevin_007', joined_at: '2026-09-02T11:20:00Z', status: 'Pending Verification' }
    ]
  };

  // Phase 2 Data Collections
  public emailVerificationTokens: EmailVerificationToken[] = [];
  public passwordResetTokens: PasswordResetToken[] = [];
  public twoFactorSecrets: TwoFactorSecret[] = [
    {
      user_id: 1, // Super Admin
      secret: 'JBSWY3DPEHPK3PXP', // Base32 test secret
      recovery_codes_hashes: [
        hashToken('1A2B-3C4D'),
        hashToken('5E6F-7A8B'),
        hashToken('9C0D-1E2F')
      ],
      enabled_at: '2025-01-15T08:10:00Z'
    }
  ];

  public accountRestrictions: AccountRestriction[] = [
    {
      id: 1,
      user_id: 6,
      type: 'SUSPEND',
      reason: 'Automated anomalous velocity detection triggered review',
      actor_user_id: 1,
      created_at: '2026-09-06T18:00:00Z',
      revoked_at: null
    }
  ];

  public loginHistory: LoginHistoryEntry[] = [
    {
      id: 1,
      user_id: 1,
      status: 'SUCCESS',
      ip_address: '198.51.100.42',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      device_type: 'Desktop macOS',
      location: 'San Francisco, US',
      created_at: '2026-09-07T13:45:00Z'
    },
    {
      id: 2,
      user_id: 4,
      status: 'SUCCESS',
      ip_address: '203.0.113.19',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Mobile Safari',
      device_type: 'Mobile iOS',
      location: 'New York, US',
      created_at: '2026-09-07T14:10:00Z'
    },
    {
      id: 3,
      user_id: 5,
      status: 'FAILED',
      ip_address: '198.51.100.99',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
      device_type: 'Desktop Windows',
      location: 'London, UK',
      failure_reason: 'Invalid credentials provided',
      created_at: '2026-09-07T10:30:00Z'
    }
  ];

  // Helper query methods
  public getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  public getUserByEmailOrUsername(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.users.find(u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean);
  }

  public getUserRoles(userId: number): Role[] {
    const roleIds = this.userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role_id);
    return this.roles.filter(r => roleIds.includes(r.id));
  }

  public getUserPermissions(userId: number): Permission[] {
    const userRoles = this.userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role_id);
    const permIds = this.rolePermissions
      .filter(rp => userRoles.includes(rp.role_id))
      .map(rp => rp.permission_id);
    return this.permissions.filter(p => permIds.includes(p.id));
  }

  public hasPermission(userId: number, permName: string): boolean {
    const perms = this.getUserPermissions(userId);
    return perms.some(p => p.name === permName);
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      id: this.auditLogs.length + 1,
      ...entry,
      created_at: new Date().toISOString()
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  // ----------------------------------------------------
  // Session Management
  // ----------------------------------------------------
  public createSession(
    userId: number,
    ip: string,
    userAgent: string,
    deviceType: string,
    location: string = 'United States',
    daysValid: number = 7
  ): UserSession {
    const rawToken = generateSecureToken(32);
    const token = `sess_${userId}_${rawToken}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000).toISOString();

    const newSession: UserSession = {
      id: this.sessions.length + 1,
      user_id: userId,
      session_token: token,
      ip_address: ip,
      user_agent: userAgent,
      device_type: deviceType,
      location,
      created_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      expires_at: expiresAt
    };

    this.sessions.push(newSession);

    // Update user's last_login_at
    const user = this.getUserById(userId);
    if (user) {
      user.last_login_at = now.toISOString();
      user.updated_at = now.toISOString();
    }

    return newSession;
  }

  public getSession(token: string): UserSession | undefined {
    if (!token) return undefined;
    const session = this.sessions.find(s => s.session_token === token);
    if (!session) return undefined;

    // Check expiration
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.revokeSession(token);
      return undefined;
    }

    return session;
  }

  public touchSession(token: string): void {
    const session = this.sessions.find(s => s.session_token === token);
    if (session) {
      session.last_activity_at = new Date().toISOString();
    }
  }

  public revokeSession(token: string): boolean {
    const idx = this.sessions.findIndex(s => s.session_token === token);
    if (idx !== -1) {
      this.sessions.splice(idx, 1);
      return true;
    }
    return false;
  }

  public revokeAllOtherSessions(userId: number, currentToken: string): number {
    const initialCount = this.sessions.length;
    this.sessions = this.sessions.filter(s => s.user_id !== userId || s.session_token === currentToken);
    return initialCount - this.sessions.length;
  }

  public revokeAllUserSessions(userId: number): number {
    const initialCount = this.sessions.length;
    this.sessions = this.sessions.filter(s => s.user_id !== userId);
    return initialCount - this.sessions.length;
  }

  public getUserSessions(userId: number, currentToken?: string): UserSession[] {
    const now = Date.now();
    return this.sessions
      .filter(s => s.user_id === userId && new Date(s.expires_at).getTime() > now)
      .map(s => ({
        ...s,
        is_current: s.session_token === currentToken
      }))
      .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
  }

  // ----------------------------------------------------
  // Email Verification Management
  // ----------------------------------------------------
  public createEmailVerificationToken(userId: number, email: string): { rawToken: string; code: string; expiresAt: string } {
    // Invalidate prior unused tokens for this user
    this.emailVerificationTokens
      .filter(t => t.user_id === userId && !t.used_at)
      .forEach(t => { t.used_at = new Date().toISOString(); });

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const code = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const entry: EmailVerificationToken = {
      id: this.emailVerificationTokens.length + 1,
      user_id: userId,
      email: email.toLowerCase(),
      token_hash: tokenHash,
      code,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      used_at: null
    };

    this.emailVerificationTokens.push(entry);
    return { rawToken, code, expiresAt };
  }

  public verifyEmailTokenOrCode(tokenOrCode: string): { success: boolean; userId?: number; message?: string } {
    const clean = tokenOrCode.trim();
    const tokenHash = hashToken(clean);
    const now = Date.now();

    const record = this.emailVerificationTokens.find(t =>
      (t.token_hash === tokenHash || t.code === clean) &&
      !t.used_at &&
      new Date(t.expires_at).getTime() > now
    );

    if (!record) {
      return { success: false, message: 'Invalid, expired, or already used verification token/code.' };
    }

    record.used_at = new Date().toISOString();

    const user = this.getUserById(record.user_id);
    if (user) {
      user.email_verified_at = new Date().toISOString();
      if (user.status === 'PENDING_VERIFICATION') {
        user.status = 'ACTIVE';
      }
      user.updated_at = new Date().toISOString();
    }

    return { success: true, userId: record.user_id, message: 'Email verified successfully.' };
  }

  // ----------------------------------------------------
  // Password Reset Management
  // ----------------------------------------------------
  public createPasswordResetToken(userId: number): { rawToken: string; expiresAt: string } {
    // Invalidate prior unused reset tokens
    this.passwordResetTokens
      .filter(t => t.user_id === userId && !t.used_at)
      .forEach(t => { t.used_at = new Date().toISOString(); });

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const entry: PasswordResetToken = {
      id: this.passwordResetTokens.length + 1,
      user_id: userId,
      token_hash: tokenHash,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      used_at: null
    };

    this.passwordResetTokens.push(entry);
    return { rawToken, expiresAt };
  }

  public verifyPasswordResetToken(rawToken: string): { success: boolean; userId?: number; message?: string } {
    const clean = rawToken.trim();
    const tokenHash = hashToken(clean);
    const now = Date.now();

    const record = this.passwordResetTokens.find(t =>
      t.token_hash === tokenHash &&
      !t.used_at &&
      new Date(t.expires_at).getTime() > now
    );

    if (!record) {
      return { success: false, message: 'Invalid, expired, or previously redeemed password reset token.' };
    }

    return { success: true, userId: record.user_id };
  }

  public markPasswordResetUsed(rawToken: string): boolean {
    const clean = rawToken.trim();
    const tokenHash = hashToken(clean);
    const record = this.passwordResetTokens.find(t => t.token_hash === tokenHash && !t.used_at);
    if (record) {
      record.used_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  // ----------------------------------------------------
  // Two-Factor Authentication (2FA) Management
  // ----------------------------------------------------
  public setupTwoFactor(userId: number, secret: string, recoveryCodeHashes: string[]): void {
    const existingIdx = this.twoFactorSecrets.findIndex(t => t.user_id === userId);
    const record: TwoFactorSecret = {
      user_id: userId,
      secret,
      recovery_codes_hashes: recoveryCodeHashes,
      enabled_at: null // Not activated until first successful verification
    };

    if (existingIdx !== -1) {
      this.twoFactorSecrets[existingIdx] = record;
    } else {
      this.twoFactorSecrets.push(record);
    }
  }

  public enableTwoFactor(userId: number): boolean {
    const record = this.twoFactorSecrets.find(t => t.user_id === userId);
    const user = this.getUserById(userId);
    if (record && user) {
      record.enabled_at = new Date().toISOString();
      user.two_factor_enabled = true;
      user.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  public disableTwoFactor(userId: number): boolean {
    const user = this.getUserById(userId);
    if (user) {
      user.two_factor_enabled = false;
      user.updated_at = new Date().toISOString();
      this.twoFactorSecrets = this.twoFactorSecrets.filter(t => t.user_id !== userId);
      return true;
    }
    return false;
  }

  public getTwoFactorSecret(userId: number): TwoFactorSecret | undefined {
    return this.twoFactorSecrets.find(t => t.user_id === userId);
  }

  public updateRecoveryCodeHashes(userId: number, hashes: string[]): boolean {
    const record = this.twoFactorSecrets.find(t => t.user_id === userId);
    if (record) {
      record.recovery_codes_hashes = hashes;
      return true;
    }
    return false;
  }

  // ----------------------------------------------------
  // Login History & Restrictions
  // ----------------------------------------------------
  public addLoginHistory(entry: Omit<LoginHistoryEntry, 'id' | 'created_at'>): LoginHistoryEntry {
    const newEntry: LoginHistoryEntry = {
      id: this.loginHistory.length + 1,
      ...entry,
      created_at: new Date().toISOString()
    };
    this.loginHistory.unshift(newEntry);
    if (this.loginHistory.length > 500) {
      this.loginHistory.pop();
    }
    return newEntry;
  }

  public getLoginHistory(userId: number, limit: number = 20): LoginHistoryEntry[] {
    return this.loginHistory.filter(h => h.user_id === userId).slice(0, limit);
  }

  public suspendUser(userId: number, actorId: number, reason: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;

    user.status = 'SUSPENDED';
    user.updated_at = new Date().toISOString();

    // Revoke all active sessions
    this.revokeAllUserSessions(userId);

    this.accountRestrictions.push({
      id: this.accountRestrictions.length + 1,
      user_id: userId,
      type: 'SUSPEND',
      reason,
      actor_user_id: actorId,
      created_at: new Date().toISOString(),
      revoked_at: null
    });

    return true;
  }

  public banUser(userId: number, actorId: number, reason: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;

    user.status = 'BANNED';
    user.updated_at = new Date().toISOString();

    // Revoke all active sessions
    this.revokeAllUserSessions(userId);

    this.accountRestrictions.push({
      id: this.accountRestrictions.length + 1,
      user_id: userId,
      type: 'BAN',
      reason,
      actor_user_id: actorId,
      created_at: new Date().toISOString(),
      revoked_at: null
    });

    return true;
  }

  public unbanUser(userId: number, actorId: number, reason: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;

    user.status = 'ACTIVE';
    user.updated_at = new Date().toISOString();

    // Revoke previous restrictions
    this.accountRestrictions
      .filter(r => r.user_id === userId && !r.revoked_at)
      .forEach(r => { r.revoked_at = new Date().toISOString(); });

    return true;
  }

  public getAccountRestrictions(userId: number): AccountRestriction[] {
    return this.accountRestrictions.filter(r => r.user_id === userId);
  }
}

export const dataStore = new DataStore();
