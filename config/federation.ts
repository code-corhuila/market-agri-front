/**
 * The portals the container mounts and where it finds each remoteEntry.js, fixed at build time. On
 * the platform the gateway serves them under /portals/<name>/ in this origin (ADR-017) and the
 * image is built with those paths (deploy/compose.yml); `dev` is each portal's own server.
 */
export const PORTALS = {
  auth: {
    variable: 'VITE_AUTH_PORTAL_URL',
    dev: 'http://localhost:5174/portals/auth/remoteEntry.js',
  },
  catalog: {
    variable: 'VITE_CATALOG_PORTAL_URL',
    dev: 'http://localhost:5175/portals/catalog/remoteEntry.js',
  },
  transactions: {
    variable: 'VITE_TRANSACTIONS_PORTAL_URL',
    dev: 'http://localhost:5176/portals/transactions/remoteEntry.js',
  },
} as const;

/** Libraries the container and every portal share as one copy (ADR-021, Annex H). */
export const SINGLETONS = ['react', 'react-dom', 'react-router-dom'] as const;

/**
 * Module Federation `shared` for the singletons: one copy, and the range of package.json required
 * strictly. Every portal declares the same, from its own package.json.
 * What strictVersion does today (@module-federation/vite 1.23.1, 'loaded-first'): a mismatch is
 * reported in the console, naming the portal and both versions, and the portal still runs on the
 * container's copy; it is not blocked (pinned by test/integration/portals.spec.ts). Blocking it
 * would take a federation runtime plugin, which is not part of this delivery.
 */
export function sharedSingletons(dependencies: Record<string, string | undefined>) {
  return Object.fromEntries(
    SINGLETONS.map((name) => {
      const requiredVersion = dependencies[name];
      if (!requiredVersion) {
        throw new Error(`${name} is shared with the portals but is not in package.json`);
      }
      return [name, { singleton: true, requiredVersion, strictVersion: true }];
    }),
  );
}
