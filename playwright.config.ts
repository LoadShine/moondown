import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'env -u FORCE_COLOR -u NO_COLOR pnpm dev',
    port: 5174,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
