import { readFileSync } from 'node:fs';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { PORTALS, sharedSingletons } from './config/federation';
import { parseMockedDomains } from './src/mocks/domains';

const { dependencies } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { dependencies: Record<string, string> };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // A misspelt simulated domain fails the build (and the CI image), not the page in the browser.
  parseMockedDomains(env.VITE_API_MOCKS);
  const remotes = Object.fromEntries(
    Object.entries(PORTALS).map(([name, { variable, dev }]) => [
      name,
      { type: 'module', name, entry: env[variable] || dev },
    ]),
  );

  return {
    plugins: [
      react(),
      // Host of the portals and provider of what they share (ADR-021, Annex H).
      federation({
        name: 'shell',
        filename: 'remoteEntry.js',
        exposes: {
          './apiClient': './src/core/http/apiClient.ts',
          './session': './src/core/auth/session.ts',
          './useSession': './src/core/auth/useSession.ts',
          './RequireAuth': './src/core/auth/RequireAuth.tsx',
          './ui': './src/shared/ui/index.ts',
        },
        remotes,
        // One copy of React and of the router for the container and every portal (two copies
        // break hooks and the portals' nested routes), in the version range of package.json.
        shared: sharedSingletons(dependencies),
        // A portal is downloaded when its route opens; with the default 'version-first' every
        // remote is fetched at start-up and one portal down blanks the whole application.
        shareStrategy: 'loaded-first',
        dts: false,
      }),
    ],
    server: { port: 5173, strictPort: true, origin: 'http://localhost:5173' },
    preview: { port: 5173, strictPort: true },
    build: { target: 'esnext' },
  };
});
