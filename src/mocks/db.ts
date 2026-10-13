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

/** State of the simulated domains while the page lives: consecutive failed logins by email. */
export const mockDb = { failedLogins: new Map<string, number>() };

/** Back to the seed: the tests start every case from it. */
export function resetMockDb(): void {
  mockDb.failedLogins.clear();
}
