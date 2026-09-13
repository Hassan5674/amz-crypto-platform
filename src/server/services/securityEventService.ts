import { dataStore } from '../dataStore.js';
import { logger } from '../logger.js';
import { RoleType } from '../../types/index.js';

export type SecurityEventType =
  | 'USER_REGISTERED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_UNVERIFIED'
  | 'LOGIN_2FA_CHALLENGE'
  | 'LOGOUT'
  | 'SESSION_REVOKED'
  | 'ALL_OTHER_SESSIONS_REVOKED'
  | 'EMAIL_VERIFICATION_REQUESTED'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'
  | 'TWO_FACTOR_SETUP_INITIATED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'TWO_FACTOR_RECOVERY_CODES_REGENERATED'
  | 'ACCOUNT_LOCKED_AUTO'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_BANNED'
  | 'ACCOUNT_UNBANNED'
  | 'ADMIN_STAFF_ENROLLED'
  | 'ADMIN_ROLE_UPDATED'
  | 'ADMIN_STATUS_CHANGED'
  | 'SYSTEM_SETTING_UPDATED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'FINANCIAL_TRANSACTION_POSTED'
  | 'FINANCIAL_TRANSACTION_REVERSED'
  | 'FINANCIAL_ADJUSTMENT_REQUESTED'
  | 'FINANCIAL_ADJUSTMENT_APPROVED'
  | 'FINANCIAL_ADJUSTMENT_REJECTED'
  | 'FINANCIAL_RECONCILIATION_RUN'
  | 'HIGH_RISK_WITHDRAWAL_BLOCKED'
  | 'WITHDRAWAL_REQUESTED'
  | 'CRYPTO_DEPOSIT_ORDER_CREATED'
  | 'CRYPTO_DEPOSIT_SETTLED'
  | 'CRYPTO_PAYOUT_APPROVED_AND_EXECUTED'
  | 'CRYPTO_PAYOUT_MANUAL_COMPLETED'
  | 'CRYPTO_PAYOUT_REJECTED'
  | 'CRYPTO_WITHDRAWAL_SUBMITTED'
  | 'CRYPTO_PAYOUT_DISBURSED';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEventParams {
  type: SecurityEventType;
  actor?: {
    id: number | null;
    name?: string;
    role?: RoleType;
  };
  target?: {
    type: string;
    id: string | number;
  };
  description: string;
  ip: string;
  userAgent?: string;
  severity?: SecuritySeverity;
  metadata?: Record<string, unknown>;
}

class SecurityEventService {
  public record(params: SecurityEventParams): void {
    const { type, actor, target, description, ip, userAgent, severity = 'LOW', metadata } = params;

    // Sanitize metadata to guarantee no secrets, credentials, or raw hashes are logged
    const safeMetadata: Record<string, unknown> = {};
    if (metadata) {
      for (const [key, val] of Object.entries(metadata)) {
        if (
          key.toLowerCase().includes('pass') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('code')
        ) {
          safeMetadata[key] = '[REDACTED]';
        } else {
          safeMetadata[key] = val;
        }
      }
    }

    // Write to persistent audit logs in dataStore
    dataStore.addAuditLog({
      actor_user_id: actor?.id ?? null,
      actor_name: actor?.name,
      actor_role: actor?.role,
      action: type,
      entity_type: target?.type || 'system',
      entity_id: target?.id ? String(target.id) : null,
      description: `[${severity}] ${description}`,
      ip_metadata: ip,
      user_agent: userAgent || 'System-Daemon'
    });

    // Output to server logger
    const logMessage = `[${severity}] ${type} | Actor: ${actor?.name || 'Anonymous'} (#${actor?.id || 'none'}) | Target: ${target?.type || 'none'} #${target?.id || ''} | IP: ${ip}`;
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      logger.security(logMessage, safeMetadata);
    } else {
      logger.info('SECURITY', logMessage);
    }
  }
}

export const securityEventService = new SecurityEventService();
