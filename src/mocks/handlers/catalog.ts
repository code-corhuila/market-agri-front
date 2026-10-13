import { http, HttpResponse } from 'msw';
import { requireRole } from '../caller';
import { mockDb, newProduct, type MockProduct } from '../db';
import { errorBody } from '../errorBody';
import { pageOf, readPage } from '../paging';

// api-contract §1.2 and E-19/E-20: codes and labels, in the fixed order of the contract.
const CATEGORIES = [
  ['FRUTAS', 'Frutas'],
  ['VERDURAS', 'Verduras'],
  ['HORTALIZAS', 'Hortalizas'],
  ['TUBERCULOS', 'Tubérculos'],
  ['GRANOS_Y_CEREALES', 'Granos y cereales'],
  ['CAFE', 'Café'],
  ['CACAO', 'Cacao'],
  ['LACTEOS', 'Lácteos'],
  ['HIERBAS_AROMATICAS', 'Hierbas aromáticas'],
  ['OTROS', 'Otros'],
] as const;
const UNITS = [
  ['KILOGRAMO', 'Kilogramo'],
  ['LIBRA', 'Libra'],
  ['ARROBA', 'Arroba'],
  ['BULTO', 'Bulto'],
  ['CANASTA', 'Canasta'],
  ['CAJA', 'Caja'],
  ['DOCENA', 'Docena'],
  ['MANOJO', 'Manojo'],
  ['LITRO', 'Litro'],
  ['UNIDAD', 'Unidad'],
] as const;
const lookup = (pairs: readonly (readonly [string, string])[]) =>
  pairs.map(([code, label]) => ({ code, label }));
const codes = (pairs: readonly (readonly [string, string])[]) => pairs.map(([code]) => code);

const STATUSES = ['ACTIVE', 'OUT_OF_STOCK'];
const MAX_QUANTITY = 9_999_999_999.99;
const MAX_PRICE = 999_999_999_999;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const INVALID = 'La solicitud tiene datos inválidos.';
const NOT_FOUND = 'El producto no existe.';
const NOT_OWNER = 'El producto pertenece a otro productor.';

type Detail = { field: string; message: string };

/** D-C7: a quantity has at most 2 decimals (12.5 kg yes, 1.125 no). */
const hasTwoDecimalsAtMost = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

/** `Garzón` = ` garzon ` (E-10): trimmed, without case nor accents. */
const fold = (text: string) =>
  text
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // the marks NFD splits from the letters (accents), nothing else
    .toLowerCase();

const view = ({ deletedAt: _deleted, ...product }: MockProduct) => product;
const visible = () => mockDb.products.filter((product) => product.deletedAt === null);
const statusFor = (quantity: number) => (quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK');

/** ProductWrite (§4.2): shape is 400, the domain rules are 422 (D-C22). */
function readWrite(body: Record<string, unknown>) {
  const details: Detail[] = [];
  const text = (field: string, max: number) => {
    const value = typeof body[field] === 'string' ? (body[field] as string).trim() : '';
    if (value.length < 1 || value.length > max)
      details.push({ field, message: `Debe tener entre 1 y ${max} caracteres.` });
    return value;
  };
  const oneOf = (field: string, allowed: string[]) => {
    if (!allowed.includes(body[field] as string))
      details.push({ field, message: 'Valor no permitido.' });
    return body[field] as string;
  };
  const name = text('name', 150);
  const category = oneOf('category', codes(CATEGORIES));
  const unit = oneOf('unit', codes(UNITS));
  const quantity = body.quantity as number;
  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    !hasTwoDecimalsAtMost(quantity) ||
    quantity > MAX_QUANTITY
  ) {
    details.push({ field: 'quantity', message: 'Debe ser un número con máximo 2 decimales.' });
  }
  const price = body.price as number;
  if (!Number.isInteger(price) || price > MAX_PRICE) {
    details.push({ field: 'price', message: 'Debe ser un valor entero en pesos.' });
  }
  const municipality = text('municipality', 100);
  return { details, product: { name, category, unit, quantity, price, municipality } };
}

/** A path {id}: 400 when it is not a UUID (D-C23), 404 when missing or deleted (D-C5). */
function find(request: Request, id: string): { product: MockProduct } | { refusal: Response } {
  if (!UUID.test(id))
    return {
      refusal: errorBody(request, 400, 'VALIDATION_ERROR', INVALID, [
        { field: 'id', message: 'No es un identificador válido.' },
      ]),
    };
  const product = visible().find((candidate) => candidate.id === id);
  return product
    ? { product }
    : { refusal: errorBody(request, 404, 'PRODUCT_NOT_FOUND', NOT_FOUND) };
}

