import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDgtApiApp } from '../server/app.ts';

// Initialize Express once per Vercel serverless cold start.
// Does not bind a TCP listener or import Vite development middleware.
const app = createDgtApiApp();

/**
 * Vercel Node.js Serverless Function entry point.
 * Forwards incoming HTTP requests to the shared Express application and
 * resolves when the response stream finishes or closes.
 */
export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      res.removeListener('finish', done);
      res.removeListener('close', done);
      resolve();
    };

    res.once('finish', done);
    res.once('close', done);

    app(req, res);
  });
}
