import { defineConfig, devices } from '@playwright/test';

// E2E level (11-quality/testing-strategy.md, Tier 4): the whole platform through the gateway.
// Not a pull request check. Before a release it runs against the qa environment and its report
// goes to the release/ pull request:
//   E2E_BASE_URL=http://localhost:8001 npm run test:e2e      (qa; dev is 8000, the default)
// Flows 4–6 also read secrets and forwarded ports from the environment: see checkout.spec.ts and
// notifications.spec.ts.
export default defineConfig({
  testDir: '.',
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../e2e-report' }]],
  outputDir: '../test-results/e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8000',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'flows', testIgnore: /notifications\.spec\.ts/ },
    // Flow 6 buys from the same conversation as flows 4 and 5, which allows one pending payment at
    // a time and counts the buyer's purchases: it runs after them, never beside them.
    { name: 'notifications', testMatch: /notifications\.spec\.ts/, dependencies: ['flows'] },
  ],
});
