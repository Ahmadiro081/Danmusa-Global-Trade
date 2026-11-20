import { Router, type Request } from 'express';
import { z } from 'zod';
import { serverEnv } from '../config/env.ts';
import {
  defaultAuthResolver,
  STAFF_ROLE_SLUGS,
  type AuthResolver,
  type DgtRoleSlug,
} from '../middleware/security.ts';
import {
  defaultEmailService,
  type EmailService,
} from '../services/emailService.ts';

/**
 * Authoritative server-side mapping between admin module slugs and permitted
 * staff RBAC roles. Mirrors the Express route guards in server/routes/admin.ts.
 */
export const ADMIN_MODULE_ROLE_MATRIX: Record<string, readonly DgtRoleSlug[]> = {
  overview: STAFF_ROLE_SLUGS,
  products: ['super_admin', 'admin', 'product_manager'],
  categories: ['super_admin', 'admin', 'product_manager'],
  inventory: ['super_admin', 'admin', 'product_manager', 'logistics_manager'],
  customers: ['super_admin', 'admin', 'order_manager', 'customer_support'],
  orders: ['super_admin', 'admin', 'order_manager', 'customer_support'],
  quotations: ['super_admin', 'admin', 'sourcing_manager', 'finance_manager'],
  sourcing: ['super_admin', 'admin', 'sourcing_manager'],
  payments: ['super_admin', 'admin', 'finance_manager'],
  procurement: ['super_admin', 'admin', 'sourcing_manager', 'finance_manager'],
  shipments: ['super_admin', 'admin', 'logistics_manager'],
  deliveries: ['super_admin', 'admin', 'logistics_manager'],
  staff: ['super_admin'],
  reports: ['super_admin', 'admin', 'finance_manager'],
  'audit-logs': ['super_admin', 'admin'],
  settings: ['super_admin', 'finance_manager'],
};

export function getAuthorizedAdminModulesForRole(role: DgtRoleSlug): string[] {
  if (!STAFF_ROLE_SLUGS.includes(role)) {
    return [];
  }
  return Object.entries(ADMIN_MODULE_ROLE_MATRIX)
    .filter(([, allowedRoles]) => allowedRoles.includes(role))
    .map(([slug]) => slug);
}

const passwordResetRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.')
      .max(320, 'Email address is too long.'),
    redirectTo: z.string().trim().max(500).optional(),
  })
  .strict();

const NEUTRAL_RESET_SUCCESS_MESSAGE =
  'If an account exists for that email address, a secure password reset link has been sent. Check your inbox and spam folder.';

const RESET_RATE_WINDOW_MS = 15 * 60 * 1000;
const RESET_RATE_MAX_ATTEMPTS = 5;
const MAX_RATE_BUCKETS = 10_000;
const DEFAULT_PRODUCTION_ORIGIN = 'https://danmusa-global-trade.vercel.app';
const DEFAULT_MIN_RESPONSE_MS = 220;

export interface AuthRouterOptions {
  /**
   * Minimum response duration (ms) for password-reset requests to narrow timing
   * differences between registered and unregistered accounts.
   */
  minResetResponseMs?: number;
  /**
   * Server-side logger for internal delivery diagnostics (never sent to clients).
   */
  logger?: (event: string, metadata: Record<string, unknown>) => void;
}

function createSlidingWindowLimiter(
  windowMs = RESET_RATE_WINDOW_MS,
  maxAttempts = RESET_RATE_MAX_ATTEMPTS,
  maxBuckets = MAX_RATE_BUCKETS,
) {
  const buckets = new Map<string, number[]>();

  return {
    isLimited(key: string, now = Date.now()): boolean {
      const existing = buckets.get(key) ?? [];
      const recent = existing.filter((ts) => now - ts < windowMs);
      if (recent.length >= maxAttempts) {
        buckets.set(key, recent);
        return true;
      }
      if (!buckets.has(key) && buckets.size >= maxBuckets) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) {
          buckets.delete(oldestKey);
        }
      }
      recent.push(now);
      buckets.set(key, recent);
      return false;
    },
  };
}

function parseValidHttpOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme =
    /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Builds the strict trusted-origin allowlist exclusively from server-controlled
 * configuration (APP_URL, ALLOWED_REDIRECT_ORIGINS, Vercel deployment URLs).
 * Never derives trust from untrusted request headers such as X-Forwarded-Host.
 */
