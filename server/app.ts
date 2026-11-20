import express, { type Express } from 'express';
import {
  apiErrorHandler,
  applySecurityHeaders,
  defaultAuthResolver,
  type AuthResolver,
} from './middleware/security.ts';
import { createAdminRouter } from './routes/admin.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createCatalogueRouter } from './routes/catalogue.ts';
import { createCustomerRouter } from './routes/customer.ts';
import { healthRouter } from './routes/health.ts';
import { platformRouter } from './routes/platform.ts';

export function createDgtApiApp(
  authResolver: AuthResolver = defaultAuthResolver,
): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter(authResolver));
  app.use('/api', platformRouter);
  app.use('/api', createCatalogueRouter(authResolver));
  app.use('/api/customer', createCustomerRouter(authResolver));
  app.use('/api/admin', createAdminRouter(authResolver));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.use(apiErrorHandler);
  return app;
}
