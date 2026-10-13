// @vitest-environment jsdom
import { setupServer } from 'msw/node';
import { getSession, setSession, type Session } from '../../../src/core/auth/session';
import { apiClient } from '../../../src/core/http/apiClient';
import { ApiError } from '../../../src/core/http/apiError';
import { SEED_USERS, resetMockDb } from '../../../src/mocks/db';
import { handlersFor } from '../../../src/mocks/handlers';

// HU-PLAT-009 with the same handlers as the simulated mode (scenario 3): E-02 of the API
// contract (POST /api/v1/auth/login, D-C3) answered by the simulated auth domain (scenario 4).
const GATEWAY = 'http://localhost:8080';
const producer = SEED_USERS.find((user) => user.role === 'PRODUCER')!;
const server = setupServer();

function claimsOf(token: string) {
  const [header, payload] = token.split('.').map((part) => JSON.parse(atob(part || 'e30')));
  return { header, payload };
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

const login = (email: string, password: string) =>
  apiClient.post<Session & { refreshToken: string }>('/api/v1/auth/login', { email, password });

beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
beforeEach(() => {
  vi.stubEnv('VITE_GATEWAY_URL', GATEWAY);
  resetMockDb();
  server.resetHandlers(); // back to no handler at all, then the domains of each case
  server.use(...handlersFor(['auth']));
});
afterEach(() => {
  vi.unstubAllEnvs();
  sessionStorage.clear();
});
afterAll(() => server.close());

describe('simulated auth: login (E-02)', () => {
  it('signs a seed user in with the AuthResponse of the contract, never the password', async () => {
    const body = await login(` ${producer.email.toUpperCase()} `, producer.password);
    expect(Object.keys(body).sort()).toEqual(['accessToken', 'expiresAt', 'refreshToken', 'user']);
    expect(body.user).toEqual({
      id: producer.id,
      name: producer.name,
      email: producer.email,
      role: 'PRODUCER',
    });
    expect(JSON.stringify(body)).not.toContain(producer.password);
  });

  it('issues an unsigned token with the claims of D-C3 that the container accepts', async () => {
    const body = await login(producer.email, producer.password);
    const { header, payload } = claimsOf(body.accessToken);
    expect(header).toMatchObject({ alg: 'none', kid: 'simulated' });
    expect(payload).toMatchObject({ sub: producer.id, role: 'PRODUCER', name: producer.name });
    expect(payload.exp - payload.iat).toBe(60 * 60);
    expect(new Date(body.expiresAt).getTime()).toBe(payload.exp * 1000);

    setSession(body);
    expect(getSession()?.user.role).toBe('PRODUCER');
  });

  it('rejects missing fields with VALIDATION_ERROR naming each one', async () => {
    const error = await failureOf(login('', ' '));
    expect(error.status).toBe(400);
    expect(error.error).toBe('VALIDATION_ERROR');
    expect(error.details.map((detail) => detail.field)).toEqual(['email', 'password']);
  });

  it('answers the same 401 to an unknown email and to a wrong password', async () => {
    for (const [email, password] of [
      ['nadie@market-agri.test', producer.password],
      [producer.email, 'otra-clave'],
    ] as const) {
      const error = await failureOf(login(email, password));
      expect([error.status, error.error, error.message]).toEqual([
        401,
        'INVALID_CREDENTIALS',
        'Correo o contraseña incorrectos.',
      ]);
    }
  });

  it('locks the account after 5 wrong passwords, even for the right one', async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect((await failureOf(login(producer.email, 'otra-clave'))).status).toBe(401);
    }
    const error = await failureOf(login(producer.email, producer.password));
    expect(error.status).toBe(423);
    expect(error.error).toBe('ACCOUNT_LOCKED');
  });

  it('puts the X-Correlation-Id of the request in the traceId of the error body', async () => {
    const error = await failureOf(login('', ''));
    expect(error.traceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('leaves a domain that is not simulated to the gateway', async () => {
    server.resetHandlers();
    server.use(...handlersFor(['catalog']));
    const error = await failureOf(login(producer.email, producer.password));
    expect(error.error).toBe('NETWORK_ERROR'); // nothing listens on the gateway in this test
  });
});
