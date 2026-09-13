import { RiskLevel } from '../../types/finance.js';
import { dataStore } from '../dataStore.js';
import { Decimal } from './decimal.js';

export interface RiskEvaluationResult {
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
}

export class RiskEngine {
  public static evaluateWithdrawal(
    userId: number,
    amountStr: string,
    currency: string,
    destinationId: number
  ): RiskEvaluationResult {
    const reasons: string[] = [];
    let score = 10; // Base score

    const amount = Decimal.fromString(amountStr);
    const user = dataStore.users.find(u => u.id === userId);

    // 1. Amount thresholds
    if (amount.greaterThan(5000)) {
      score += 40;
      reasons.push('High value withdrawal exceeding $5,000 threshold');
    } else if (amount.greaterThan(1000)) {
      score += 20;
      reasons.push('Moderate value withdrawal exceeding $1,000 threshold');
    }

    // 2. Account age check
    if (user && user.created_at) {
      const createdDate = new Date(user.created_at).getTime();
      const ageDays = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
      if (ageDays < 3) {
        score += 35;
        reasons.push('Account created less than 3 days ago');
      } else if (ageDays < 7) {
        score += 15;
        reasons.push('Account created less than 7 days ago');
      }
    }

    // 3. Destination check (newly added destination or cooling off)
    const dest = dataStore.withdrawalDestinations.find(d => d.id === destinationId);
    if (dest) {
      if (dest.verification_status === 'PENDING' || dest.verification_status === 'COOLING_OFF') {
        score += 30;
        reasons.push('Withdrawal requested to unverified or cooling-off destination');
      }
    } else {
      score += 50;
      reasons.push('Unknown or invalid withdrawal destination');
    }

    // 4. Velocity check (multiple withdrawals in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentWithdrawals = dataStore.withdrawalRequests.filter(
      w => w.user_id === userId && w.created_at >= oneDayAgo && w.status !== 'REJECTED' && w.status !== 'CANCELLED'
    );
    if (recentWithdrawals.length >= 3) {
      score += 25;
      reasons.push(`High velocity: ${recentWithdrawals.length} withdrawal requests in past 24 hours`);
    }

    // Clamp score 0-100
    score = Math.max(0, Math.min(100, score));

    let level: RiskLevel = 'LOW';
    if (score >= 75) {
      level = 'BLOCKED';
    } else if (score >= 50) {
      level = 'HIGH';
    } else if (score >= 30) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    return {
      riskScore: score,
      riskLevel: level,
      reasons
    };
  }
}
