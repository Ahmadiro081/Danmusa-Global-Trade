import type { RoleSlug } from '../types/domain';

export const STAFF_ROLE_SLUGS: readonly RoleSlug[] = [
  'super_admin',
  'admin',
  'product_manager',
  'order_manager',
  'finance_manager',
  'sourcing_manager',
  'logistics_manager',
  'customer_support',
] as const;

export const ADMIN_MODULE_ALLOWED_ROLES: Record<string, readonly RoleSlug[]> = {
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

export const ROLE_LABELS: Record<RoleSlug, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  product_manager: 'Product Manager',
  order_manager: 'Order Manager',
  finance_manager: 'Finance Manager',
  sourcing_manager: 'Sourcing Manager',
  logistics_manager: 'Logistics Manager',
  customer_support: 'Customer Support',
  registered_customer: 'Registered Customer',
  guest_customer: 'Guest Customer',
};

export function isStaffRole(role: RoleSlug | null | undefined): boolean {
  if (!role) return false;
  return STAFF_ROLE_SLUGS.includes(role);
}

export function canAccessAdminModule(
  role: RoleSlug | null | undefined,
  moduleSlug: string,
  authorizedModules?: readonly string[],
): boolean {
  if (!role || !isStaffRole(role)) return false;
  if (authorizedModules && authorizedModules.length > 0) {
    return authorizedModules.includes(moduleSlug);
  }
  const allowed = ADMIN_MODULE_ALLOWED_ROLES[moduleSlug];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function getAuthorizedModuleSlugs(
  role: RoleSlug | null | undefined,
): string[] {
  if (!role || !isStaffRole(role)) return [];
  return Object.entries(ADMIN_MODULE_ALLOWED_ROLES)
    .filter(([, allowed]) => allowed.includes(role))
    .map(([slug]) => slug);
}

/**
 * Validates an internal redirect path from ?next= to prevent open-redirect
 * attacks or auth-page redirect loops.
 */
export function getSafeNextPath(nextParam: string | null | undefined): string | null {
  if (!nextParam) return null;
  const trimmed = nextParam.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null;
  }
  if (
    trimmed.startsWith('/login') ||
    trimmed.startsWith('/register') ||
    trimmed.startsWith('/forgot-password') ||
    trimmed.startsWith('/reset-password')
  ) {
    return null;
  }
  return trimmed;
}

export interface PostLoginSessionLike {
  role: RoleSlug | null;
  isStaff: boolean;
  isInactiveStaff: boolean;
  authorizedAdminModules?: readonly string[];
}

/**
 * Resolves the authoritative post-login destination based on the server-verified
 * session context and an optional ?next= parameter.
 *
 * - Inactive staff: returns null (login page displays Access Denied; never enters admin)
 * - Active staff: honors authorized /admin* next path, otherwise routes to /admin
 * - Registered customer: honors non-admin next path, otherwise routes to /account
 */
export function resolvePostLoginDestination(
  session: PostLoginSessionLike,
  nextParam?: string | null,
): string | null {
  if (session.isInactiveStaff) {
    return null;
  }

  const safeNext = getSafeNextPath(nextParam);

  if (session.isStaff && session.role) {
    if (safeNext && safeNext.startsWith('/admin')) {
      const pathOnly = safeNext.split('?')[0];
      const segments = pathOnly.split('/').filter(Boolean);
      const moduleSlug = segments.length > 1 ? segments[1] : 'overview';
      if (canAccessAdminModule(session.role, moduleSlug, session.authorizedAdminModules)) {
        return safeNext;
      }
      return '/admin';
    }
    return '/admin';
  }

  if (safeNext && !safeNext.startsWith('/admin')) {
    return safeNext;
  }
  return '/account';
}
