import { readFileSync } from 'node:fs';
import { SINGLETONS, sharedSingletons } from '../../config/federation';

// Review of #12 (finding 3): `singleton: true` alone lets a portal run against a React or router it
// was not built for. Each shared library requires the range of package.json, strictly.
describe('sharedSingletons', () => {
  const { dependencies } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { dependencies: Record<string, string> };

  it('shares React, React DOM and the router as single copies', () => {
    expect([...SINGLETONS]).toEqual(['react', 'react-dom', 'react-router-dom']);
  });

  it('requires, strictly, the version range of package.json', () => {
    expect(sharedSingletons(dependencies)).toEqual({
      react: { singleton: true, requiredVersion: dependencies.react, strictVersion: true },
      'react-dom': {
        singleton: true,
        requiredVersion: dependencies['react-dom'],
        strictVersion: true,
      },
      'react-router-dom': {
        singleton: true,
        requiredVersion: dependencies['react-router-dom'],
        strictVersion: true,
      },
    });
  });

  it('fails the build when a shared library is not a dependency', () => {
    expect(() => sharedSingletons({ react: '^19.2.0' })).toThrow(
      'react-dom is shared with the portals but is not in package.json',
    );
  });
});
