import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createDgtApiApp } from '../server/app.ts';
import { DEFAULT_RESEND_FROM_EMAIL } from '../server/config/env.ts';
import { createSupabaseAuthResolver } from '../server/middleware/security.ts';
import { resolveStrictResetRedirectUrl } from '../server/routes/auth.ts';
import {
  buildPasswordResetEmailContent,
  createResendEmailService,
  type EmailDispatchResult,
  type EmailService,
  type PasswordResetEmailParams,
} from '../server/services/emailService.ts';
import { ApiRequestError } from '../src/services/apiClient.ts';
import {
  getSafeNextPath,
  resolvePostLoginDestination,
} from '../src/utils/authRouting.ts';
import {
  canGrantRecoveryFormAccess,
  parseRecoveryUrlSignals,
  shouldTriggerNativeSupabaseFallback,
} from '../src/utils/recoverySession.ts';

async function postJson(
  app: ReturnType<typeof createDgtApiApp>,
  urlPath: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return {
      status: res.status,
      text,
      json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

function createMockSupabaseRecoveryClient(
  knownEmails: Record<string, { fullName: string; failInternal?: boolean }>,
) {
  const generatedCalls: Array<{
    type: string;
    email: string;
    redirectTo?: string;
  }> = [];

  const client = {
    auth: {
      admin: {
        generateLink: async (params: {
          type: string;
          email: string;
          options?: { redirectTo?: string };
        }) => {
          generatedCalls.push({
            type: params.type,
            email: params.email,
            redirectTo: params.options?.redirectTo,
          });

          const match = knownEmails[params.email.toLowerCase()];
          if (!match) {
            return {
              data: { user: null, properties: null },
              error: {
                message: 'User not found',
                status: 404,
                code: 'user_not_found',
              },
            };
          }

          if (match.failInternal) {
            return {
              data: { user: null, properties: null },
              error: {
                message: 'Database timeout',
                status: 500,
                code: 'unexpected_failure',
              },
            };
          }

          return {
            data: {
              user: {
                id: 'd45df9fd-d9fe-4e20-83d7-450ca2490b06',
                email: params.email,
                user_metadata: { full_name: match.fullName },
              },
              properties: {
                action_link: `https://project.supabase.co/auth/v1/verify?token=SECRET_RECOVERY_TOKEN_999&type=recovery&redirect_to=${encodeURIComponent(
                  params.options?.redirectTo ?? '',
                )}`,
              },
            },
            error: null,
          };
        },
      },
    },
  };

  return { client: client as never, generatedCalls };
}

function createMockEmailService(overrides?: Partial<EmailService>): {
  service: EmailService;
  sent: PasswordResetEmailParams[];
} {
  const sent: PasswordResetEmailParams[] = [];
  const service: EmailService = {
    isConfigured: () => true,
    getFromEmail: () => DEFAULT_RESEND_FROM_EMAIL,
    sendPasswordResetEmail: async (params): Promise<EmailDispatchResult> => {
      sent.push(params);
      return {
        ok: true,
        id: 'email_test_123',
        provider: 'resend',
        from: DEFAULT_RESEND_FROM_EMAIL,
      };
    },
    ...overrides,
  };
  return { service, sent };
}

test('Default RESEND_FROM_EMAIL uses onboarding@resend.dev and builds branded DGT HTML/text reset email', () => {
  assert.equal(
    DEFAULT_RESEND_FROM_EMAIL,
    'Danmusa Global Trade <onboarding@resend.dev>',
  );

  const email = buildPasswordResetEmailContent({
    to: 'ahmadcybro@gmail.com',
    resetLink: 'https://supabase.example/verify?token=abc&type=recovery',
    recipientName: 'Ahmad <Admin>',
  });

  assert.match(email.subject, /Danmusa Global Trade/i);
  assert.match(email.html, /#10243A/);
  assert.match(email.html, /#2563EB/);
  assert.match(email.html, /Ahmad &lt;Admin&gt;/);
  assert.match(
    email.html,
    /https:\/\/supabase\.example\/verify\?token=abc&amp;type=recovery/,
  );
  assert.match(
    email.text,
    /https:\/\/supabase\.example\/verify\?token=abc&type=recovery/,
  );
});

test('Account enumeration protection: registered, unregistered, Resend 403/502 failures, and generateLink errors return identical HTTP 200 responses with zero token leakage', async () => {
  const serverLogs: Array<{ event: string; metadata: Record<string, unknown> }> = [];
  const logger = (event: string, metadata: Record<string, unknown>) => {
    serverLogs.push({ event, metadata });
  };

  const { client } = createMockSupabaseRecoveryClient({
    'ahmadcybro@gmail.com': { fullName: 'Ahmad Ibrahim' },
    'customer@example.com': { fullName: 'Musa Danjuma' },
    'broken@example.com': { fullName: 'Broken User', failInternal: true },
  });
  const resolver = createSupabaseAuthResolver(() => client);

  // 1. Registered user (Resend succeeds)
  const okEmail = createMockEmailService();
  const appOk = createDgtApiApp(resolver, okEmail.service, {
    minResetResponseMs: 0,
    logger,
  });
  const registeredRes = await postJson(appOk, '/api/auth/password-reset', {
    email: 'ahmadcybro@gmail.com',
  });

  // 2. Unregistered user
  const unregisteredRes = await postJson(appOk, '/api/auth/password-reset', {
    email: 'nobody@example.com',
  });

  // 3. Registered user when Resend returns 403 testing-domain restriction
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_secret_key_DO_NOT_LEAK';
  let resend403Res: { status: number; json: Record<string, unknown>; text: string };
  let resend502Res: { status: number; json: Record<string, unknown>; text: string };
  try {
    const resend403Service = createResendEmailService(async () => {
      return new Response(
        JSON.stringify({
          statusCode: 403,
          name: 'validation_error',
          message:
            'You can only send testing emails to your own email address (ahmadcybro@gmail.com).',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const app403 = createDgtApiApp(resolver, resend403Service, {
      minResetResponseMs: 0,
      logger,
    });
    resend403Res = await postJson(app403, '/api/auth/password-reset', {
      email: 'customer@example.com',
    });

    // 4. Registered user when Resend returns 500/502 transport failure
    const resend502Service = createResendEmailService(async () => {
      return new Response(JSON.stringify({ message: 'Upstream failure' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const app502 = createDgtApiApp(resolver, resend502Service, {
      minResetResponseMs: 0,
      logger,
    });
    resend502Res = await postJson(app502, '/api/auth/password-reset', {
      email: 'customer@example.com',
    });
  } finally {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
  }

  // 5. Registered user when Supabase generateLink fails internally
  const internalErrRes = await postJson(appOk, '/api/auth/password-reset', {
    email: 'broken@example.com',
  });

  // All 5 external HTTP responses MUST be indistinguishable
  for (const res of [
    registeredRes,
    unregisteredRes,
    resend403Res,
    resend502Res,
    internalErrRes,
  ]) {
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, registeredRes.json);
    assert.equal(res.text.includes('SECRET_RECOVERY_TOKEN_999'), false);
    assert.equal(res.text.includes('re_test_secret_key_DO_NOT_LEAK'), false);
  }

  // Detailed delivery failures must be captured server-side WITHOUT recovery tokens or API keys
  assert.ok(
    serverLogs.some(
      (l) =>
        l.event === 'password_reset_email_delivery_failed' &&
        l.metadata.code === 'RESEND_TESTING_DOMAIN_LIMIT',
    ),
  );
  const serializedLogs = JSON.stringify(serverLogs);
  assert.equal(serializedLogs.includes('SECRET_RECOVERY_TOKEN_999'), false);
  assert.equal(serializedLogs.includes('re_test_secret_key_DO_NOT_LEAK'), false);
});

test('Redirect security: rejects X-Forwarded-Host poisoning, arbitrary redirect URLs, query injection, and resolves production redirect to DGT route', async () => {
  const { client, generatedCalls } = createMockSupabaseRecoveryClient({
    'ahmadcybro@gmail.com': { fullName: 'Ahmad Ibrahim' },
  });
  const { service, sent } = createMockEmailService();
  const resolver = createSupabaseAuthResolver(() => client);
  const app = createDgtApiApp(resolver, service, { minResetResponseMs: 0 });

  // 1. Reject arbitrary external redirectTo (even if X-Forwarded-Host matches attacker domain!)
  const spoofedRes = await postJson(
    app,
    '/api/auth/password-reset',
    {
      email: 'ahmadcybro@gmail.com',
      redirectTo: 'https://evil-phishing.example/reset-password',
    },
    {
      'X-Forwarded-Host': 'evil-phishing.example',
      'X-Forwarded-Proto': 'https',
    },
  );
  assert.equal(spoofedRes.status, 400);
  assert.equal(spoofedRes.json.code, 'INVALID_REDIRECT_URL');
  assert.equal(generatedCalls.length, 0);
  assert.equal(sent.length, 0);

  // 2. Reject arbitrary query strings or non-/reset-password paths on trusted origin
  const queryInjectRes = await postJson(app, '/api/auth/password-reset', {
    email: 'ahmadcybro@gmail.com',
    redirectTo: 'https://danmusa-global-trade.vercel.app/reset-password?next=//evil.com',
  });
  assert.equal(queryInjectRes.status, 400);
  assert.equal(queryInjectRes.json.code, 'INVALID_REDIRECT_URL');

  const wrongPathRes = await postJson(app, '/api/auth/password-reset', {
    email: 'ahmadcybro@gmail.com',
    redirectTo: 'https://danmusa-global-trade.vercel.app/login',
  });
  assert.equal(wrongPathRes.status, 400);
  assert.equal(wrongPathRes.json.code, 'INVALID_REDIRECT_URL');

  // 3. Omitted redirectTo ignores spoofed X-Forwarded-Host and uses trusted server origin
  const defaultRes = await postJson(
    app,
    '/api/auth/password-reset',
    { email: 'ahmadcybro@gmail.com' },
    {
      'X-Forwarded-Host': 'evil-phishing.example',
      'X-Forwarded-Proto': 'https',
    },
  );
  assert.equal(defaultRes.status, 200);
  assert.equal(generatedCalls.length, 1);
  assert.equal(
    generatedCalls[0].redirectTo?.includes('evil-phishing.example'),
    false,
  );
  assert.match(generatedCalls[0].redirectTo ?? '', /\/reset-password$/);

  // 4. Production environment resolves default redirect strictly to DGT production route and blocks localhost
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAppUrl = process.env.APP_URL;
  process.env.NODE_ENV = 'production';
  process.env.APP_URL = 'http://localhost:3000';
  try {
    const prodDefault = resolveStrictResetRedirectUrl();
    assert.equal(prodDefault.ok, true);
    if (prodDefault.ok) {
      assert.equal(
        prodDefault.url,
        'https://danmusa-global-trade.vercel.app/reset-password',
      );
    }

    const prodLocalReject = resolveStrictResetRedirectUrl(
      'http://localhost:3000/reset-password',
    );
    assert.equal(prodLocalReject.ok, false);

    const prodExplicitAllow = resolveStrictResetRedirectUrl(
      'https://danmusa-global-trade.vercel.app/reset-password',
    );
    assert.equal(prodExplicitAllow.ok, true);
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
  }
});

test('Resend fallback only triggers on RESEND_NOT_CONFIGURED (before generateLink) and never causes duplicate links on generic 503/502/429', async () => {
  const { client, generatedCalls } = createMockSupabaseRecoveryClient({
    'customer@example.com': { fullName: 'Customer Buyer' },
  });
  const resolver = createSupabaseAuthResolver(() => client);

  const unconfigured = createMockEmailService({ isConfigured: () => false });
  const app503 = createDgtApiApp(resolver, unconfigured.service, {
    minResetResponseMs: 0,
  });
  const res503 = await postJson(app503, '/api/auth/password-reset', {
    email: 'customer@example.com',
  });
  assert.equal(res503.status, 503);
  assert.equal(res503.json.code, 'RESEND_NOT_CONFIGURED');
  // Crucial invariant: generateLink was NOT called before returning RESEND_NOT_CONFIGURED
  assert.equal(generatedCalls.length, 0);

  // Frontend fallback helper strictly accepts ONLY RESEND_NOT_CONFIGURED
  assert.equal(
    shouldTriggerNativeSupabaseFallback(
      new ApiRequestError('Not configured', 503, 'RESEND_NOT_CONFIGURED'),
    ),
    true,
  );
  assert.equal(
    shouldTriggerNativeSupabaseFallback(
      new ApiRequestError('Gateway timeout', 503, 'GATEWAY_TIMEOUT'),
    ),
    false,
  );
  assert.equal(
    shouldTriggerNativeSupabaseFallback(
      new ApiRequestError('Supabase missing', 503, 'SUPABASE_NOT_CONFIGURED'),
    ),
    false,
  );
  assert.equal(
    shouldTriggerNativeSupabaseFallback(
      new ApiRequestError('Rate limited', 429, 'RATE_LIMITED'),
    ),
    false,
  );
});

test('Recovery-session validation blocks ordinary authenticated sessions and parses PKCE, token_hash, implicit hash, and expiry signals', () => {
  // Ordinary authenticated session WITHOUT recovery event or URL recovery flow MUST be rejected
  assert.equal(
    canGrantRecoveryFormAccess({
      passwordRecoveryPending: false,
      verifiedByUrlRecoveryFlow: false,
      hasActiveSession: true,
    }),
    false,
  );

  // Unauthenticated without session MUST be rejected
  assert.equal(
    canGrantRecoveryFormAccess({
      passwordRecoveryPending: true,
      verifiedByUrlRecoveryFlow: true,
      hasActiveSession: false,
    }),
    false,
  );

  // Explicit PASSWORD_RECOVERY event with active session MUST be granted
  assert.equal(
    canGrantRecoveryFormAccess({
      passwordRecoveryPending: true,
      verifiedByUrlRecoveryFlow: false,
      hasActiveSession: true,
    }),
    true,
  );

  // Verified URL recovery flow with active session MUST be granted
  assert.equal(
    canGrantRecoveryFormAccess({
      passwordRecoveryPending: false,
      verifiedByUrlRecoveryFlow: true,
      hasActiveSession: true,
    }),
    true,
  );

  // PKCE code signal
  const pkce = parseRecoveryUrlSignals('?code=pkce_123', '');
  assert.equal(pkce.pkceCode, 'pkce_123');
  assert.equal(pkce.hasSensitiveUrlParams, true);
  assert.equal(pkce.errorMessage, null);

  // Token-hash recovery signal
  const otp = parseRecoveryUrlSignals('?token_hash=th_123&type=recovery', '');
  assert.equal(otp.isTokenHashRecovery, true);
  assert.equal(otp.tokenHash, 'th_123');
  assert.equal(otp.hasSensitiveUrlParams, true);

  // Implicit recovery hash signal (non-recovery hash type rejected)
  const implicit = parseRecoveryUrlSignals(
    '',
    '#access_token=jwt_abc&type=recovery',
  );
  assert.equal(implicit.hasImplicitRecoveryHash, true);
  assert.equal(implicit.hasSensitiveUrlParams, true);

  const nonRecoveryHash = parseRecoveryUrlSignals(
    '',
    '#access_token=jwt_abc&type=magiclink',
  );
  assert.equal(nonRecoveryHash.hasImplicitRecoveryHash, false);

  // Expired recovery link error
  const expired = parseRecoveryUrlSignals(
    '',
    '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
  );
  assert.match(expired.errorMessage ?? '', /expired/i);
  assert.equal(expired.hasSensitiveUrlParams, true);
});

test('Rate limiting enforces IP and email caps per instance and auth redirect guards remain strict for staff and customers', async () => {
  assert.equal(getSafeNextPath('/forgot-password'), null);
  assert.equal(getSafeNextPath('/reset-password'), null);

  // Inactive staff remains denied even after password recovery
  assert.equal(
    resolvePostLoginDestination({
      role: 'registered_customer',
      isStaff: false,
      isInactiveStaff: true,
    }),
    null,
  );
  assert.equal(
    resolvePostLoginDestination({
      role: 'super_admin',
      isStaff: true,
      isInactiveStaff: false,
    }),
    '/admin',
  );
  assert.equal(
    resolvePostLoginDestination({
      role: 'registered_customer',
      isStaff: false,
      isInactiveStaff: false,
    }),
    '/account',
  );

  const { client } = createMockSupabaseRecoveryClient({
    'ahmadcybro@gmail.com': { fullName: 'Ahmad Ibrahim' },
  });
  const { service } = createMockEmailService();
  const resolver = createSupabaseAuthResolver(() => client);
  const app = createDgtApiApp(resolver, service, { minResetResponseMs: 0 });

  // Email-based limit across varying IPs
  for (let i = 0; i < 5; i += 1) {
    const res = await postJson(
      app,
      '/api/auth/password-reset',
      { email: 'ahmadcybro@gmail.com' },
      { 'x-vercel-forwarded-for': `198.51.100.${i + 1}` },
    );
    assert.equal(res.status, 200);
  }
  const emailLimited = await postJson(
    app,
    '/api/auth/password-reset',
    { email: 'ahmadcybro@gmail.com' },
    { 'x-vercel-forwarded-for': '198.51.100.99' },
  );
  assert.equal(emailLimited.status, 429);
  assert.equal(emailLimited.json.code, 'RATE_LIMITED');

  // IP-based limit across varying emails
  for (let i = 0; i < 5; i += 1) {
    const res = await postJson(
      app,
      '/api/auth/password-reset',
      { email: `user${i}@example.com` },
      { 'x-vercel-forwarded-for': '203.0.113.55' },
    );
    assert.equal(res.status, 200);
  }
  const ipLimited = await postJson(
    app,
    '/api/auth/password-reset',
    { email: 'user99@example.com' },
    { 'x-vercel-forwarded-for': '203.0.113.55' },
  );
  assert.equal(ipLimited.status, 429);
  assert.equal(ipLimited.json.code, 'RATE_LIMITED');
});
