import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../errorHandler.js';
import { logger } from '../logger.js';

interface IdempotentResponse {
  statusCode: number;
  body: any;
  createdAt: number;
}

class IdempotencyManager {
  private cache = new Map<string, IdempotentResponse>();
  private processing = new Set<string>();

  public middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] || req.body?.idempotency_key;
    if (!key || typeof key !== 'string') {
      return res.status(400).json(
        createErrorResponse('Missing required idempotency-key header or field for secure betting transaction.', ['idempotency_required'], 400)
      );
    }

    const idempotencyKey = key.trim();

    if (this.cache.has(idempotencyKey)) {
      const cached = this.cache.get(idempotencyKey)!;
      logger.info('FINANCE', `Idempotency cache hit for key: ${idempotencyKey}`);
      return res.status(cached.statusCode).json(cached.body);
    }

    if (this.processing.has(idempotencyKey)) {
      logger.warn('FINANCE', `Duplicate concurrent request detected for idempotency-key: ${idempotencyKey}`);
      return res.status(409).json(
        createErrorResponse('Duplicate transaction request detected. A previous request with this idempotency-key is currently in flight.', ['idempotency_conflict'], 409)
      );
    }

    this.processing.add(idempotencyKey);

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      this.processing.delete(idempotencyKey);
      this.cache.set(idempotencyKey, {
        statusCode: res.statusCode,
        body,
        createdAt: Date.now()
      });

      setTimeout(() => {
        this.cache.delete(idempotencyKey);
      }, 15 * 60 * 1000);

      return originalJson(body);
    };

    res.on('finish', () => {
      this.processing.delete(idempotencyKey);
    });

    next();
  };
}

export const idempotencyManager = new IdempotencyManager();
