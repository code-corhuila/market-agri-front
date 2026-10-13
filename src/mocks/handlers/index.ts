import type { RequestHandler } from 'msw';
import type { Domain } from '../domains';
import { authHandlers } from './auth';

/** Handlers of each domain, written from api-contract §4. The others arrive with G1.9 and G1.10. */
const HANDLERS: Record<Domain, readonly RequestHandler[]> = {
  auth: authHandlers,
  catalog: [],
  chat: [],
  transactions: [],
  workflow: [],
};

/** Only the listed domains are answered here; every other request goes on to the gateway. */
export function handlersFor(domains: readonly Domain[]): RequestHandler[] {
  return domains.flatMap((domain) => HANDLERS[domain]);
}
