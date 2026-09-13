import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { createErrorResponse } from '../errorHandler.js';
import { logger } from '../logger.js';

interface IdempotentRecord {
  statusCode: number;
  body: any;
  createdAt: number;
}

// In-memory cache for idempotency responses (15 min TTL)
const idempotencyCache = new Map<string, IdempotentRecord>();
const inFlightKeys = new Set<string>();

// Per-user rate limiting timestamp store (3-second cooldown)
const lastBetTimestamps = new Map<string, number>();

/**
 * Betting Security Middleware for Express.js
 * 
 * Enforces:
 * 1. Mandatory `idempotency-key` header (or body field) check to prevent duplicate transactions.
 *    - In-flight duplicate detection returns 409 Conflict.
 *    - Processed duplicate request returns cached response.
 * 2. Per-user rate limiting (max 1 bet per 3 seconds) to prevent transaction spam.
 *    - Exceeded frequency returns 429 Too Many Requests with Retry-After header.
 */
export function bettingSecurityMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // --------------------------------------------------------------------------
  // 1. IDEMPOTENCY KEY CHECK
  // --------------------------------------------------------------------------
  const rawKey = req.headers['idempotency-key'] || req.body?.idempotency_key;
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return res.status(400).json(
      createErrorResponse(
        'Missing required idempotency-key header or field for secure betting transaction.',
        ['idempotency_required'],
        400
      )
    );
  }

  const idempotencyKey = rawKey.trim();

  // Return cached response if this transaction was already processed
  if (idempotencyCache.has(idempotencyKey)) {
    const cached = idempotencyCache.get(idempotencyKey)!;
    logger.info('SECURITY', `Serving idempotent cached response for key: ${idempotencyKey}`);
    return res.status(cached.statusCode).json(cached.body);
  }

  // Detect concurrent duplicate in-flight requests
  if (inFlightKeys.has(idempotencyKey)) {
    logger.warn('SECURITY', `Duplicate concurrent request detected for key: ${idempotencyKey}`);
    return res.status(409).json(
      createErrorResponse(
        'Duplicate transaction request detected. A previous request with this idempotency-key is currently in flight.',
        ['idempotency_conflict'],
        409
      )
    );
  }

  // --------------------------------------------------------------------------
  // 2. PER-USER RATE LIMITING (Max 1 bet per 3 seconds)
  // --------------------------------------------------------------------------
  const userId = req.user?.id;
  const identifier = userId ? `user_${userId}` : `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;
  const now = Date.now();
  const lastTime = lastBetTimestamps.get(identifier) || 0;
  const cooldownMs = 3000; // 3000ms cooldown

  if (now - lastTime < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - (now - lastTime)) / 1000);
    res.setHeader('Retry-After', remainingSeconds);
    return res.status(429).json(
      createErrorResponse(
        `Rate limit exceeded: Please wait ${remainingSeconds}s before placing another bet. Maximum 1 bet per 3 seconds.`,
        ['rate_limit_exceeded'],
        429
      )
    );
  }

  // Mark in-flight key and update user timestamp
  inFlightKeys.add(idempotencyKey);
  lastBetTimestamps.set(identifier, now);

  // Hook into response to cache successful or terminal result
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    inFlightKeys.delete(idempotencyKey);

    // Cache successful and client error responses (don't cache 500 server crashes)
    if (res.statusCode < 500) {
      idempotencyCache.set(idempotencyKey, {
        statusCode: res.statusCode,
        body,
        createdAt: Date.now()
      });

      // Evict after 15 minutes
      setTimeout(() => {
        idempotencyCache.delete(idempotencyKey);
      }, 15 * 60 * 1000);
    }

    return originalJson(body);
  };

  res.on('finish', () => {
    inFlightKeys.delete(idempotencyKey);
  });

  res.on('close', () => {
    inFlightKeys.delete(idempotencyKey);
  });

  next();
}

/**
 * Utility to clear rate limit or idempotency cache for testing purposes
 */
export function resetBettingSecurity() {
  idempotencyCache.clear();
  inFlightKeys.clear();
  lastBetTimestamps.clear();
}
