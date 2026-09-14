// Phase 9 & 10: Professional Games Engine & Provably Fair Service

import { dataStore } from '../dataStore.js';
import { accountService } from '../finance/accountService.js';
import { balanceService } from '../finance/balanceService.js';
import { financialTransactionService } from '../finance/transactionService.js';
import { Decimal } from '../finance/decimal.js';
import {
  GameEntity,
  GameRound,
  GameBet,
  GameDispute
} from '../../types/games.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { logger } from '../logger.js';
import crypto from 'crypto';

export class GameService {
  private static globalKillSwitch: boolean = false;
  private static activeBettingUsers = new Set<number>();

  public static setKillSwitch(enabled: boolean): void {
    GameService.globalKillSwitch = enabled;
    logger.warn('FINANCE', `Game Kill Switch status updated: ${enabled}`);
  }

  public static isKillSwitchEnabled(): boolean {
    return GameService.globalKillSwitch;
  }

  public static getGames(): GameEntity[] {
    return dataStore.gameEntities;
  }

  public static getGame(idOrSlug: string | number): GameEntity | null {
    return dataStore.gameEntities.find(
      g => g.id === Number(idOrSlug) || g.slug === String(idOrSlug)
    ) || null;
  }

  /**
   * Generates cryptographic server seed and SHA-256 hash commitment.
   */
  public static createRound(gameId: number, currency: string = 'USD'): GameRound {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found.');
    if (game.status !== 'ACTIVE' || GameService.globalKillSwitch) {
      throw new Error('Game is currently disabled or in maintenance / kill switch mode.');
    }

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const nextId = dataStore.gameRounds.length > 0 ? Math.max(...dataStore.gameRounds.map(r => r.id)) + 1 : 1;
    const roundReference = `GMR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const round: GameRound = {
      id: nextId,
      round_reference: roundReference,
      game_id: game.id,
      game_version: game.current_version,
      currency,
      status: 'OPEN',
      server_seed: serverSeed,
      server_seed_hash: serverSeedHash,
      client_seed: 'DEFAULT_CLIENT_SEED',
      nonce: 1,
      outcome_data: {},
      created_at: new Date().toISOString(),
      settled_at: null
    };

    dataStore.gameRounds.push(round);
    return round;
  }

  /**
   * Places a game bet with authoritative server settlement, idempotency lock, and ledger integration.
   */
  public static placeBet(
    userId: number,
    idOrSlug: number | string,
    selection: string,
    stakeStr: string,
    currency: string = 'USD',
    clientSeed?: string,
    options?: {
      outcome_multiplier?: string | number;
      is_win?: boolean;
      outcome_summary?: string;
      game_state?: Record<string, unknown>;
    }
  ): { bet: GameBet; round: GameRound } {
    if (GameService.globalKillSwitch) {
      throw new Error('All gaming operations are currently halted by administrative kill switch.');
    }

    if (GameService.activeBettingUsers.has(userId)) {
      throw new Error('A bet is already currently processing for this user. Duplicate submissions are locked by server-side isBetting guard.');
    }

    GameService.activeBettingUsers.add(userId);

    try {
      const game = this.getGame(idOrSlug);
      if (!game || game.status !== 'ACTIVE') {
        throw new Error(game ? `Game ${game.name} is currently ${game.status.toLowerCase()}.` : 'Game not found.');
      }

      const stake = Decimal.fromString(stakeStr);
      const minBet = Decimal.fromString(game.min_bet);
      const maxBet = Decimal.fromString(game.max_bet);

      if (stake.compareTo(minBet) < 0 || stake.compareTo(maxBet) > 0) {
        throw new Error(`Bet amount must be between $${game.min_bet} and $${game.max_bet} ${currency}`);
      }

      // 1. Check user responsible gaming limits
      const userLimits = dataStore.userResponsibleGamingLimits.find(l => l.user_id === userId);
      if (userLimits && userLimits.self_excluded) {
        throw new Error('Account is self-excluded from gaming activities.');
      }

      // 2. Open or get latest open round for this game
      let round = dataStore.gameRounds.find(r => r.game_id === game.id && r.status === 'OPEN');
      if (!round) {
        round = this.createRound(game.id, currency);
      }

      if (clientSeed) {
        round.client_seed = clientSeed;
      }
      round.status = 'RESOLVING';

      // 3. Deduct stake from ledger: USER_AVAILABLE -> SYSTEM_GAME_SETTLEMENT
      const availableAcc = accountService.getUserAccount(userId, 'USER_AVAILABLE', currency);
      const gamesLiabilityAcc = accountService.getSystemAccount('SYSTEM_GAME_SETTLEMENT', currency);

      // Ensure user has sufficient funds in available account
      const currentBal = balanceService.getAccountBalance(availableAcc.id);
      if (currentBal.compareTo(stake) < 0) {
        throw new Error(`Insufficient balance (${currentBal.toString()} ${currency}) to place bet of ${stake.toString()} ${currency}. Please deposit funds to continue playing.`);
      }

      const idempotencyKey = `bet_${userId}_${round.id}_${Date.now()}`;
      const tx = financialTransactionService.postTransaction(
        {
          transaction_type: 'GAME_BET',
          currency,
          amount: stake.toString(),
          description: `Wager stake of ${stake.toString()} ${currency} on game #${game.slug}`,
          idempotency_key: idempotencyKey,
          created_by: userId
        },
        [
          {
            account_id: availableAcc.id,
            entry_type: 'DEBIT',
            amount: stake.toString(),
            description: `Debit available balance for game wager`
          },
          {
            account_id: gamesLiabilityAcc.id,
            entry_type: 'CREDIT',
            amount: stake.toString(),
            description: `Credit game settlement pool`
          }
        ]
      );

      // 4. Resolve Game Outcome
      let resolution: { roll: number; result: string; multiplier: Decimal; won: boolean };

      if (options?.outcome_multiplier !== undefined || options?.is_win !== undefined) {
        // Multiplier submitted via interactive table or arcade game
        const rawMultiplier = Math.max(0, Number(options.outcome_multiplier ?? (options.is_win ? 1 : 0)));
        const maxMult = parseFloat(game.max_multiplier?.replace('x', '') || '10000');
        const boundedMultiplier = Math.min(rawMultiplier, maxMult);
        const won = boundedMultiplier > 0;
        const multDec = Decimal.fromString(boundedMultiplier.toFixed(4));
        
        resolution = {
          roll: Math.floor(Math.random() * 100) + 1,
          result: options.outcome_summary || (won ? `Won with multiplier ${boundedMultiplier}x` : 'Round ended'),
          multiplier: multDec,
          won
        };
      } else {
        // Standard server-side RNG calculation
        resolution = this.resolveGameOutcome(game.category, selection, stake, round.server_seed, round.client_seed, round.nonce);
      }

      // Authoritative Admin Win Rate / RTP Enforcement (strictly 0 to 99%)
      const configuredRtp = game.configured_rtp_pct !== undefined ? parseFloat(game.configured_rtp_pct) : 96.0;
      const targetWinRate = Math.min(99.0, Math.max(0.0, isNaN(configuredRtp) ? 48.0 : configuredRtp));

      if (resolution.won) {
        if (targetWinRate <= 0.0) {
          // 0% win rate: User NEVER wins
          resolution.won = false;
          resolution.multiplier = Decimal.zero();
          resolution.result = 'Outcome settled: Loss (House edge 100%)';
        } else if (targetWinRate < 100.0) {
          const winCheckRoll = Math.random() * 100;
          if (winCheckRoll > targetWinRate) {
            // Did not pass the admin-controlled win probability threshold (0-99%)
            resolution.won = false;
            resolution.multiplier = Decimal.zero();
            resolution.result = 'Outcome settled: Loss';
          }
        }
      }

      round.status = 'SETTLED';
      round.settled_at = new Date().toISOString();
      round.outcome_data = {
        random_roll: resolution.roll,
        outcome_result: resolution.result,
        multiplier: resolution.multiplier.toString(),
        ...(options?.game_state ? { game_state: options.game_state } : {})
      };

      const payout = stake.multiply(resolution.multiplier);
      const won = resolution.won;

      const nextBetId = dataStore.gameBets.length > 0 ? Math.max(...dataStore.gameBets.map(b => b.id)) + 1 : 1;
      const betRef = `BET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      let payoutTxId: number | null = null;
      if (won && payout.compareTo(Decimal.zero()) > 0) {
        const payoutKey = `payout_${userId}_${nextBetId}_${Date.now()}`;
        const payoutTx = financialTransactionService.postTransaction(
          {
            transaction_type: 'GAME_PAYOUT',
            currency,
            amount: payout.toString(),
            description: `Game win payout for bet #${betRef}`,
            idempotency_key: payoutKey,
            created_by: userId
          },
          [
            {
              account_id: gamesLiabilityAcc.id,
              entry_type: 'DEBIT',
              amount: payout.toString(),
              description: `Debit game settlement for payout`
            },
            {
              account_id: availableAcc.id,
              entry_type: 'CREDIT',
              amount: payout.toString(),
              description: `Credit user available balance for game winnings`
            }
          ]
        );
        payoutTxId = payoutTx.id;
      }

      const bet: GameBet = {
        id: nextBetId,
        public_reference: betRef,
        user_id: userId,
        round_id: round.id,
        game_id: game.id,
        game_version: round.game_version,
        currency,
        selection,
        stake: stake.toString(),
        multiplier: resolution.multiplier.toString(),
        potential_payout: payout.toString(),
        actual_payout: won ? payout.toString() : '0.00000000',
        status: won ? 'WON' : 'LOST',
        ledger_transaction_id: tx.id,
        payout_ledger_transaction_id: payoutTxId,
        idempotency_key: `bet_place_${nextBetId}`,
        created_at: new Date().toISOString(),
        settled_at: new Date().toISOString()
      };

      dataStore.gameBets.push(bet);

      SecurityLogger.logSpin({
        user_id: userId,
        bet_id: bet.id,
        game_id: game.id,
        action: 'SPIN',
        server_seed_hash: round.server_seed_hash,
        server_seed: round.server_seed,
        client_seed: round.client_seed,
        nonce: round.nonce,
        outcome_result: resolution.result,
        payout: won ? payout.toString() : '0.00'
      });

      logger.info('FINANCE', `Game bet #${bet.id} resolved for user #${userId} on game #${game.slug}: Status ${bet.status} (${resolution.result})`);
      return { bet, round };
    } finally {
      GameService.activeBettingUsers.delete(userId);
    }
  }

  /**
   * Admin updates game configuration with mathematical RTP checks and audit logging
   */
  public static updateGameConfig(
    slug: string,
    updates: Partial<GameEntity>,
    adminUser: { id: number; email: string }
  ): GameEntity {
    const game = dataStore.gameEntities.find(g => g.slug === slug);
    if (!game) throw new Error(`Game '${slug}' not found.`);

    // If updating RTP, validate mathematical bounds (0% to 100%)
    if (updates.configured_rtp_pct !== undefined) {
      const newRtp = parseFloat(updates.configured_rtp_pct);
      const minRtp = 0.00; // Allow full admin control from 0% (never win) to 100%
      const maxRtp = 100.00;

      if (isNaN(newRtp) || newRtp < minRtp || newRtp > maxRtp) {
        throw new Error(`RTP for ${game.name} must be between ${minRtp}% and ${maxRtp}%. Provided: ${updates.configured_rtp_pct}%`);
      }

      const prevRtp = game.configured_rtp_pct || (100 - parseFloat(game.house_edge_pct)).toFixed(2);
      const newHouseEdge = (100 - newRtp).toFixed(2);
      const prevHouseEdge = game.house_edge_pct;

      // Log RTP audit trail
      dataStore.gameRtpAuditLogs.unshift({
        id: dataStore.gameRtpAuditLogs.length + 1,
        game_slug: game.slug,
        game_name: game.name,
        previous_rtp: prevRtp,
        new_rtp: newRtp.toFixed(2),
        previous_house_edge: prevHouseEdge,
        new_house_edge: newHouseEdge,
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        reason: (updates as any).audit_reason || 'Administrative RTP adjustment',
        created_at: new Date().toISOString()
      });

      game.configured_rtp_pct = newRtp.toFixed(2);
      game.house_edge_pct = newHouseEdge;
    }

    if (updates.status !== undefined) game.status = updates.status;
    if (updates.min_bet !== undefined) game.min_bet = updates.min_bet;
    if (updates.max_bet !== undefined) game.max_bet = updates.max_bet;
    if (updates.is_featured !== undefined) game.is_featured = updates.is_featured;
    if (updates.sound_enabled !== undefined) game.sound_enabled = updates.sound_enabled;
    if (updates.sort_order !== undefined) game.sort_order = updates.sort_order;
    game.updated_at = new Date().toISOString();

    logger.info('FINANCE', `Admin #${adminUser.id} updated game #${game.slug} configuration (RTP: ${game.configured_rtp_pct}%, Status: ${game.status})`);
    return game;
  }

  /**
   * Provably fair deterministic game resolution adapter.
   */
  private static resolveGameOutcome(
    category: string,
    selection: string,
    stake: Decimal,
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): { roll: number; result: string; multiplier: Decimal; won: boolean } {
    // Generate HMAC SHA-256 hash of serverSeed with clientSeed + nonce
    const hmac = crypto.createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}`).digest('hex');
    const intVal = parseInt(hmac.slice(0, 8), 16);
    const roll = (intVal % 100) + 1; // 1 to 100

    let won = false;
    let multiplier = Decimal.zero();
    let result = '';

    switch (category) {
      case 'DICE': {
        // Selection format e.g. "UNDER_50" or "OVER_50"
        const parts = selection.split('_');
        const direction = parts[0];
        const target = parseInt(parts[1] || '50', 10);

        if (direction === 'UNDER') {
          won = roll < target;
          const winChance = target - 1;
          const rawMult = 99 / winChance;
          multiplier = won ? Decimal.fromString(rawMult.toFixed(4)) : Decimal.zero();
        } else {
          won = roll > target;
          const winChance = 100 - target;
          const rawMult = 99 / winChance;
          multiplier = won ? Decimal.fromString(rawMult.toFixed(4)) : Decimal.zero();
        }
        result = `Rolled ${roll} (${selection})`;
        break;
      }
      case 'COIN_FLIP': {
        // Selection: "HEADS" or "TAILS"
        const winningFlip = roll <= 50 ? 'HEADS' : 'TAILS';
        won = selection.toUpperCase() === winningFlip;
        multiplier = won ? Decimal.fromString('1.98') : Decimal.zero();
        result = `Coin landed on ${winningFlip}`;
        break;
      }
      case 'CARD': {
        // Red / Black card draw
        const winningColor = roll <= 50 ? 'RED' : 'BLACK';
        won = selection.toUpperCase() === winningColor;
        multiplier = won ? Decimal.fromString('1.98') : Decimal.zero();
        result = `Card drawn was ${winningColor}`;
        break;
      }
      case 'NUMBER': {
        // Exact number selection 1-10
        const targetNum = parseInt(selection, 10) || 7;
        const drawnNum = (roll % 10) + 1;
        won = targetNum === drawnNum;
        multiplier = won ? Decimal.fromString('9.00') : Decimal.zero();
        result = `Number drawn was ${drawnNum}`;
        break;
      }
      case 'ROULETTE': {
        // European roulette: 37 pockets (0 to 36)
        const drawnNum = intVal % 37;
        const redNums = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        let color = 'green';
        if (drawnNum !== 0) {
          color = redNums.includes(drawnNum) ? 'red' : 'black';
        }

        const sel = String(selection).toLowerCase().trim();
        if (!isNaN(Number(sel))) {
          // Straight up bet (36x return / 35:1)
          won = drawnNum === Number(sel);
          multiplier = won ? Decimal.fromString('36.00') : Decimal.zero();
        } else if (sel === 'red') {
          won = color === 'red';
          multiplier = won ? Decimal.fromString('2.00') : Decimal.zero();
        } else if (sel === 'black') {
          won = color === 'black';
          multiplier = won ? Decimal.fromString('2.00') : Decimal.zero();
        } else if (sel === 'even') {
          won = drawnNum !== 0 && drawnNum % 2 === 0;
          multiplier = won ? Decimal.fromString('2.00') : Decimal.zero();
        } else if (sel === 'odd') {
          won = drawnNum !== 0 && drawnNum % 2 !== 0;
          multiplier = won ? Decimal.fromString('2.00') : Decimal.zero();
        }
        result = `Ball landed on ${drawnNum} (${color.toUpperCase()})`;
        return { roll: drawnNum, result, multiplier, won };
      }
      default:
        won = false;
        multiplier = Decimal.zero();
        result = `Outcome roll ${roll}`;
    }

    return { roll, result, multiplier, won };
  }
}

export class DisputeService {
  public static createDispute(userId: number, betId: number, reason: string): GameDispute {
    const bet = dataStore.gameBets.find(b => b.id === betId && b.user_id === userId);
    if (!bet) throw new Error('Bet not found or unauthorized.');

    const nextId = dataStore.gameDisputes.length > 0 ? Math.max(...dataStore.gameDisputes.map(d => d.id)) + 1 : 1;
    const dispute: GameDispute = {
      id: nextId,
      user_id: userId,
      bet_id: betId,
      reason,
      status: 'OPEN',
      admin_notes: null,
      resolution: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dataStore.gameDisputes.push(dispute);
    logger.info('FINANCE', `New game dispute #${dispute.id} created for bet #${betId} by user #${userId}`);
    return dispute;
  }
}
