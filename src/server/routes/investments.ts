import { Router, Request, Response } from 'express';
import { InvestmentService } from '../finance/investmentService.js';
import { InvestmentReconciliationService } from '../finance/investmentReconciliation.js';
import { dataStore } from '../dataStore.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { logger } from '../logger.js';

const router = Router();

// ----------------------------------------------------
// Public / User Investment Plan Endpoints
// ----------------------------------------------------
router.get('/investment-plans', (req: Request, res: Response) => {
  try {
    const plans = InvestmentService.getPlans();
    res.json({ success: true, data: plans, request_id: (req as any).id || 'req_plans', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error fetching investment plans: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_plans', timestamp: new Date().toISOString() });
  }
});

router.get('/investment-plans/:id', (req: Request, res: Response) => {
  try {
    const plan = InvestmentService.getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Investment plan not found', request_id: (req as any).id || 'req_plan', timestamp: new Date().toISOString() });
    }
    res.json({ success: true, data: plan, request_id: (req as any).id || 'req_plan', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error fetching investment plan detail: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_plan', timestamp: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// User Investments Endpoints (Authenticated)
// ----------------------------------------------------
router.get('/investments', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const investments = InvestmentService.getUserInvestments(userId);
    res.json({ success: true, data: investments, request_id: (req as any).id || 'req_investments', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error fetching user investments: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_investments', timestamp: new Date().toISOString() });
  }
});

router.post('/investments', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { plan_id, amount, currency, auto_renew } = req.body;

    if (!plan_id || !amount) {
      return res.status(400).json({ success: false, message: 'plan_id and amount are required.', request_id: (req as any).id || 'req_create_inv', timestamp: new Date().toISOString() });
    }

    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'ApexPlatform-Client';

    const investment = InvestmentService.createInvestment(
      userId,
      Number(plan_id),
      String(amount),
      currency || 'USD',
      Boolean(auto_renew),
      ip,
      userAgent
    );

    res.status(201).json({ success: true, data: investment, message: 'Investment created successfully with locked principal.', request_id: (req as any).id || 'req_create_inv', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error creating investment: ${err instanceof Error ? err.message : String(err)}`);
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create investment', request_id: (req as any).id || 'req_create_inv', timestamp: new Date().toISOString() });
  }
});

router.get('/investments/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const investmentId = Number(req.params.id);
    const investment = InvestmentService.getInvestment(investmentId, userId);

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found or unauthorized.', request_id: (req as any).id || 'req_inv_detail', timestamp: new Date().toISOString() });
    }

    const events = dataStore.investmentEvents.filter(e => e.investment_id === investmentId);

    res.json({ success: true, data: { ...investment, events }, request_id: (req as any).id || 'req_inv_detail', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error fetching investment detail: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_inv_detail', timestamp: new Date().toISOString() });
  }
});

router.post('/investments/:id/early-exit', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const investmentId = Number(req.params.id);
    const result = InvestmentService.earlyExitInvestment(investmentId, userId);

    res.json({ success: true, data: result, message: 'Investment successfully exited early and principal refunded.', request_id: (req as any).id || 'req_early_exit', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error processing early exit: ${err instanceof Error ? err.message : String(err)}`);
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to process early exit', request_id: (req as any).id || 'req_early_exit', timestamp: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// Admin Investment Management Endpoints
// ----------------------------------------------------
router.get('/admin/investments', authMiddleware, requirePermission('investments.view'), (req: Request, res: Response) => {
  try {
    const investments = dataStore.userInvestments.map(inv => {
      const plan = dataStore.investmentPlans.find(p => p.id === inv.plan_id);
      const user = dataStore.users.find(u => u.id === inv.user_id);
      return {
        ...inv,
        plan_name: plan?.name || 'Unknown Plan',
        user_name: user?.name || `User #${inv.user_id}`,
        user_email: user?.email || ''
      };
    }).sort((a, b) => b.id - a.id);

    res.json({ success: true, data: investments, request_id: (req as any).id || 'req_admin_invs', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error fetching admin investments: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_admin_invs', timestamp: new Date().toISOString() });
  }
});

router.get('/admin/investments/reconciliation', authMiddleware, requirePermission('investments.reconcile'), (req: Request, res: Response) => {
  try {
    const report = InvestmentReconciliationService.reconcile();
    res.json({ success: true, data: report, request_id: (req as any).id || 'req_admin_recon', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error running investment reconciliation: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_admin_recon', timestamp: new Date().toISOString() });
  }
});

router.post('/admin/investments/process-maturities', authMiddleware, requirePermission('investments.process'), (req: Request, res: Response) => {
  try {
    const result = InvestmentService.processMaturities();
    res.json({ success: true, data: result, message: `Processed ${result.processed} maturities with ${result.errors.length} errors.`, request_id: (req as any).id || 'req_admin_maturities', timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('FINANCE', `Error processing maturities: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Internal server error', request_id: (req as any).id || 'req_admin_maturities', timestamp: new Date().toISOString() });
  }
});

export const investmentRoutes = router;
