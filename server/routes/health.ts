import { Router } from 'express';
import { getIntegrationReadiness } from '../config/env.ts';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const integrations = getIntegrationReadiness();
  res.json({
    service: 'Danmusa Global Trade (DGT) Platform API',
    stage: 'stage-2-security-and-backend',
    status: 'operational',
    paymentStrategy: 'bank_transfer_only',
    timestamp: new Date().toISOString(),
    integrations,
  });
});
