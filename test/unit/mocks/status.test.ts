// @vitest-environment jsdom
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setupServer } from 'msw/node';
import { apiClient } from '../../../src/core/http/apiClient';
import { handlersFor } from '../../../src/mocks/handlers';

// HU-PLAT-010 in the simulated mode: /status/<service> (ADR-017) answers UP for a simulated
// domain, like the service's GET /health (api-contract E-60); any other goes on to the gateway.
const server = setupServer();
let gateway: Server;
const reached: string[] = [];

beforeAll(async () => {
  server.listen({ onUnhandledFrame: 'bypass' });
  gateway = createServer((request, response) => {
    reached.push(`${request.method} ${request.url}`);
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'SERVICE_UNAVAILABLE', message: 'gateway', details: [] }));
  });
  await new Promise<void>((ready) => gateway.listen(0, '127.0.0.1', ready));
});
beforeEach(() => {
  reached.length = 0;
  vi.stubEnv('VITE_GATEWAY_URL', `http://127.0.0.1:${(gateway.address() as AddressInfo).port}`);
  server.resetHandlers();
  server.use(...handlersFor(['catalog']));
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  server.close();
  await new Promise((closed) => gateway.close(closed));
});

describe('simulated /status/<service> (HU-PLAT-010)', () => {
  it('answers UP for a simulated domain, without reaching the gateway', async () => {
    expect(await apiClient.get('/status/catalog')).toEqual({ status: 'UP' });
    expect(reached).toEqual([]);
  });

  it('leaves a domain that is not simulated to the gateway', async () => {
    await expect(apiClient.get('/status/auth')).rejects.toMatchObject({
      error: 'SERVICE_UNAVAILABLE',
    });
    expect(reached).toEqual(['GET /status/auth']);
  });
});
