import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { createDgtApiApp } from '../server/app.ts';
import {
  createSupabaseAuthResolver,
  sanitizeAuditSnapshot,
  type AuthResolver,
  type DgtRoleSlug,
} from '../server/middleware/security.ts';

// ---------------------------------------------------------------------------
// Test Helpers: In-memory Express HTTP Runner + Mock Supabase Query Builder
// ---------------------------------------------------------------------------

interface RecordedRpcCall {
  fn: string;
  args: Record<string, unknown>;
}

interface RecordedInsert {
  table: string;
  payload: unknown;
}

interface MockDbResult {
  data: unknown;
  error: { message: string } | null;
  count?: number;
}

function createMockSupabaseClient(options?: {
  onRpc?: (fn: string, args: Record<string, unknown>) => MockDbResult;
  onSelect?: (table: string, filters: Record<string, unknown>) => MockDbResult;
}) {
  const rpcCalls: RecordedRpcCall[] = [];
  const inserts: RecordedInsert[] = [];
  const queries: Array<{ table: string; filters: Record<string, unknown> }> = [];

  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (options?.onRpc) {
        return options.onRpc(fn, args);
      }
      return { data: { ok: true }, error: null };
    },
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: async (objectPath: string, expiresIn: number) => ({
          data: {
            signedUrl: `https://private.supabase.local/signed/${objectPath}?exp=${expiresIn}`,
          },
          error: null,
        }),
      }),
    },
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        insert: (payload: unknown) => {
          inserts.push({ table, payload });
          return {
            select: () => ({
              single: async () => ({
                data: { id: '00000000-0000-4000-8000-000000000999', ...(typeof payload === 'object' && payload ? payload : {}) },
                error: null,
              }),
            }),
            then: (resolve: (val: MockDbResult) => void) =>
              resolve({ data: payload, error: null }),
          };
        },
        update: (payload: unknown) => {
          inserts.push({ table: `${table}:update`, payload });
          return builder;
        },
        upsert: (payload: unknown) => {
          inserts.push({ table: `${table}:upsert`, payload });
          return builder;
        },
        delete: () => builder,
        maybeSingle: async () => {
          queries.push({ table, filters: { ...filters } });
          if (options?.onSelect) {
            return options.onSelect(table, filters);
          }
          return { data: null, error: null };
        },
        single: async () => {
          queries.push({ table, filters: { ...filters } });
          if (options?.onSelect) {
            return options.onSelect(table, filters);
          }
          return { data: { id: '00000000-0000-4000-8000-000000000001' }, error: null };
        },
        then: (resolve: (val: MockDbResult) => void) => {
          queries.push({ table, filters: { ...filters } });
          if (options?.onSelect) {
            resolve(options.onSelect(table, filters));
            return;
          }
          resolve({ data: [], error: null, count: 0 });
        },
      };
      return builder;
    },
  };

  return { client: client as never, rpcCalls, inserts, queries };
}

function createTestAuthResolver(
  tokens: Record<
    string,
    { userId: string; email: string; role: DgtRoleSlug; staffAccountId?: string }
  >,
  mockClient: ReturnType<typeof createMockSupabaseClient>['client'],
): AuthResolver {
  return {
    getAdminClient: () => mockClient,
    async resolveSession(token: string) {
      const entry = tokens[token];
      if (!entry) {
        return {
          ok: false,
          status: 401,
          code: 'INVALID_SESSION',
          error: 'Invalid or expired session token',
        };
      }
      return {
        ok: true,
        context: {
          user: { id: entry.userId, email: entry.email },
          role: entry.role,
          staffAccountId: entry.staffAccountId ?? null,
        },
      };
    },
  };
}

