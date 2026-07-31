// Playwright E2E config — runs against a local dev build.
// Prerequisite: backend running on :8000, frontend on :3000
//   cd backend && npm run dev &
//   cd frontend && npm run dev &
//   npx playwright test

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium/chrome',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start both servers before tests run
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:8000/api/health',
      timeout: 30_000,
      reuseExistingServer: true,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:3000',
      timeout: 30_000,
      reuseExistingServer: true,
    },
  ],
});
