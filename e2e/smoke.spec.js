// E2E smoke tests — verifies the critical happy paths work end-to-end.
// Runs against localhost:3000 (frontend) + localhost:8000 (backend).
// Run: npx playwright test  (from repo root)

import { test, expect } from '@playwright/test';

// ── API layer (direct HTTP) ───────────────────────────────────────────────────
test.describe('API health', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const res = await request.get('http://localhost:8000/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /api/openapi.json returns a valid OpenAPI spec', async ({ request }) => {
    const res = await request.get('http://localhost:8000/api/openapi.json');
    expect(res.status()).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBeTruthy();
  });

  test('POST /api/auth/login with bad credentials returns 401', async ({ request }) => {
    const res = await request.post('http://localhost:8000/api/auth/login', {
      data: { username: 'wrong', password: 'wrong' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    // New canonical error shape from enterprise middleware
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.requestId).toBeTruthy();
  });

  test('POST /api/auth/login with missing fields returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:8000/api/auth/login', {
      data: { username: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('every response has X-Request-ID header', async ({ request }) => {
    const res = await request.get('http://localhost:8000/api/health');
    expect(res.headers()['x-request-id']).toBeTruthy();
  });

  test('X-Request-ID is echoed back when sent in request', async ({ request }) => {
    const myId = 'test-trace-12345';
    const res = await request.get('http://localhost:8000/api/health', {
      headers: { 'X-Request-ID': myId },
    });
    expect(res.headers()['x-request-id']).toBe(myId);
  });
});

// ── Frontend UI (browser) ─────────────────────────────────────────────────────
test.describe('Landing page', () => {
  test('loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('shows the site name or brand', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    // Either page title or visible text contains the brand
    const bodyText = await page.locator('body').innerText();
    expect(title.toLowerCase().includes('openthai') || bodyText.toLowerCase().includes('openthai')).toBe(true);
  });
});

test.describe('Login page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Should have at minimum an input field of some kind
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

test.describe('404 page', () => {
  test('navigating to unknown route shows Not Found', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    // Must have some kind of "not found" / 404 / หน้านี้ message
    const hasNotFound = bodyText.toLowerCase().includes('not found')
      || bodyText.includes('404')
      || bodyText.includes('ไม่พบ')
      || bodyText.includes('หน้านี้');
    expect(hasNotFound).toBe(true);
  });
});
