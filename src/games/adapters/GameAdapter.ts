import { GameBetRequest, GameBetResult } from '../types.js';

export class GameAdapter {
  /**
   * Authoritative server-side bet placement and outcome resolution.
   */
  public static async placeServerBet(req: GameBetRequest): Promise<GameBetResult> {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('apex_token') || '';
      const response = await fetch(`/api/games/${req.gameSlug}/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stake: req.stake,
          selection: typeof req.selection === 'object' ? JSON.stringify(req.selection) : req.selection,
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
          errorMessage: data.error || data.message || 'Failed to place bet on authoritative backend'
        };
      }

      const bet = data.data.bet;
      const round = data.data.round;

      return {
        success: true,
        betId: bet.id,
        roundReference: round.round_reference || bet.public_reference,
        gameSlug: req.gameSlug,
        stake: parseFloat(bet.stake),
        payout: parseFloat(bet.actual_payout),
        multiplier: parseFloat(bet.multiplier),
        won: bet.status === 'WON',
        outcomeData: round.outcome_data || {},
        newBalance: data.data.new_balance ? parseFloat(data.data.new_balance) : 0,
        serverSeedHash: round.server_seed_hash,
        revealedServerSeed: round.server_seed,
        clientSeed: round.client_seed,
        nonce: round.nonce
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
