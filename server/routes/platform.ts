import { Router } from 'express';
import { getIntegrationReadiness } from '../config/env.ts';

export const platformRouter = Router();

platformRouter.get('/config/public', (_req, res) => {
  res.json({
    brandName: 'Danmusa Global Trade',
    abbreviation: 'DGT',
    tagline: 'Your Trusted China-to-Nigeria Trade Partner.',
    primaryCurrency: 'NGN',
    supportedCurrencies: ['NGN', 'CNY', 'USD'],
    paymentStrategy: 'bank_transfer_only',
    onlineGatewayStatus: 'postponed',
    integrations: getIntegrationReadiness(),
  });
});
