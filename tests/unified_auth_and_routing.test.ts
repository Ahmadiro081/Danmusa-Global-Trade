import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createDgtApiApp } from '../server/app.ts';
import {
  createSupabaseAuthResolver,
  type DgtRoleSlug,
} from '../server/middleware/security.ts';
import {
  canAccessAdminModule,
  getAuthorizedModuleSlugs,
  getSafeNextPath,
  resolvePostLoginDestination,
} from '../src/utils/authRouting.ts';

async function requestApp(
  app: ReturnType<typeof createDgtApiApp>,
  method: string,
  urlPath: string,
  token?: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}${urlPath}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await res.text();
    return {
      status: res.status,
      json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

function createScenarioSupabaseClient() {
  const users: Record<
    string,
    {
      id: string;
      email: string;
      fullName: string;
      accountType: string;
      staff: {
        id: string;
        department: string;
        isActive: boolean;
        roleSlug: DgtRoleSlug;
        roleName: string;
      } | null;
    }
  > = {
    'tok-super-admin': {
      id: 'd45df9fd-d9fe-4e20-83d7-450ca2490b06',
      email: 'ahmadcybro@gmail.com',
      fullName: 'Ahmad Ibrahim',
      accountType: 'staff',
      staff: {
        id: 'staff-super-01',
        department: 'Administration',
        isActive: true,
        roleSlug: 'super_admin',
        roleName: 'Super Administrator',
      },
    },
    'tok-product-mgr': {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'pm@dgt.local',
      fullName: 'Amina Bello',
      accountType: 'staff',
      staff: {
        id: 'staff-pm-02',
        department: 'Catalogue',
        isActive: true,
        roleSlug: 'product_manager',
        roleName: 'Product Manager',
      },
    },
    'tok-inactive-staff': {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'former.staff@dgt.local',
      fullName: 'Former Staff',
      accountType: 'staff',
      staff: {
        id: 'staff-inactive-03',
        department: 'Finance',
        isActive: false,
        roleSlug: 'finance_manager',
        roleName: 'Finance Manager',
      },
    },
    'tok-customer': {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'buyer@example.com',
      fullName: 'Musa Danjuma',
      accountType: 'registered_customer',
      staff: null,
    },
  };

  const client = {
    auth: {
      getUser: async (token: string) => {
        const u = users[token];
        if (!u) {
          return { data: { user: null }, error: { message: 'Invalid JWT' } };
        }
        return { data: { user: { id: u.id, email: u.email } }, error: null };
      },
    },
    from: (table: string) => {
      let targetUserId = '';
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (_col: string, val: unknown) => {
          targetUserId = String(val);
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          const entry = Object.values(users).find((u) => u.id === targetUserId);
          if (!entry) return { data: null, error: null };
          if (table === 'user_profiles') {
            return {
              data: {
                id: entry.id,
                full_name: entry.fullName,
                email: entry.email,
                phone: '+2348000000000',
                account_type: entry.accountType,
                default_state_id: null,
              },
              error: null,
            };
          }
          if (table === 'staff_accounts') {
            if (!entry.staff) return { data: null, error: null };
            return {
              data: {
                id: entry.staff.id,
                department: entry.staff.department,
                is_active: entry.staff.isActive,
                roles: {
                  slug: entry.staff.roleSlug,
                  name: entry.staff.roleName,
                },
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then: (resolve: (val: { data: unknown[]; error: null }) => void) =>
          resolve({ data: [], error: null }),
      };
      return builder;
    },
  };

  return client as never;
}

test('GET /api/auth/session fails closed when unconfigured, missing token, or invalid token', async () => {
  const unconfiguredApp = createDgtApiApp();
  const res503 = await requestApp(unconfiguredApp, 'GET', '/api/auth/session');
  assert.equal(res503.status, 503);
  assert.equal(res503.json.code, 'SUPABASE_NOT_CONFIGURED');

  const resolver = createSupabaseAuthResolver(() => createScenarioSupabaseClient());
  const app = createDgtApiApp(resolver);

  const missingToken = await requestApp(app, 'GET', '/api/auth/session');
  assert.equal(missingToken.status, 401);
  assert.equal(missingToken.json.code, 'MISSING_BEARER_TOKEN');

  const badToken = await requestApp(app, 'GET', '/api/auth/session', 'bad-jwt');
  assert.equal(badToken.status, 401);
  assert.equal(badToken.json.code, 'INVALID_SESSION');
});

test('GET /api/auth/session resolves super_admin, product_manager, registered_customer, and inactive staff authoritatively', async () => {
  const resolver = createSupabaseAuthResolver(() => createScenarioSupabaseClient());
  const app = createDgtApiApp(resolver);

  // 1. Super Admin
  const superRes = await requestApp(app, 'GET', '/api/auth/session', 'tok-super-admin');
  assert.equal(superRes.status, 200);
  assert.equal(superRes.json.role, 'super_admin');
  assert.equal(superRes.json.isStaff, true);
  assert.equal(superRes.json.isInactiveStaff, false);
  assert.equal((superRes.json.authorizedAdminModules as string[]).length, 16);
  assert.equal(
    (superRes.json.profile as Record<string, unknown>).fullName,
    'Ahmad Ibrahim',
  );

  // 2. Product Manager (restricted module set)
  const pmRes = await requestApp(app, 'GET', '/api/auth/session', 'tok-product-mgr');
  assert.equal(pmRes.status, 200);
  assert.equal(pmRes.json.role, 'product_manager');
  assert.equal(pmRes.json.isStaff, true);
  assert.deepEqual(pmRes.json.authorizedAdminModules, [
    'overview',
    'products',
    'categories',
    'inventory',
  ]);

  // 3. Registered Customer
  const custRes = await requestApp(app, 'GET', '/api/auth/session', 'tok-customer');
  assert.equal(custRes.status, 200);
  assert.equal(custRes.json.role, 'registered_customer');
  assert.equal(custRes.json.isStaff, false);
  assert.equal(custRes.json.isInactiveStaff, false);
  assert.deepEqual(custRes.json.authorizedAdminModules, []);

  // 4. Inactive Staff (blocked from admin privileges & flagged isInactiveStaff: true)
  const inactiveRes = await requestApp(
    app,
    'GET',
    '/api/auth/session',
    'tok-inactive-staff',
  );
  assert.equal(inactiveRes.status, 200);
  assert.equal(inactiveRes.json.isStaff, false);
  assert.equal(inactiveRes.json.isInactiveStaff, true);
  assert.equal(inactiveRes.json.role, 'registered_customer');
  assert.deepEqual(inactiveRes.json.authorizedAdminModules, []);

  // Inactive staff calling admin API must receive 403 Forbidden
  const inactiveAdminRes = await requestApp(
    app,
    'GET',
    '/api/admin/foundation-status',
    'tok-inactive-staff',
  );
  assert.equal(inactiveAdminRes.status, 403);
});

test('Admin API endpoints enforce 401 unauthenticated, 403 customer/wrong-role, and 200 authorized staff', async () => {
  const resolver = createSupabaseAuthResolver(() => createScenarioSupabaseClient());
  const app = createDgtApiApp(resolver);

  // Unauthenticated -> 401
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/foundation-status')).status,
    401,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/settings')).status,
    401,
  );

  // Registered Customer -> 403
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/foundation-status', 'tok-customer'))
      .status,
    403,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/procurement', 'tok-customer')).status,
    403,
  );

  // Product Manager -> 200 on products, 403 on settings/staff/deliveries
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/products', 'tok-product-mgr')).status,
    200,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/settings', 'tok-product-mgr')).status,
    403,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/staff', 'tok-product-mgr')).status,
    403,
  );

  // Super Admin -> 200 across all protected endpoints
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/foundation-status', 'tok-super-admin'))
      .status,
    200,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/procurement', 'tok-super-admin'))
      .status,
    200,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/deliveries/states', 'tok-super-admin'))
      .status,
    200,
  );
  assert.equal(
    (await requestApp(app, 'GET', '/api/admin/settings', 'tok-super-admin')).status,
    200,
  );
});

