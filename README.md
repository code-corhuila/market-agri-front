# market-agri-front

Container (shell) of the web interface of the **Marketplace Agrícola Huila** distributed system:
React 19, TypeScript (strict) and Vite. It will own the **single HTTP client**, the **session**
and the **design system** (`market-agri-docs/12-ux-ui/design-system.md`), and mount the domain
portals (`auth-portal`, `catalog-portal`, `transactions-portal`) with Module Federation
(Annex H; ADR-021, planned). Sub-tasks: HU-PLAT-008 (shell), HU-PLAT-009 (simulated API),
HU-PLAT-010 (status panel).

## Structure (Annex H)

```
src/app/App.tsx         routes: home and the 404 page
src/core/auth/          the session (sessionStorage) and useSession; exposed later as shell/session
src/core/http/          the single HTTP client: gateway URL, token, X-Correlation-Id, 10 s, errors
src/shared/ui/          design-system components (exposed later as shell/ui): Button, Alert, Badge…
src/layout/             frame of the application (Shell, Wordmark) and the container's own pages
src/styles/             design tokens, base styles and utilities (12-ux-ui/design-system.md)
test/unit/              tests that need nothing (job `ci`)
test/component/         components in jsdom (job `ci`)
test/docker/            the image: build context after .dockerignore, and the build (job `ci`)
deploy/                 Dockerfile (npm ci), nginx.conf, compose.yml (included by infra)
```

## Tests

Levels and the branch where each one is a required check:
`market-agri-docs/11-quality/testing-strategy.md`, _test levels per branch_. Every sub-task branch
starts with a `test(...)` commit holding the failing tests.

```bash
cp .env.example .env      # VITE_GATEWAY_URL
npm ci
npm run test:unit
npm run test:component
npm run build             # tsc + vite build → dist/
npm run dev               # http://localhost:5173
bash test/docker/image.sh # the image builds and never carries node_modules, dist or .env
```

## Branches

`develop` ← `feat/…`, `fix/…`, `chore/…` · `qa` ← promotion · `main` ← `release/…`, `hotfix/…`.
Rules: `market-agri-docs/00-governance/git-conventions.md`.
