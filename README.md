# market-agri-front

Container (shell) of the web interface of the **Marketplace Agrícola Huila** distributed system:
React 19, TypeScript (strict) and Vite. It will own the **single HTTP client**, the **session**
and the **design system** (`market-agri-docs/12-ux-ui/design-system.md`), and mount the domain
portals (`auth-portal`, `catalog-portal`, `transactions-portal`) with Module Federation
(Annex H; ADR-021). Sub-tasks: HU-PLAT-008 (shell), HU-PLAT-009 (simulated API),
HU-PLAT-010 (status panel).

## Structure (Annex H)

```
src/app/App.tsx         routes: home, one route per portal (protected ones behind RequireAuth), 404
src/core/auth/          session, useSession, RequireAuth (exposed as shell/session, …/useSession, …/RequireAuth)
src/core/errors/        RemoteBoundary: a portal that cannot load or fails only warns in its own area
src/core/http/          the single HTTP client (shell/apiClient): gateway URL, token, X-Correlation-Id, 10 s
src/remotes/            registry of the portals (route, title, loader), navigation by role, remotes.d.ts
src/shared/ui/          design-system components, exposed as shell/ui (index.ts)
src/layout/             frame of the application (Shell with the navigation, Wordmark), home and 404
src/styles/             design tokens, base styles and utilities (12-ux-ui/design-system.md)
test/unit/              tests that need nothing (job `ci`)
test/component/         components in jsdom (job `ci`)
test/docker/            the image: build context after .dockerignore, and the build (job `ci`)
deploy/                 Dockerfile (npm ci), nginx.conf, compose.yml (included by infra)
```

## Simulated mode (HU-PLAT-009)

`VITE_API_MOCKS` lists the domains answered in the browser by Mock Service Worker
(`src/mocks/`, handlers written from `market-agri-docs/07-api/api-contract.md` §4); the others
reach the gateway. A notice on every page names the simulated domains. The tests use the same
handlers. Seed users of the simulated login (development only):

| Role     | Email                        | Password       |
| -------- | ---------------------------- | -------------- |
| PRODUCER | `productor@market-agri.test` | `Productor123` |
| BUYER    | `comprador@market-agri.test` | `Comprador123` |
| ADMIN    | `admin@market-agri.test`     | `Admin123`     |

The simulated token is unsigned (`kid: simulated`): only this container accepts it. The simulated
catalog starts from five seed products (`src/mocks/db.ts`); photos (E-16, E-17) are not simulated.
The simulated purchase (chat, workflow E-40, transactions) has no Stripe: `checkoutUrl` is the page
of the transaction, and the payment is confirmed 5 seconds after the checkout.

## Tests

Levels and the branch where each one is a required check:
`market-agri-docs/11-quality/testing-strategy.md`, _test levels per branch_. Every sub-task branch
starts with a `test(...)` commit holding the failing tests.

```bash
cp .env.example .env      # VITE_GATEWAY_URL and the portals' remoteEntry URLs
npm ci
npm run test:unit
npm run test:component
npm run build             # tsc + vite build → dist/
npm run dev               # http://localhost:5173
bash test/docker/image.sh # the image builds and never carries node_modules, dist or .env
```

The portals run on their own dev servers (5174 auth, 5175 catalog, 5176 transactions; see
`.env.example`). A portal that is not running only shows its notice: the container still works.

## Branches

`develop` ← `feat/…`, `fix/…`, `chore/…` · `qa` ← promotion · `main` ← `release/…`, `hotfix/…`.
Rules: `market-agri-docs/00-governance/git-conventions.md`.
