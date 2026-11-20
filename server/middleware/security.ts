import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ZodType } from 'zod';
import { getIntegrationReadiness } from '../config/env.ts';
import { getSupabaseAdmin } from '../services/supabaseAdmin.ts';

export type DgtRoleSlug =
  | 'super_admin'
  | 'admin'
  | 'product_manager'
  | 'order_manager'
  | 'finance_manager'
  | 'sourcing_manager'
  | 'logistics_manager'
  | 'customer_support'
  | 'registered_customer'
  | 'guest_customer';

export const STAFF_ROLE_SLUGS: readonly DgtRoleSlug[] = [
  'super_admin',
  'admin',
  'product_manager',
  'order_manager',
  'finance_manager',
  'sourcing_manager',
  'logistics_manager',
  'customer_support',
] as const;

export interface VerifiedUserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  accountType: string;
  defaultStateId: string | null;
}

export interface VerifiedStaffAccount {
  id: string;
  department: string | null;
  isActive: boolean;
  roleSlug: DgtRoleSlug | null;
  roleName: string | null;
}

export interface VerifiedAuthContext {
  user: Pick<User, 'id' | 'email'>;
  role: DgtRoleSlug;
  staffAccountId: string | null;
  profile?: VerifiedUserProfile;
  staffAccount?: VerifiedStaffAccount | null;
  isInactiveStaff?: boolean;
}

export interface AuthResolver {
  resolveSession: (token: string) => Promise<
    | { ok: true; context: VerifiedAuthContext }
    | { ok: false; status: 401 | 403 | 500 | 503; code: string; error: string }
  >;
  getAdminClient: () => SupabaseClient | null;
}

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|api_?key|authorization|cookie|service_role/i;

export function sanitizeAuditSnapshot(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      clean[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = sanitizeAuditSnapshot(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export function createSupabaseAuthResolver(
  getClient: () => SupabaseClient | null,
): AuthResolver {
  return {
    getAdminClient: getClient,
    async resolveSession(token: string) {
      const supabaseAdmin = getClient();

      if (!supabaseAdmin) {
        return {
          ok: false,
          status: 503,
          code: 'SUPABASE_NOT_CONFIGURED',
          error:
            'Protected administrative and customer endpoints fail closed until Supabase Auth and PostgreSQL credentials are configured.',
        };
      }

      const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(token);

      if (userError || !userData.user) {
        return {
          ok: false,
          status: 401,
          code: 'INVALID_SESSION',
          error: 'Invalid or expired session token',
        };
      }

      const { data: profileRow, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email, phone, account_type, default_state_id')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) {
        const classified = classifySupabaseError(
          profileError,
          'Authorization profile check failed',
        );
        return {
          ok: false,
          status: classified.status,
          code: classified.code,
          error: classified.error,
        };
      }

      const { data: staffRow, error: staffError } = await supabaseAdmin
        .from('staff_accounts')
        .select('id, department, is_active, roles(slug, name)')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (staffError) {
        const classified = classifySupabaseError(
          staffError,
          'Authorization check failed',
        );
        return {
          ok: false,
          status: classified.status,
          code: classified.code,
          error: classified.error,
        };
      }

      const roleRelation = staffRow?.roles as unknown as {
        slug?: DgtRoleSlug;
        name?: string;
      } | null;

      // Active staff requires BOTH staff_accounts.is_active === true AND profile.account_type === 'staff'.
      const isVerifiedActiveStaff =
        Boolean(staffRow?.is_active) &&
        profileRow?.account_type === 'staff' &&
        Boolean(roleRelation?.slug) &&
        STAFF_ROLE_SLUGS.includes(roleRelation!.slug!);

      const isInactiveStaff =
        profileRow?.account_type === 'staff' && !isVerifiedActiveStaff;

      const resolvedRole: DgtRoleSlug = isVerifiedActiveStaff
        ? roleRelation!.slug!
        : 'registered_customer';

      const profile: VerifiedUserProfile = {
        id: userData.user.id,
        fullName:
          (profileRow as { full_name?: string | null } | null)?.full_name ?? null,
        email:
          (profileRow as { email?: string | null } | null)?.email ??
          userData.user.email ??
          null,
        phone: (profileRow as { phone?: string | null } | null)?.phone ?? null,
        accountType: profileRow?.account_type ?? 'registered_customer',
        defaultStateId:
          (profileRow as { default_state_id?: string | null } | null)
            ?.default_state_id ?? null,
      };

      const staffAccount: VerifiedStaffAccount | null = staffRow
        ? {
            id: staffRow.id,
            department:
              (staffRow as { department?: string | null }).department ?? null,
            isActive: Boolean(staffRow.is_active),
            roleSlug: roleRelation?.slug ?? null,
            roleName: roleRelation?.name ?? null,
          }
        : null;

      return {
        ok: true,
        context: {
          user: { id: userData.user.id, email: userData.user.email },
          role: resolvedRole,
          staffAccountId: isVerifiedActiveStaff ? (staffRow?.id ?? null) : null,
          profile,
          staffAccount,
          isInactiveStaff,
        },
      };
    },
  };
}

export const defaultAuthResolver: AuthResolver = createSupabaseAuthResolver(() => {
  const readiness = getIntegrationReadiness();
  return readiness.supabaseAdmin ? getSupabaseAdmin() : null;
});

export function applySecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.startsWith('/api')) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'no-store');
  }
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

