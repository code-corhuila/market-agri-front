import { expect, test } from '@playwright/test';

// HU-PLAT-010 through the gateway: the panel lists the five services and loads the three portals.
test('the status panel shows every service and loads every portal', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'Estado de la plataforma' })
    .click();
  await expect(page.getByRole('heading', { name: 'Estado de la plataforma' })).toBeVisible();

  const services = page.getByRole('list', { name: 'Servicios' }).getByRole('listitem');
  await expect(services).toHaveCount(5);
  for (const item of await services.all()) {
    await expect(item).toContainText(/Activo|Caído/);
  }
  const portals = page.getByRole('list', { name: 'Portales' }).getByRole('listitem');
  await expect(portals).toHaveCount(3);
  for (const item of await portals.all()) {
    await expect(item).toContainText('Cargado');
  }
});