function domainError(request: Request, { price, quantity }: { price: number; quantity: number }) {
  if (price <= 0)
    return errorBody(request, 422, 'PRICE_NOT_POSITIVE', 'El precio debe ser mayor que cero.');
  if (quantity < 0)
    return errorBody(request, 422, 'QUANTITY_NEGATIVE', 'La cantidad no puede ser negativa.');
  return null;
}

const bodyOf = async (request: Request) =>
  ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

/** E-10…E-14 and E-18…E-20 (api-contract §4.2). Photos (E-16/E-17) are not simulated. */
export const catalogHandlers = [
  http.get('*/api/v1/catalog/categories', () => HttpResponse.json(lookup(CATEGORIES))),
  http.get('*/api/v1/catalog/units', () => HttpResponse.json(lookup(UNITS))),

  http.get('*/api/v1/catalog/products/mine', ({ request }) => {
    const guard = requireRole(request, ['PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const url = new URL(request.url);
    const page = readPage(url, { status: STATUSES });
    if ('details' in page)
      return errorBody(request, 400, 'VALIDATION_ERROR', INVALID, page.details);
    const status = url.searchParams.get('status');
    const mine = visible().filter(
      (p) => p.producerId === guard.caller.id && (!status || p.status === status),
    );
    return HttpResponse.json(pageOf(mine, page, view));
  }),

  http.get('*/api/v1/catalog/products', ({ request }) => {
    const url = new URL(request.url);
    const page = readPage(url, { category: codes(CATEGORIES), status: STATUSES }, ['municipality']);
    if ('details' in page)
      return errorBody(request, 400, 'VALIDATION_ERROR', INVALID, page.details);
    const category = url.searchParams.get('category');
    const municipality = url.searchParams.get('municipality');
    const status = url.searchParams.get('status');
    const matches = visible().filter(
      (p) =>
        (!category || p.category === category) &&
        (municipality === null || fold(p.municipality) === fold(municipality)) &&
        (!status || p.status === status),
    );
    return HttpResponse.json(pageOf(matches, page, view));
  }),

  http.get('*/api/v1/catalog/products/:id', ({ request, params }) => {
    const found = find(request, String(params.id));
    return 'refusal' in found ? found.refusal : HttpResponse.json(view(found.product));
  }),

  http.post('*/api/v1/catalog/products', async ({ request }) => {
    const guard = requireRole(request, ['PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const key = request.headers.get('Idempotency-Key') ?? '';
    const { details, product } = readWrite(await bodyOf(request));
    if (key.length < 8 || key.length > 128)
      details.unshift({
        field: 'Idempotency-Key',
        message: 'Es obligatorio (8 a 128 caracteres).',
      });
    if (details.length > 0) return errorBody(request, 400, 'VALIDATION_ERROR', INVALID, details);
    const broken = domainError(request, product);
    if (broken) return broken;

    // D-C35: the replay answers 200 with the original, after validation.
    const replayOf = mockDb.productKeys.get(`${guard.caller.id}:${key}`);
    const original = mockDb.products.find((candidate) => candidate.id === replayOf);
    if (original) return HttpResponse.json(view(original));

    const created = newProduct(
      crypto.randomUUID(),
      guard.caller,
      product,
      new Date().toISOString(),
    );
    mockDb.products.push(created);
    mockDb.productKeys.set(`${guard.caller.id}:${key}`, created.id);
    return HttpResponse.json(view(created), {
      status: 201,
      headers: { Location: `/api/v1/catalog/products/${created.id}` },
    });
  }),

  http.put('*/api/v1/catalog/products/:id', async ({ request, params }) => {
    const guard = requireRole(request, ['PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const { details, product } = readWrite(await bodyOf(request));
    if (details.length > 0) return errorBody(request, 400, 'VALIDATION_ERROR', INVALID, details);
    const found = find(request, String(params.id));
    if ('refusal' in found) return found.refusal;
    if (found.product.producerId !== guard.caller.id)
      return errorBody(request, 403, 'NOT_PRODUCT_OWNER', NOT_OWNER);
    const broken = domainError(request, product);
    if (broken) return broken;
    // INV-009: the status always follows the new quantity (E-14, amended 2026-10-10).
    Object.assign(found.product, product, {
      status: statusFor(product.quantity),
      updatedAt: new Date().toISOString(),
    });
    return HttpResponse.json(view(found.product));
  }),

  http.delete('*/api/v1/catalog/products/:id', ({ request, params }) => {
    const guard = requireRole(request, ['PRODUCER']);
    if ('refusal' in guard) return guard.refusal;
    const found = find(request, String(params.id));
    if ('refusal' in found) return found.refusal;
    if (found.product.producerId !== guard.caller.id)
      return errorBody(request, 403, 'NOT_PRODUCT_OWNER', NOT_OWNER);
    found.product.deletedAt = new Date().toISOString(); // logical and terminal (D-C5)
    return new HttpResponse(null, { status: 204 });
  }),
];
