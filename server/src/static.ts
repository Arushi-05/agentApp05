import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolves to <repo>/client/dist from both server/src (dev/tests) and server/dist (prod).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

// Call after the API routes are registered so /api/* is matched first.
export function mountStatic(app: Express): void {
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
