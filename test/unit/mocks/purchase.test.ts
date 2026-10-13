// @vitest-environment jsdom
import { setupServer } from 'msw/node';
import { setSession, type Session } from '../../../src/core/auth/session';
import { apiClient } from '../../../src/core/http/apiClient';
import { ApiError } from '../../../src/core/http/apiError';
import { SEED_PRODUCTS, SEED_USERS, mockDb, resetMockDb } from '../../../src/mocks/db';
import { handlersFor } from '../../../src/mocks/handlers';

// HU-PLAT-009 for the purchase (G1.10): chat E-30/E-32/E-34, the checkout saga E-40 (workflow)
// and transactions E-41/E-42, with the same handlers as the simulated mode. Money in whole pesos.
const GATEWAY = 'http://localhost:8080';
const server = setupServer();
const coffee = SEED_PRODUCTS[0]!; // Ana's, 12.5 arrobas at $ 185.000
const outOfStock = SEED_PRODUCTS.find((product) => product.status === 'OUT_OF_STOCK')!;

interface Conversation {
  id: string;
  productId: string;
  buyerId: string;
  producerId: string;
  productName: string;
  agreedPurchaseMethod: string | null;
}
interface Transaction {
  id: string;
  status: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  producerId: string;
  ledger: { grossAmount: number; platformFee: number; netAmount: number; status: string } | null;
}
interface Checkout {
  transaction: Transaction;
  checkoutUrl: string;
}

async function loginAs(role: string) {
  const { email, password } = SEED_USERS.find((user) => user.role === role)!;
  setSession(await apiClient.post<Session>('/api/v1/auth/login', { email, password }));
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('the request did not fail');
}

const open = (productId: string) =>
  apiClient.post<Conversation>('/api/v1/chat/conversations', { productId });
const agree = (id: string, method: unknown) =>
  apiClient.put<Conversation>(`/api/v1/chat/conversations/${id}/purchase-method`, { method });
const checkout = (conversationId: string, quantity: unknown, key: string = crypto.randomUUID()) =>
  apiClient.post<Checkout>(
    '/api/v1/workflow/checkouts',
    { conversationId, quantity },
    { idempotencyKey: key },
  );
const stockOf = (id: string) => mockDb.products.find((product) => product.id === id)!.quantity;

/** The buyer opens a conversation about a product and agrees to pay through the platform. */
async function readyToBuy(productId = coffee.id) {
  await loginAs('BUYER');
  const conversation = await open(productId);
  await agree(conversation.id, 'PLATFORM');
  return conversation;
}

beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
beforeEach(() => {
  vi.stubEnv('VITE_GATEWAY_URL', GATEWAY);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-13T15:00:00Z'));
  resetMockDb();
  server.resetHandlers();
  server.use(...handlersFor(['auth', 'catalog', 'chat', 'transactions', 'workflow']));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  sessionStorage.clear();
});
afterAll(() => server.close());

