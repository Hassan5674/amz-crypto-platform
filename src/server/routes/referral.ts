import { Router, Request, Response } from 'express';
import { ReferralService } from '../referral/referralService.js';
import { dataStore } from '../dataStore.js';
import { authMiddleware, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';

const router = Router();

// ----------------------------------------------------
// User Referral & Affiliate Endpoints
// ----------------------------------------------------
router.get('/referrals/code', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const codeObj = ReferralService.getOrCreateReferralCode(userId);
    res.json(createResponse(codeObj));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error getting referral code: ${msg}`);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.get('/referrals/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const referrals = dataStore.referralRelationships
      .filter(r => r.referrer_user_id === userId)
      .map(r => {
        const referredUser = dataStore.users.find(u => u.id === r.referred_user_id);
        const parts = referredUser ? referredUser.name.split(' ') : [];
        const lastNameInitial = parts.length > 1 && parts[1] ? parts[1][0] : '';
        const maskedName = referredUser ? `${referredUser.name.slice(0, 1)}*** ${lastNameInitial}***` : 'User ***';
        return {
          id: r.id,
          referred_masked_name: maskedName,
          status: r.status,
          created_at: r.created_at
        };
      });

    const commissions = dataStore.affiliateCommissions.filter(c => c.referrer_user_id === userId);
    res.json(createResponse({ referrals, commissions }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.get('/affiliate/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const referralsCount = dataStore.referralRelationships.filter(r => r.referrer_user_id === userId).length;
    const commissions = dataStore.affiliateCommissions.filter(c => c.referrer_user_id === userId);

    const totalEarned = commissions
      .filter(c => c.status === 'AVAILABLE' || c.status === 'PAID')
      .reduce((acc, c) => acc + Number(c.commission_amount), 0);

    const pendingEarned = commissions
      .filter(c => c.status === 'PENDING')
      .reduce((acc, c) => acc + Number(c.commission_amount), 0);

    res.json(createResponse({
      referrals_count: referralsCount,
      total_earned: totalEarned.toFixed(2),
      pending_earned: pendingEarned.toFixed(2),
      commissions
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// Bonus Campaign Endpoints
// ----------------------------------------------------
router.get('/bonuses', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaigns = dataStore.bonusCampaigns.filter(c => c.status === 'ACTIVE');
    const userBonuses = dataStore.userBonuses.filter(b => b.user_id === req.user!.id);
    res.json(createResponse({ campaigns, user_bonuses: userBonuses }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/bonuses/:id/claim', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaignId = Number(req.params.id);
    const bonus = ReferralService.claimBonus(userId, campaignId);
    res.status(201).json(createResponse(bonus, 'Bonus successfully claimed.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// Admin Affiliate & Commission Management
// ----------------------------------------------------
router.get('/admin/commissions', authMiddleware, requirePermission('commissions.view'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const commissions = dataStore.affiliateCommissions.map(c => {
      const referrer = dataStore.users.find(u => u.id === c.referrer_user_id);
      const referred = dataStore.users.find(u => u.id === c.referred_user_id);
      return {
        ...c,
        referrer_name: referrer?.name || `User #${c.referrer_user_id}`,
        referred_name: referred?.name || `User #${c.referred_user_id}`
      };
    }).sort((a, b) => b.id - a.id);

    res.json(createResponse(commissions));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/admin/commissions/:id/approve', authMiddleware, requirePermission('commissions.approve'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const commissionId = Number(req.params.id);
    const commission = ReferralService.approveCommission(commissionId, adminId);
    res.json(createResponse(commission, 'Commission approved and credited successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

export const referralRoutes = router;
