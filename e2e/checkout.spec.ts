import { createHash, randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// HU-PLAT-006, E2E flows 4 and 5 (11-quality/testing-strategy.md), and since closure 6
// (HU-PLAT-005) the purchase page through the real chat. The conversation is the one chat-db seeds
// in dev and qa (Carlos Pérez buying the Mora de Castilla). Everything is real: gateway, chat,
// workflow, catalog reservation, transactions, RabbitMQ and the E-41 portal. The tests of this
// file run one after the other: the conversation allows one pending payment at a time.

const BUYER = {
  email: 'comprador@market-agri.test',
  password: 'Comprador123',
  name: 'Carlos Pérez',
};
const CHECKOUT_CONVERSATION = '7e0b1d2c-3a4f-4b5c-8d6e-9f0a1b2c3d4e';
const CHECKOUT_PRODUCT = '5e1f0c2a-7b3d-4e8f-9a6b-000000000021';
const AMOUNT_CENTS = 17_000_000;

type Session = { accessToken: string };
type Product = { quantity: number };
type Transaction = { id: string; status: string; amountCents: number };
type Checkout = { transaction: Transaction };
type TransactionPage = { data: Transaction[]; meta: { total: number } };

async function logIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(BUYER.email);
  await page.getByLabel('Contraseña').fill(BUYER.password);
  await page.getByRole('main').getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }).getByText(BUYER.name),
  ).toBeVisible();
}

async function buyerSession(page: Page): Promise<Session> {
  const stored = await page.evaluate(() => sessionStorage.getItem('market-agri.session'));
  if (!stored) throw new Error('The buyer session was not stored after login.');
  return JSON.parse(stored) as Session;
}

function bearer(session: Session) {
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function product(request: APIRequestContext): Promise<Product> {
  const response = await request.get(`/api/v1/catalog/products/${CHECKOUT_PRODUCT}`);
  expect(response).toBeOK();
  return (await response.json()) as Product;
}

async function purchases(request: APIRequestContext, session: Session): Promise<TransactionPage> {
  const response = await request.get('/api/v1/transactions/mine?page=1&limit=100', {
    headers: bearer(session),
  });
  expect(response).toBeOK();
  return (await response.json()) as TransactionPage;
}

function paymentEvent(reference: string, secret: string, amountCents = AMOUNT_CENTS) {
  const timestamp = Math.floor(Date.now() / 1000);
  const gatewayId = `e2e-${randomUUID()}`;
  const status = 'APPROVED';
  const checksum = createHash('sha256')
    .update(`${gatewayId}${status}${amountCents}${timestamp}${secret}`, 'utf8')
    .digest('hex');
  return {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: gatewayId,
        amount_in_cents: amountCents,
        reference,
        currency: 'COP',
        payment_method_type: 'CARD',
        status,
      },
    },
    signature: {
      properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
      checksum,
    },
    timestamp,
  };
}

test('a buyer completes checkout and insufficient stock changes neither product nor purchases', async ({
  page,
  request,
}) => {
  const eventsSecret = process.env.E2E_WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    throw new Error('E2E_WOMPI_EVENTS_SECRET is required to sign the fake E-43 payment event.');
  }

  await logIn(page);
  const session = await buyerSession(page);
  const stockBefore = await product(request);
  expect(stockBefore.quantity).toBeGreaterThanOrEqual(3);
  const purchasesBefore = await purchases(request, session);

  const checkout = await request.post('/api/v1/workflow/checkouts', {
    headers: { ...bearer(session), 'Idempotency-Key': `e2e-checkout-${randomUUID()}` },
    data: { conversationId: CHECKOUT_CONVERSATION, quantity: 2 },
  });
  expect(checkout.status()).toBe(201);
  const created = (await checkout.json()) as Checkout;
  expect(created.transaction.status).toBe('PENDING');
  expect(created.transaction.amountCents).toBe(AMOUNT_CENTS);

  const webhook = await request.post('/api/v1/transactions/webhooks/payment-gateway', {
    data: paymentEvent(created.transaction.id, eventsSecret),
  });
  expect(webhook).toBeOK();

  await page.goto(`/transacciones/${created.transaction.id}`);
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/\$\s*170\.000/)).toBeVisible();

  const stockAfterConfirmed = await product(request);
  expect(stockAfterConfirmed.quantity).toBe(stockBefore.quantity - 2);

  const purchasesAfterConfirmed = await purchases(request, session);
  expect(purchasesAfterConfirmed.meta.total).toBe(purchasesBefore.meta.total + 1);

  const insufficient = await request.post('/api/v1/workflow/checkouts', {
    headers: { ...bearer(session), 'Idempotency-Key': `e2e-insufficient-${randomUUID()}` },
    data: { conversationId: CHECKOUT_CONVERSATION, quantity: stockAfterConfirmed.quantity + 1 },
  });
  expect(insufficient.status()).toBe(409);
  const rejected = await insufficient.json();
  expect(rejected).toMatchObject({ error: 'INSUFFICIENT_STOCK' });
  expect(rejected).toMatchObject({
    message: expect.stringContaining(String(stockAfterConfirmed.quantity)),
  });

  const stockAfterRejected = await product(request);
  expect(stockAfterRejected.quantity).toBe(stockAfterConfirmed.quantity);
  const purchasesAfterRejected = await purchases(request, session);
  expect(purchasesAfterRejected.meta.total).toBe(purchasesAfterConfirmed.meta.total);
});

