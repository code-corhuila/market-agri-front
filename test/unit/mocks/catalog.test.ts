// @vitest-environment jsdom
import { setupServer } from 'msw/node';
import { setSession, type Session } from '../../../src/core/auth/session';
import { apiClient } from '../../../src/core/http/apiClient';
import { ApiError } from '../../../src/core/http/apiError';
import { SEED_PRODUCTS, SEED_USERS, resetMockDb } from '../../../src/mocks/db';
import { handlersFor } from '../../../src/mocks/handlers';

// HU-PLAT-009 for the catalog domain (G1.9): E-10…E-14, E-18…E-20 of api-contract §4.2, with the
// same handlers as the simulated mode. Money in whole pesos (ADR-026), pages as in D-C24.
const GATEWAY = 'http://localhost:8080';
const PRODUCTS = '/api/v1/catalog/products';
const server = setupServer();

interface ProductView {
  id: string;
  producerId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  currency: string;
  municipality: string;
  status: string;
  photoUrl: string | null;
  createdAt: string;
}
interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const user = (role: string) => SEED_USERS.find((candidate) => candidate.role === role)!;
const write = {
  name: 'Mango tommy',
  category: 'FRUTAS',
  unit: 'KILOGRAMO',
  quantity: 40,
  price: 6500,
  municipality: 'Garzón',
};