export function getTrustedResetOrigins(): {
  canonicalOrigin: string;
  allowedOrigins: Set<string>;
  allowLocalDevOrigin: boolean;
} {
  const nodeEnv = (process.env.NODE_ENV ?? serverEnv.nodeEnv).trim();
  const isProduction = nodeEnv === 'production';
  const allowedOrigins = new Set<string>();

  const configuredAppUrl = (process.env.APP_URL ?? serverEnv.appUrl).trim();
  const appOrigin = parseValidHttpOrigin(configuredAppUrl);

  const prodVercelOrigin = parseValidHttpOrigin(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? serverEnv.vercelProductionUrl,
  );
  const deployVercelOrigin = parseValidHttpOrigin(
    process.env.VERCEL_URL ?? serverEnv.vercelUrl,
  );

  // In production, ignore localhost APP_URL defaults and prefer explicit production origins.
  const isLocalhostOrigin = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  if (appOrigin && (!isProduction || !isLocalhostOrigin(appOrigin))) {
    allowedOrigins.add(appOrigin);
  }
  if (prodVercelOrigin) {
    allowedOrigins.add(prodVercelOrigin);
  }
  if (deployVercelOrigin) {
    allowedOrigins.add(deployVercelOrigin);
  }

  const extraRaw = (
    process.env.ALLOWED_REDIRECT_ORIGINS ?? serverEnv.allowedRedirectOrigins
  ).trim();
  if (extraRaw) {
    for (const part of extraRaw.split(',')) {
      const origin = parseValidHttpOrigin(part);
      if (origin && (!isProduction || !isLocalhostOrigin(origin))) {
        allowedOrigins.add(origin);
      }
    }
  }

  // Always trust the canonical DGT production origin.
  allowedOrigins.add(DEFAULT_PRODUCTION_ORIGIN);

  let canonicalOrigin: string;
  if (isProduction) {
    canonicalOrigin =
      (appOrigin && !isLocalhostOrigin(appOrigin) ? appOrigin : null) ??
      prodVercelOrigin ??
      deployVercelOrigin ??
      DEFAULT_PRODUCTION_ORIGIN;
  } else {
    canonicalOrigin = appOrigin ?? 'http://localhost:3000';
    allowedOrigins.add(canonicalOrigin);
  }

  return {
    canonicalOrigin,
    allowedOrigins,
    allowLocalDevOrigin: !isProduction,
  };
}

/**
 * Strictly validates an optional client-supplied redirectTo URL.
 * - Rejects arbitrary external origins, spoofed hosts, non-HTTP schemes,
 *   embedded credentials, unexpected paths, query strings, or hash fragments.
 * - Resolves to `${canonicalOrigin}/reset-password` when omitted.
 */
export function resolveStrictResetRedirectUrl(
  requestedRedirect?: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const { canonicalOrigin, allowedOrigins, allowLocalDevOrigin } =
    getTrustedResetOrigins();

  if (!requestedRedirect) {
    return { ok: true, url: `${canonicalOrigin}/reset-password` };
  }

  let parsed: URL;
  try {
    parsed = new URL(requestedRedirect);
  } catch {
    return { ok: false, error: 'Invalid password reset redirect URL.' };
  }

  const isHttp = parsed.protocol === 'https:' || parsed.protocol === 'http:';
  if (!isHttp || parsed.username || parsed.password) {
    return { ok: false, error: 'Invalid password reset redirect URL.' };
  }

  if (parsed.pathname !== '/reset-password' || parsed.search || parsed.hash) {
    return {
      ok: false,
      error: 'Password reset redirect must target the /reset-password route.',
    };
  }

  const isAllowedLocal =
    allowLocalDevOrigin &&
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');

  if (!allowedOrigins.has(parsed.origin) && !isAllowedLocal) {
    return {
      ok: false,
      error: 'Untrusted password reset redirect origin.',
    };
  }

  return { ok: true, url: `${parsed.origin}/reset-password` };
}

