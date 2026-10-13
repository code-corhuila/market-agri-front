import { readFileSync } from 'node:fs';
import { PORTALS } from '../../config/federation';

// ADR-017: on the platform the gateway serves each portal under /portals/<name>/, in the
// container's origin. The container is built with those addresses and fails without them (R-24).
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const NAMES = ['auth', 'catalog', 'transactions'] as const;

describe('the container and its portals behind the gateway (ADR-017)', () => {
  it('names each portal and, in development, finds it on its own server under its path', () => {
    expect(PORTALS).toEqual({
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
    });
  });

  it('cannot build its image without the address of every portal (R-24)', () => {
    const dockerfile = read('deploy/Dockerfile');
    for (const name of NAMES) {
      const variable = PORTALS[name].variable;
      expect(dockerfile).toMatch(new RegExp(`^ARG ${variable}$`, 'm'));
      expect(dockerfile).toContain(`\${${variable}:?`);
    }
  });

  it('is built by infra with the portals in its own origin', () => {
    const compose = read('deploy/compose.yml');
    for (const name of NAMES) {
      expect(compose).toContain(`${PORTALS[name].variable}: /portals/${name}/remoteEntry.js`);
    }
  });

  it('answers no CORS: the portals are in the same origin, and remoteEntry.js is never cached', () => {
    const nginx = read('deploy/nginx.conf');
    expect(nginx).not.toContain('Access-Control-Allow-Origin');
    expect(nginx).toMatch(/remoteEntry\\\.js\|mf-manifest\\\.json[\s\S]*Cache-Control "no-store"/);
  });

  // Review of #20: a chunk that is not there must be a 404 (the browser names the missing file),
  // not the application's page served as a script ("Unexpected token '<'").
  it('answers a missing file under /assets/ with 404, not with the page', () => {
    expect(read('deploy/nginx.conf')).toMatch(
      /location \/assets\/ \{\s*try_files \$uri =404;\s*\}/,
    );
  });
});
