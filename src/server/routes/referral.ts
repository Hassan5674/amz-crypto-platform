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
// Admin Referral Linkages / Trees
// ----------------------------------------------------
router.get('/admin/referral-linkages', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const linkages = dataStore.referralRelationships.map(r => {
      const referrer = dataStore.users.find(u => u.id === r.referrer_user_id);
      const referred = dataStore.users.find(u => u.id === r.referred_user_id);
      const codeObj = dataStore.referralCodes.find(c => c.id === r.referral_code_id);
      return {
        id: r.id,
        referrer_id: r.referrer_user_id,
        referrer_name: referrer?.name || `User #${r.referrer_user_id}`,
        referrer_email: referrer?.email || '',
        referrer_username: referrer?.username || '',
        referred_id: r.referred_user_id,
        referred_name: referred?.name || `User #${r.referred_user_id}`,
        referred_email: referred?.email || '',
        referred_username: referred?.username || '',
        referral_code: codeObj?.code || 'N/A',
        attribution_source: r.attribution_source,
        status: r.status,
        created_at: r.created_at
      };
    }).sort((a, b) => b.id - a.id);

    res.json(createResponse(linkages));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// Admin Affiliate & Commission Management
// ----------------------------------------------------
router.get('/admin/commissions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const commissions = dataStore.affiliateCommissions.map(c => {
      const referrer = dataStore.users.find(u => u.id === c.referrer_user_id);
      const referred = dataStore.users.find(u => u.id === c.referred_user_id);
      return {
        ...c,
        referrer_name: referrer?.name || `User #${c.referrer_user_id}`,
        referrer_username: referrer?.username || '',
        referred_name: referred?.name || `User #${c.referred_user_id}`,
        referred_username: referred?.username || ''
      };
    }).sort((a, b) => b.id - a.id);

    res.json(createResponse(commissions));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/admin/commissions/:id/approve', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const commissionId = Number(req.params.id);
    const commission = ReferralService.approveCommission(commissionId, adminId);
    res.json(createResponse(commission, 'Commission approved and credited successfully to referrer wallet.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// Admin Referral Commission Rules Configuration
// ----------------------------------------------------
router.get('/admin/referral-rules', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(createResponse(dataStore.affiliateCommissionRules));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/admin/referral-rules', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, event_type, calculation_type, rate, fixed_amount, minimum_event_amount, maximum_commission, currency = 'USD', status = 'ACTIVE' } = req.body;
    if (!name || rate === undefined) {
      return res.status(400).json(createErrorResponse('Name and commission rate percentage are required.'));
    }

    const nextId = dataStore.affiliateCommissionRules.length > 0
      ? Math.max(...dataStore.affiliateCommissionRules.map(r => r.id)) + 1
      : 1;

    const newRule: import('../../types/referral.js').AffiliateCommissionRule = {
      id: nextId,
      name: String(name),
      event_type: event_type || 'FIRST_DEPOSIT_CONFIRMED',
      calculation_type: calculation_type || 'PERCENTAGE',
      rate: parseFloat(rate).toFixed(2),
      fixed_amount: parseFloat(fixed_amount || 0).toFixed(2),
      minimum_event_amount: parseFloat(minimum_event_amount || 10).toFixed(2),
      maximum_commission: parseFloat(maximum_commission || 1000).toFixed(2),
      currency: String(currency),
      status: status || 'ACTIVE',
      version: 1,
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dataStore.affiliateCommissionRules.push(newRule);
    logger.info('FINANCE', `Admin #${req.user!.id} created new affiliate commission rule #${newRule.id} (${newRule.name}: ${newRule.rate}%)`);
    res.status(201).json(createResponse(newRule, 'Commission rule created successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.put('/admin/referral-rules/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ruleId = Number(req.params.id);
    const rule = dataStore.affiliateCommissionRules.find(r => r.id === ruleId);
    if (!rule) {
      return res.status(404).json(createErrorResponse(`Commission rule #${ruleId} not found.`));
    }

    const { name, event_type, calculation_type, rate, fixed_amount, minimum_event_amount, maximum_commission, status } = req.body;

    if (name !== undefined) rule.name = String(name);
    if (event_type !== undefined) rule.event_type = event_type;
    if (calculation_type !== undefined) rule.calculation_type = calculation_type;
    if (rate !== undefined) {
      const numericRate = parseFloat(rate);
      if (isNaN(numericRate) || numericRate < 0 || numericRate > 100) {
        return res.status(400).json(createErrorResponse('Commission rate must be a valid percentage between 0% and 100%.'));
      }
      rule.rate = numericRate.toFixed(2);
    }
    if (fixed_amount !== undefined) rule.fixed_amount = parseFloat(fixed_amount || 0).toFixed(2);
    if (minimum_event_amount !== undefined) rule.minimum_event_amount = parseFloat(minimum_event_amount || 0).toFixed(2);
    if (maximum_commission !== undefined) rule.maximum_commission = parseFloat(maximum_commission || 1000).toFixed(2);
    if (status !== undefined) rule.status = status;
    rule.updated_at = new Date().toISOString();

    logger.info('FINANCE', `Admin #${req.user!.id} updated affiliate commission rule #${rule.id} (Rate: ${rule.rate}%, Status: ${rule.status})`);
    res.json(createResponse(rule, 'Commission rule updated successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.delete('/admin/referral-rules/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ruleId = Number(req.params.id);
    const index = dataStore.affiliateCommissionRules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return res.status(404).json(createErrorResponse(`Commission rule #${ruleId} not found.`));
    }
    dataStore.affiliateCommissionRules.splice(index, 1);
    res.json(createResponse(null, 'Commission rule removed successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// Public & Admin Deposit Bonus Tiers
// ----------------------------------------------------
router.get(['/deposit-bonus-tiers', '/admin/deposit-bonus-tiers'], (req: Request, res: Response) => {
  try {
    res.json(createResponse(dataStore.depositBonusTiers));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/admin/deposit-bonus-tiers', authMiddleware, requirePermission('commissions.approve'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, min_deposit, max_deposit, bonus_amount, bonus_type = 'FIXED', status = 'ACTIVE', description } = req.body;
    if (!name || min_deposit === undefined || bonus_amount === undefined) {
      return res.status(400).json(createErrorResponse('Name, minimum deposit, and bonus amount are required.'));
    }

    const minNum = parseFloat(min_deposit);
    const bonusNum = parseFloat(bonus_amount);
    if (isNaN(minNum) || minNum <= 0 || isNaN(bonusNum) || bonusNum <= 0) {
      return res.status(400).json(createErrorResponse('Minimum deposit and bonus amount must be positive numbers.'));
    }

    const nextId = dataStore.depositBonusTiers.length > 0
      ? Math.max(...dataStore.depositBonusTiers.map(t => t.id)) + 1
      : 1;

    const newTier = {
      id: nextId,
      name: String(name),
      min_deposit: minNum.toFixed(2),
      max_deposit: max_deposit ? parseFloat(max_deposit).toFixed(2) : undefined,
      bonus_amount: bonusNum.toFixed(2),
      bonus_type: (bonus_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED') as 'FIXED' | 'PERCENTAGE',
      status: (status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      description: description || `Deposit $${minNum.toFixed(2)} to get a $${bonusNum.toFixed(2)} cash bonus!`,
      created_at: new Date().toISOString()
    };

    dataStore.depositBonusTiers.push(newTier);
    logger.info('FINANCE', `Admin #${req.user!.id} created new Deposit Bonus Tier #${newTier.id} (${newTier.name}: Min $${newTier.min_deposit} -> Bonus $${newTier.bonus_amount})`);
    dataStore.saveState();
    res.status(201).json(createResponse(newTier, 'Deposit bonus tier created successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.put('/admin/deposit-bonus-tiers/:id', authMiddleware, requirePermission('commissions.approve'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const tierId = Number(req.params.id);
    const tier = dataStore.depositBonusTiers.find(t => t.id === tierId);
    if (!tier) {
      return res.status(404).json(createErrorResponse(`Deposit bonus tier #${tierId} not found.`));
    }

    const { name, min_deposit, max_deposit, bonus_amount, bonus_type, status, description } = req.body;
    if (name !== undefined) tier.name = String(name);
    if (min_deposit !== undefined) tier.min_deposit = parseFloat(min_deposit).toFixed(2);
    if (max_deposit !== undefined) tier.max_deposit = max_deposit ? parseFloat(max_deposit).toFixed(2) : undefined;
    if (bonus_amount !== undefined) tier.bonus_amount = parseFloat(bonus_amount).toFixed(2);
    if (bonus_type !== undefined) tier.bonus_type = bonus_type;
    if (status !== undefined) tier.status = status;
    if (description !== undefined) tier.description = description;

    logger.info('FINANCE', `Admin #${req.user!.id} updated Deposit Bonus Tier #${tier.id} (${tier.name}: Min $${tier.min_deposit} -> Bonus $${tier.bonus_amount})`);
    dataStore.saveState();
    res.json(createResponse(tier, 'Deposit bonus tier updated successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.delete('/admin/deposit-bonus-tiers/:id', authMiddleware, requirePermission('commissions.approve'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const tierId = Number(req.params.id);
    const index = dataStore.depositBonusTiers.findIndex(t => t.id === tierId);
    if (index === -1) {
      return res.status(404).json(createErrorResponse(`Deposit bonus tier #${tierId} not found.`));
    }
    dataStore.depositBonusTiers.splice(index, 1);
    dataStore.saveState();
    res.json(createResponse(null, 'Deposit bonus tier removed successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

export const referralRoutes = router;
