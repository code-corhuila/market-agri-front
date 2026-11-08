import { expect, test, type Page } from '@playwright/test';

// HU-AUTH-002, E2E flow 2 (11-quality/testing-strategy.md, Priority E2E flows): a seeded user logs
// in and out through the gateway against the real auth-api (E-02), with nothing simulated about
// it. It relies on the seed users of auth-db for dev and qa (D-20), the same as the simulated ones.
// A wrong password counts towards the lockout of HU-AUTH-005, so the test that uses it ends with a
// right login, which puts the counter back to 0: the suite can run any number of times in qa.

const PRODUCER = {
  email: 'productor@market-agri.test',
  password: 'Productor123',
  name: 'Ana Ruiz',
};
const INVALID = 'Correo o contraseña incorrectos.';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('main').getByRole('button', { name: 'Ingresar' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('a seeded producer logs in and the header shows their name and role, not simulated', async ({
  page,
}) => {
  await logIn(page, PRODUCER.email, PRODUCER.password);

  await expect(nav(page).getByText(PRODUCER.name)).toBeVisible();
  // The role shows in the navigation: the links of a PRODUCER, and no longer the visitor's one.
  await expect(nav(page).getByRole('link', { name: 'Mis productos' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Mis ventas' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Ingresar' })).toHaveCount(0);

  // The notice stays while other domains are simulated (ADR-021); auth is no longer one of them.
  const notice = page.getByText(/^Datos simulados:/);
  if ((await notice.count()) > 0) await expect(notice).not.toContainText('auth');
});

test('a wrong password shows the 401 message and the right one still logs in', async ({ page }) => {
  await logIn(page, PRODUCER.email, 'NoEsLaClave1');

  await expect(page.getByRole('alert')).toHaveText(INVALID);
  await expect(nav(page).getByRole('link', { name: 'Ingresar' })).toBeVisible();

  await logIn(page, PRODUCER.email, PRODUCER.password);
  await expect(nav(page).getByText(PRODUCER.name)).toBeVisible();
});

test('logging out clears the session', async ({ page }) => {
  await logIn(page, PRODUCER.email, PRODUCER.password);
  await expect(nav(page).getByText(PRODUCER.name)).toBeVisible();

  await nav(page).getByRole('button', { name: 'Salir' }).click();

  await expect(nav(page).getByRole('link', { name: 'Ingresar' })).toBeVisible();
  await expect(nav(page).getByText(PRODUCER.name)).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('market-agri.session'))).toBeNull();

  // Without a session, a page that needs one asks to log in again.
  await page.goto('/transacciones/ventas');
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});
