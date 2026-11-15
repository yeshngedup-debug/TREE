import { defineConfig } from '@playwright/test';

/**
 * E2E suite. The dev server is started externally (npm run dev on port 3100,
 * or BASE_URL=http://localhost:3000) — tests hit a live app, never spawn one,
 * because the author runs their own dev server during development.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
});
