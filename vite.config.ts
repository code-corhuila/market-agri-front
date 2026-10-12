import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** Where each portal publishes its remoteEntry.js; fixed at build time like every VITE_ value. */
const PORTAL_ENTRIES = {
  auth: ['VITE_AUTH_PORTAL_URL', 'http://localhost:5174/remoteEntry.js'],
  catalog: ['VITE_CATALOG_PORTAL_URL', 'http://localhost:5175/remoteEntry.js'],
  transactions: ['VITE_TRANSACTIONS_PORTAL_URL', 'http://localhost:5176/remoteEntry.js'],
} as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const remotes = Object.fromEntries(
    Object.entries(PORTAL_ENTRIES).map(([name, [variable, fallback]]) => [
      name,
      { type: 'module', name, entry: env[variable] || fallback },
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
        // One copy of React and of the router for the container and every portal: two copies
        // break hooks and the portals' nested routes.
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
          'react-router-dom': { singleton: true },
        },
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
