import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDgtApiApp } from './app.ts';

// Initialize the Express API once per serverless container cold start.
// Does NOT call app.listen() and does NOT import Vite dev middleware.
const app = createDgtApiApp();

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  app(req, res);
}
