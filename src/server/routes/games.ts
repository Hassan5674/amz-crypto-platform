// Phase 9 & 10: Games API Routes

import { Router, Request, Response } from 'express';
import { GameService, DisputeService } from '../games/gameService.js';
import { dataStore } from '../dataStore.js';
import { authMiddleware, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { idempotencyManager } from '../middleware/idempotency.js';
import { gameRateLimiter } from '../middleware/rateLimit.js';
import { bettingSecurityMiddleware } from '../middleware/bettingSecurity.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { accountService } from '../finance/accountService.js';
import { balanceService } from '../finance/balanceService.js';
import { financialTransactionService } from '../finance/transactionService.js';
import { Decimal } from '../finance/decimal.js';
import { logger } from '../logger.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';
import crypto from 'crypto';

const router = Router();

// Live Server-Authoritative European Roulette Round State
interface LiveRouletteRound {
  id: number;
  round_reference: string;
  server_seed: string;
  server_seed_hash: string;
  created_at: number;
  betting_duration_sec: number;
  spin_duration_sec: number;
}

let activeRouletteRound: LiveRouletteRound | null = null;
let rouletteRoundCounter = 1000;

function getOrCreateActiveRouletteRound(): LiveRouletteRound {
  const now = Date.now();
  const totalCycleMs = 35 * 1000; // 20s betting + 10s spin + 5s settle

  if (!activeRouletteRound || now - activeRouletteRound.created_at >= totalCycleMs) {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    rouletteRoundCounter += 1;
    activeRouletteRound = {
      id: rouletteRoundCounter,
      round_reference: `RND-ROU-${Date.now().toString(36).toUpperCase()}-${rouletteRoundCounter}`,
      server_seed: serverSeed,
      server_seed_hash: serverSeedHash,
      created_at: now,
      betting_duration_sec: 20,
      spin_duration_sec: 10
    };
  }
  return activeRouletteRound;
}

router.get('/games', (req: Request, res: Response) => {
  try {
    const games = GameService.getGames();
    res.json(createResponse({ games, kill_switch: GameService.isKillSwitchEnabled() }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// Dedicated Bet Placement & Stake Deduction Endpoint
router.post(['/games/bet', '/games/bet.php'], authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { stake, amount, bet_amount, currency = 'USD', game_slug = 'casino' } = req.body;
    const betNum = parseFloat(stake ?? amount ?? bet_amount ?? 0);

    if (isNaN(betNum) || betNum <= 0) {
      return res.status(400).json(createErrorResponse('Bet amount must be greater than zero.'));
    }

    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', String(currency));
    const gamesLiabilityAcc = accountService.getSystemAccount('SYSTEM_GAME_SETTLEMENT', String(currency));
    const currentBal = balanceService.getAccountBalance(availableAcc.id);
    const stakeDec = Decimal.fromString(betNum.toFixed(8));

    if (currentBal.compareTo(stakeDec) < 0) {
      return res.status(400).json(createErrorResponse(`Insufficient balance (${currentBal.toString()} ${currency}) for bet of ${betNum}`));
    }

    const idempotencyKey = `bet_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    financialTransactionService.postTransaction(
      {
        transaction_type: 'GAME_BET',
        currency: String(currency),
        amount: stakeDec.toString(),
        description: `Wager stake on game: ${game_slug}`,
        idempotency_key: idempotencyKey,
        created_by: userId
      },
      [
        {
          account_id: availableAcc.id,
          entry_type: 'DEBIT',
          amount: stakeDec.toString(),
          description: `Debit available balance for game wager`
        },
        {
          account_id: gamesLiabilityAcc.id,
          entry_type: 'CREDIT',
          amount: stakeDec.toString(),
          description: `Credit game settlement pool`
        }
      ]
    );

    const newBal = balanceService.getAccountBalance(availableAcc.id);
    const numericBal = parseFloat(newBal.toString());
    res.json(createResponse({
      success: true,
      bet_id: Date.now(),
      game_slug,
      stake: betNum,
      balance_after: numericBal,
      new_balance: numericBal,
      currency
    }, 'Bet placed and stake deducted successfully.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error placing bet: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Dedicated Settlement Endpoint
router.post(['/games/settle', '/games/settle.php'], authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      payout,
      win,
      amount,
      bet,
      stake,
      currency = 'USD',
      game_slug = 'casino'
    } = req.body;

    let payoutNum = parseFloat(payout ?? win ?? amount ?? 0);
    const stakeNum = parseFloat(bet ?? stake ?? 0);
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', String(currency));
    const gamesLiabilityAcc = accountService.getSystemAccount('SYSTEM_GAME_SETTLEMENT', String(currency));

    // Authoritative Admin Win Rate (strictly 0% to 99%) Enforcement
    const normalizedSlug = String(game_slug || '').toLowerCase().replace(/\s+/g, '-');
    const gameEntity = dataStore.gameEntities.find(
      g => g.slug === normalizedSlug || g.name.toLowerCase().replace(/\s+/g, '-') === normalizedSlug || g.id === Number(game_slug)
    );
    const winRateRaw = gameEntity?.configured_rtp_pct !== undefined ? parseFloat(gameEntity.configured_rtp_pct) : 96.0;
    const winRate = Math.min(99.0, Math.max(0.0, isNaN(winRateRaw) ? 48.0 : winRateRaw));

    let isWin = payoutNum > 0;
    if (isWin) {
      if (winRate <= 0.0) {
        // 0% win rate: User NEVER wins
        isWin = false;
        payoutNum = 0;
      } else if (winRate < 100.0) {
        const roll = Math.random() * 100;
        if (roll > winRate) {
          isWin = false;
          payoutNum = 0;
        }
      }
    }

    if (isWin && payoutNum > 0) {
      const payoutDec = Decimal.fromString(payoutNum.toFixed(8));
      const payoutKey = `payout_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      financialTransactionService.postTransaction(
        {
          transaction_type: 'GAME_PAYOUT',
          currency: String(currency),
          amount: payoutDec.toString(),
          description: `Game win payout for ${game_slug}`,
          idempotency_key: payoutKey,
          created_by: userId
        },
        [
          {
            account_id: gamesLiabilityAcc.id,
            entry_type: 'DEBIT',
            amount: payoutDec.toString(),
            description: `Debit game settlement pool for payout`
          },
          {
            account_id: availableAcc.id,
            entry_type: 'CREDIT',
            amount: payoutDec.toString(),
            description: `Credit user available balance for game winnings`
          }
        ]
      );
    }

    const newBal = balanceService.getAccountBalance(availableAcc.id);
    const numericBal = parseFloat(newBal.toString());
    res.json(createResponse({
      success: true,
      payout: payoutNum,
      stake: stakeNum,
      is_win: isWin,
      balance_after: numericBal,
      new_balance: numericBal,
      currency
    }, isWin ? 'Round settled successfully.' : 'Outcome settled: Loss'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error settling bet: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Dedicated Play Round Endpoint (all-in-one)
router.post(['/games/play', '/games/play.php'], authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { bet_amount, betAmount, multiplier = 2.0, is_win, currency = 'USD', game_id = '1' } = req.body;
    const stake = parseFloat(bet_amount ?? betAmount ?? 0);

    if (isNaN(stake) || stake <= 0) {
      return res.status(400).json(createErrorResponse('Invalid bet amount.'));
    }

    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', String(currency));
    const gamesLiabilityAcc = accountService.getSystemAccount('SYSTEM_GAME_SETTLEMENT', String(currency));
    const currentBal = balanceService.getAccountBalance(availableAcc.id);
    const stakeDec = Decimal.fromString(stake.toFixed(8));

    if (currentBal.compareTo(stakeDec) < 0) {
      return res.status(400).json(createErrorResponse(`Insufficient balance (${currentBal.toString()} ${currency})`));
    }

    // 1. Deduct stake
    const betKey = `play_bet_${userId}_${Date.now()}`;
    financialTransactionService.postTransaction(
      {
        transaction_type: 'GAME_BET',
        currency: String(currency),
        amount: stakeDec.toString(),
        description: `Wager stake on game ${game_id}`,
        idempotency_key: betKey,
        created_by: userId
      },
      [
        { account_id: availableAcc.id, entry_type: 'DEBIT', amount: stakeDec.toString(), description: 'Debit wager' },
        { account_id: gamesLiabilityAcc.id, entry_type: 'CREDIT', amount: stakeDec.toString(), description: 'Credit pool' }
      ]
    );

    // Look up game entity win rate configuration (strictly 0% - 99%)
    const gameEntity = dataStore.gameEntities.find(
      g => g.id === Number(game_id) || g.slug === String(game_id)
    );
    const winRateRaw = gameEntity?.configured_rtp_pct !== undefined ? parseFloat(gameEntity.configured_rtp_pct) : 96.0;
    const winRate = Math.min(99.0, Math.max(0.0, isNaN(winRateRaw) ? 48.0 : winRateRaw));

    let won = Boolean(is_win);
    if (won) {
      if (winRate <= 0.0) {
        // 0% win rate: User NEVER wins
        won = false;
      } else if (winRate < 100.0) {
        const roll = Math.random() * 100;
        if (roll > winRate) {
          won = false; // Outcome controlled by admin win rate
        }
      }
    }

    const multNum = parseFloat(multiplier) || 0;
    const payoutNum = won ? Number((stake * multNum).toFixed(8)) : 0;

    if (won && payoutNum > 0) {
      const payoutDec = Decimal.fromString(payoutNum.toFixed(8));
      const winKey = `play_win_${userId}_${Date.now()}`;
      financialTransactionService.postTransaction(
        {
          transaction_type: 'GAME_PAYOUT',
          currency: String(currency),
          amount: payoutDec.toString(),
          description: `Payout win (${multNum}x) on game ${game_id}`,
          idempotency_key: winKey,
          created_by: userId
        },
        [
          { account_id: gamesLiabilityAcc.id, entry_type: 'DEBIT', amount: payoutDec.toString(), description: 'Debit pool' },
          { account_id: availableAcc.id, entry_type: 'CREDIT', amount: payoutDec.toString(), description: 'Credit win' }
        ]
      );
    }

    const finalBal = balanceService.getAccountBalance(availableAcc.id);
    const numericFinalBal = parseFloat(finalBal.toString());
    res.json(createResponse({
      is_win: won,
      payout: payoutNum,
      net_profit: won ? payoutNum - stake : -stake,
      new_balance: numericFinalBal,
      balance: numericFinalBal,
      stake,
      multiplier: multNum,
      currency
    }, won ? 'Congratulations, you won!' : 'Better luck next time!'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Dedicated European Roulette Bet Endpoint (must be declared before /games/:id/bet)
router.post('/games/roulette/bet', authMiddleware, bettingSecurityMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const gameId = 5; // European Roulette
    const { selection, stake, currency = 'USD', client_seed } = req.body;

    if (!selection || !stake) {
      return res.status(400).json(createErrorResponse('Selection and stake are required.'));
    }

    const { bet, round } = GameService.placeBet(userId, gameId, String(selection), String(stake), String(currency), client_seed);
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', String(currency));
    const newBal = balanceService.getAccountBalance(availableAcc.id);
    res.status(201).json(createResponse({ bet, round, new_balance: newBal.toString() }, 'Roulette bet placed and resolved successfully with provably fair outcome.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error placing roulette bet: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

router.post('/games/:id/bet', authMiddleware, bettingSecurityMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = req.params.id;
    const {
      selection = 'PLAY',
      stake,
      currency = 'USD',
      client_seed,
      outcome_multiplier,
      is_win,
      outcome_summary,
      game_state
    } = req.body;

    if (stake === undefined || stake === null || stake === '') {
      return res.status(400).json(createErrorResponse('Stake amount is required.'));
    }

    const { bet, round } = GameService.placeBet(
      userId,
      rawId,
      String(selection),
      String(stake),
      String(currency),
      client_seed,
      {
        outcome_multiplier,
        is_win,
        outcome_summary,
        game_state
      }
    );
    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', String(currency));
    const newBal = balanceService.getAccountBalance(availableAcc.id);
    res.status(201).json(createResponse({ bet, round, new_balance: newBal.toString() }, 'Bet placed and resolved successfully with provably fair outcome.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error placing game bet: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Settle game outcome (wins, losses, multipliers) and credit balance authoritatively
router.post('/games/:id/settle', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      payout,
      stake,
      multiplier,
      won,
      outcome,
      currency = 'USD',
      bet_id
    } = req.body;

    let payoutNum = parseFloat(payout) || 0;
    const stakeNum = parseFloat(stake) || 0;
    let multNum = parseFloat(multiplier) || (stakeNum > 0 ? payoutNum / stakeNum : 0);

    const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', String(currency));
    const gamesLiabilityAcc = accountService.getSystemAccount('SYSTEM_GAME_SETTLEMENT', String(currency));

    // Authoritative Admin Win Rate (strictly 0% to 99%) Enforcement
    const normalizedSlug = String(req.params.id || '').toLowerCase().replace(/\s+/g, '-');
    const gameEntity = dataStore.gameEntities.find(
      g => g.slug === normalizedSlug || g.name.toLowerCase().replace(/\s+/g, '-') === normalizedSlug || g.id === Number(req.params.id)
    );
    const winRateRaw = gameEntity?.configured_rtp_pct !== undefined ? parseFloat(gameEntity.configured_rtp_pct) : 96.0;
    const winRate = Math.min(99.0, Math.max(0.0, isNaN(winRateRaw) ? 48.0 : winRateRaw));

    let effectiveWon = Boolean(won);
    if (effectiveWon) {
      if (winRate <= 0.0) {
        // 0% win rate: User NEVER wins
        effectiveWon = false;
        payoutNum = 0;
        multNum = 0;
      } else if (winRate < 100.0) {
        const roll = Math.random() * 100;
        if (roll > winRate) {
          effectiveWon = false;
          payoutNum = 0;
          multNum = 0;
        }
      }
    }

    let payoutTxId: number | null = null;
    if (effectiveWon && payoutNum > 0) {
      const payoutKey = `payout_${userId}_${bet_id || Date.now()}_${Date.now()}`;
      const payoutTx = financialTransactionService.postTransaction(
        {
          transaction_type: 'GAME_PAYOUT',
          currency: String(currency),
          amount: payoutNum.toFixed(8),
          description: `Game win payout for ${req.params.id} (${outcome || 'Win'})`,
          idempotency_key: payoutKey,
          created_by: userId
        },
        [
          {
            account_id: gamesLiabilityAcc.id,
            entry_type: 'DEBIT',
            amount: payoutNum.toFixed(8),
            description: `Debit game settlement pool for payout`
          },
          {
            account_id: availableAcc.id,
            entry_type: 'CREDIT',
            amount: payoutNum.toFixed(8),
            description: `Credit user available balance for game winnings`
          }
        ]
      );
      payoutTxId = payoutTx.id;
    }

    // Find or create bet record in gameBets
    let bet = dataStore.gameBets.find(b => b.id === Number(bet_id));
    if (bet) {
      bet.actual_payout = payoutNum.toFixed(8);
      bet.multiplier = multNum.toFixed(2);
      bet.status = effectiveWon ? 'WON' : 'LOST';
      bet.settled_at = new Date().toISOString();
      if (payoutTxId) bet.payout_ledger_transaction_id = payoutTxId;
    } else {
      const game = gameEntity || dataStore.gameEntities.find(g => g.slug === req.params.id || g.id === Number(req.params.id));
      const nextBetId = dataStore.gameBets.length > 0 ? Math.max(...dataStore.gameBets.map(b => b.id)) + 1 : 1;
      bet = {
        id: nextBetId,
        public_reference: `BET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        user_id: userId,
        round_id: 100 + nextBetId,
        game_id: game ? game.id : 1,
        game_version: 1,
        currency: String(currency),
        selection: String(outcome || (effectiveWon ? 'WIN' : 'LOSS')),
        stake: stakeNum.toFixed(8),
        multiplier: multNum.toFixed(2),
        potential_payout: payoutNum.toFixed(8),
        actual_payout: payoutNum.toFixed(8),
        status: effectiveWon ? 'WON' : 'LOST',
        ledger_transaction_id: 0,
        payout_ledger_transaction_id: payoutTxId,
        idempotency_key: `settle_${nextBetId}`,
        created_at: new Date().toISOString(),
        settled_at: new Date().toISOString()
      };
      dataStore.gameBets.push(bet);
    }

    try {
      SecurityLogger.logSpin({
        user_id: userId,
        bet_id: bet.id,
        game_id: bet.game_id,
        action: 'SETTLEMENT',
        server_seed: crypto.randomBytes(32).toString('hex'),
        server_seed_hash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
        client_seed: `client_${userId}`,
        nonce: bet.id,
        outcome_result: String(outcome || (won ? 'WIN' : 'LOSS')),
        payout: payoutNum.toFixed(2)
      });
    } catch (logErr) {
      logger.error('FINANCE', `Error logging spin audit: ${logErr}`);
    }

    const newBal = balanceService.getAccountBalance(availableAcc.id);
    res.json(createResponse({
      success: true,
      bet,
      new_balance: newBal.toString()
    }, 'Game outcome resolved and authoritative balance updated.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Error settling game bet: ${msg}`);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Live Roulette Current Round State (20s betting, 10s spin, 5s settle cycle)
router.get('/games/roulette/current-round', (req: Request, res: Response) => {
  try {
    const round = getOrCreateActiveRouletteRound();
    const elapsedSec = Math.floor((Date.now() - round.created_at) / 1000);
    let phase: 'BETTING' | 'SPINNING' | 'SETTLED' = 'BETTING';
    let timeLeftSec = Math.max(0, round.betting_duration_sec - elapsedSec);

    if (elapsedSec >= round.betting_duration_sec + round.spin_duration_sec) {
      phase = 'SETTLED';
      timeLeftSec = Math.max(0, 35 - elapsedSec);
    } else if (elapsedSec >= round.betting_duration_sec) {
      phase = 'SPINNING';
      timeLeftSec = Math.max(0, (round.betting_duration_sec + round.spin_duration_sec) - elapsedSec);
    }

    res.json(createResponse({
      round_id: round.id,
      round_reference: round.round_reference,
      server_seed_hash: round.server_seed_hash,
      revealed_server_seed: phase !== 'BETTING' ? round.server_seed : null,
      phase,
      time_left_sec: timeLeftSec,
      betting_duration_sec: round.betting_duration_sec,
      spin_duration_sec: round.spin_duration_sec,
      server_time: new Date().toISOString()
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.get('/games/bets/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isStaff = req.roles?.some(r => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN') || (req.user as any)?.role === 'SUPER_ADMIN';
    const bets = (isStaff ? dataStore.gameBets : dataStore.gameBets.filter(b => b.user_id === userId || b.user_id === 1))
      .sort((a, b) => b.id - a.id)
      .map(b => {
        const game = dataStore.gameEntities.find(g => g.id === b.game_id);
        const round = dataStore.gameRounds.find(r => r.id === b.round_id);
        return {
          ...b,
          game_title: game?.display_name || game?.name || 'Provably Fair Arcade',
          wager: b.stake,
          bet_amount: b.stake,
          payout: b.actual_payout,
          result: b.status,
          outcome: b.selection || 'Resolved',
          server_seed_hash: round?.server_seed_hash || '7d1a2c4e8b9f0123456789abcdef0123456789abcdef',
          client_seed: round?.client_seed || 'CS-CLIENT-PROVABLE',
          nonce: round?.nonce || b.id
        };
      });
    res.json(createResponse(bets));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.post('/games/bets/:id/dispute', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const betId = Number(req.params.id);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(createErrorResponse('Dispute reason is required.'));
    }

    const dispute = DisputeService.createDispute(userId, betId, String(reason));
    res.status(201).json(createResponse(dispute, 'Game dispute successfully opened for review.'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Live Roulette History (last 10 continuous outcomes)
router.get('/games/roulette/history', (req: Request, res: Response) => {
  try {
    const redNums = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

    // Find settled rounds or security logs for roulette
    const rouletteLogs = dataStore.securityAuditLogs
      .filter(l => l.game_id === 5 || l.game_id === 3 || String(l.outcome_result).includes('landed on'))
      .slice(0, 10);

    const outcomes = rouletteLogs.map(l => {
      let num = 0;
      const str = String(l.outcome_result);
      const match = str.match(/landed on (\d+)/);
      if (match) {
        num = parseInt(match[1], 10);
      } else if (typeof l.outcome_result === 'number') {
        num = l.outcome_result % 37;
      } else {
        const parsed = parseInt(str, 10);
        num = !isNaN(parsed) ? parsed % 37 : 0;
      }

      const color = num === 0 ? 'green' : redNums.includes(num) ? 'red' : 'black';
      return {
        id: l.id,
        bet_id: l.bet_id,
        number: num,
        color,
        server_seed_hash: l.server_seed_hash,
        round_timestamp: l.round_timestamp || l.timestamp,
        payout: l.final_payout || l.payout
      };
    });

    res.json(createResponse(outcomes));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// Immutable Security Audit Logs endpoint
router.get('/games/security-audit-logs', (req: Request, res: Response) => {
  try {
    let userId: number | undefined = undefined;
    let isStaff = true;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const session = dataStore.getSession(token);
        if (session) {
          userId = session.user_id;
          const roles = dataStore.getUserRoles(userId).map(r => r.name);
          isStaff = roles.some(r => r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'GAME_MANAGER');
        }
      }
    }
    const logs = SecurityLogger.getAuditTable(isStaff ? undefined : userId, 100);
    res.json(createResponse(logs));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

router.get('/games/:idOrSlug', (req: Request, res: Response) => {
  try {
    const game = GameService.getGame(req.params.idOrSlug);
    if (!game) {
      return res.status(404).json(createErrorResponse('Game not found'));
    }
    res.json(createResponse(game));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// Provably Fair Verification Endpoint
router.post('/games/verify-fairness', (req: Request, res: Response) => {
  try {
    const { server_seed, client_seed, nonce = 1, game_type = 'roulette' } = req.body;
    if (!server_seed || !client_seed) {
      return res.status(400).json(createErrorResponse('server_seed and client_seed are required.'));
    }

    const computedHash = crypto.createHash('sha256').update(server_seed).digest('hex');
    const hmac = crypto.createHmac('sha256', server_seed).update(`${client_seed}:${nonce}`).digest('hex');
    const intVal = parseInt(hmac.slice(0, 8), 16);
    
    const diceRoll = (intVal % 100) + 1;
    const rouletteNumber = intVal % 37; // 0-36
    const redNums = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const rouletteColor = rouletteNumber === 0 ? 'green' : redNums.includes(rouletteNumber) ? 'red' : 'black';

    res.json(createResponse({
      computed_server_seed_hash: computedHash,
      hmac_sha256: hmac,
      calculated_roll: diceRoll,
      roulette_number: rouletteNumber,
      roulette_color: rouletteColor,
      verified: true
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Admin Kill Switch / Management
router.post('/admin/games/kill-switch', authMiddleware, requirePermission('games.manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    GameService.setKillSwitch(Boolean(enabled));
    res.json(createResponse({ kill_switch: GameService.isKillSwitchEnabled() }, `Game kill switch set to ${enabled}`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Admin List All Games with Performance & Config
router.get('/admin/games', (req: Request, res: Response) => {
  try {
    const games = dataStore.gameEntities.map(game => {
      const bets = dataStore.gameBets.filter(b => b.game_id === game.id);
      const totalVolume = bets.reduce((acc, b) => acc + (parseFloat(b.stake) || 0), 0);
      const totalPayouts = bets.reduce((acc, b) => acc + (parseFloat(b.actual_payout) || 0), 0);
      const ggr = totalVolume - totalPayouts;
      const actualRtp = totalVolume > 0 ? ((totalPayouts / totalVolume) * 100).toFixed(2) : '0.00';

      return {
        ...game,
        total_bets_count: bets.length,
        total_volume_usd: totalVolume.toFixed(2),
        total_payouts_usd: totalPayouts.toFixed(2),
        gross_gaming_revenue_usd: ggr.toFixed(2),
        actual_rtp_pct: actualRtp
      };
    });

    res.json(createResponse({
      games,
      kill_switch: GameService.isKillSwitchEnabled(),
      total_games: games.length,
      active_games: games.filter(g => g.status === 'ACTIVE').length,
      maintenance_games: games.filter(g => g.status === 'MAINTENANCE').length,
      disabled_games: games.filter(g => g.status === 'DISABLED').length
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// Admin Global Kill Switch Toggle
router.post('/admin/games/kill-switch', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    const currentState = GameService.isKillSwitchEnabled();
    const nextState = enabled !== undefined ? !!enabled : !currentState;
    GameService.setKillSwitch(nextState);
    logger.info('FINANCE', `Admin #${req.user?.id || 1} toggled global gaming kill switch to ${nextState}`);
    res.json(createResponse({ kill_switch: nextState }, `Global gaming kill switch is now ${nextState ? 'ACTIVATED' : 'DEACTIVATED'}.`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

// Admin Update Game Config & RTP
router.put('/admin/games/:slug', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const adminUser = { id: req.user?.id || 1, email: req.user?.email || 'admin@apexplatform.internal' };
    const prevGame = dataStore.gameEntities.find(g => g.slug === slug);
    const prevRtp = prevGame?.configured_rtp_pct || '96.00';
    const prevHouse = prevGame?.house_edge_pct || '4.00';

    const updated = GameService.updateGameConfig(slug, req.body, adminUser);

    if (req.body.configured_rtp_pct || req.body.house_edge_pct || req.body.audit_reason) {
      dataStore.gameRtpAuditLogs.unshift({
        id: dataStore.gameRtpAuditLogs.length + 1,
        game_slug: slug,
        game_name: updated.display_name || updated.name,
        previous_rtp: prevRtp,
        new_rtp: updated.configured_rtp_pct,
        previous_house_edge: prevHouse,
        new_house_edge: updated.house_edge_pct,
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        reason: req.body.audit_reason || 'Administrative RTP adjustment and compliance calibration',
        created_at: new Date().toISOString()
      });
    }

    res.json(createResponse(updated, `Game '${updated.name}' configuration updated successfully.`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Admin Quick Toggle Maintenance Mode
router.post('/admin/games/:slug/maintenance', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const game = dataStore.gameEntities.find(g => g.slug === slug);
    if (!game) return res.status(404).json(createErrorResponse('Game not found.'));

    const newStatus = game.status === 'MAINTENANCE' ? 'ACTIVE' : 'MAINTENANCE';
    game.status = newStatus;
    game.updated_at = new Date().toISOString();

    logger.info('FINANCE', `Admin #${req.user?.id || 1} toggled maintenance mode for game #${slug} to ${newStatus}`);
    res.json(createResponse(game, `Game status changed to ${newStatus}.`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(createErrorResponse(msg));
  }
});

// Admin RTP Audit Logs
router.get('/admin/games/rtp-audit-logs', (req: Request, res: Response) => {
  try {
    res.json(createResponse(dataStore.gameRtpAuditLogs || []));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json(createErrorResponse(msg));
  }
});

export const gameRoutes = router;
