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
