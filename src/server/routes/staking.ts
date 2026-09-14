import { Router, Request, Response } from 'express';
import { StakingService } from '../staking/stakingService.js';
import { dataStore } from '../dataStore.js';
import { authMiddleware, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';

const router = Router();

// ----------------------------------------------------
// Public / User Staking Pool Endpoints
// ----------------------------------------------------
router.get('/staking-pools', (req: Request, res: Response) => {
  try {
    const pools = StakingService.getPools();
    res.json(createResponse(pools));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error fetching staking pools: ${msg}`);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.get('/staking-pools/:id', (req: Request, res: Response) => {
  try {
    const pool = StakingService.getPool(req.params.id);
    if (!pool) {
      return res.status(404).json(createErrorResponse('Staking pool not found'));
    }
    res.json(createResponse(pool));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// User Stakes Endpoints (Authenticated)
// ----------------------------------------------------
router.get('/stakes', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stakes = StakingService.getUserStakes(userId);
    res.json(createResponse(stakes));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/stakes', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { pool_id, amount, currency = 'USD', auto_compound } = req.body;

    if (!pool_id || !amount) {
      return res.status(400).json(createErrorResponse('pool_id and amount are required.'));
    }

    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'ApexPlatform-Client';

    const stake = StakingService.createStake(
      userId,
      Number(pool_id),
      String(amount),
      String(currency),
      Boolean(auto_compound),
      ip,
      userAgent
    );

    res.status(201).json(createResponse(stake, 'Successfully staked funds in pool with locked principal.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error creating stake: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.get('/stakes/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stakeId = Number(req.params.id);
    const stake = StakingService.getStake(stakeId, userId);

    if (!stake) {
      return res.status(404).json(createErrorResponse('Stake not found or unauthorized.'));
    }

    const events = dataStore.stakingEvents.filter(e => e.stake_id === stakeId);
    res.json(createResponse({ ...stake, events }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/stakes/:id/claim', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stakeId = Number(req.params.id);
    const stake = StakingService.claimReward(stakeId, userId);
    res.json(createResponse(stake, 'Staking reward successfully claimed and credited to available balance.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.post('/stakes/:id/unstake', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stakeId = Number(req.params.id);
    const stake = StakingService.unstake(stakeId, userId);
    res.json(createResponse(stake, 'Stake successfully completed and principal released.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// ----------------------------------------------------
// Admin Staking Management Endpoints
// ----------------------------------------------------
router.get('/admin/stakes', authMiddleware, requirePermission('staking.view'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const stakes = dataStore.userStakes.map(s => {
      const pool = dataStore.stakingPoolEntities.find(p => p.id === s.pool_id);
      const user = dataStore.users.find(u => u.id === s.user_id);
      return {
        ...s,
        pool_name: pool?.name || 'Unknown Pool',
        user_name: user?.name || `User #${s.user_id}`,
        user_email: user?.email || ''
      };
    }).sort((a, b) => b.id - a.id);

    res.json(createResponse(stakes));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.get('/admin/staking-pools', (req: Request, res: Response) => {
  try {
    const pools = StakingService.getPools();
    res.json(createResponse(pools));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// Admin Create Staking Pool
router.post('/admin/staking-pools', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      symbol = 'USD',
      description = '',
      reward_rate = '8.50',
      lock_period_days = 30,
      min_stake = '50.00',
      max_stake = '50000.00',
      reward_model = 'FIXED_PERCENTAGE',
      status = 'ACTIVE'
    } = req.body;

    if (!name) {
      return res.status(400).json(createErrorResponse('Pool name is required.'));
    }

    const nextId = dataStore.stakingPoolEntities.length > 0 ? Math.max(...dataStore.stakingPoolEntities.map(p => p.id)) + 1 : 1;
    const nextVersionId = dataStore.stakingPoolVersions.length > 0 ? Math.max(...dataStore.stakingPoolVersions.map(v => v.id)) + 1 : 1;

    const newVersion = {
      id: nextVersionId,
      pool_id: nextId,
      version_number: 1,
      reward_model: (reward_model || 'FIXED_RATE') as any,
      reward_rate: String(reward_rate),
      reward_frequency: 'DAILY' as const,
      minimum_stake: String(min_stake),
      maximum_stake: String(max_stake),
      lock_period_days: Number(lock_period_days),
      cooldown_period_days: 1,
      early_unstake_allowed: true,
      early_unstake_fee: '5.00',
      compound_enabled: true,
      claim_enabled: true,
      unstake_enabled: true,
      terms_version: 1,
      disclosure_version: 1,
      effective_from: new Date().toISOString(),
      effective_until: null,
      created_by: req.user?.id || 1,
      created_at: new Date().toISOString()
    };
    dataStore.stakingPoolVersions.push(newVersion as any);

    const newPool = {
      id: nextId,
      public_id: `pool_${symbol.toLowerCase()}_${nextId}`,
      name: String(name),
      slug: symbol.toLowerCase(),
      description: String(description || `${symbol} Institutional Staking Pool`),
      asset: String(symbol),
      currency: 'USD',
      display_order: nextId,
      max_pool_capacity: null,
      current_utilization: '0.00',
      reward_model: reward_model as any,
      status: status as any,
      current_version_id: nextVersionId,
      created_by: req.user?.id || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dataStore.stakingPoolEntities.push(newPool as any);

    // Also add to legacy stakingPools for compatibility
    if (Array.isArray((dataStore as any).stakingPools)) {
      (dataStore as any).stakingPools.push({
        id: nextId,
        asset_symbol: symbol,
        asset_name: name,
        lockup_days: Number(lock_period_days),
        min_stake: parseFloat(min_stake) || 50,
        max_stake: parseFloat(max_stake) || 50000,
        estimated_apr_indicator: `${reward_rate}% (Daily Compounded)`,
        status: status,
        total_staked_indicator: '$0 USD'
      });
    }

    logger.info('FINANCE', `Admin #${req.user?.id || 1} created new staking pool #${nextId} (${name})`);
    dataStore.saveState();
    res.status(201).json(createResponse({ ...newPool, active_version: newVersion }, 'Staking pool created successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

const handleUpdatePool = (req: AuthenticatedRequest, res: Response) => {
  try {
    const poolId = Number(req.params.id);
    const { status, name, description, reward_rate, lock_period_days, min_stake, max_stake, symbol } = req.body;
    const pool = dataStore.stakingPoolEntities.find(p => p.id === poolId);
    if (!pool) {
      return res.status(404).json(createErrorResponse('Staking pool not found'));
    }
    if (status) pool.status = status;
    if (name) pool.name = name;
    if (description) pool.description = description;
    if (symbol) pool.asset = symbol;

    // Also update the active version values
    const version = dataStore.stakingPoolVersions.find(v => v.id === pool.current_version_id);
    if (version) {
      if (reward_rate !== undefined) version.reward_rate = String(reward_rate);
      if (lock_period_days !== undefined) version.lock_period_days = Number(lock_period_days);
      if (min_stake !== undefined) version.minimum_stake = String(min_stake);
      if (max_stake !== undefined) version.maximum_stake = String(max_stake);
    }

    // Synchronize legacy pool entry if present
    const legacyPools = (dataStore as any).stakingPools;
    if (Array.isArray(legacyPools)) {
      const lp = legacyPools.find((p: any) => p.id === poolId);
      if (lp) {
        if (status) lp.status = status;
        if (name) lp.name = name;
        if (symbol) lp.asset_symbol = symbol;
        if (reward_rate !== undefined) {
          lp.reward_rate = String(reward_rate);
          lp.estimated_apr_indicator = `${reward_rate}% (Daily Compounded)`;
        }
        if (lock_period_days !== undefined) lp.lockup_days = Number(lock_period_days);
        if (min_stake !== undefined) lp.min_stake = parseFloat(min_stake) || 50;
        if (max_stake !== undefined) lp.max_stake = parseFloat(max_stake) || 50000;
      }
    }

    logger.info('FINANCE', `Admin #${req.user?.id || 1} updated staking pool #${poolId}`);
    dataStore.saveState();
    res.json(createResponse({ ...pool, active_version: version }, 'Staking pool successfully updated.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
};

router.put('/admin/staking-pools/:id', authMiddleware, handleUpdatePool);
router.post('/admin/staking-pools/:id', authMiddleware, handleUpdatePool);

// Admin Archive or Delete Staking Pool
router.delete('/admin/staking-pools/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const poolId = Number(req.params.id);
    const pool = dataStore.stakingPoolEntities.find(p => p.id === poolId);
    if (!pool) {
      return res.status(404).json(createErrorResponse('Staking pool not found'));
    }
    pool.status = 'PAUSED' as any;
    logger.info('FINANCE', `Admin #${req.user?.id || 1} paused/archived staking pool #${poolId}`);
    dataStore.saveState();
    res.json(createResponse(pool, 'Staking pool paused successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

export const stakingRoutes = router;
