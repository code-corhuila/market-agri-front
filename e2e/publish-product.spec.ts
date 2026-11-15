import { expect, test, type Page } from '@playwright/test';

// HU-CAT-001, E2E flow 3 (11-quality/testing-strategy.md, Priority E2E flows): a seeded producer
// publishes through the interface and the real catalog-api (E-13), and a seeded buyer is not
// offered the action. It relies on the seed users of auth-db for dev and qa (D-20). Each run
// publishes one product with a unique name, and no assertion depends on how many products exist,
// so the suite can run any number of times in qa (the products stay: deleting is not in 2.1.0).

const PRODUCER = { email: 'productor@market-agri.test', password: 'Productor123' };
const BUYER = { email: 'comprador@market-agri.test', password: 'Comprador123' };
const PRODUCTS = '/api/v1/catalog/products';

async function logIn(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('main').getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toHaveCount(0);
}

const publishAction = (page: Page) => page.getByRole('link', { name: 'Publicar producto' });

test('a producer publishes a product with its price in pesos and lands on its page', async ({
  page,
}) => {
  const name = `Café de prueba E2E ${Date.now()}`;
  await logIn(page, PRODUCER);
  await page.goto('/catalogo');
  await publishAction(page).click();
  await expect(page.getByRole('heading', { name: 'Publicar producto' })).toBeVisible();

  const form = page.getByRole('main');
  await form.getByRole('textbox', { name: 'Nombre' }).fill(name);
  await form.getByRole('combobox', { name: 'Categoría' }).selectOption('CAFE');
  await form.getByRole('combobox', { name: 'Unidad' }).selectOption('ARROBA');
  await form.getByRole('textbox', { name: 'Cantidad disponible' }).fill('40');
  await form.getByRole('textbox', { name: 'Precio por unidad' }).fill('85.000');
  await form.getByRole('textbox', { name: 'Municipio' }).fill('Pitalito');
  const created = page.waitForResponse(
    (response) => response.url().endsWith(PRODUCTS) && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Publicar' }).click();

  // E-13 received the price as integer centavos (ADR-029) and answered 201 with the new product.
  const response = await created;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toMatchObject({ name, priceCents: 8_500_000 });
  const { id } = (await response.json()) as { id: string };

  await expect(page).toHaveURL(new RegExp(`/catalogo/productos/${id}$`));
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('$ 85.000');
  await expect(page.getByRole('main')).toContainText('Disponible');

  // The public catalog (E-10, anonymous) has it, wherever it lands in the list.
  const list = await page.request.get(`${PRODUCTS}?page=1&limit=100`);
  expect(list.ok()).toBe(true);
  const { data } = (await list.json()) as { data: { id: string; name: string }[] };
  expect(data).toContainEqual(expect.objectContaining({ id, name }));
});

test('a buyer is not offered "Publicar producto"', async ({ page }) => {
  await logIn(page, BUYER);
  await page.goto('/catalogo');
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('listitem').first()).toBeVisible();
  await expect(publishAction(page)).toHaveCount(0);
});
