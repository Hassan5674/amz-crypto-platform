import { Router, Response } from 'express';
import { dataStore } from '../dataStore.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';
import {
  authMiddleware,
  requirePermission,
  AuthenticatedRequest
} from '../middleware/auth.js';
import { WithdrawalService } from '../finance/withdrawalService.js';
import { WithdrawalReconciliationService } from '../finance/withdrawalReconciliation.js';
import { balanceService } from '../finance/balanceService.js';
import { logger } from '../logger.js';
import { WithdrawalDestination } from '../../types/finance.js';

const router = Router();

// ============================================================================
// 1. USER WITHDRAWAL & DESTINATION APIS
// ============================================================================

/**
 * GET /withdrawal-destinations
 * List user's saved withdrawal destinations.
 */
router.get('/withdrawal-destinations', authMiddleware, requirePermission('withdrawals.view'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const destinations = dataStore.withdrawalDestinations.filter(d => d.user_id === userId && d.verification_status !== 'DISABLED');
    res.json(createResponse(destinations));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * POST /withdrawal-destinations
 * Add a new withdrawal destination (bank account, crypto address, etc.).
 */
router.post('/withdrawal-destinations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type = 'bank_account', currency = 'USD', provider = 'Bank', display_name, masked_identifier } = req.body;

    if (!display_name || !masked_identifier) {
      return res.status(400).json(createErrorResponse('Display name and masked identifier are required'));
    }

    const newDest: WithdrawalDestination = {
      id: dataStore.withdrawalDestinations.length + 1,
      uuid: crypto.randomUUID ? crypto.randomUUID() : `dest_${Date.now()}`,
      user_id: userId,
      type: type as any,
      currency: currency.toUpperCase(),
      provider,
      display_name,
      masked_identifier,
      verification_status: 'VERIFIED', // or PENDING / COOLING_OFF
      is_default: dataStore.withdrawalDestinations.filter(d => d.user_id === userId).length === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      disabled_at: null
    };

    dataStore.withdrawalDestinations.push(newDest);
    logger.info('FINANCE', `New withdrawal destination added by user #${userId}: ${display_name} (${masked_identifier})`);
    res.json(createResponse(newDest, 'Withdrawal destination successfully added'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * DELETE /withdrawal-destinations/:id
 * Disable/remove a user withdrawal destination.
 */
router.delete('/withdrawal-destinations/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const destId = parseInt(req.params.id);
    const dest = dataStore.withdrawalDestinations.find(d => d.id === destId && d.user_id === userId);
    if (!dest) {
      return res.status(404).json(createErrorResponse('Destination not found'));
    }

    dest.verification_status = 'DISABLED';
    dest.disabled_at = new Date().toISOString();
    dest.updated_at = new Date().toISOString();

    res.json(createResponse(null, 'Destination successfully removed'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * GET /withdrawals
 * List user's withdrawal requests.
 */
router.get('/withdrawals', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));

    const withdrawals = dataStore.withdrawalRequests
      .filter(w => w.user_id === userId)
      .sort((a, b) => b.id - a.id);

    const total = withdrawals.length;
    const paginated = withdrawals.slice((page - 1) * limit, page * limit);

    res.json(createResponse({
      data: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * POST /withdrawals
 * Request a new withdrawal. Atomically locks available balance via ledger.
 */
router.post('/withdrawals', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { destination_id, amount, currency = 'USD' } = req.body;

    if (!destination_id || !amount) {
      return res.status(400).json(createErrorResponse('Destination ID and amount are required'));
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'ApexPlatform-Client';

    const withdrawal = WithdrawalService.requestWithdrawal(
      userId,
      parseInt(destination_id),
      String(amount),
      String(currency),
      ip,
      userAgent
    );

    const newBalance = balanceService.getAvailableBalance(userId, currency).toString();
    res.json(createResponse({
      ...withdrawal,
      new_balance: newBalance
    }, 'Withdrawal successfully requested and funds deducted from available balance'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('FINANCE', `Withdrawal request failed: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * GET /withdrawals/:id
 * Get single withdrawal details for owner user.
 */
router.get('/withdrawals/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wdId = parseInt(req.params.id);
    const wd = dataStore.withdrawalRequests.find(w => w.id === wdId && w.user_id === userId);
    if (!wd) {
      return res.status(404).json(createErrorResponse('Withdrawal request not found'));
    }
    res.json(createResponse(wd));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * POST /withdrawals/:id/cancel
 * Cancel a pending or approved withdrawal request (releases locked funds).
 */
router.post('/withdrawals/:id/cancel', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wdId = parseInt(req.params.id);
    const { reason = 'User cancelled withdrawal' } = req.body;

    const wd = WithdrawalService.cancelWithdrawal(wdId, userId, false, reason);
    res.json(createResponse(wd, 'Withdrawal successfully cancelled and funds returned to available balance'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});


// ============================================================================
// 2. ADMIN WITHDRAWAL GOVERNANCE APIS
// ============================================================================

/**
 * GET /admin/withdrawals
 * Admin list of all withdrawals with filtering and search.
 */
router.get('/admin/withdrawals', authMiddleware, requirePermission('withdrawals.view'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string;
    const riskLevel = req.query.risk_level as string;
    const search = (req.query.search as string || '').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    let withdrawals = [...dataStore.withdrawalRequests];

    if (status) {
      withdrawals = withdrawals.filter(w => w.status === status);
    }
    if (riskLevel) {
      withdrawals = withdrawals.filter(w => w.risk_level === riskLevel);
    }
    if (search) {
      withdrawals = withdrawals.filter(w =>
        w.public_reference.toLowerCase().includes(search) ||
        String(w.user_id).includes(search) ||
        (w.provider_reference && w.provider_reference.toLowerCase().includes(search))
      );
    }

    withdrawals.sort((a, b) => b.id - a.id);

    const total = withdrawals.length;
    const paginated = withdrawals.slice((page - 1) * limit, page * limit);

    res.json(createResponse({
      data: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * GET /admin/withdrawals/:id
 * Admin detail view for a withdrawal.
 */
router.get('/admin/withdrawals/:id', authMiddleware, requirePermission('withdrawals.view'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const wd = dataStore.withdrawalRequests.find(w => w.id === wdId);
    if (!wd) {
      return res.status(404).json(createErrorResponse('Withdrawal not found'));
    }

    const user = dataStore.users.find(u => u.id === wd.user_id);
    const destination = dataStore.withdrawalDestinations.find(d => d.id === wd.destination_id);

    res.json(createResponse({
      withdrawal: wd,
      user: user ? { id: user.id, name: user.name, email: user.email, username: user.username } : null,
      destination
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/review
 */
router.post('/admin/withdrawals/:id/review', authMiddleware, requirePermission('withdrawals.review'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { approve, notes } = req.body;

    const wd = WithdrawalService.reviewWithdrawal(wdId, adminId, Boolean(approve), String(notes || ''));
    res.json(createResponse(wd, 'Withdrawal review completed'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/approve
 */
router.post('/admin/withdrawals/:id/approve', authMiddleware, requirePermission('withdrawals.approve'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { notes } = req.body;

    const wd = WithdrawalService.approveWithdrawal(wdId, adminId, notes ? String(notes) : undefined);
    res.json(createResponse(wd, 'Withdrawal successfully approved'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/reject
 */
router.post('/admin/withdrawals/:id/reject', authMiddleware, requirePermission('withdrawals.reject'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { reason = 'Rejected by finance admin' } = req.body;

    const wd = WithdrawalService.rejectWithdrawal(wdId, adminId, String(reason));
    res.json(createResponse(wd, 'Withdrawal rejected and funds unlocked'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/process
 */
router.post('/admin/withdrawals/:id/process', authMiddleware, requirePermission('withdrawals.process'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const adminId = req.user!.id;

    const wd = await WithdrawalService.processWithdrawal(wdId, adminId);
    res.json(createResponse(wd, 'Withdrawal submitted to payout provider'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/complete
 */
router.post('/admin/withdrawals/:id/complete', authMiddleware, requirePermission('withdrawals.complete'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { provider_reference } = req.body;

    const wd = WithdrawalService.completeWithdrawal(wdId, adminId, String(provider_reference || 'MANUAL_COMPLETION'));
    res.json(createResponse(wd, 'Withdrawal marked completed and settled via ledger'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/fail
 */
router.post('/admin/withdrawals/:id/fail', authMiddleware, requirePermission('withdrawals.process'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const { reason = 'Marked failed by administrator' } = req.body;

    const wd = WithdrawalService.failWithdrawal(wdId, String(reason));
    res.json(createResponse(wd, 'Withdrawal marked failed and funds unlocked'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * POST /admin/withdrawals/:id/reverse
 */
router.post('/admin/withdrawals/:id/reverse', authMiddleware, requirePermission('withdrawals.reverse'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { reason = 'Administrative reversal' } = req.body;

    const wd = WithdrawalService.reverseWithdrawal(wdId, adminId, String(reason));
    res.json(createResponse(wd, 'Withdrawal successfully reversed via immutable ledger entry'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

/**
 * GET /admin/withdrawals/reconciliation/report
 */
router.get('/admin/withdrawals/reconciliation/report', authMiddleware, requirePermission('financial_reconciliation.view'), (_req: AuthenticatedRequest, res: Response) => {
  try {
    const report = WithdrawalReconciliationService.reconcileAll();
    res.json(createResponse(report));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ============================================================================
// 3. PAYMENT PROVIDER WEBHOOK
// ============================================================================
router.post('/webhooks/:provider/payout', (req, res) => {
  try {
    const provider = req.params.provider;
    const payload = req.body;
    logger.info('FINANCE_WEBHOOK', `Received payout webhook from provider [${provider}]: ${JSON.stringify(payload)}`);
    res.json({ received: true, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
