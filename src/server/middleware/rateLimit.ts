import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { createErrorResponse } from '../errorHandler.js';

const failedLoginsStore = new Map<string, { count: number; lockedUntil: number }>();

export const rateLimiter = {
  isLoginLocked(identifier: string) {
    const record = failedLoginsStore.get(identifier);
    if (!record) return { locked: false, remainingMinutes: 0 };
    if (Date.now() < record.lockedUntil) {
      const remainingMs = record.lockedUntil - Date.now();
      return { locked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
    }
    return { locked: false, remainingMinutes: 0 };
  },
  recordFailedLogin(identifier: string) {
    let record = failedLoginsStore.get(identifier);
    const now = Date.now();
    if (!record) {
      record = { count: 0, lockedUntil: 0 };
    }
    record.count += 1;
    let isLocked = false;
    if (record.count >= 5) {
      record.lockedUntil = now + 15 * 60 * 1000; // 15 mins lock
      isLocked = true;
    }
    failedLoginsStore.set(identifier, record);
    return { count: record.count, isLocked };
  },
  resetFailedLogins(identifier: string) {
    failedLoginsStore.delete(identifier);
  },
  middleware(req: Request, res: Response, next: NextFunction) {
    next();
  }
};

const rateLimitStore = new Map<string, number[]>();

function createGenericRateLimiter(windowMs: number, max: number, message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let timestamps = rateLimitStore.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);
    
    if (timestamps.length >= max) {
      return res.status(429).json(createErrorResponse(message));
    }

    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    next();
  };
}

export const loginRateLimiter = createGenericRateLimiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again later.');
export const registerRateLimiter = createGenericRateLimiter(60 * 60 * 1000, 5, 'Too many registration attempts. Please try again later.');
export const passwordResetRateLimiter = createGenericRateLimiter(15 * 60 * 1000, 5, 'Too many password reset requests.');
export const emailVerifyRateLimiter = createGenericRateLimiter(15 * 60 * 1000, 10, 'Too many verification attempts.');
export const cryptoRateLimiter = createGenericRateLimiter(60 * 1000, 20, 'Too many financial requests. Please try again in 1 minute.');
export { createGenericRateLimiter };

const lastBetTimestamps = new Map<string, number>();

export function gameRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const identifier = userId ? `user_${userId}` : `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;

  const now = Date.now();
  const lastTime = lastBetTimestamps.get(identifier) || 0;
  const cooldownMs = 3000; // 3 seconds per user

  if (now - lastTime < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastTime)) / 1000);
    res.setHeader('Retry-After', remaining);
    return res.status(429).json(
      createErrorResponse(`Rate limit exceeded: Please wait ${remaining}s before placing another bet. Maximum 1 bet per 3 seconds.`, ['rate_limit_exceeded'], 429)
    );
  }

  lastBetTimestamps.set(identifier, now);
  next();
}
