import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createDgtApiApp } from '../server/app.ts';
import { DEFAULT_RESEND_FROM_EMAIL } from '../server/config/env.ts';
import { createSupabaseAuthResolver } from '../server/middleware/security.ts';
import {
  buildPasswordResetEmailContent,
  createResendEmailService,
  type EmailDispatchResult,
  type EmailService,
  type PasswordResetEmailParams,
} from '../server/services/emailService.ts';
import { getSafeNextPath } from '../src/utils/authRouting.ts';

async function postJson(
  app: ReturnType<typeof createDgtApiApp>,
  urlPath: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown> }> {
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
      json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

function createMockSupabaseRecoveryClient(
  knownEmails: Record<string, { fullName: string }>,
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
              error: { message: 'User not found', status: 404, code: 'user_not_found' },
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
                action_link: `https://project.supabase.co/auth/v1/verify?token=tok_123&type=recovery&redirect_to=${encodeURIComponent(
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

function createMockEmailService(
  overrides?: Partial<EmailService>,
): {
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
  assert.match(email.text, /https:\/\/supabase\.example\/verify\?token=abc&type=recovery/);
});

test('POST /api/auth/password-reset validates email, generates Supabase recovery link, sanitizes redirectTo, and dispatches via Resend', async () => {
  const { client, generatedCalls } = createMockSupabaseRecoveryClient({
    'ahmadcybro@gmail.com': { fullName: 'Ahmad Ibrahim' },
  });
  const { service, sent } = createMockEmailService();
  const resolver = createSupabaseAuthResolver(() => client);
  const app = createDgtApiApp(resolver, service);

  // Invalid email -> 400
  const badRes = await postJson(app, '/api/auth/password-reset', {
    email: 'not-an-email',
  });
  assert.equal(badRes.status, 400);
  assert.equal(badRes.json.code, 'VALIDATION_ERROR');

  // Valid request with malicious external redirectTo -> sanitized to trusted host /reset-password
  const okRes = await postJson(app, '/api/auth/password-reset', {
    email: 'AhmadCybro@gmail.com',
    redirectTo: 'https://evil-phishing.example/steal',
  });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.json.ok, true);
  assert.equal(okRes.json.provider, 'resend');
  assert.equal(generatedCalls.length, 1);
  assert.equal(generatedCalls[0].type, 'recovery');
  assert.equal(generatedCalls[0].email, 'ahmadcybro@gmail.com');
  assert.match(generatedCalls[0].redirectTo ?? '', /^http:\/\/127\.0\.0\.1:\d+\/reset-password$/);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'ahmadcybro@gmail.com');
  assert.equal(sent[0].recipientName, 'Ahmad Ibrahim');
  assert.match(sent[0].resetLink, /type=recovery/);
});

test('POST /api/auth/password-reset returns neutral 200 for unknown emails (anti-enumeration)', async () => {
  const { client } = createMockSupabaseRecoveryClient({});
  const { service, sent } = createMockEmailService();
  const resolver = createSupabaseAuthResolver(() => client);
  const app = createDgtApiApp(resolver, service);

  const res = await postJson(app, '/api/auth/password-reset', {
    email: 'nonexistent@example.com',
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(sent.length, 0);
});

test('POST /api/auth/password-reset surfaces RESEND_NOT_CONFIGURED (503) and RESEND_TESTING_DOMAIN_LIMIT (403) cleanly', async () => {
  const { client } = createMockSupabaseRecoveryClient({
    'customer@example.com': { fullName: 'Customer Buyer' },
  });
  const resolver = createSupabaseAuthResolver(() => client);

  // 1. Unconfigured Resend -> 503 so frontend can fall back cleanly to Supabase Auth
  const unconfigured = createMockEmailService({ isConfigured: () => false });
  const app503 = createDgtApiApp(resolver, unconfigured.service);
  const res503 = await postJson(app503, '/api/auth/password-reset', {
    email: 'customer@example.com',
  });
  assert.equal(res503.status, 503);
  assert.equal(res503.json.code, 'RESEND_NOT_CONFIGURED');

  // 2. Resend free-tier testing restriction (403) via actual Resend service parser
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_mock_key';
  try {
    const resendService = createResendEmailService(async () => {
      return new Response(
        JSON.stringify({
          statusCode: 403,
          name: 'validation_error',
          message:
            'You can only send testing emails to your own email address (ahmadcybro@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const app403 = createDgtApiApp(resolver, resendService);
    const res403 = await postJson(app403, '/api/auth/password-reset', {
      email: 'customer@example.com',
    });
    assert.equal(res403.status, 403);
    assert.equal(res403.json.code, 'RESEND_TESTING_DOMAIN_LIMIT');
  } finally {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
  }
});

test('POST /api/auth/password-reset enforces rate limit (429) and safe auth redirect guards', async () => {
  assert.equal(getSafeNextPath('/forgot-password'), null);
  assert.equal(getSafeNextPath('/reset-password'), null);

  const { client } = createMockSupabaseRecoveryClient({
    'ahmadcybro@gmail.com': { fullName: 'Ahmad Ibrahim' },
  });
  const { service } = createMockEmailService();
  const resolver = createSupabaseAuthResolver(() => client);
  const app = createDgtApiApp(resolver, service);

  for (let i = 0; i < 5; i += 1) {
    const res = await postJson(app, '/api/auth/password-reset', {
      email: 'ahmadcybro@gmail.com',
    });
    assert.equal(res.status, 200);
  }

  const limited = await postJson(app, '/api/auth/password-reset', {
    email: 'ahmadcybro@gmail.com',
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.json.code, 'RATE_LIMITED');
});
