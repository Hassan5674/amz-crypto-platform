import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

export class AppError extends Error {
  public statusCode: number;
  public errors: string[];

  constructor(message: string, statusCode = 400, errors: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function generateRequestId(): string {
  return 'req_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
}

export function createResponse<T>(data?: T, message = 'Operation successful', success = true) {
  return {
    success,
    data,
    message,
    request_id: generateRequestId(),
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(message: string, errors: string[] = [], statusCode = 400) {
  return {
    success: false,
    message,
    errors,
    request_id: generateRequestId(),
    timestamp: new Date().toISOString()
  };
}

export function globalErrorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const reqId = generateRequestId();
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: string[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Error) {
    // Prevent leaking raw database or stack traces
    logger.error('API', `Unhandled Exception: ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    message = 'An unexpected platform error occurred. Please contact security/support.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    request_id: reqId,
    timestamp: new Date().toISOString()
  });
}
