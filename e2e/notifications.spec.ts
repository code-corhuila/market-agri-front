import { createHash, randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';

// HU-PLAT-007, E2E flow 6 (11-quality/testing-strategy.md; ADR-016): the confirmation emails.
// A purchase goes through the real chain (workflow, catalog, transactions, RabbitMQ) to the worker,
// which emails the buyer and the producer through Mailpit; then the same TransactionConfirmed is
// delivered twice to the worker's queue and the second delivery must email no one.
// Mailpit and RabbitMQ publish no port (Annex F). Before the run, forward both to 127.0.0.1 with
// socat (market-agri-infra README, "Mailpit") and pass E2E_MAILPIT_URL and E2E_RABBITMQ_URL; the
// broker administrator (E2E_RABBITMQ_USER, E2E_RABBITMQ_PASSWORD) and E2E_WOMPI_EVENTS_SECRET are
// read from env/qa.env, never committed or printed.

const BUYER = {
  id: '6a1d9b2c-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
  email: 'comprador@market-agri.test',
  password: 'Comprador123',
};
const PRODUCER = {
  id: '0b6f2c7e-4a51-4c1e-9d0e-2f1c3a7b9e10',
  email: 'productor@market-agri.test',
};
const CHECKOUT_CONVERSATION = '7e0b1d2c-3a4f-4b5c-8d6e-9f0a1b2c3d4e';
const CHECKOUT_PRODUCT = '5e1f0c2a-7b3d-4e8f-9a6b-000000000021';
const UNIT_PRICE_CENTS = 8_500_000;
const WORKER_QUEUE = 'worker.transaction-confirmed';
const EMAILS_TIMEOUT = 30_000;

// What the two notices of one transaction look like: "<subject> → <address>", sorted.
const BOTH_NOTICES = [
  `Su compra fue confirmada → ${BUYER.email}`,
  `Tiene una venta confirmada → ${PRODUCER.email}`,
];

type Mail = { ID: string; Subject: string; To: { Address: string }[]; Text: string };

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required by E2E flow 6 (see the top of this file).`);
  return value;
}

// The notices whose text links to the transaction: Mailpit's search, checked against the body.
async function notices(request: APIRequestContext, transactionId: string): Promise<string[]> {
  const mailpit = required('E2E_MAILPIT_URL');
  const search = await request.get(`${mailpit}/api/v1/search`, {
    params: { query: transactionId, limit: 50 },
  });
  expect(search).toBeOK();
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  const found = await Promise.all(
    messages.map(async ({ ID }) => {
      const message = await request.get(`${mailpit}/api/v1/message/${ID}`);
      expect(message).toBeOK();
      return (await message.json()) as Mail;
    }),
  );
  return found
    .filter((mail) => mail.Text.includes(`/transacciones/${transactionId}`))
    .map((mail) => `${mail.Subject} → ${mail.To.map((to) => to.Address).join(', ')}`)
    .sort();
}

function paymentEvent(reference: string, amountCents: number, secret: string) {
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

// A TransactionConfirmed with the envelope and payload of api-contract §6.
function transactionConfirmed(transactionId: string) {
  const now = new Date().toISOString();
  return {
    eventId: randomUUID(),
    eventType: 'TransactionConfirmed',
    aggregateId: transactionId,
    aggregateType: 'Transaction',
    occurredAt: now,
    version: 1,
    payload: {
      transactionId,
      conversationId: CHECKOUT_CONVERSATION,
      productId: CHECKOUT_PRODUCT,
      productName: 'Mora de Castilla',
      buyerId: BUYER.id,
      producerId: PRODUCER.id,
      quantity: 1,
      unit: 'CANASTA',
      unitPriceCents: UNIT_PRICE_CENTS,
      amountCents: UNIT_PRICE_CENTS,
      currency: 'COP',
      confirmedAt: now,
    },
    metadata: { correlationId: randomUUID(), causationId: null, userId: null },
  };
}

// Puts the event straight into the worker's queue (default exchange), as a broker redelivery would.
async function deliverToWorker(request: APIRequestContext, event: object) {
  const broker = required('E2E_RABBITMQ_URL');
  const credentials = `${required('E2E_RABBITMQ_USER')}:${required('E2E_RABBITMQ_PASSWORD')}`;
  const response = await request.post(`${broker}/api/exchanges/%2F/amq.default/publish`, {
    headers: { Authorization: `Basic ${Buffer.from(credentials).toString('base64')}` },
    data: {
      properties: { content_type: 'application/json', delivery_mode: 2 },
      routing_key: WORKER_QUEUE,
      payload: JSON.stringify(event),
      payload_encoding: 'string',
    },
  });
  expect(response).toBeOK();
  expect(await response.json()).toEqual({ routed: true });
}

test('a confirmed purchase emails the buyer and the producer once, with the link to the transaction', async ({
  request,
}) => {
  const eventsSecret = required('E2E_WOMPI_EVENTS_SECRET');
  const login = await request.post('/api/v1/auth/login', {
    data: { email: BUYER.email, password: BUYER.password },
  });
  expect(login).toBeOK();
  const { accessToken } = (await login.json()) as { accessToken: string };

  const checkout = await request.post('/api/v1/workflow/checkouts', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Idempotency-Key': `e2e-notifications-${randomUUID()}`,
    },
    data: { conversationId: CHECKOUT_CONVERSATION, quantity: 1 },
  });
  expect(checkout.status()).toBe(201);
  const { transaction } = (await checkout.json()) as {
    transaction: { id: string; amountCents: number };
  };
  expect(transaction.amountCents).toBe(UNIT_PRICE_CENTS);

  const webhook = await request.post('/api/v1/transactions/webhooks/payment-gateway', {
    data: paymentEvent(transaction.id, transaction.amountCents, eventsSecret),
  });
  expect(webhook).toBeOK();

  await expect
    .poll(() => notices(request, transaction.id), { timeout: EMAILS_TIMEOUT })
    .toEqual(BOTH_NOTICES);
});

test('a TransactionConfirmed delivered twice emails each recipient only once', async ({
  request,
}) => {
  const duplicated = transactionConfirmed(randomUUID());
  const sentinel = transactionConfirmed(randomUUID());

  await deliverToWorker(request, duplicated);
  await deliverToWorker(request, duplicated);
  await deliverToWorker(request, sentinel);

  // The worker takes one message at a time, in order: once the sentinel's notices exist, both
  // deliveries of the duplicated event were already handled.
  await expect
    .poll(() => notices(request, sentinel.payload.transactionId), { timeout: EMAILS_TIMEOUT })
    .toEqual(BOTH_NOTICES);
  expect(await notices(request, duplicated.payload.transactionId)).toEqual(BOTH_NOTICES);
});
