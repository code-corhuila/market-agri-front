import { defineConfig, devices } from '@playwright/test';

// Integration level (11-quality/testing-strategy.md): the built container with real portals over
// Module Federation, in a real browser. Runs in the job `integration` (pull requests to qa).
//   auth         → :5174, nothing listens there: a portal that cannot be downloaded
//   catalog      → :5175, the test portal: uses shell/ui and the container's session
//   transactions → :5176, the test portal built for React Router 6: an incompatible version
const portal = (name: string, port: number, router = '') => ({
  command: `vite build -c test/integration/portal/vite.config.ts && vite preview -c test/integration/portal/vite.config.ts --port ${port} --strictPort`,
  url: `http://localhost:${port}/remoteEntry.js`,
  env: { PORTAL_NAME: name, PORTAL_ROUTER: router },
  reuseExistingServer: false,
});

export default defineConfig({
  testDir: 'test/integration',
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
    // A Chromium already installed (CHROMIUM_PATH) instead of the one `playwright install` gets.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  webServer: [
    {
      command: 'vite build && vite preview --port 5173 --strictPort',
      url: 'http://localhost:5173/remoteEntry.js',
      env: {
        VITE_GATEWAY_URL: '',
        VITE_AUTH_PORTAL_URL: 'http://localhost:5174/remoteEntry.js',
        VITE_CATALOG_PORTAL_URL: 'http://localhost:5175/remoteEntry.js',
        VITE_TRANSACTIONS_PORTAL_URL: 'http://localhost:5176/remoteEntry.js',
      },
      reuseExistingServer: false,
    },
    portal('catalog', 5175),
    portal('transactions', 5176, '^6.30.0'),
  ],
});
