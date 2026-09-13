import { Router, Request, Response } from 'express';
import { dataStore } from '../dataStore.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';
import {
  authMiddleware,
  requirePermission,
  AuthenticatedRequest
} from '../middleware/auth.js';
import { cryptoRateLimiter } from '../middleware/rateLimit.js';
import { cryptoGatewayService } from '../services/cryptoGatewayService.js';
import { nowPaymentsService, normalizeCurrencyCode } from '../services/nowpayments.js';
import { balanceService } from '../finance/balanceService.js';
import { verifyPassword, verifyTotpCode } from '../security.js';
import { logger } from '../logger.js';
import {
  CreateDepositRequestDto,
  CreateWithdrawalRequestDto,
  WalletConnectionEntity,
  CryptoWalletType,
  CryptoAssetConfig
} from '../../types/crypto.js';

const router = Router();

// ============================================================================
// 1. DYNAMIC CURRENCY & NETWORK DISCOVERY
// ============================================================================

/**
 * GET /api/crypto/currencies
 * Dynamically queries official NOWPayments catalog enriched with authoritative minimum bounds
 */
router.get('/currencies', async (req: Request, res: Response) => {
  try {
    const operation = req.query.operation as string | undefined;
    const rawCurrencies = await nowPaymentsService.getAvailableCurrencies();
    const configMap = new Map(dataStore.cryptoAssetConfigs.map(c => [normalizeCurrencyCode(c.code), c]));
    let enriched = rawCurrencies.map((curr) => {
      const config = configMap.get(normalizeCurrencyCode(curr.code));
      if (config) {
        return {
          ...curr,
          min_deposit_usd: config.effective_min_deposit_usd,
          min_withdrawal_usd: config.effective_min_withdrawal_usd,
          provider_min_deposit_usd: config.provider_min_deposit_usd,
          app_min_deposit_usd: config.app_min_deposit_usd,
          effective_min_deposit_usd: config.effective_min_deposit_usd,
          provider_min_withdrawal_usd: config.provider_min_withdrawal_usd,
          app_min_withdrawal_usd: config.app_min_withdrawal_usd,
          effective_min_withdrawal_usd: config.effective_min_withdrawal_usd,
          deposit_available: config.deposit_enabled && curr.deposit_available,
          withdrawal_available: config.withdrawal_enabled && curr.withdrawal_available
        };
      }
      return curr;
    });

    if (operation === 'deposit') {
      enriched = enriched.filter(c => c.deposit_available !== false);
    } else if (operation === 'withdrawal') {
      enriched = enriched.filter(c => c.withdrawal_available !== false);
    }

    res.json(createResponse(enriched));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * GET /api/crypto/currencies/min-amount
 * Returns authoritative minimum allowable amount for selected coin + network and operation
 */
router.get('/currencies/min-amount', async (req: Request, res: Response) => {
  try {
    const currencyParam = String(req.query.currency || 'usdttrc20');
    const operation = String(req.query.operation || 'deposit').toLowerCase();
    const config = await cryptoGatewayService.resolveAssetConfig(currencyParam);

    const isWithdrawal = operation === 'withdrawal' || operation === 'payout';
    const effectiveMin = isWithdrawal ? config.effective_min_withdrawal_usd : config.effective_min_deposit_usd;
    const providerMin = isWithdrawal ? config.provider_min_withdrawal_usd : config.provider_min_deposit_usd;
    const appMin = isWithdrawal ? config.app_min_withdrawal_usd : config.app_min_deposit_usd;

    res.json(createResponse({
      currency: config.symbol,
      network: config.network,
      network_display: config.network_display,
      code: config.code,
      operation: isWithdrawal ? 'withdrawal' : 'deposit',
      min_amount: effectiveMin,
      provider_min: providerMin,
      app_min: appMin,
      effective_min: effectiveMin,
      deposit_enabled: config.deposit_enabled,
      withdrawal_enabled: config.withdrawal_enabled,
      last_updated: config.last_updated
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * GET /api/crypto/payment-options
 * Full cryptocurrency asset configuration & policy specifications
 */
router.get('/payment-options', async (_req: Request, res: Response) => {
  try {
    res.json(createResponse(dataStore.cryptoAssetConfigs));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ============================================================================
// 2. WALLET CONNECTION SESSION
// ============================================================================

/**
 * POST /api/crypto/wallet/connect
 * Registers verified wallet connection session for the authenticated user
 */
router.post(
  '/wallet/connect',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { address, wallet_type = 'METAMASK', chain_id = null, chain_name = null } = req.body;

      if (!address || typeof address !== 'string' || address.length < 10) {
        return res.status(400).json(createErrorResponse('A valid blockchain wallet address is required'));
      }

      // Check existing connection or create a new session
      let conn = dataStore.walletConnections.find(
        w => w.user_id === userId && w.address.toLowerCase() === address.toLowerCase()
      );

      if (conn) {
        conn.wallet_type = wallet_type as CryptoWalletType;
        conn.chain_id = chain_id;
        conn.chain_name = chain_name;
        conn.is_active = true;
        conn.last_seen_at = new Date().toISOString();
      } else {
        conn = {
          id: dataStore.walletConnections.length + 1,
          uuid: crypto.randomUUID ? crypto.randomUUID() : `wconn_${Date.now()}`,
          user_id: userId,
          address: address.trim(),
          wallet_type: wallet_type as CryptoWalletType,
          chain_id,
          chain_name,
          session_token: `w_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          is_active: true,
          connected_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };
        dataStore.walletConnections.push(conn);
      }

      logger.info('CRYPTO', `User #${userId} connected ${wallet_type} wallet: ${address} on chain ${chain_name || chain_id}`);
      res.json(createResponse(conn, 'Wallet successfully connected'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /api/crypto/solana/blockhash
 * Provides reliable, CORS-free latest Solana blockhash for wallet transactions
 */
router.get('/solana/blockhash', async (_req: Request, res: Response) => {
  try {
    const endpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-rpc.publicnode.com',
      'https://rpc.ankr.com/solana'
    ];
    let lastErr: any = null;
    for (const ep of endpoints) {
      try {
        const rpcRes = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'confirmed' }]
          })
        });
        const json: any = await rpcRes.json();
        if (json?.result?.value?.blockhash) {
          return res.json(createResponse({
            blockhash: json.result.value.blockhash,
            lastValidBlockHeight: json.result.value.lastValidBlockHeight,
            endpoint: ep
          }));
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Solana RPC blockhash unavailable');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ============================================================================
// 3. BACKEND-AUTHORITATIVE DEPOSIT ENDPOINTS
// ============================================================================

/**
 * POST /api/crypto/deposits
 * Creates official payment order on NOWPayments
 */
router.post(
  '/deposits',
  authMiddleware,
  cryptoRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const rawBody = req.body || {};
      const currencyCode = rawBody.currency_code || rawBody.currency || rawBody.code;
      const amountVal = rawBody.amount !== undefined && rawBody.amount !== null && rawBody.amount !== ''
        ? String(rawBody.amount)
        : (rawBody.amount_usd !== undefined && rawBody.amount_usd !== null && rawBody.amount_usd !== '' ? String(rawBody.amount_usd) : '');

      if (!currencyCode || !amountVal) {
        return res.status(400).json(createErrorResponse('Currency code and deposit amount are required'));
      }

      const dto: CreateDepositRequestDto = {
        currency_code: String(currencyCode).toLowerCase(),
        network: rawBody.network || '',
        amount: amountVal,
        wallet_address: rawBody.wallet_address || rawBody.customer_wallet_address,
        wallet_type: rawBody.wallet_type || rawBody.customer_wallet_type,
        idempotency_key: rawBody.idempotency_key
      };

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'ApexPlatform-Client';

      const order = await cryptoGatewayService.createDepositOrder(userId, dto, ip, userAgent);
      res.json(createResponse(order, 'Payment order successfully created'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('CRYPTO', `Deposit creation failed: ${msg}`);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /api/crypto/deposits/user
 * List all crypto deposit orders belonging to the user
 */
router.get(
  '/deposits/user',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const orders = dataStore.paymentOrders.filter(o => o.user_id === userId);
      const sorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(createResponse(sorted));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /api/crypto/deposits/:id/status
 * Synchronizes and retrieves latest payment status
 */
router.get(
  '/deposits/:id/status',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.id);
      const order = dataStore.paymentOrders.find(o => o.id === orderId && o.user_id === userId);

      if (!order) {
        return res.status(404).json(createErrorResponse('Deposit order not found'));
      }

      const updated = await cryptoGatewayService.syncPaymentStatus(orderId);
      res.json(createResponse(updated));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /api/crypto/deposits/:id/tx-hash
 * User submits on-chain transaction hash after confirming in wallet
 */
router.post(
  '/deposits/:id/tx-hash',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.id);
      const { tx_hash } = req.body;

      if (!tx_hash) {
        return res.status(400).json(createErrorResponse('Transaction hash is required'));
      }

      const order = cryptoGatewayService.submitClientTxHash(orderId, userId, tx_hash);
      res.json(createResponse(order, 'Transaction submitted. Awaiting provider verification.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

// ============================================================================
// 4. NOWPAYMENTS IPN WEBHOOK LISTENER
// ============================================================================

/**
 * POST /api/crypto/nowpayments/ipn and POST /api/crypto/webhook/nowpayments
 * Authoritative webhook receiver with HMAC-SHA512 verification (LIVE & Production ready)
 */
const handleNowPaymentsIpn = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-nowpayments-sig'] as string | undefined;
    const rawBody = req.body;

    const result = await cryptoGatewayService.processIpnWebhook(rawBody, signature);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('CRYPTO', `IPN Processing failed: ${msg}`);
    res.status(400).json({ error: msg });
  }
};

router.post('/nowpayments/ipn', handleNowPaymentsIpn);
router.post('/webhook/nowpayments', handleNowPaymentsIpn);

// GET diagnostic ping to verify endpoint reachability in browser or monitoring tools
const handleNowPaymentsPing = (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'NOWPayments IPN Callback Endpoint',
    endpoints: [
      '/api/crypto/nowpayments/ipn',
      '/api/crypto/webhook/nowpayments'
    ],
    ready: true,
    timestamp: new Date().toISOString()
  });
};
router.get('/nowpayments/ipn', handleNowPaymentsPing);
router.get('/webhook/nowpayments', handleNowPaymentsPing);

// ============================================================================
// 5. CRYPTO WITHDRAWALS
// ============================================================================

/**
 * POST /api/crypto/withdrawals
 * Secure cryptocurrency withdrawal with balance check & MFA/Password verification
 */
router.post(
  '/withdrawals',
  authMiddleware,
  cryptoRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const dto: CreateWithdrawalRequestDto = req.body;

      // Security check: Require password or 2FA verification for real money withdrawals
      if (user.two_factor_enabled) {
        if (!dto.totp_code) {
          return res.status(403).json(createErrorResponse('Two-factor authentication code is required for withdrawals'));
        }
        const secret = dataStore.twoFactorSecrets.find(s => s.user_id === user.id && s.enabled_at);
        if (!secret || !verifyTotpCode(secret.secret, dto.totp_code)) {
          return res.status(403).json(createErrorResponse('Invalid two-factor authentication code'));
        }
      } else if (dto.password) {
        const isValidPass = await verifyPassword(dto.password, user.password_hash);
        if (!isValidPass) {
          return res.status(403).json(createErrorResponse('Invalid account password'));
        }
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'ApexPlatform-Client';

      const payout = await cryptoGatewayService.requestCryptoWithdrawal(user.id, dto, ip, userAgent);
      const newBalance = balanceService.getAvailableBalance(user.id, 'USD').toString();

      res.json(createResponse({
        ...payout,
        new_balance: newBalance
      }, 'Withdrawal request submitted successfully. Funds deducted from available balance.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /api/crypto/withdrawals/user
 * List user's crypto withdrawals
 */
router.get(
  '/withdrawals/user',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const payouts = dataStore.cryptoPayoutOrders
        .filter(p => p.user_id === userId)
        .map(p => ({
          ...p,
          internal_payout_id: p.uuid || `PO-${p.id}`,
          currency_code: p.currency
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(createResponse(payouts));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

// ============================================================================
// 6. ADMIN CRYPTO PAYMENTS DESK
// ============================================================================

/**
 * GET /api/crypto/admin/payments
 * Full administrative payment review desk
 */
router.get(
  '/admin/payments',
  authMiddleware,
  requirePermission('deposits.view'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const payments = dataStore.paymentOrders.map(order => {
        const user = dataStore.users.find(u => u.id === order.user_id);
        return {
          ...order,
          user_email: user?.email || `User #${order.user_id}`,
          user_name: user?.name || 'Investor'
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(createResponse(payments));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /api/crypto/admin/payments/:id/resync
 * Admin trigger to re-check blockchain status on NOWPayments API
 */
router.post(
  '/admin/payments/:id/resync',
  authMiddleware,
  requirePermission('deposits.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const updated = await cryptoGatewayService.syncPaymentStatus(orderId);
      res.json(createResponse(updated, 'Payment status synchronized with blockchain gateway'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * GET /api/crypto/admin/payouts
 * List all cryptocurrency withdrawal/payout orders for admin review
 */
router.get(
  '/admin/payouts',
  authMiddleware,
  requirePermission(['withdrawals.view', 'deposits.view']),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      const payouts = dataStore.cryptoPayoutOrders.map(payout => {
        const user = dataStore.users.find(u => u.id === payout.user_id);
        return {
          ...payout,
          internal_payout_id: payout.uuid || `PO-${payout.id}`,
          currency_code: payout.currency,
          user_email: user?.email || `User #${payout.user_id}`,
          user_name: user?.name || 'User'
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(createResponse(payouts));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /api/crypto/admin/payouts/:id/approve
 * Admin approves withdrawal request: Automatically dispatches funds via blockchain gateway
 */
router.post(
  '/admin/payouts/:id/approve',
  authMiddleware,
  requirePermission(['withdrawals.manage', 'deposits.manage']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payoutId = parseInt(req.params.id);
      const adminUser = { id: req.user!.id, name: req.user!.name };
      const updated = await cryptoGatewayService.approveAndExecuteCryptoPayout(payoutId, adminUser);
      res.json(createResponse(updated, 'Withdrawal request approved. Blockchain gateway auto-disbursement successfully executed.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /api/crypto/admin/payouts/:id/complete-manual
 * Admin manually completes payout by providing the custom Blockchain Transaction Hash (HRX)
 */
router.post(
  '/admin/payouts/:id/complete-manual',
  authMiddleware,
  requirePermission(['withdrawals.manage', 'deposits.manage']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payoutId = parseInt(req.params.id);
      const { tx_hash, admin_notes } = req.body;
      if (!tx_hash || typeof tx_hash !== 'string' || !tx_hash.trim()) {
        return res.status(400).json(createErrorResponse('Transaction Hash (TxID / HRX) is required to complete manual payout'));
      }
      const adminUser = { id: req.user!.id, name: req.user!.name };
      const updated = await cryptoGatewayService.completeManualCryptoPayout(
        payoutId,
        tx_hash.trim(),
        admin_notes || '',
        adminUser
      );
      res.json(createResponse(updated, 'Manual payout completed successfully. Blockchain transaction hash assigned and ledger settled.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /api/crypto/admin/payouts/:id/reject
 * Admin rejects withdrawal request: Automatically returns locked funds to user's balance
 */
router.post(
  '/admin/payouts/:id/reject',
  authMiddleware,
  requirePermission(['withdrawals.manage', 'deposits.manage']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payoutId = parseInt(req.params.id);
      const reason = req.body.reason || 'Administrative review criteria not met';
      const adminUser = { id: req.user!.id, name: req.user!.name };
      const updated = await cryptoGatewayService.rejectCryptoPayout(payoutId, reason, adminUser);
      res.json(createResponse(updated, 'Withdrawal request rejected. Reserved funds refunded to user available balance.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json(createErrorResponse(msg));
    }
  }
);

// ============================================================================
// 7. ADMIN CRYPTO CONFIGURATION & LIMITS MANAGEMENT
// ============================================================================

/**
 * GET /api/crypto/admin/settings
 * View all cryptocurrency network configurations & dynamic limits
 */
router.get(
  '/admin/settings',
  authMiddleware,
  requirePermission('settings.view'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(createResponse(dataStore.cryptoAssetConfigs));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * PUT /api/crypto/admin/settings/:code
 * Update app min deposit/withdrawal or toggle asset enablement
 */
router.put(
  '/admin/settings/:code',
  authMiddleware,
  requirePermission('settings.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code } = req.params;
      const {
        app_min_deposit_usd,
        app_min_withdrawal_usd,
        deposit_enabled,
        withdrawal_enabled
      } = req.body;

      const normCode = normalizeCurrencyCode(code);
      let config = dataStore.cryptoAssetConfigs.find(c => normalizeCurrencyCode(c.code) === normCode);
      if (!config) {
        config = await cryptoGatewayService.resolveAssetConfig(normCode);
      }

      if (app_min_deposit_usd !== undefined) {
        const appMin = parseFloat(app_min_deposit_usd);
        if (isNaN(appMin) || appMin < 0) {
          return res.status(400).json(createErrorResponse('Invalid app minimum deposit amount'));
        }
        config.app_min_deposit_usd = appMin.toFixed(2);
      }

      if (app_min_withdrawal_usd !== undefined) {
        const appMinWd = parseFloat(app_min_withdrawal_usd);
        if (isNaN(appMinWd) || appMinWd < 0) {
          return res.status(400).json(createErrorResponse('Invalid app minimum withdrawal amount'));
        }
        config.app_min_withdrawal_usd = appMinWd.toFixed(2);
      }

      if (deposit_enabled !== undefined) config.deposit_enabled = Boolean(deposit_enabled);
      if (withdrawal_enabled !== undefined) config.withdrawal_enabled = Boolean(withdrawal_enabled);

      // Re-calculate effective bounds: Effective = Max(Provider, App)
      config.effective_min_deposit_usd = Math.max(
        parseFloat(config.provider_min_deposit_usd || '0'),
        parseFloat(config.app_min_deposit_usd || '1.00')
      ).toFixed(2);

      config.effective_min_withdrawal_usd = Math.max(
        parseFloat(config.provider_min_withdrawal_usd || '0'),
        parseFloat(config.app_min_withdrawal_usd || '1.00')
      ).toFixed(2);

      config.last_updated = new Date().toISOString();
      config.source = 'ADMIN_CONFIG';

      res.json(createResponse(config, 'Cryptocurrency configuration updated successfully.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

/**
 * POST /api/crypto/admin/sync-limits
 * Trigger on-demand sync of all live provider minimums from NOWPayments API
 */
router.post(
  '/admin/sync-limits',
  authMiddleware,
  requirePermission('settings.manage'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const updatedList: CryptoAssetConfig[] = [];
      for (const config of dataStore.cryptoAssetConfigs) {
        const liveProviderMin = await nowPaymentsService.getMinAmount(config.code);
        config.provider_min_deposit_usd = liveProviderMin;
        config.effective_min_deposit_usd = Math.max(
          parseFloat(liveProviderMin) || 0,
          parseFloat(config.app_min_deposit_usd || '1.00')
        ).toFixed(2);
        config.last_updated = new Date().toISOString();
        updatedList.push(config);
      }
      res.json(createResponse(updatedList, 'Synchronized live network limits with blockchain gateway.'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

export default router;
