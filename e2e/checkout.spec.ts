import { createHash, randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// HU-PLAT-006, E2E flows 4 and 5 (11-quality/testing-strategy.md): this is a characterization
// test of the real checkout closure. Chat is deliberately still simulated, so the test addresses
// the single I-05 WireMock fixture installed by market-agri-infra#43. Everything after I-05 is
// real: gateway, workflow, catalog reservation, transactions, RabbitMQ and the E-41 portal.

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

function paymentEvent(reference: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const gatewayId = `e2e-${randomUUID()}`;
  const status = 'APPROVED';
  const checksum = createHash('sha256')
    .update(`${gatewayId}${status}${AMOUNT_CENTS}${timestamp}${secret}`, 'utf8')
    .digest('hex');
  return {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: gatewayId,
        amount_in_cents: AMOUNT_CENTS,
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
  await expect(page.getByText('Confirmada')).toBeVisible({ timeout: 20_000 });
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
