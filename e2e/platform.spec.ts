import { expect, test } from '@playwright/test';

// HU-PLAT-008: the platform opens through the gateway, with the container's frame and its 404.
// Each page branch adds the E2E flow of its own sub-task in this folder (G-14).

test('the home page opens through the gateway with the navigation of a visitor', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Marketplace Agrícola Huila' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(nav.getByRole('link', { name: 'Catálogo' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Ingresar' })).toBeVisible();
});

test('an address that does not exist shows the 404 page of the container', async ({ page }) => {
  await page.goto('/no-existe');
  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
});
