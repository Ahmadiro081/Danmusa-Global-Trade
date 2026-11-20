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

function createSlidingWindowLimiter(
  windowMs = RESET_RATE_WINDOW_MS,
  maxAttempts = RESET_RATE_MAX_ATTEMPTS,
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
      recent.push(now);
      buckets.set(key, recent);
      return false;
    },
  };
}

function resolveTrustedOrigin(req: Request): string {
  const forwardedProto = req
    .header('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.header('host')?.trim();

  if (host) {
    const protocol =
      forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    try {
      const parsed = new URL(`${protocol}://${host}`);
      return parsed.origin;
    } catch {
      // Fall through to APP_URL
    }
  }

  try {
    return new URL(serverEnv.appUrl).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function buildSafeResetRedirectUrl(
  req: Request,
  requestedRedirect?: string,
): string {
  const trustedOrigin = resolveTrustedOrigin(req);
  const configuredOrigins = new Set<string>([trustedOrigin]);

  try {
    configuredOrigins.add(new URL(serverEnv.appUrl).origin);
  } catch {
    // Ignore malformed APP_URL
  }

  if (requestedRedirect) {
    try {
      const parsed = new URL(requestedRedirect);
      const isHttp = parsed.protocol === 'https:' || parsed.protocol === 'http:';
      if (
        isHttp &&
        configuredOrigins.has(parsed.origin) &&
        (parsed.pathname === '/reset-password' ||
          parsed.pathname === '/login')
      ) {
        return `${parsed.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Fall back to default trusted reset-password path
    }
  }

  return `${trustedOrigin}/reset-password`;
}

function isUserNotFoundError(err: { message?: string; status?: number; code?: string } | null): boolean {
  if (!err) return false;
  if (err.status === 404) return true;
  if (err.code === 'user_not_found') return true;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('user not found') || msg.includes('not found');
}

/**
 * Unified session introspection and password-recovery router for both
 * registered customers and DGT staff administrators.
 */
export function createAuthRouter(
  authResolver: AuthResolver = defaultAuthResolver,
  emailService: EmailService = defaultEmailService,
): Router {
  const router = Router();
  const resetLimiter = createSlidingWindowLimiter();

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
   * branded Danmusa Global Trade email through Resend. Works identically for
   * both registered customers and staff administrators without leaking whether
   * an email address exists in the database.
   */
  router.post('/password-reset', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    const parsed = passwordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid password reset request.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const clientIp = req.ip || 'unknown';
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

    const safeRedirectUrl = buildSafeResetRedirectUrl(req, parsed.data.redirectTo);

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: safeRedirectUrl,
      },
    });

    if (error) {
      if (isUserNotFoundError(error)) {
        // Prevent account enumeration: respond identically to valid emails.
        res.status(200).json({
          ok: true,
          provider: 'resend',
          message: NEUTRAL_RESET_SUCCESS_MESSAGE,
        });
        return;
      }

      res.status(500).json({
        error: 'Unable to generate a password recovery link right now. Please try again.',
        code: 'RECOVERY_LINK_ERROR',
      });
      return;
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      res.status(500).json({
        error: 'Recovery link could not be generated. Please try again.',
        code: 'RECOVERY_LINK_MISSING',
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
      res.status(delivery.status).json({
        error: delivery.error,
        code: delivery.code,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      provider: 'resend',
      message: NEUTRAL_RESET_SUCCESS_MESSAGE,
    });
  });

  return router;
}