async function loginAs(role: string) {
  const { email, password } = user(role);
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

const list = (query = '') => apiClient.get<Page<ProductView>>(`${PRODUCTS}${query}`);
const create = (body: unknown, key = crypto.randomUUID()) =>
  apiClient.post<ProductView>(PRODUCTS, body, { idempotencyKey: key });

beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
beforeEach(() => {
  vi.stubEnv('VITE_GATEWAY_URL', GATEWAY);
  resetMockDb();
  server.resetHandlers();
  server.use(...handlersFor(['auth', 'catalog']));
});
afterEach(() => {
  vi.unstubAllEnvs();
  sessionStorage.clear();
});
afterAll(() => server.close());

describe('simulated catalog: browse (E-10, E-11)', () => {
  it('lists anonymously as Page<T>, newest first, with prices as whole pesos', async () => {
    const page = await list();
    expect(page.meta).toEqual({ page: 1, limit: 20, total: SEED_PRODUCTS.length, totalPages: 1 });
    const dates = page.data.map((product) => product.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const product of page.data) {
      expect(Number.isInteger(product.price)).toBe(true);
      expect(product.currency).toBe('COP');
      expect(['ACTIVE', 'OUT_OF_STOCK']).toContain(product.status);
    }
  });

  it('filters by municipality without accents nor case, AND the category', async () => {
    const byPlace = await list('?municipality=%20garzon%20');
    expect(byPlace.data.length).toBeGreaterThan(0);
    expect(byPlace.data.every((product) => product.municipality === 'Garzón')).toBe(true);
    const both = await list('?municipality=GARZON&category=CAFE');
    expect(both.data.every((product) => product.category === 'CAFE')).toBe(true);
    expect(both.meta.total).toBeLessThan(byPlace.meta.total);
  });

  it('paginates with meta and answers an empty page past the last', async () => {
    const page = await list('?page=2&limit=2');
    expect(page.data).toHaveLength(2);
    expect(page.meta).toEqual({
      page: 2,
      limit: 2,
      total: SEED_PRODUCTS.length,
      totalPages: Math.ceil(SEED_PRODUCTS.length / 2),
    });
    expect((await list('?page=99')).data).toEqual([]);
  });

  it.each(['?limit=0', '?limit=101', '?page=0', '?page=uno', '?color=rojo', '?category=FLORES'])(
    'rejects %s with 400 VALIDATION_ERROR',
    async (query) => {
      const error = await failureOf(list(query));
      expect([error.status, error.error]).toEqual([400, 'VALIDATION_ERROR']);
    },
  );

  it('reads one product, 404 PRODUCT_NOT_FOUND for an unknown id and 400 for a bad one', async () => {
    const [first] = SEED_PRODUCTS;
    expect((await apiClient.get<ProductView>(`${PRODUCTS}/${first!.id}`)).name).toBe(first!.name);
    const missing = await failureOf(apiClient.get(`${PRODUCTS}/${crypto.randomUUID()}`));
    expect([missing.status, missing.error]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    const bad = await failureOf(apiClient.get(`${PRODUCTS}/no-es-uuid`));
    expect([bad.status, bad.details[0]?.field]).toEqual([400, 'id']);
  });
});

describe('simulated catalog: publish (E-13)', () => {
  it('asks for a session and the PRODUCER role', async () => {
    expect((await failureOf(create(write))).status).toBe(401);
    await loginAs('BUYER');
    const error = await failureOf(create(write));
    expect([error.status, error.error]).toEqual([403, 'FORBIDDEN']);
  });

  it('creates with 201 and Location; the same Idempotency-Key answers 200 with the original', async () => {
    await loginAs('PRODUCER');
    const headers = () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JSON.parse(sessionStorage.getItem('market-agri.session')!).accessToken}`,
      'Idempotency-Key': 'intencion-0001',
    });
    const first = await fetch(`${GATEWAY}${PRODUCTS}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(write),
    });
    const created = (await first.json()) as ProductView;
    expect(first.status).toBe(201);
    expect(first.headers.get('Location')).toBe(`${PRODUCTS}/${created.id}`);
    expect(created).toMatchObject({
      producerId: user('PRODUCER').id,
      price: 6500,
      currency: 'COP',
      status: 'ACTIVE',
      photoUrl: null,
    });

    const retry = await fetch(`${GATEWAY}${PRODUCTS}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(write),
    });
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as ProductView).id).toBe(created.id);
    expect((await list()).meta.total).toBe(SEED_PRODUCTS.length + 1);
  });

  it('derives OUT_OF_STOCK from a quantity of 0', async () => {
    await loginAs('PRODUCER');
    expect((await create({ ...write, quantity: 0 })).status).toBe('OUT_OF_STOCK');
  });

  it.each([
    ['a missing Idempotency-Key', undefined, write, 'Idempotency-Key'],
    ['a price with decimals', 'k-decimals', { ...write, price: 6500.5 }, 'price'],
    ['a price as text', 'k-text-price', { ...write, price: '6500' }, 'price'],
    ['an unknown unit', 'k-unit', { ...write, unit: 'TONELADA' }, 'unit'],
    ['a quantity with 3 decimals', 'k-qty', { ...write, quantity: 1.125 }, 'quantity'],
    ['an empty name', 'k-name', { ...write, name: '  ' }, 'name'],
  ])('rejects %s with 400 naming the field', async (_case, key, body, field) => {
    await loginAs('PRODUCER');
    const error = await failureOf(
      apiClient.post(PRODUCTS, body, key ? { idempotencyKey: key } : {}),
    );
    expect([error.status, error.error]).toEqual([400, 'VALIDATION_ERROR']);
    expect(error.details.map((detail) => detail.field)).toContain(field);
  });

  it.each([
    [{ ...write, price: 0 }, 'PRICE_NOT_POSITIVE', 'El precio debe ser mayor que cero.'],
    [{ ...write, quantity: -1 }, 'QUANTITY_NEGATIVE', 'La cantidad no puede ser negativa.'],
  ])('breaks a domain rule with 422 %#', async (body, code, message) => {
    await loginAs('PRODUCER');
    const error = await failureOf(create(body));
    expect([error.status, error.error, error.message]).toEqual([422, code, message]);
  });
});

describe('simulated catalog: my products, edit and delete (E-12, E-14, E-18)', () => {
  const othersProduct = () =>
    SEED_PRODUCTS.find((product) => product.producerId !== user('PRODUCER').id)!;
  const ownProduct = () =>
    SEED_PRODUCTS.find((product) => product.producerId === user('PRODUCER').id)!;

  it('lists only the products of the producer', async () => {
    await loginAs('PRODUCER');
    const mine = await apiClient.get<Page<ProductView>>(`${PRODUCTS}/mine`);
    expect(mine.data.length).toBeGreaterThan(0);
    expect(mine.data.every((product) => product.producerId === user('PRODUCER').id)).toBe(true);
  });

  it('replaces a product and derives its status from the new quantity', async () => {
    await loginAs('PRODUCER');
    const edited = await apiClient.put<ProductView>(`${PRODUCTS}/${ownProduct().id}`, {
      ...write,
      quantity: 0,
      price: 7000,
    });
    expect(edited).toMatchObject({ id: ownProduct().id, price: 7000, status: 'OUT_OF_STOCK' });
  });

  it('answers 403 NOT_PRODUCT_OWNER on a product of another producer', async () => {
    await loginAs('PRODUCER');
    for (const request of [
      apiClient.put(`${PRODUCTS}/${othersProduct().id}`, write),
      apiClient.delete(`${PRODUCTS}/${othersProduct().id}`),
    ]) {
      const error = await failureOf(request);
      expect([error.status, error.error]).toEqual([403, 'NOT_PRODUCT_OWNER']);
    }
  });

  it('deletes logically: 404 everywhere afterwards and absent from every list', async () => {
    await loginAs('PRODUCER');
    const { id } = ownProduct();
    await apiClient.delete(`${PRODUCTS}/${id}`);
    expect((await failureOf(apiClient.get(`${PRODUCTS}/${id}`))).error).toBe('PRODUCT_NOT_FOUND');
    expect((await failureOf(apiClient.delete(`${PRODUCTS}/${id}`))).status).toBe(404);
    expect((await list()).data.some((product) => product.id === id)).toBe(false);
    const mine = await apiClient.get<Page<ProductView>>(`${PRODUCTS}/mine`);
    expect(mine.data.some((product) => product.id === id)).toBe(false);
  });
});

describe('simulated catalog: lookups (E-19, E-20)', () => {
  it('answers the categories and the units in the fixed order of the contract', async () => {
    const categories = await apiClient.get<{ code: string; label: string }[]>(
      '/api/v1/catalog/categories',
    );
    expect(categories).toHaveLength(10);
    expect(categories[5]).toEqual({ code: 'CAFE', label: 'Café' });
    const units = await apiClient.get<{ code: string; label: string }[]>('/api/v1/catalog/units');
    expect(units.map((unit) => unit.code)).toEqual([
      'KILOGRAMO',
      'LIBRA',
      'ARROBA',
      'BULTO',
      'CANASTA',
      'CAJA',
      'DOCENA',
      'MANOJO',
      'LITRO',
      'UNIDAD',
    ]);
  });
});
