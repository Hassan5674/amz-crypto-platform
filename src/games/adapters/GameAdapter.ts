import { GameBetRequest, GameBetResult } from '../types.js';

export class GameAdapter {
  /**
   * Authoritative server-side bet placement and immediate stake deduction.
   */
  public static async placeServerBet(req: GameBetRequest): Promise<GameBetResult> {
    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      
      const response = await fetch('/api/games/bet.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_slug: req.gameSlug,
          stake: req.stake,
          currency: req.currency || 'USD',
          client_seed: req.clientSeed || `CS-${Date.now()}`
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          betId: 0,
          roundReference: '',
          gameSlug: req.gameSlug,
          stake: req.stake,
          payout: 0,
          multiplier: 0,
          won: false,
          outcomeData: {},
          newBalance: 0,
          errorMessage: data.message || 'Failed to place bet on MySQL authoritative backend'
        };
      }

      const outcome = data.data || {};
      const newBalance = Number(outcome.new_balance ?? outcome.balance_after ?? 0);

      return {
        success: true,
        betId: outcome.bet_id || Date.now(),
        roundReference: `ROUND-${Date.now()}`,
        gameSlug: req.gameSlug,
        stake: req.stake,
        payout: 0,
        multiplier: 0,
        won: false,
        outcomeData: outcome,
        newBalance: newBalance,
        clientSeed: req.clientSeed
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        betId: 0,
        roundReference: '',
        gameSlug: req.gameSlug,
        stake: req.stake,
        payout: 0,
        multiplier: 0,
        won: false,
        outcomeData: {},
        newBalance: 0,
        errorMessage: msg
      };
    }
  }

  /**
   * Authoritative server-side win settlement and balance credit.
   */
  public static async settleServerWin(params: {
    gameSlug: string;
    payout: number;
    bet: number;
    currency?: string;
    clientSeed?: string;
  }): Promise<{ success: boolean; newBalance: number; errorMessage?: string }> {
    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      
      const response = await fetch('/api/games/settle.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_slug: params.gameSlug,
          payout: params.payout,
          bet: params.bet,
          currency: params.currency || 'USD',
          client_seed: params.clientSeed
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          newBalance: 0,
          errorMessage: data.message || 'Failed to settle win on backend'
        };
      }

      const newBal = Number(data.data?.new_balance ?? data.data?.balance_after ?? 0);
      return {
        success: true,
        newBalance: newBal
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        newBalance: 0,
        errorMessage: msg
      };
    }
  }

  /**
   * Verify fairness with backend cryptographic engine.
   */
  public static async verifyFairness(serverSeed: string, clientSeed: string, nonce: number): Promise<{ valid: boolean; hash: string }> {
    try {
      const response = await fetch('/api/games/verify-fairness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_seed: serverSeed, client_seed: clientSeed, nonce })
      });
      const data = await response.json();
      return {
        valid: data.success && data.data.valid,
        hash: data.data?.server_seed_hash || ''
      };
    } catch {
      return { valid: false, hash: '' };
    }
  }
}