test('Role-aware routing, safe redirect sanitization, and sidebar module filtering work for all user types', () => {
  // Open redirect & auth loop rejection
  assert.equal(getSafeNextPath('https://evil.example/phish'), null);
  assert.equal(getSafeNextPath('//evil.example/phish'), null);
  assert.equal(getSafeNextPath('/login?next=/admin'), null);
  assert.equal(getSafeNextPath('/register'), null);
  assert.equal(getSafeNextPath('/admin/orders'), '/admin/orders');

  // Customer redirects to /account and never to /admin
  assert.equal(
    resolvePostLoginDestination({
      role: 'registered_customer',
      isStaff: false,
      isInactiveStaff: false,
    }),
    '/account',
  );
  assert.equal(
    resolvePostLoginDestination(
      {
        role: 'registered_customer',
        isStaff: false,
        isInactiveStaff: false,
      },
      '/admin/orders',
    ),
    '/account',
  );
  assert.equal(
    resolvePostLoginDestination(
      {
        role: 'registered_customer',
        isStaff: false,
        isInactiveStaff: false,
      },
      '/account/orders',
    ),
    '/account/orders',
  );

  // Super Admin redirects to /admin or authorized ?next=
  assert.equal(
    resolvePostLoginDestination({
      role: 'super_admin',
      isStaff: true,
      isInactiveStaff: false,
    }),
    '/admin',
  );
  assert.equal(
    resolvePostLoginDestination(
      {
        role: 'super_admin',
        isStaff: true,
        isInactiveStaff: false,
      },
      '/admin/staff',
    ),
    '/admin/staff',
  );
  assert.equal(getAuthorizedModuleSlugs('super_admin').length, 16);

  // Product Manager limited strictly to overview, products, categories, inventory
  assert.equal(canAccessAdminModule('product_manager', 'products'), true);
  assert.equal(canAccessAdminModule('product_manager', 'payments'), false);
  assert.equal(
    resolvePostLoginDestination(
      {
        role: 'product_manager',
        isStaff: true,
        isInactiveStaff: false,
      },
      '/admin/products',
    ),
    '/admin/products',
  );
  assert.equal(
    resolvePostLoginDestination(
      {
        role: 'product_manager',
        isStaff: true,
        isInactiveStaff: false,
      },
      '/admin/payments',
    ),
    '/admin',
  );
  assert.deepEqual(getAuthorizedModuleSlugs('product_manager'), [
    'overview',
    'products',
    'categories',
    'inventory',
  ]);

  // Inactive Staff denied portal redirect
  assert.equal(
    resolvePostLoginDestination(
      {
        role: 'registered_customer',
        isStaff: false,
        isInactiveStaff: true,
      },
      '/admin',
    ),
    null,
  );
});
