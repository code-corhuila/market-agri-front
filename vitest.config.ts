import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Test levels (market-agri-docs 11-quality/testing-strategy.md, "test levels per branch"):
// unit and component run in the job `ci` on every pull request; they need no infrastructure.
// The remote portals (auth/App, catalog/App, transactions/App) only exist at runtime, through
// Module Federation: in the tests one double stands in for all of them.
const portalDouble = fileURLToPath(new URL('./test/component/doubles/portal.tsx', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^(auth|catalog|transactions)\/App$/, replacement: portalDouble }] },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['test/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['test/component/**/*.test.tsx'],
          setupFiles: ['./test/component/setup.ts'],
        },
      },
    ],
  },
});
