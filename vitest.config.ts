import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Test levels (market-agri-docs 11-quality/testing-strategy.md, "test levels per branch"):
// unit and component run in the job `ci` on every pull request; they need no infrastructure.
export default defineConfig({
  plugins: [react()],
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
