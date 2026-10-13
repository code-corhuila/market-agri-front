/** Libraries the container and every portal share as one copy (ADR-021, Annex H). */
export const SINGLETONS = ['react', 'react-dom', 'react-router-dom'] as const;

/**
 * Module Federation `shared` for the singletons. One copy is not enough: each one also requires
 * the range of package.json, strictly, so a portal built for another version fails to start (and
 * its RemoteBoundary contains it) instead of running against a React or router it does not know.
 * Every portal declares the same, from its own package.json.
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
