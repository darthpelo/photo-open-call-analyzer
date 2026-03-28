/**
 * Express API Server
 *
 * Read-only web server for the Photo Open Call Analyzer.
 * Binds to 127.0.0.1 only (Security P2).
 * Uses helmet for HTTP security headers.
 */

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { createProjectsRouter } from './routes/projects.js';
import { createPhotosRouter } from './routes/photos.js';

const DEFAULT_PORT = 3000;
const HOST = '127.0.0.1';

/**
 * Create the Express application.
 * @param {Object} options
 * @param {string} [options.dataDir] - Absolute path to data directory (defaults to data/open-calls/)
 * @returns {import('express').Application}
 */
export function createApp(options = {}) {
  const dataDir = options.dataDir || path.resolve(process.cwd(), 'data', 'open-calls');

  const app = express();

  // Security headers
  app.use(helmet());

  // Disable leaking framework info
  app.disable('x-powered-by');

  // API routes
  app.use('/api/projects', createProjectsRouter(dataDir));
  app.use('/api/projects', createPhotosRouter(dataDir));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler - strip filesystem paths
  app.use((err, req, res, _next) => {
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Start server when run directly
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const port = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
  const app = createApp();
  app.listen(port, HOST, () => {
    console.log(`Photo Open Call Analyzer API running at http://${HOST}:${port}`);
    console.log(`Data directory: ${path.resolve(process.cwd(), 'data', 'open-calls')}`);
  });
}
