import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';

export const healthRouter = Router();

// /health: el proceso responde. Incluye el commit desplegado (Render define
// RENDER_GIT_COMMIT) para que GitHub Actions confirme que la versión nueva ya está publicada.
healthRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok', commit: process.env.RENDER_GIT_COMMIT ?? 'local' });
});

// /ready: además del proceso, la base de datos está conectada.
healthRouter.get('/ready', (_request, response) => {
  if (isDatabaseConnected()) {
    response.json({ status: 'ready', database: 'connected' });
    return;
  }
  response.status(503).json({ status: 'not_ready', database: 'disconnected' });
});
