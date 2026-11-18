import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDgtApiApp } from './server/app.ts';
import { serverEnv } from './server/config/env.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  const app = createDgtApiApp();

  if (serverEnv.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(serverEnv.port, '0.0.0.0', () => {
    console.log(
      `[DGT Server] Listening on http://0.0.0.0:${serverEnv.port} (${serverEnv.nodeEnv})`,
    );
  });
}

startServer().catch((err) => {
  console.error('[DGT Server] Fatal startup error:', err);
  process.exit(1);
});
