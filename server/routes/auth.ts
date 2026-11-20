import { Router } from 'express';
import {
  defaultAuthResolver,
  STAFF_ROLE_SLUGS,
  type AuthResolver,
  type DgtRoleSlug,
} from '../middleware/security.ts';

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

/**
 * Unified session introspection endpoint for both registered customers and staff.
 * Verifies the Supabase JWT server-side and returns the authoritative database
 * profile, RBAC role, active staff status, and permitted admin modules.
 */
export function createAuthRouter(
  authResolver: AuthResolver = defaultAuthResolver,
): Router {
  const router = Router();

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

  return router;
}