describe('simulated chat: the conversation of a purchase (E-30, E-32, E-34)', () => {
  it('opens one conversation per product and buyer, with the snapshots of the product', async () => {
    await loginAs('BUYER');
    const first = await open(coffee.id);
    expect(first).toMatchObject({
      productId: coffee.id,
      productName: coffee.name,
      producerId: coffee.producerId,
      agreedPurchaseMethod: null,
    });
    expect((await open(coffee.id)).id).toBe(first.id);
    const read = await apiClient.get<Conversation>(`/api/v1/chat/conversations/${first.id}`);
    expect(read.id).toBe(first.id);
  });

  it('is for buyers, about products that exist', async () => {
    await loginAs('BUYER');
    const missing = await failureOf(open(crypto.randomUUID()));
    expect([missing.status, missing.error]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    await loginAs('PRODUCER');
    expect((await failureOf(open(coffee.id))).status).toBe(403);
  });

  it('stores the purchase method and rejects any other value', async () => {
    const conversation = await readyToBuy();
    const read = await apiClient.get<Conversation>(`/api/v1/chat/conversations/${conversation.id}`);
    expect(read.agreedPurchaseMethod).toBe('PLATFORM');
    const error = await failureOf(agree(conversation.id, 'EFECTIVO'));
    expect([error.status, error.details[0]?.field]).toEqual([400, 'method']);
  });
});

describe('simulated checkout saga (E-40)', () => {
  it('reserves the stock and creates a PENDING payment priced by the reservation', async () => {
    const conversation = await readyToBuy();
    const { transaction, checkoutUrl } = await checkout(conversation.id, 2.5);
    expect(transaction).toMatchObject({
      status: 'PENDING',
      quantity: 2.5,
      unitPrice: 185000,
      amount: 462500,
      currency: 'COP',
      ledger: null,
    });
    expect(checkoutUrl).toBe(`/transacciones/${transaction.id}`);
    expect(stockOf(coffee.id)).toBe(10);
  });

  it('rounds the amount half up to whole pesos', async () => {
    mockDb.products.find((product) => product.id === coffee.id)!.price = 333;
    const conversation = await readyToBuy();
    expect((await checkout(conversation.id, 1.5)).transaction.amount).toBe(500); // 499.5
  });

  it('answers a retry with the same Idempotency-Key with the original, reserving once', async () => {
    const conversation = await readyToBuy();
    const first = await checkout(conversation.id, 2, 'compra-0001');
    const again = await checkout(conversation.id, 2, 'compra-0001');
    expect(again.transaction.id).toBe(first.transaction.id);
    expect(stockOf(coffee.id)).toBe(10.5);
  });

  it('refuses more than the stock with INSUFFICIENT_STOCK and creates nothing', async () => {
    const conversation = await readyToBuy();
    const error = await failureOf(checkout(conversation.id, 20));
    expect([error.status, error.error, error.message]).toEqual([
      409,
      'INSUFFICIENT_STOCK',
      'Cantidad insuficiente: hay 12.5 disponibles y se solicitaron 20.',
    ]);
    expect(stockOf(coffee.id)).toBe(12.5);
    const mine = await apiClient.get<{ data: Transaction[] }>('/api/v1/transactions/mine');
    expect(mine.data).toEqual([]);
  });

  it.each([
    ['the method was not agreed', 409, 'PURCHASE_METHOD_NOT_PLATFORM'],
    ['the product is out of stock', 409, 'PRODUCT_NOT_AVAILABLE'],
  ])('refuses when %s', async (reason, status, code) => {
    await loginAs('BUYER');
    const conversation = await open(reason.includes('stock') ? outOfStock.id : coffee.id);
    if (reason.includes('stock')) await agree(conversation.id, 'PLATFORM');
    const error = await failureOf(checkout(conversation.id, 1));
    expect([error.status, error.error]).toEqual([status, code]);
  });

  it('allows one payment in progress per conversation, and its stock stays reserved once', async () => {
    const conversation = await readyToBuy();
    await checkout(conversation.id, 2);
    const error = await failureOf(checkout(conversation.id, 1));
    expect([error.status, error.error]).toEqual([409, 'TRANSACTION_IN_PROGRESS']);
    expect(stockOf(coffee.id)).toBe(10.5);
  });

  it.each([
    [0, 422, 'QUANTITY_NOT_POSITIVE'],
    ['2', 400, 'VALIDATION_ERROR'],
    [1.125, 400, 'VALIDATION_ERROR'],
  ])('rejects the quantity %j with %i', async (quantity, status, code) => {
    const conversation = await readyToBuy();
    const error = await failureOf(checkout(conversation.id, quantity));
    expect([error.status, error.error]).toEqual([status, code]);
  });

  it('is for the buyer of an existing conversation', async () => {
    await loginAs('BUYER');
    const missing = await failureOf(checkout(crypto.randomUUID(), 1));
    expect([missing.status, missing.error]).toEqual([404, 'CONVERSATION_NOT_FOUND']);
    await loginAs('PRODUCER');
    expect((await failureOf(checkout(crypto.randomUUID(), 1))).status).toBe(403);
  });
});

describe('simulated transactions (E-41, E-42)', () => {
  it('confirms the simulated payment after a few seconds; the ledger is for the producer', async () => {
    const conversation = await readyToBuy();
    const { transaction } = await checkout(conversation.id, 2);
    const path = `/api/v1/transactions/${transaction.id}`;
    expect((await apiClient.get<Transaction>(path)).status).toBe('PENDING');

    vi.setSystemTime(new Date('2026-10-13T15:00:10Z'));
    const confirmed = await apiClient.get<Transaction>(path);
    expect(confirmed).toMatchObject({ status: 'CONFIRMED', ledger: null });

    await loginAs('PRODUCER');
    expect((await apiClient.get<Transaction>(path)).ledger).toMatchObject({
      grossAmount: 370000,
      platformFee: 0,
      netAmount: 370000,
      status: 'PENDING_DISBURSEMENT',
    });
  });

  it('lists the purchases of the buyer and the sales of the producer', async () => {
    const conversation = await readyToBuy();
    const { transaction } = await checkout(conversation.id, 1);
    const mine = () =>
      apiClient.get<{ data: Transaction[]; meta: { total: number } }>('/api/v1/transactions/mine');
    expect((await mine()).data.map((item) => item.id)).toEqual([transaction.id]);
    await loginAs('PRODUCER');
    expect((await mine()).data.map((item) => item.id)).toEqual([transaction.id]);
    await loginAs('ADMIN');
    expect((await failureOf(mine())).status).toBe(403);
  });

  it('answers 404 TRANSACTION_NOT_FOUND for an unknown id', async () => {
    await loginAs('BUYER');
    const error = await failureOf(apiClient.get(`/api/v1/transactions/${crypto.randomUUID()}`));
    expect([error.status, error.error]).toEqual([404, 'TRANSACTION_NOT_FOUND']);
  });
});
