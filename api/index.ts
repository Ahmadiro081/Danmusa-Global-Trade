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
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      res.removeListener('finish', onDone);
      res.removeListener('close', onDone);
      res.removeListener('error', onError);
    };
    const onDone = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    res.once('finish', onDone);
    res.once('close', onDone);
    res.once('error', onError);

    try {
      app(req, res);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
