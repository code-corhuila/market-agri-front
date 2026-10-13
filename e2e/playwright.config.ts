import { defineConfig, devices } from '@playwright/test';

// E2E level (11-quality/testing-strategy.md, Tier 4): the whole platform through the gateway.
// Not a pull request check. Before a release it runs against the qa environment and its report
// goes to the release/ pull request:
//   E2E_BASE_URL=http://localhost:8001 npm run test:e2e      (qa; dev is 8000, the default)
export default defineConfig({
  testDir: '.',
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../e2e-report' }]],
  outputDir: '../test-results/e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8000',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
});