/**
 * Fail-closed authentication & RBAC guard for protected endpoints.
 * Never trusts client-supplied role headers or bypasses unconfigured Supabase Auth.
 */
export function requireVerifiedRole(
  allowedRoles: readonly DgtRoleSlug[],
  authResolver: AuthResolver = defaultAuthResolver,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // If Supabase itself is unconfigured, still report 503 when no token or unconfigured backend
      if (!authResolver.getAdminClient()) {
        res.status(503).json({
          error: 'Authentication service not yet configured',
          code: 'SUPABASE_NOT_CONFIGURED',
          message:
            'Protected administrative and customer endpoints fail closed until Supabase Auth and PostgreSQL credentials are configured.',
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

    const result = await authResolver.resolveSession(token);
    if (!result.ok) {
      res.status(result.status).json({
        error: result.error,
        code: result.code,
      });
      return;
    }

    if (!allowedRoles.includes(result.context.role)) {
      res.status(403).json({
        error: 'Forbidden: insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }

    res.locals.authUser = result.context.user;
    res.locals.authRole = result.context.role;
    res.locals.staffAccountId = result.context.staffAccountId;
    next();
  };
}

export function requireDatabaseClient(
  authResolver: AuthResolver = defaultAuthResolver,
) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const client = authResolver.getAdminClient();
    if (!client) {
      res.status(503).json({
        error: 'Database service not yet configured',
        code: 'SUPABASE_NOT_CONFIGURED',
      });
      return;
    }
    res.locals.supabaseAdmin = client;
    next();
  };
}

export function classifySupabaseError(
  err: { code?: string; message?: string } | null | undefined,
  fallbackMessage: string,
): { status: 500 | 503; code: string; error: string } {
  const code = err?.code ?? '';
  const message = err?.message ?? '';

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    /schema cache|does not exist/i.test(message)
  ) {
    return {
      status: 503,
      code: 'DATABASE_NOT_INITIALIZED',
      error:
        'Database schema is not initialized yet. Apply the Supabase SQL migrations first.',
    };
  }

  if (
    /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|Invalid API key/i.test(
      message,
    )
  ) {
    return {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      error: 'Database service is unavailable or unreachable.',
    };
  }

  return {
    status: 500,
    code: 'DATABASE_QUERY_ERROR',
    error: fallbackMessage,
  };
}

export function sendDatabaseError(
  res: Response,
  err: { code?: string; message?: string } | null | undefined,
  fallbackMessage: string,
): void {
  const classified = classifySupabaseError(err, fallbackMessage);
  res.status(classified.status).json({
    error: classified.error,
    code: classified.code,
  });
}

export function apiErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[DGT API Error]', err.message);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
