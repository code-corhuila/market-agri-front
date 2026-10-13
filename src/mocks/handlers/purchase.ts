import { http, HttpResponse } from 'msw';
import { requireRole } from '../caller';
import { mockDb, type MockConversation, type MockTransaction } from '../db';
import { errorBody } from '../errorBody';
import { pageOf, readPage } from '../paging';

// The purchase of api-contract §4.3–§4.4 and E-40: one conversation per product and buyer, the
// checkout saga (reserve the stock, then create the payment) and the transactions it leaves.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const INVALID = 'La solicitud tiene datos inválidos.';
const METHODS = ['PLATFORM', 'OFF_PLATFORM'];
const TRANSACTION_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED'];
/** The simulated payment gateway confirms a payment this long after it starts (no Stripe here). */
export const SIMULATED_PAYMENT_MS = 5_000;

const invalid = (request: Request, field: string, message: string) =>
  errorBody(request, 400, 'VALIDATION_ERROR', INVALID, [{ field, message }]);
const bodyOf = async (request: Request) =>
  ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
const now = () => new Date().toISOString();

/** Quantity of D-C7: a number with at most 2 decimals, in hundredths to compute exactly. */
function hundredths(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const scaled = Math.round(value * 100);
  return Math.abs(value * 100 - scaled) < 1e-6 ? scaled : null;
}

/** D-C11 with ADR-026: round_half_up(quantity × unitPrice, 0), in integers. */
const amountOf = (quantityHundredths: number, unitPrice: number) =>
  Math.floor((quantityHundredths * unitPrice + 50) / 100);

/** What the gateway's webhook (E-43) would do: a PENDING payment is confirmed after a while. */
function settle(transaction: MockTransaction): MockTransaction {
  const due = Date.parse(transaction.createdAt) + SIMULATED_PAYMENT_MS;
  if (transaction.status === 'PENDING' && Date.now() >= due) {
    Object.assign(transaction, { status: 'CONFIRMED', confirmedAt: new Date(due).toISOString() });
  }
  return transaction;
}

/** TransactionView: the ledger only when CONFIRMED and for the producer or ADMIN (§4.4). */
function viewFor(callerId: string, role: string) {
  return (transaction: MockTransaction) => {
    const { amount, status, confirmedAt, producerId } = settle(transaction);
    const seesLedger = status === 'CONFIRMED' && (role === 'ADMIN' || callerId === producerId);
    const ledger = seesLedger
      ? {
          grossAmount: amount,
          platformFee: 0,
          netAmount: amount,
          currency: 'COP',
          status: 'PENDING_DISBURSEMENT',
          createdAt: confirmedAt,
        }
      : null;
    return { ...transaction, ledger };
  };
}

function conversationFor(request: Request, id: string, callerId: string) {
  const conversation = mockDb.conversations.find((candidate) => candidate.id === id);
  if (!conversation) {
    return errorBody(request, 404, 'CONVERSATION_NOT_FOUND', 'La conversación no existe.');
  }
  if (callerId !== conversation.buyerId && callerId !== conversation.producerId) {
    return errorBody(request, 403, 'NOT_A_PARTICIPANT', 'No participa en esta conversación.');
  }
  return conversation;
}

