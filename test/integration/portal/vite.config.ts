import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// A test portal built the way every real portal is (ADR-021): it exposes ./App under its remote
// name and takes React, React DOM and the router from the container as single copies.
const name = process.env.PORTAL_NAME || 'catalog';
const { dependencies } = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { dependencies: Record<string, string> };
// PORTAL_ROUTER pretends the portal was built for another React Router (the incompatible case).
const required: Record<string, string | undefined> = {
  ...dependencies,
  'react-router-dom': process.env.PORTAL_ROUTER || dependencies['react-router-dom'],
};
const singleton = (lib: string) => ({
  singleton: true,
  requiredVersion: required[lib],
  strictVersion: true,
});

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    react(),
    federation({
      name,
      filename: 'remoteEntry.js',
      exposes: { './App': fileURLToPath(new URL('./App.tsx', import.meta.url)) },
      remotes: {
        shell: { type: 'module', name: 'shell', entry: 'http://localhost:5173/remoteEntry.js' },
      },
      shared: {
        react: singleton('react'),
        'react-dom': singleton('react-dom'),
        'react-router-dom': singleton('react-router-dom'),
      },
      shareStrategy: 'loaded-first',
      dts: false,
    }),
  ],
  build: { target: 'esnext', outDir: `../../../.integration/${name}`, emptyOutDir: true },
});
