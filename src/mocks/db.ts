import type { Role } from '../core/auth/session';

/** A user of the simulated auth domain. Development data only: never a real account. */
export interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

/** One seed user per role (README, "Simulated mode"). */
export const SEED_USERS: readonly SeedUser[] = [
  {
    id: '0b6f2c7e-4a51-4c1e-9d0e-2f1c3a7b9e10',
    name: 'Ana Ruiz',
    email: 'productor@market-agri.test',
    password: 'Productor123',
    role: 'PRODUCER',
  },
  {
    id: '6a1d9b2c-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
    name: 'Carlos Pérez',
    email: 'comprador@market-agri.test',
    password: 'Comprador123',
    role: 'BUYER',
  },
  {
    id: '9f8e7d6c-5b4a-4c3d-9e2f-1a0b9c8d7e6f',
    name: 'Administración',
    email: 'admin@market-agri.test',
    password: 'Admin123',
    role: 'ADMIN',
  },
];

/** `ProductView` of api-contract §4.2, plus the logical deletion that the API never shows. */
export interface MockProduct {
  id: string;
  producerId: string;
  producerName: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  price: number;
  currency: 'COP';
  municipality: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK';
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

type ProductFields = Pick<
  MockProduct,
  'name' | 'category' | 'unit' | 'quantity' | 'price' | 'municipality'
>;

/** A product as E-13 creates it: owner from the token, status from the quantity (INV-009). */
export function newProduct(
  id: string,
  owner: { id: string; name: string },
  fields: ProductFields,
  createdAt: string,
): MockProduct {
  return {
    id,
    producerId: owner.id,
    producerName: owner.name,
    ...fields,
    currency: 'COP',
    status: fields.quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
    photoUrl: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };
}

const ANA = SEED_USERS[0]!;
const LUIS = { id: '3c2b1a09-8f7e-4d6c-9b5a-4e3d2c1b0a99', name: 'Luis Gómez' };
type Row = [string, string, string, number, number, string, typeof ANA | typeof LUIS];

// name, category, unit, quantity, price (whole pesos, ADR-026), municipality, producer.
const ROWS: Row[] = [
  ['Café especial de altura', 'CAFE', 'ARROBA', 12.5, 185000, 'Garzón', ANA],
  ['Plátano hartón', 'FRUTAS', 'CANASTA', 30, 45000, 'Garzón', ANA],
  ['Cacao en grano', 'CACAO', 'KILOGRAMO', 80, 14000, 'Neiva', LUIS],
  ['Lulo', 'FRUTAS', 'KILOGRAMO', 0, 6000, 'Pitalito', LUIS],
  ['Queso campesino', 'LACTEOS', 'LIBRA', 20, 12000, 'La Plata', ANA],
];

/** Catalog seed: decimal quantities (D-C7), accented municipalities, one product out of stock. */
export const SEED_PRODUCTS: readonly MockProduct[] = ROWS.map(
  ([name, category, unit, quantity, price, municipality, owner], index) =>
    newProduct(
      `5e1f0c2a-7b3d-4e8f-9a6b-00000000000${index + 1}`,
      owner,
      { name, category, unit, quantity, price, municipality },
      `2026-10-0${index + 1}T14:00:00Z`,
    ),
);

/** State of the simulated domains while the page lives. */
export const mockDb = {
  /** Consecutive failed logins by email. */
  failedLogins: new Map<string, number>(),
  products: SEED_PRODUCTS.map((product) => ({ ...product })),
  /** Idempotency-Key of E-13 (by producer) → id of the product it created (D-C35). */
  productKeys: new Map<string, string>(),
};

/** Back to the seed: the tests start every case from it. */
export function resetMockDb(): void {
  mockDb.failedLogins.clear();
  mockDb.products = SEED_PRODUCTS.map((product) => ({ ...product }));
  mockDb.productKeys.clear();
}