async function requestApp(
  app: ReturnType<typeof createDgtApiApp>,
  method: string,
  urlPath: string,
  options?: { token?: string; body?: unknown },
): Promise<{ status: number; json: Record<string, unknown> }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}${urlPath}`, {
      method,
      headers: {
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
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

const CUSTOMER_A_ID = '11111111-1111-4111-8111-111111111111';
const CUSTOMER_B_ID = '22222222-2222-4222-8222-222222222222';
const ORDER_ID = '33333333-3333-4333-8333-333333333333';
const PAYMENT_ID = '44444444-4444-4444-8444-444444444444';
const QUOTATION_ID = '55555555-5555-4555-8555-555555555555';
const ADDRESS_ID = '66666666-6666-4666-8666-666666666666';

// ---------------------------------------------------------------------------
// 1. Fail-Closed Behaviour When Supabase Is Unconfigured
// ---------------------------------------------------------------------------
test('Unconfigured Supabase fails closed on protected customer, admin, and DB catalogue routes', async () => {
  const unconfiguredApp = createDgtApiApp();

  const adminRes = await requestApp(unconfiguredApp, 'GET', '/api/admin/foundation-status');
  assert.equal(adminRes.status, 503);
  assert.equal(adminRes.json.code, 'SUPABASE_NOT_CONFIGURED');

  const customerRes = await requestApp(unconfiguredApp, 'GET', '/api/customer/orders');
  assert.equal(customerRes.status, 503);
  assert.equal(customerRes.json.code, 'SUPABASE_NOT_CONFIGURED');

  const productsRes = await requestApp(unconfiguredApp, 'GET', '/api/products');
  assert.equal(productsRes.status, 503);
  assert.equal(productsRes.json.code, 'SUPABASE_NOT_CONFIGURED');

  const healthRes = await requestApp(unconfiguredApp, 'GET', '/api/health');
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.json.paymentStrategy, 'bank_transfer_only');
});

// ---------------------------------------------------------------------------
// 2. Customer Record Isolation & Private Payment Evidence Path Enforcement
// ---------------------------------------------------------------------------
test('Customer queries are strictly scoped to authUser.id and cross-customer evidence paths are blocked', async () => {
  const mockDb = createMockSupabaseClient();
  const resolver = createTestAuthResolver(
    {
      'tok-cust-a': {
        userId: CUSTOMER_A_ID,
        email: 'a@example.com',
        role: 'registered_customer',
      },
    },
    mockDb.client,
  );
  const app = createDgtApiApp(resolver);

  // Customer A fetches orders -> query MUST filter customer_id = CUSTOMER_A_ID
  const ordersRes = await requestApp(app, 'GET', '/api/customer/orders', {
    token: 'tok-cust-a',
  });
  assert.equal(ordersRes.status, 200);
  const ordersQuery = mockDb.queries.find((q) => q.table === 'orders');
  assert.equal(ordersQuery?.filters.customer_id, CUSTOMER_A_ID);

  // Customer A attempting to reference Customer B's evidence storage path -> 403 Forbidden
  const crossEvidenceRes = await requestApp(
    app,
    'POST',
    '/api/customer/payments/bank-transfer',
    {
      token: 'tok-cust-a',
      body: {
        orderId: ORDER_ID,
        amountNgn: 150000,
        bankReference: 'NIP-2026-88991',
        senderBankName: 'First Bank',
        senderAccountName: 'Customer A',
        transferDate: '2026-11-18',
        storageObjectPath: `${CUSTOMER_B_ID}/receipt.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: 245000,
        idempotencyKey: 'idem-cust-a-001',
      },
    },
  );
  assert.equal(crossEvidenceRes.status, 403);
  assert.equal(crossEvidenceRes.json.code, 'INVALID_EVIDENCE_PATH');

  // Path traversal attempt -> 403 Forbidden
  const traversalRes = await requestApp(
    app,
    'POST',
    '/api/customer/payments/bank-transfer',
    {
      token: 'tok-cust-a',
      body: {
        orderId: ORDER_ID,
        amountNgn: 150000,
        bankReference: 'NIP-2026-88992',
        senderBankName: 'First Bank',
        senderAccountName: 'Customer A',
        transferDate: '2026-11-18',
        storageObjectPath: `${CUSTOMER_A_ID}/../${CUSTOMER_B_ID}/receipt.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: 245000,
        idempotencyKey: 'idem-cust-a-002',
      },
    },
  );
  assert.equal(traversalRes.status, 403);
});

// ---------------------------------------------------------------------------
// 3. Unauthorized Administrative Access & Role Escalation Prevention
// ---------------------------------------------------------------------------
test('Unauthorized admin access, privilege escalation payloads, and non-super-admin staff mutations are blocked', async () => {
  const mockDb = createMockSupabaseClient();
  const resolver = createTestAuthResolver(
    {
      'tok-cust': {
        userId: CUSTOMER_A_ID,
        email: 'cust@example.com',
        role: 'registered_customer',
      },
      'tok-admin': {
        userId: '77777777-7777-4777-8777-777777777777',
        email: 'admin@example.com',
        role: 'admin',
        staffAccountId: '88888888-8888-4888-8888-888888888888',
      },
      'tok-product': {
        userId: '99999999-9999-4999-8999-999999999999',
        email: 'pm@example.com',
        role: 'product_manager',
        staffAccountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    },
    mockDb.client,
  );
  const app = createDgtApiApp(resolver);

  // Missing token -> 401
  const noAuthAdmin = await requestApp(app, 'GET', '/api/admin/orders');
  assert.equal(noAuthAdmin.status, 401);

  // Customer calling admin route -> 403
  const custAdmin = await requestApp(app, 'GET', '/api/admin/orders', {
    token: 'tok-cust',
  });
  assert.equal(custAdmin.status, 403);
  assert.equal(custAdmin.json.code, 'INSUFFICIENT_ROLE');

  // Customer trying to self-escalate via profile PATCH -> 400 strict Zod rejection
  const selfEscalate = await requestApp(app, 'PATCH', '/api/customer/profile', {
    token: 'tok-cust',
    body: {
      fullName: 'Attacker',
      account_type: 'staff',
      role: 'super_admin',
    },
  });
  assert.equal(selfEscalate.status, 400);
  assert.equal(selfEscalate.json.code, 'VALIDATION_ERROR');

  // Product manager trying to verify a bank transfer -> 403
  const pmVerify = await requestApp(
    app,
    'POST',
    `/api/admin/payments/${PAYMENT_ID}/verify`,
    {
      token: 'tok-product',
      body: { decision: 'approve' },
    },
  );
  assert.equal(pmVerify.status, 403);

  // Regular Admin (not Super Admin) trying to appoint staff -> 403
  const adminAppoint = await requestApp(app, 'POST', '/api/admin/staff', {
    token: 'tok-admin',
    body: {
      userId: CUSTOMER_A_ID,
      roleSlug: 'super_admin',
      department: 'Executive',
    },
  });
  assert.equal(adminAppoint.status, 403);
});

// ---------------------------------------------------------------------------
// 4. Bank Transfer Verification & Duplicate Payment Prevention
// ---------------------------------------------------------------------------
test('Bank transfer submission, Finance Manager verification, rejection validation, and duplicate prevention work as designed', async () => {
  const verifiedPayments = new Set<string>();
  const mockDb = createMockSupabaseClient({
    onRpc: (fn, args) => {
      if (fn === 'rpc_submit_bank_transfer_evidence') {
        return {
          data: {
            idempotent_replay: false,
            payment_id: PAYMENT_ID,
            payment_reference: 'DGT-PAY-20261118-ABC12345',
            status: 'Awaiting Verification',
          },
          error: null,
        };
      }
      if (fn === 'rpc_verify_bank_transfer_payment') {
        const pid = String(args.p_payment_id);
        if (verifiedPayments.has(pid)) {
          return {
            data: null,
            error: {
              message:
                'Duplicate or invalid verification blocked: payment is already Paid',
            },
          };
        }
        verifiedPayments.add(pid);
        return {
          data: {
            payment_id: pid,
            payment_status: args.p_decision === 'approve' ? 'Paid' : 'Rejected',
            order_payment_status: args.p_decision === 'approve' ? 'Paid' : 'Rejected',
          },
          error: null,
        };
      }
      return { data: {}, error: null };
    },
  });

  const resolver = createTestAuthResolver(
    {
      'tok-cust-a': {
        userId: CUSTOMER_A_ID,
        email: 'a@example.com',
        role: 'registered_customer',
      },
      'tok-finance': {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'finance@example.com',
        role: 'finance_manager',
        staffAccountId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      },
    },
    mockDb.client,
  );
  const app = createDgtApiApp(resolver);

  // Customer submits valid bank transfer evidence inside own folder
  const submitRes = await requestApp(
    app,
    'POST',
    '/api/customer/payments/bank-transfer',
    {
      token: 'tok-cust-a',
      body: {
        orderId: ORDER_ID,
        amountNgn: 485000,
        bankReference: 'NIP-2026-771122',
        senderBankName: 'Zenith Bank',
        senderAccountName: 'Danmusa Customer A',
        transferDate: '2026-11-18',
        storageObjectPath: `${CUSTOMER_A_ID}/receipt-01.png`,
        mimeType: 'image/png',
        fileSizeBytes: 180000,
        idempotencyKey: 'idem-pay-sub-001',
      },
    },
  );
  assert.equal(submitRes.status, 201);
  assert.equal(mockDb.rpcCalls[0]?.fn, 'rpc_submit_bank_transfer_evidence');

  // Reject without rejectionReason -> 400
  const badReject = await requestApp(
    app,
    'POST',
    `/api/admin/payments/${PAYMENT_ID}/verify`,
    {
      token: 'tok-finance',
      body: { decision: 'reject' },
    },
  );
  assert.equal(badReject.status, 400);

  // First approval succeeds
  const firstVerify = await requestApp(
    app,
    'POST',
    `/api/admin/payments/${PAYMENT_ID}/verify`,
    {
      token: 'tok-finance',
      body: { decision: 'approve' },
    },
  );
  assert.equal(firstVerify.status, 200);

  // Duplicate verification attempt is blocked cleanly
  const dupVerify = await requestApp(
    app,
    'POST',
    `/api/admin/payments/${PAYMENT_ID}/verify`,
    {
      token: 'tok-finance',
      body: { decision: 'approve' },
    },
  );
  assert.equal(dupVerify.status, 400);
  assert.match(String(dupVerify.json.error), /Duplicate or invalid verification blocked/);
});

// ---------------------------------------------------------------------------
// 5. Inventory Reservation Concurrency & Quotation Acceptance
// ---------------------------------------------------------------------------
test('Concurrent ready-stock checkouts cannot oversell inventory and quotation acceptance invokes atomic RPC', async () => {
  let availableStock = 1;
  const mockDb = createMockSupabaseClient({
    onRpc: (fn, args) => {
      if (fn === 'rpc_create_ready_stock_order') {
        const items = args.p_items as Array<{ quantity: number }>;
        const reqQty = items.reduce((s, i) => s + i.quantity, 0);
        if (availableStock < reqQty) {
          return {
            data: null,
            error: { message: 'Insufficient ready-stock for product' },
          };
        }
        availableStock -= reqQty;
        return {
          data: {
            idempotent_replay: false,
            order_id: ORDER_ID,
            order_number: 'DGT-ORD-20261118-001',
            payment_reference: 'DGT-PAY-20261118-001',
            total_ngn: 485000,
          },
          error: null,
        };
      }
      if (fn === 'rpc_accept_quotation') {
        return {
          data: {
            idempotent_replay: false,
            order_id: ORDER_ID,
            order_number: 'DGT-ORD-20261118-Q01',
          },
          error: null,
        };
      }
      return { data: {}, error: null };
    },
  });

  const resolver = createTestAuthResolver(
    {
      'tok-cust-a': {
        userId: CUSTOMER_A_ID,
        email: 'a@example.com',
        role: 'registered_customer',
      },
      'tok-cust-b': {
        userId: CUSTOMER_B_ID,
        email: 'b@example.com',
        role: 'registered_customer',
      },
    },
    mockDb.client,
  );
  const app = createDgtApiApp(resolver);

  const checkoutPayload = {
    addressId: ADDRESS_ID,
    warehouseId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    items: [
      {
        product_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        quantity: 1,
      },
    ],
  };

  const [resA, resB] = await Promise.all([
    requestApp(app, 'POST', '/api/customer/checkout', {
      token: 'tok-cust-a',
      body: { ...checkoutPayload, idempotencyKey: 'idem-race-a-001' },
    }),
    requestApp(app, 'POST', '/api/customer/checkout', {
      token: 'tok-cust-b',
      body: { ...checkoutPayload, idempotencyKey: 'idem-race-b-001' },
    }),
  ]);

  const statuses = [resA.status, resB.status].sort((x, y) => x - y);
  assert.deepEqual(statuses, [201, 400]);
  assert.equal(availableStock, 0);

  // Quotation acceptance invokes rpc_accept_quotation with authenticated customerId
  const acceptRes = await requestApp(
    app,
    'POST',
    `/api/customer/quotations/${QUOTATION_ID}/accept`,
    {
      token: 'tok-cust-a',
      body: {
        addressId: ADDRESS_ID,
        allowPartialPayment: true,
        idempotencyKey: 'idem-quote-accept-001',
      },
    },
  );
  assert.equal(acceptRes.status, 201);
  const acceptCall = mockDb.rpcCalls.find((c) => c.fn === 'rpc_accept_quotation');
  assert.equal(acceptCall?.args.p_customer_id, CUSTOMER_A_ID);
  assert.equal(acceptCall?.args.p_quotation_id, QUOTATION_ID);
});

// ---------------------------------------------------------------------------
// 6. Audit Logging, Secret Redaction & Disabled Staff Protection
// ---------------------------------------------------------------------------
test('Audit snapshot sanitizer strips secrets and audit-logs endpoint is restricted to admin/super_admin', async () => {
  const sanitized = sanitizeAuditSnapshot({
    order_number: 'DGT-ORD-001',
    password: 'plain-password',
    service_role_key: 'sb_secret_123',
    nested: { apiKey: 'secret-value', safeField: 'NGN' },
  });
  assert.deepEqual(sanitized, {
    order_number: 'DGT-ORD-001',
    password: '[REDACTED]',
    service_role_key: '[REDACTED]',
    nested: { apiKey: '[REDACTED]', safeField: 'NGN' },
  });

  const mockDb = createMockSupabaseClient();
  const resolver = createTestAuthResolver(
    {
      'tok-finance': {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'finance@example.com',
        role: 'finance_manager',
      },
      'tok-super': {
        userId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        email: 'super@example.com',
        role: 'super_admin',
      },
    },
    mockDb.client,
  );
  const app = createDgtApiApp(resolver);

  // Finance manager cannot read audit_logs -> 403
  const finAudit = await requestApp(app, 'GET', '/api/admin/audit-logs', {
    token: 'tok-finance',
  });
  assert.equal(finAudit.status, 403);

  // Super admin can read audit_logs -> 200
  const superAudit = await requestApp(app, 'GET', '/api/admin/audit-logs', {
    token: 'tok-super',
  });
  assert.equal(superAudit.status, 200);
});

// ---------------------------------------------------------------------------
// 7. SQL Migration Security & RLS Completeness Verification (Static Audit)
// ---------------------------------------------------------------------------
test('SQL migrations enable RLS on all public tables, pin search_path, prevent overselling, and define all 8 RPCs', () => {
  const m1 = fs.readFileSync(
    path.resolve('supabase/migrations/20261118000001_dgt_initial_foundation.sql'),
    'utf8',
  );
  const m2 = fs.readFileSync(
    path.resolve(
      'supabase/migrations/20261118000002_dgt_security_hardening_and_transactions.sql',
    ),
    'utf8',
  );
  const combinedSql = `${m1}\n${m2}`;

  const requiredTables = [
    'currencies',
    'nigerian_states',
    'roles',
    'permissions',
    'role_permissions',
    'user_profiles',
    'staff_accounts',
    'customer_addresses',
    'exchange_rates',
    'system_settings',
    'categories',
    'products',
    'product_media',
    'warehouses',
    'inventory_balances',
    'shopping_carts',
    'cart_items',
    'wholesale_sourcing_requests',
    'quotations',
    'orders',
    'order_items',
    'suppliers',
    'procurement_orders',
    'logistics_partners',
    'shipments',
    'shipment_milestones',
    'payments',
    'payment_evidences',
    'expenses',
    'notifications',
    'audit_logs',
  ];

  for (const table of requiredTables) {
    assert.match(
      combinedSql,
      new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`),
      `Missing ENABLE ROW LEVEL SECURITY for table ${table}`,
    );
  }

  // Verify Stage 2 migration fixes search_path on security functions
  assert.match(m2, /SET search_path = public, pg_temp/);
  assert.match(m2, /SET search_path = public, auth, pg_temp/);
  assert.match(m2, /chk_inventory_no_oversell CHECK \(quantity_reserved <= quantity_on_hand\)/);
  assert.match(m2, /REVOKE UPDATE, DELETE, TRUNCATE ON public\.audit_logs FROM anon, authenticated;/);
  assert.match(m2, /dgt-payment-evidence/);

  const requiredRpcs = [
    'rpc_reserve_ready_stock_inventory',
    'rpc_create_ready_stock_order',
    'rpc_submit_bank_transfer_evidence',
    'rpc_verify_bank_transfer_payment',
    'rpc_accept_quotation',
    'rpc_create_procurement_order',
    'rpc_update_shipment_stage',
    'rpc_complete_delivery',
  ];

  for (const rpcName of requiredRpcs) {
    assert.match(
      m2,
      new RegExp(`CREATE OR REPLACE FUNCTION public\\.${rpcName}`),
      `Missing RPC ${rpcName}`,
    );
    assert.match(
      m2,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${rpcName}`),
      `Missing REVOKE ALL on RPC ${rpcName}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 8. Disabled Staff Account & Profile Account-Type Verification
// ---------------------------------------------------------------------------
test('Disabled staff accounts and non-staff user_profiles cannot retain staff privileges', async () => {
  const scenarios: Record<
    string,
    { accountType: string; isActive: boolean; roleSlug: DgtRoleSlug }
  > = {
    'jwt-disabled-staff': {
      accountType: 'staff',
      isActive: false,
      roleSlug: 'finance_manager',
    },
    'jwt-demoted-profile': {
      accountType: 'registered_customer',
      isActive: true,
      roleSlug: 'admin',
    },
    'jwt-active-finance': {
      accountType: 'staff',
      isActive: true,
      roleSlug: 'finance_manager',
    },
  };

  let currentUserId = '';
  const stubClient = {
    auth: {
      getUser: async (token: string) => {
        if (!scenarios[token]) {
          return { data: { user: null }, error: { message: 'bad token' } };
        }
        currentUserId = token;
        return {
          data: { user: { id: token, email: `${token}@example.com` } },
          error: null,
        };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            const scenario = scenarios[currentUserId];
            if (table === 'user_profiles') {
              return {
                data: { id: currentUserId, account_type: scenario.accountType },
                error: null,
              };
            }
            if (table === 'staff_accounts') {
              return {
                data: {
                  id: 'staff-row-1',
                  is_active: scenario.isActive,
                  roles: { slug: scenario.roleSlug },
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
    }),
  } as never;

  const resolver = createSupabaseAuthResolver(() => stubClient);

  const disabledSession = await resolver.resolveSession('jwt-disabled-staff');
  assert.equal(disabledSession.ok, true);
  if (disabledSession.ok) {
    assert.equal(disabledSession.context.role, 'registered_customer');
    assert.equal(disabledSession.context.staffAccountId, null);
  }

  const demotedSession = await resolver.resolveSession('jwt-demoted-profile');
  assert.equal(demotedSession.ok, true);
  if (demotedSession.ok) {
    assert.equal(demotedSession.context.role, 'registered_customer');
    assert.equal(demotedSession.context.staffAccountId, null);
  }

  const activeSession = await resolver.resolveSession('jwt-active-finance');
  assert.equal(activeSession.ok, true);
  if (activeSession.ok) {
    assert.equal(activeSession.context.role, 'finance_manager');
    assert.equal(activeSession.context.staffAccountId, 'staff-row-1');
  }
});
