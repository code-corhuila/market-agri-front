import { expect, test, type Page } from '@playwright/test';

// HU-PLAT-008, scenarios 3 and 5 (Annex H): a portal is loaded by its contract (ADR-021: ./App
// under its remote name) and shares the container's session and design system; a portal that
// fails, to download or to start, only warns in its own area.

async function signIn(page: Page) {
  const session = {
    accessToken: 'token-de-prueba',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 'u-1', name: 'Ana Ruiz', email: 'ana@finca.co', role: 'BUYER' },
  };
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem('market-agri.session')) {
      sessionStorage.setItem('market-agri.session', text);
    }
  }, JSON.stringify(session));
}

const header = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test('a portal uses the shell: its design system, its toast and one shared session', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/catalogo');
  await expect(page.getByRole('heading', { name: 'Portal de prueba' })).toBeVisible();
  await expect(page.getByText('Sesión de Ana Ruiz')).toBeVisible();

  await page.getByRole('button', { name: 'Avisar' }).click();
  await expect(page.getByText('Aviso del portal.')).toBeVisible();

  // One copy of the session module: closing it in the container's header updates the portal.
  await header(page).getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByText('Sin sesión')).toBeVisible();
});

test('the portal owns the routes below its path', async ({ page }) => {
  await page.goto('/catalogo/detalle');
  await expect(page.getByRole('heading', { name: 'Detalle del portal de prueba' })).toBeVisible();
});

test('a portal that cannot be downloaded only warns in its area', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Inicio de sesión no está disponible en este momento')).toBeVisible();
  await expect(header(page).getByRole('link', { name: 'Catálogo' })).toBeVisible();

  await header(page).getByRole('link', { name: 'Catálogo' }).click();
  await expect(page.getByRole('heading', { name: 'Portal de prueba' })).toBeVisible();
});

test('a portal built for another React Router is reported by name; the platform goes on', async ({
  page,
}) => {
  // @module-federation/vite 1.23.1 with 'loaded-first' reports a strictVersion mismatch as an
  // error naming the portal and both versions, and keeps the container's single copy.
  const mismatches: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('does not satisfy the requirement of transactions')) {
      mismatches.push(message.text());
    }
  });
  await signIn(page);
  await page.goto('/transacciones');
  await expect.poll(() => mismatches.length).toBeGreaterThan(0);
  expect(mismatches[0]).toContain('needs ^6.30.0');
  await expect(header(page).getByText('Ana Ruiz')).toBeVisible();
});
