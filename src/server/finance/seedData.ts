import { accountService } from './accountService.js';
import { logger } from '../logger.js';

/**
 * Initializes essential double-entry system clearing accounts
 * for institutional ledger consistency without inserting mock users.
 */
export function seedInitialLedgerData(): void {
  try {
    for (const currency of ['USD', 'EUR', 'GBP', 'USDT']) {
      accountService.ensureSystemAccounts(currency);
    }
    logger.info('FINANCE', 'Double-entry institutional clearing accounts initialized.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('FINANCE', `Failed to initialize system ledger accounts: ${msg}`);
  }
}
