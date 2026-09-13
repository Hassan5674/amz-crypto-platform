// Structured Logger for ApexPlatform
// Categories: AUTH, SECURITY, ADMIN, API, SYSTEM, JOB, FINANCIAL (Phase 2)
// Sanitizes passwords, tokens, API keys, and sensitive credentials

export type LogCategory =
  | 'AUTH'
  | 'SECURITY'
  | 'ADMIN'
  | 'API'
  | 'SYSTEM'
  | 'JOB'
  | 'FINANCIAL'
  | 'FINANCE'
  | 'FINANCE_AUDIT'
  | 'FINANCE_RECON'
  | 'FINANCE_TESTS'
  | 'FINANCE_API'
  | 'FINANCE_WEBHOOK'
  | 'CRYPTO'
  | 'EMAIL'
  | 'GAMES';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogPayload {
  category: LogCategory;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'session_token',
  'secret',
  'authorization',
  'private_key',
  'two_factor_secret'
]);

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitize(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export const logger = {
  log(category: LogCategory, level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogPayload = {
      category,
      level,
      message,
      context: context ? (sanitize(context) as Record<string, unknown>) : undefined,
      timestamp: new Date().toISOString(),
    };
    const formatted = `[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`;
    if (level === 'ERROR') {
      console.error(formatted, entry.context || '');
    } else if (level === 'WARN') {
      console.warn(formatted, entry.context || '');
    } else {
      console.log(formatted, entry.context || '');
    }
    return entry;
  },

  info(category: LogCategory, message: string, context?: Record<string, unknown>) {
    return this.log(category, 'INFO', message, context);
  },

  warn(category: LogCategory, message: string, context?: Record<string, unknown>) {
    return this.log(category, 'WARN', message, context);
  },

  error(category: LogCategory, message: string, context?: Record<string, unknown>) {
    return this.log(category, 'ERROR', message, context);
  },

  security(message: string, context?: Record<string, unknown>) {
    return this.log('SECURITY', 'WARN', message, context);
  },

  admin(message: string, context?: Record<string, unknown>) {
    return this.log('ADMIN', 'INFO', message, context);
  }
};