export const chatHandlers = [
  // E-30: idempotent on (productId, buyerId); the snapshots come from the product (I-02).
  http.post('*/api/v1/chat/conversations', async ({ request }) => {
    const guard = requireRole(request, ['BUYER']);
    if ('refusal' in guard) return guard.refusal;
    const { productId } = await bodyOf(request);
    if (typeof productId !== 'string' || !UUID.test(productId)) {
      return invalid(request, 'productId', 'Debe ser un identificador válido.');
    }
    const buyer = guard.caller;
    const existing = mockDb.conversations.find(
      (candidate) => candidate.productId === productId && candidate.buyerId === buyer.id,
    );
    if (existing) return HttpResponse.json(existing);
    const product = mockDb.products.find((p) => p.id === productId && p.deletedAt === null);
    if (!product) return errorBody(request, 404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');
    const conversation: MockConversation = {
      id: crypto.randomUUID(),
      productId,
      productName: product.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      producerId: product.producerId,
      producerName: product.producerName,
      agreedPurchaseMethod: null,
      lastMessageAt: null,
      createdAt: now(),
    };
    mockDb.conversations.push(conversation);
    return HttpResponse.json(conversation, {
      status: 201,
      headers: { Location: `/api/v1/chat/conversations/${conversation.id}` },
    });
  }),

  // E-32
  http.get('*/api/v1/chat/conversations/:id', ({ request, params }) => {
    const guard = requireRole(request, ['BUYER', 'PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const found = conversationFor(request, String(params.id), guard.caller.id);
    return found instanceof Response ? found : HttpResponse.json(found);
  }),

  // E-34: last write wins.
  http.put('*/api/v1/chat/conversations/:id/purchase-method', async ({ request, params }) => {
    const guard = requireRole(request, ['BUYER', 'PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const { method } = await bodyOf(request);
    if (!METHODS.includes(method as string)) {
      return invalid(request, 'method', 'Valor no permitido.');
    }
    const found = conversationFor(request, String(params.id), guard.caller.id);
    if (found instanceof Response) return found;
    found.agreedPurchaseMethod = method as MockConversation['agreedPurchaseMethod'];
    return HttpResponse.json(found);
  }),
];

export const workflowHandlers = [
  // E-40, the checkout saga: errors in the order of the card; nothing is reserved on a refusal.
  http.post('*/api/v1/workflow/checkouts', async ({ request }) => {
    const guard = requireRole(request, ['BUYER']);
    if ('refusal' in guard) return guard.refusal;
    const buyer = guard.caller;
    const key = request.headers.get('Idempotency-Key') ?? '';
    if (key.length < 8 || key.length > 128) {
      return invalid(request, 'Idempotency-Key', 'Es obligatorio (8 a 128 caracteres).');
    }
    const { conversationId, quantity } = await bodyOf(request);
    if (typeof conversationId !== 'string' || !UUID.test(conversationId)) {
      return invalid(request, 'conversationId', 'Debe ser un identificador válido.');
    }
    const wanted = hundredths(quantity);
    if (wanted === null) {
      return invalid(request, 'quantity', 'Debe ser un número con máximo 2 decimales.');
    }
    if (wanted <= 0) {
      const message = 'La cantidad debe ser mayor que cero.';
      return errorBody(request, 422, 'QUANTITY_NOT_POSITIVE', message);
    }

    const replayOf = mockDb.checkoutKeys.get(`${buyer.id}:${key}`);
    const original = mockDb.transactions.find((candidate) => candidate.id === replayOf);
    const view = viewFor(buyer.id, buyer.role);
    if (original) {
      return HttpResponse.json({ transaction: view(original), checkoutUrl: checkoutUrl(original) });
    }

    const conversation = mockDb.conversations.find((candidate) => candidate.id === conversationId);
    if (!conversation) {
      return errorBody(request, 404, 'CONVERSATION_NOT_FOUND', 'La conversación no existe.');
    }
    if (conversation.buyerId !== buyer.id) {
      const message = 'Solo el comprador de la conversación puede iniciar el pago.';
      return errorBody(request, 403, 'NOT_CONVERSATION_BUYER', message);
    }
    if (conversation.agreedPurchaseMethod !== 'PLATFORM') {
      const message = 'La forma de compra acordada no es por la plataforma.';
      return errorBody(request, 409, 'PURCHASE_METHOD_NOT_PLATFORM', message);
    }
    const product = mockDb.products.find((p) => p.id === conversation.productId);
    if (!product || product.deletedAt !== null || product.status !== 'ACTIVE') {
      const message = 'El producto no está disponible para la venta.';
      return errorBody(request, 409, 'PRODUCT_NOT_AVAILABLE', message);
    }
    const available = Math.round(product.quantity * 100);
    if (wanted > available) {
      const message = `Cantidad insuficiente: hay ${product.quantity} disponibles y se solicitaron ${quantity}.`;
      return errorBody(request, 409, 'INSUFFICIENT_STOCK', message);
    }
    // I-06 refuses a second PENDING payment; the saga releases the reservation (I-04): net, nothing.
    if (
      mockDb.transactions.some(
        (t) => t.conversationId === conversationId && settle(t).status === 'PENDING',
      )
    ) {
      return errorBody(
        request,
        409,
        'TRANSACTION_IN_PROGRESS',
        'Ya hay un pago en curso para esta conversación.',
      );
    }

    // I-03: reserve at the current price; I-06: the PENDING payment priced by the reservation.
    product.quantity = (available - wanted) / 100;
    product.status = product.quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
    const { buyerName, producerId, producerName, productId, productName } = conversation;
    const transaction: MockTransaction = {
      id: crypto.randomUUID(),
      conversationId,
      productId,
      productName,
      buyerId: buyer.id,
      buyerName,
      producerId,
      producerName,
      quantity: wanted / 100,
      unit: product.unit,
      unitPrice: product.price,
      amount: amountOf(wanted, product.price),
      currency: 'COP',
      status: 'PENDING',
      createdAt: now(),
      confirmedAt: null,
      failedAt: null,
    };
    mockDb.transactions.push(transaction);
    mockDb.checkoutKeys.set(`${buyer.id}:${key}`, transaction.id);
    return HttpResponse.json(
      { transaction: view(transaction), checkoutUrl: checkoutUrl(transaction) },
      { status: 201, headers: { Location: `/api/v1/transactions/${transaction.id}` } },
    );
  }),
];

/** Instead of Stripe Checkout, the page of the transaction in this application (same origin). */
const checkoutUrl = (transaction: MockTransaction) => `/transacciones/${transaction.id}`;

export const transactionsHandlers = [
  // E-42: the buyer's purchases or the producer's sales. Before /:id, which would match "mine".
  http.get('*/api/v1/transactions/mine', ({ request }) => {
    const guard = requireRole(request, ['BUYER', 'PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const { id, role } = guard.caller;
    const url = new URL(request.url);
    const page = readPage(url, ['status'], { status: TRANSACTION_STATUSES });
    if ('details' in page)
      return errorBody(request, 400, 'VALIDATION_ERROR', INVALID, page.details);
    const status = url.searchParams.get('status');
    const mine = mockDb.transactions
      .map(settle)
      .filter((t) => (role === 'BUYER' ? t.buyerId : t.producerId) === id)
      .filter((t) => !status || t.status === status);
    return HttpResponse.json(pageOf(mine, page, viewFor(id, role)));
  }),

  // E-41
  http.get('*/api/v1/transactions/:id', ({ request, params }) => {
    const guard = requireRole(request, ['BUYER', 'PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const { id, role } = guard.caller;
    const transaction = mockDb.transactions.find((candidate) => candidate.id === params.id);
    if (!transaction) {
      return errorBody(request, 404, 'TRANSACTION_NOT_FOUND', 'La transacción no existe.');
    }
    if (id !== transaction.buyerId && id !== transaction.producerId) {
      return errorBody(request, 403, 'NOT_A_PARTICIPANT', 'No participa en esta transacción.');
    }
    return HttpResponse.json(viewFor(id, role)(transaction));
  }),
];
