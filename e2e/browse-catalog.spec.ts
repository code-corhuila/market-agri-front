import { expect, test, type Page } from '@playwright/test';

// HU-CAT-005, E2E flow 1 (11-quality/testing-strategy.md, Priority E2E flows): a visitor browses
// the real catalog through the gateway (E-10, E-11), with nothing simulated about it. It relies on
// the demo seeds of catalog-db for dev and qa (D-20): 21 products, so two pages, one of them
// "Mora de Castilla" at 8 500 000 centavos. Products published later in qa only push the seeds
// down, so no assertion depends on the order of the list.

const SEEDED = 'Mora de Castilla';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const cards = (page: Page) => page.getByRole('main').getByRole('listitem');
const pager = (page: Page) => page.getByRole('navigation', { name: 'Páginas del catálogo' });

test('the catalog lists the seeded products with their price in pesos, not simulated', async ({
  page,
}) => {
  await page.goto('/catalogo');
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();

  const card = cards(page).filter({ has: page.getByRole('link', { name: SEEDED }) });
  await expect(card).toContainText('$ 85.000');

  // The notice stays while other domains are simulated (ADR-021); catalog is no longer one of them.
  const notice = page.getByText(/^Datos simulados:/);
  if ((await notice.count()) > 0) await expect(notice).not.toContainText('catalog');
});

test('the next page shows other products', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(pager(page)).toContainText('Página 1 de');
  const firstPage = await cards(page).getByRole('link').allTextContents();

  await pager(page).getByRole('button', { name: 'Siguiente' }).click();

  await expect(page).toHaveURL(/[?&]page=2\b/);
  await expect(pager(page)).toContainText('Página 2 de');
  await expect(cards(page).first()).toBeVisible();
  const secondPage = await cards(page).getByRole('link').allTextContents();
  expect(secondPage.filter((name) => firstPage.includes(name))).toEqual([]);
});

test('a product opens its detail with the same price', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('link', { name: SEEDED }).click();

  await expect(page).toHaveURL(/\/catalogo\/productos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: SEEDED })).toBeVisible();
  await expect(page.getByText('$ 85.000')).toBeVisible();
});

test('a product that does not exist says so and leads back to the catalog', async ({ page }) => {
  await page.goto(`/catalogo/productos/${MISSING_ID}`);
  await expect(page.getByText('El producto no existe.')).toBeVisible();

  await page.getByRole('link', { name: 'Ver el catálogo' }).click();
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
});
