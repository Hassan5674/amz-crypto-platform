import { dataStore } from '../dataStore.js';
import { SecurityAuditLog } from '../../types/games.js';
import { logger } from '../logger.js';

export class SecurityLogger {
  /**
   * Captures and stores an immutable audit log record for each bet and spin.
   * Uses Object.freeze to guarantee in-memory immutability and prevent retrospective tampering.
   */
  public static logSpin(entry: {
    user_id: number;
    bet_id: number;
    game_id: number;
    action?: 'BET' | 'SPIN' | 'SETTLEMENT';
    server_seed: string;
    server_seed_hash: string;
    client_seed: string;
    nonce: number;
    outcome_result: string | number;
    payout: string;
  }): SecurityAuditLog {
    const nextId = dataStore.securityAuditLogs.length > 0 
      ? Math.max(...dataStore.securityAuditLogs.map(l => l.id)) + 1 
      : 1;

    const currentIsoTime = new Date().toISOString();

    // Create immutable audit log entry
    const auditLog: SecurityAuditLog = Object.freeze({
      id: nextId,
      user_id: entry.user_id,
      bet_id: entry.bet_id,
      game_id: entry.game_id,
      action: entry.action || 'SPIN',
      game_seed: entry.server_seed,
      server_seed: entry.server_seed,
      server_seed_hash: entry.server_seed_hash,
      client_seed: entry.client_seed,
      nonce: entry.nonce,
      outcome_result: entry.outcome_result,
      final_payout: entry.payout,
      payout: entry.payout,
      round_timestamp: currentIsoTime,
      timestamp: currentIsoTime
    });

    // Unshift into datastore audit table
    dataStore.securityAuditLogs.unshift(auditLog);

    // Keep up to 2,000 immutable records in audit table
    if (dataStore.securityAuditLogs.length > 2000) {
      dataStore.securityAuditLogs.pop();
    }

    logger.info('FINANCE', `[SECURITY AUDIT] Spin captured: User #${auditLog.user_id}, Bet #${auditLog.bet_id}, Game #${auditLog.game_id}, SeedHash: ${auditLog.server_seed_hash.substring(0, 16)}..., Payout: $${auditLog.final_payout}`);

    return auditLog;
  }

  /**
   * Returns immutable audit table logs for compliance, verification, or dispute arbitration.
   */
  public static getAuditTable(userId?: number, limit: number = 50): SecurityAuditLog[] {
    let logs = dataStore.securityAuditLogs;
    if (userId !== undefined) {
      logs = logs.filter(l => l.user_id === userId);
    }
    return logs.slice(0, limit);
  }

  /**
   * Alias for backward compatibility
   */
  public static getLogs(userId?: number, limit: number = 50): SecurityAuditLog[] {
    return this.getAuditTable(userId, limit);
  }
}
