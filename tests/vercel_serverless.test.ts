import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';

async function invokeServerlessHandler(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void,
  method: string,
  urlPath: string,
  options?: { headers?: Record<string, string>; body?: unknown },
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: Record<string, unknown> }> {
  const server = http.createServer((req, res) => {
    void handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}${urlPath}`, {
      method,
      headers: {
        ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers ?? {}),
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

test('api/index.ts exists cleanly without conflicting api/index.mjs, Vite imports, or listen() calls', () => {
  const apiEntryPath = path.resolve('api/index.ts');
  assert.equal(fs.existsSync(apiEntryPath), true, 'Expected api/index.ts to exist');
  assert.equal(
    fs.existsSync(path.resolve('api/index.mjs')),
    false,
    'api/index.mjs must not coexist with api/index.ts in api/',
  );

  const stripComments = (src: string) =>
    src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  const source = stripComments(fs.readFileSync(apiEntryPath, 'utf8'));
  assert.doesNotMatch(source, /from\s+['"]vite['"]/);
  assert.doesNotMatch(source, /\.listen\s*\(/);
  assert.match(source, /createDgtApiApp/);
});

test('api/index.ts serverless handler handles health, config, catalogue, nested API paths, and methods', async () => {
  const entryUrl = new URL('../api/index.ts', import.meta.url).href;
  const mod = (await import(entryUrl)) as {
    default: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
  };
  assert.equal(typeof mod.default, 'function');

  // 1. Public Health endpoint
  const health = await invokeServerlessHandler(mod.default, 'GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.status, 'operational');
  assert.equal(health.json.paymentStrategy, 'bank_transfer_only');
  assert.ok(health.json.integrations && typeof health.json.integrations === 'object');
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.equal(health.headers['x-frame-options'], 'SAMEORIGIN');

  // 2. Public Config endpoint
  const pubConfig = await invokeServerlessHandler(mod.default, 'GET', '/api/config/public');
  assert.equal(pubConfig.status, 200);
  assert.equal(pubConfig.json.abbreviation, 'DGT');
  assert.equal(pubConfig.json.paymentStrategy, 'bank_transfer_only');
  assert.equal(pubConfig.json.onlineGatewayStatus, 'postponed');

  // 3. Catalogue & query parameter routing reach Express handlers (503 fail-closed when Supabase unconfigured in test env)
  for (const route of ['/api/products?mode=ready_stock', '/api/categories', '/api/states']) {
    const res = await invokeServerlessHandler(mod.default, 'GET', route);
    assert.equal(res.status, 503);
    assert.equal(res.json.code, 'SUPABASE_NOT_CONFIGURED');
  }

  // 4. Nested admin & customer endpoints across GET/POST/PATCH/DELETE reach Express guards (never SPA 404)
  const adminProbe = await invokeServerlessHandler(
    mod.default,
    'GET',
    '/api/admin/foundation-status',
  );
  assert.equal(adminProbe.status, 503);
  assert.equal(adminProbe.json.code, 'SUPABASE_NOT_CONFIGURED');

  for (const [method, endpoint, body] of [
    ['POST', '/api/customer/sourcing-requests', { productTitle: 'Solar Inverter' }],
    ['PATCH', '/api/customer/profile', { fullName: 'Test User' }],
    ['DELETE', '/api/customer/addresses/11111111-1111-4111-8111-111111111111', undefined],
  ] as const) {
    const res = await invokeServerlessHandler(mod.default, method, endpoint, { body });
    assert.equal(res.status, 503);
    assert.equal(res.json.code, 'SUPABASE_NOT_CONFIGURED');
  }

  // 5. Unknown API endpoint returns structured JSON 404
  const unknown = await invokeServerlessHandler(mod.default, 'GET', '/api/does-not-exist');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.error, 'API endpoint not found');
});

test('vercel.json routes /api/* to serverless Express before SPA fallback and supports deep React routes', () => {
  const raw = fs.readFileSync(path.resolve('vercel.json'), 'utf8');
  const config = JSON.parse(raw) as {
    buildCommand?: string;
    outputDirectory?: string;
    rewrites?: Array<{ source: string; destination: string }>;
  };

  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.ok(Array.isArray(config.rewrites) && config.rewrites.length >= 3);

  const apiRootIdx = config.rewrites.findIndex(
    (r) => r.source === '/api' && r.destination === '/api/index',
  );
  const apiWildcardIdx = config.rewrites.findIndex(
    (r) => r.source === '/api/:path*' && r.destination === '/api/index',
  );
  const spaFallbackIdx = config.rewrites.findIndex(
    (r) => r.destination === '/index.html',
  );

  assert.ok(apiRootIdx >= 0, 'Missing /api rewrite');
  assert.ok(apiWildcardIdx >= 0, 'Missing /api/:path* rewrite');
  assert.ok(spaFallbackIdx > apiWildcardIdx, 'SPA fallback must come after API rewrites');

  const spaRule = config.rewrites[spaFallbackIdx]!;
  assert.equal(spaRule.source, '/((?!api/).*)');
  const spaRegex = new RegExp(`^${spaRule.source}$`);

  for (const spaRoute of [
    '/',
    '/admin',
    '/admin/products',
    '/catalogue',
    '/account',
    '/account/tracking',
    '/register',
    '/login',
  ]) {
    assert.equal(spaRegex.test(spaRoute), true, `Expected SPA fallback to match ${spaRoute}`);
  }

  for (const apiRoute of [
    '/api/health',
    '/api/config/public',
    '/api/products',
    '/api/customer/orders',
    '/api/admin/orders',
  ]) {
    assert.equal(spaRegex.test(apiRoute), false, `SPA fallback must NOT match ${apiRoute}`);
  }
});
