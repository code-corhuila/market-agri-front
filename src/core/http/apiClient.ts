import { clearSession, getSession } from '../auth/session';
import { ApiError } from './apiError';

/**
 * The single HTTP client of the interface (Annex H), exposed to the portals as `shell/apiClient`
 * (Facade). Only the container knows the gateway URL: the portals ask for `/api/v1/...`.
 */
const TIMEOUT_MS = 10_000;

export interface RequestOptions {
  /** Lets the caller cancel a request that a newer one replaces. */
  signal?: AbortSignal;
  /** One key per intention, reused on the retry (api-contract D-C35). */
  idempotencyKey?: string;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function gatewayUrl(): string {
  return import.meta.env.VITE_GATEWAY_URL ?? '';
}

function buildHeaders(correlationId: string, hasBody: boolean, options: RequestOptions): Headers {
  const headers = new Headers({ Accept: 'application/json', 'X-Correlation-Id': correlationId });
  if (hasBody) headers.set('Content-Type', 'application/json');
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
  const session = getSession();
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);
  return headers;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const correlationId = crypto.randomUUID();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel);

  try {
    const response = await fetch(`${gatewayUrl()}${path}`, {
      method,
      headers: buildHeaders(correlationId, body !== undefined, options),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await readBody(response);
    if (response.ok) return payload as T;
    if (response.status === 401) clearSession();
    throw ApiError.fromResponse(response.status, payload, correlationId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw ApiError.of(0, 'TIMEOUT', correlationId);
    if (options.signal?.aborted) throw error;
    throw ApiError.of(0, 'NETWORK_ERROR', correlationId);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