test('closure 6: the purchase page opens the conversation in the real chat, agrees PLATFORM and checks out', async ({
  page,
  request,
}) => {
  const eventsSecret = process.env.E2E_WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    throw new Error('E2E_WOMPI_EVENTS_SECRET is required to sign the fake E-43 payment event.');
  }
  // With Wompi (dev) the page leaves for the provider's checkout: it never loads in the test.
  await page.route('https://checkout.wompi.co/**', (route) => route.fulfill({ body: 'wompi' }));

  await logIn(page);
  const session = await buyerSession(page);
  const stockBefore = await product(request);
  expect(stockBefore.quantity).toBeGreaterThanOrEqual(1);

  await page.goto(`/transacciones/comprar/${CHECKOUT_PRODUCT}`);
  await expect(page.getByRole('heading', { name: 'Comprar Mora de Castilla' })).toBeVisible();
  // No domain is simulated any more (ADR-021): the notice is gone.
  await expect(page.getByText(/^Datos simulados:/)).toHaveCount(0);

  await page.getByLabel('Cantidad (canastas)').fill('1');
  const opened = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/chat/conversations'),
  );
  const agreed = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().endsWith('/purchase-method'),
  );
  // The page leaves right after E-40, so its body is read here, before the navigation.
  let started: { status: number; body: Checkout } | undefined;
  await page.route('**/api/v1/workflow/checkouts', async (route) => {
    const response = await route.fetch();
    started = { status: response.status(), body: (await response.json()) as Checkout };
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Ir a pagar' }).click();

  const conversation = (await (await opened).json()) as { id: string };
  expect((await opened).status()).toBe(200); // E-30 returns the seeded conversation (idempotent)
  expect(conversation.id).toBe(CHECKOUT_CONVERSATION);
  expect((await agreed).status()).toBe(200);
  await expect.poll(() => started?.status).toBe(201);
  const created = started!.body;
  expect(created.transaction.amountCents).toBe(AMOUNT_CENTS / 2);

  // E-32 from chat-api itself: the choice was stored, and only for its participants.
  const read = await request.get(`/api/v1/chat/conversations/${CHECKOUT_CONVERSATION}`, {
    headers: bearer(session),
  });
  expect(read).toBeOK();
  expect(await read.json()).toMatchObject({
    agreedPurchaseMethod: 'PLATFORM',
    buyerName: BUYER.name,
    productName: 'Mora de Castilla',
  });

  // The payment is settled so the next flow can buy from the same conversation.
  const webhook = await request.post('/api/v1/transactions/webhooks/payment-gateway', {
    data: paymentEvent(created.transaction.id, eventsSecret, AMOUNT_CENTS / 2),
  });
  expect(webhook).toBeOK();
  await page.goto(`/transacciones/${created.transaction.id}`);
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible({ timeout: 20_000 });
  expect((await product(request)).quantity).toBe(stockBefore.quantity - 1);
});
