// @vitest-environment jsdom
// Annex H, "Lo que el cliente del contenedor hace por todos": destination, credential,
// correlation, 10 s maximum and one place that decides the message for the person.
import { setSession, getSession } from '../../../src/core/auth/session';
import { apiClient } from '../../../src/core/http/apiClient';
import { ApiError } from '../../../src/core/http/apiError';

const GATEWAY = 'http://localhost:8080';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function signIn() {
  setSession({
    accessToken: 'the-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: { id: 'u-1', name: 'Ana', email: 'ana@example.co', role: 'BUYER' },
  });
}

function sentRequest(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  const [url, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return { url, headers: new Headers(init.headers), init };
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

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('VITE_GATEWAY_URL', GATEWAY);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('sends the relative path of the portal to the gateway and returns the JSON body', async () => {
    fetchMock.mockResolvedValue(json(200, { data: [], meta: { page: 1 } }));
    const body = await apiClient.get('/api/v1/catalog/products?page=1');
    expect(sentRequest(fetchMock).url).toBe(`${GATEWAY}/api/v1/catalog/products?page=1`);
    expect(body).toEqual({ data: [], meta: { page: 1 } });
  });

  it('attaches the token of the session, and no Authorization without one', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(200, {})));
    await apiClient.get('/api/v1/catalog/products');
    signIn();
    await apiClient.get('/api/v1/catalog/products');
    expect(sentRequest(fetchMock, 0).headers.has('Authorization')).toBe(false);
    expect(sentRequest(fetchMock, 1).headers.get('Authorization')).toBe('Bearer the-token');
  });

  it('sends no Authorization with an expired session', async () => {
    setSession({
      accessToken: 'expired-token',
      expiresAt: '2020-01-01T00:00:00Z',
      user: { id: 'u-1', name: 'Ana', email: 'ana@example.co', role: 'BUYER' },
    });
    fetchMock.mockResolvedValue(json(200, {}));
    await apiClient.get('/api/v1/catalog/products');
    expect(sentRequest(fetchMock).headers.has('Authorization')).toBe(false);
  });

  it('sends a new X-Correlation-Id on every request', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(200, {})));
    await apiClient.get('/api/v1/catalog/products');
    await apiClient.get('/api/v1/catalog/products');
    const first = sentRequest(fetchMock, 0).headers.get('X-Correlation-Id');
    const second = sentRequest(fetchMock, 1).headers.get('X-Correlation-Id');
    expect(first).toMatch(UUID);
    expect(second).toMatch(UUID);
    expect(first).not.toBe(second);
  });

  it('sends the JSON body and the Idempotency-Key of a creation', async () => {
    fetchMock.mockResolvedValue(json(201, { id: 'p-1' }));
    await apiClient.post('/api/v1/catalog/products', { name: 'Café' }, { idempotencyKey: 'k-1' });
    const { headers, init } = sentRequest(fetchMock);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"Café"}');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotency-Key')).toBe('k-1');
  });

  it('turns the error body of the contract into an ApiError', async () => {
    const body = {
      error: 'VALIDATION_ERROR',
      message: 'La solicitud tiene datos inválidos.',
      details: [{ field: 'price', message: 'Debe ser un número entero.' }],
      traceId: 'trace-1',
    };
    fetchMock.mockResolvedValue(json(400, body));
    const error = await failureOf(apiClient.get('/api/v1/catalog/products'));
    expect(error).toMatchObject({ status: 400, ...body });
  });

  it('decides the message itself when the body is not the contract envelope', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    const error = await failureOf(apiClient.get('/api/v1/catalog/products'));
    expect(error.status).toBe(502);
    expect(error.error).toBe('SERVICE_UNAVAILABLE');
    expect(error.message).toBe('El servicio no está disponible en este momento.');
    expect(error.traceId).toBe(sentRequest(fetchMock).headers.get('X-Correlation-Id'));
  });

  it('closes the session on a 401', async () => {
    signIn();
    fetchMock.mockResolvedValue(
      json(401, {
        error: 'UNAUTHORIZED',
        message: 'Debe iniciar sesión para continuar.',
        details: [],
        traceId: 't',
      }),
    );
    const error = await failureOf(apiClient.get('/api/v1/transactions/transactions'));
    expect(error.error).toBe('UNAUTHORIZED');
    expect(getSession()).toBeNull();
  });

  // Review of #14 (finding 4): authorization is the server's (ADR-020). A 403 reaches the portal
  // as FORBIDDEN with its message and keeps the session: the person is signed in, only not allowed.
  it('keeps the session on a 403 and reports FORBIDDEN', async () => {
    signIn();
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const error = await failureOf(apiClient.get('/api/v1/transactions/admin/transactions'));
    expect(error.status).toBe(403);
    expect(error.error).toBe('FORBIDDEN');
    expect(error.message).toBe('No tiene permisos para realizar esta acción.');
    expect(getSession()).not.toBeNull();
  });

  it('fails with TIMEOUT (status 0) after 10 s without an answer', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    );
    const pending = failureOf(apiClient.get('/api/v1/catalog/products'));
    await vi.advanceTimersByTimeAsync(10_000);
    const error = await pending;
    expect(error).toMatchObject({ status: 0, error: 'TIMEOUT' });
    expect(error.message).toBe('El servidor tardó demasiado en responder. Intente de nuevo.');
  });

  it('fails with NETWORK_ERROR (status 0) when the gateway cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await failureOf(apiClient.get('/api/v1/catalog/products'));
    expect(error).toMatchObject({ status: 0, error: 'NETWORK_ERROR' });
    expect(error.message).toBe(
      'No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.',
    );
  });

  it('lets the caller cancel a request that a newer one replaces', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    );
    const controller = new AbortController();
    const pending = apiClient.get('/api/v1/catalog/products', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