function getClientIp(req: Request): string {
  const vercelForwarded = req
    .header('x-vercel-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  if (vercelForwarded) return vercelForwarded;
  return req.ip || 'unknown';
}

function isUserNotFoundError(
  err: { message?: string; status?: number; code?: string } | null,
): boolean {
  if (!err) return false;
  if (err.status === 404) return true;
  if (err.code === 'user_not_found') return true;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('user not found') || msg.includes('not found');
}

async function enforceMinimumResponseFloor(
  startedAtMs: number,
  minDurationMs: number,
): Promise<void> {
  if (minDurationMs <= 0) return;
  const elapsed = Date.now() - startedAtMs;
  const remaining = minDurationMs - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

/**
 * Unified session introspection and password-recovery router for both
 * registered customers and DGT staff administrators.
 */
export function createAuthRouter(
  authResolver: AuthResolver = defaultAuthResolver,
  emailService: EmailService = defaultEmailService,
  options: AuthRouterOptions = {},
): Router {
  const router = Router();
  const resetLimiter = createSlidingWindowLimiter();
  const minResetResponseMs =
    options.minResetResponseMs ??
    (process.env.NODE_ENV === 'test' ? 0 : DEFAULT_MIN_RESPONSE_MS);
  const logServerEvent =
    options.logger ??
    ((event: string, metadata: Record<string, unknown>) => {
      console.error(`[DGT Auth] ${event}`, JSON.stringify(metadata));
    });

  router.get('/session', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (!authResolver.getAdminClient()) {
        res.status(503).json({
          error: 'Authentication service not yet configured',
          code: 'SUPABASE_NOT_CONFIGURED',
          message:
            'Protected authentication endpoints fail closed until Supabase Auth and PostgreSQL credentials are configured.',
        });
        return;
      }
      res.status(401).json({
        error: 'Unauthorized',
        code: 'MISSING_BEARER_TOKEN',
      });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'EMPTY_BEARER_TOKEN',
      });
      return;
    }

    const resolved = await authResolver.resolveSession(token);
    if (!resolved.ok) {
      res.status(resolved.status).json({
        error: resolved.error,
        code: resolved.code,
      });
      return;
    }

    const { context } = resolved;
    const isStaff =
      STAFF_ROLE_SLUGS.includes(context.role) &&
      Boolean(context.staffAccountId) &&
      !context.isInactiveStaff;

    const isInactiveStaff = Boolean(context.isInactiveStaff);

    const profile = context.profile ?? {
      id: context.user.id,
      fullName: null,
      email: context.user.email ?? null,
      phone: null,
      accountType: isStaff || isInactiveStaff ? 'staff' : 'registered_customer',
      defaultStateId: null,
    };

    const staffAccount =
      context.staffAccount !== undefined
        ? context.staffAccount
        : isStaff && context.staffAccountId
          ? {
              id: context.staffAccountId,
              department: null,
              isActive: true,
              roleSlug: context.role,
              roleName: null,
            }
          : null;

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      authenticated: true,
      user: {
        id: context.user.id,
        email: context.user.email ?? null,
      },
      profile,
      role: context.role,
      isStaff,
      isInactiveStaff,
      staffAccount,
      authorizedAdminModules: isStaff
        ? getAuthorizedAdminModulesForRole(context.role)
        : [],
    });
  });

  /**
   * Generates a genuine Supabase Auth recovery link server-side and delivers a
   * branded Danmusa Global Trade email through Resend.
   *
   * Security invariants:
   * - Strict trusted-origin validation (never trusts X-Forwarded-Host).
   * - Indistinguishable HTTP 200 responses for registered, unregistered, and
   *   post-lookup delivery failures to prevent account enumeration.
   * - Detailed delivery diagnostics logged exclusively server-side without
   *   ever logging recovery links, tokens, or API keys.
   */
  router.post('/password-reset', async (req, res) => {
    const startedAtMs = Date.now();
    res.setHeader('Cache-Control', 'no-store');

    const parsed = passwordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid password reset request.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const redirectResolution = resolveStrictResetRedirectUrl(
      parsed.data.redirectTo,
    );
    if (!redirectResolution.ok) {
      res.status(400).json({
        error: redirectResolution.error,
        code: 'INVALID_REDIRECT_URL',
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const clientIp = getClientIp(req);
    if (
      resetLimiter.isLimited(`ip:${clientIp}`) ||
      resetLimiter.isLimited(`email:${email}`)
    ) {
      res.status(429).json({
        error:
          'Too many password reset requests. Please wait 15 minutes before trying again.',
        code: 'RATE_LIMITED',
      });
      return;
    }

    const adminClient = authResolver.getAdminClient();
    if (!adminClient) {
      res.status(503).json({
        error: 'Authentication service is not configured on the server.',
        code: 'SUPABASE_NOT_CONFIGURED',
      });
      return;
    }

    if (!emailService.isConfigured()) {
      res.status(503).json({
        error: 'Resend email delivery is not configured on the server.',
        code: 'RESEND_NOT_CONFIGURED',
      });
      return;
    }

    try {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: redirectResolution.url,
        },
      });

      if (error) {
        if (!isUserNotFoundError(error)) {
          logServerEvent('password_reset_generate_link_failed', {
            code: error.code ?? 'RECOVERY_LINK_ERROR',
            status: error.status ?? 500,
          });
        }
        await enforceMinimumResponseFloor(startedAtMs, minResetResponseMs);
        res.status(200).json({
          ok: true,
          message: NEUTRAL_RESET_SUCCESS_MESSAGE,
        });
        return;
      }

      const actionLink = data?.properties?.action_link;
      if (!actionLink) {
        logServerEvent('password_reset_missing_action_link', {
          code: 'RECOVERY_LINK_MISSING',
        });
        await enforceMinimumResponseFloor(startedAtMs, minResetResponseMs);
        res.status(200).json({
          ok: true,
          message: NEUTRAL_RESET_SUCCESS_MESSAGE,
        });
        return;
      }

      const recipientName =
        typeof data.user?.user_metadata?.full_name === 'string'
          ? data.user.user_metadata.full_name
          : null;

      const delivery = await emailService.sendPasswordResetEmail({
        to: email,
        resetLink: actionLink,
        recipientName,
      });

      if (!delivery.ok) {
        // Log detailed delivery error strictly server-side; never expose token/link or leak account existence to client.
        logServerEvent('password_reset_email_delivery_failed', {
          code: delivery.code,
          status: delivery.status,
          from: emailService.getFromEmail(),
          reason: delivery.error,
        });
      }
    } catch {
      logServerEvent('password_reset_unexpected_error', {
        code: 'UNEXPECTED_ERROR',
      });
    }

    await enforceMinimumResponseFloor(startedAtMs, minResetResponseMs);
    res.status(200).json({
      ok: true,
      message: NEUTRAL_RESET_SUCCESS_MESSAGE,
    });
  });

  return router;
}
