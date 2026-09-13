import 'dotenv/config';
import express from 'express';
import path from 'path';
import apiRouter from './src/server/routes/api.js';
import { globalErrorHandler } from './src/server/errorHandler.js';
import { logger } from './src/server/logger.js';
import { seedInitialLedgerData } from './src/server/finance/seedData.js';

async function startServer() {
  // Initialize double-entry ledger with baseline seed accounts and demo funding
  seedInitialLedgerData();

  const app = express();
  const PORT = 3000;

  // Basic security and body parsing middlewares
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Custom Request Logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        logger.info('API', `${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Mount API Router (supporting both /api and versioned /api/v1 endpoints)
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Health check at root API level
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ApexPlatform Core Backend',
      phase: 'PHASE_3_FINANCIAL_LEDGER',
      timestamp: new Date().toISOString()
    });
  });

  // Critical: API 404 handler prevents any unhandled /api/* request from falling through to Vite/index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
      error: 'Not Found'
    });
  });

  // Global API error handler
  app.use(globalErrorHandler);

  // Frontend integration: Vite middleware in development, static in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('SYSTEM', `ApexPlatform Enterprise server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
