import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite (spec-06).
 *
 * `webServer` boots the Node API (server/, port 3000) and the Angular dev
 * server (port 4200, proxying /api to 3000). Tests stub `speechSynthesis`
 * via addInitScript and the dictionary network via page.route fixtures, so
 * the suite never touches the internet (CA6.3). Grammatical analysis comes
 * from the real local backend (compromise, offline).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      grep: /layout/,
    },
  ],
  webServer: [
    {
      command: 'npm run dev:server',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
    {
      command: 'npx ng serve',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
