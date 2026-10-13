import { http, HttpResponse } from 'msw';
import type { Domain } from '../domains';

/**
 * /status/<domain> of ADR-017 for a simulated domain: what the gateway would return from the
 * service's GET /health (api-contract E-60). The panel marks these services as simulated.
 */
export const statusHandler = (domain: Domain) =>
  http.get(`*/status/${domain}`, () => HttpResponse.json({ status: 'UP' }));
