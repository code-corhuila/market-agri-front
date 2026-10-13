import type { RequestHandler } from 'msw';
import type { Domain } from '../domains';
import { authHandlers } from './auth';
import { catalogHandlers } from './catalog';
import { chatHandlers, transactionsHandlers, workflowHandlers } from './purchase';
import { statusHandler } from './status';

/** Handlers of each domain, written from api-contract §4. */
const HANDLERS: Record<Domain, readonly RequestHandler[]> = {
  auth: authHandlers,
  catalog: catalogHandlers,
  chat: chatHandlers,
  transactions: transactionsHandlers,
  workflow: workflowHandlers,
};

/**
 * Only the listed domains are answered here, with their /status/<domain> (ADR-017); every other
 * request goes on to the gateway.
 */
export function handlersFor(domains: readonly Domain[]): RequestHandler[] {
  return domains.flatMap((domain) => [...HANDLERS[domain], statusHandler(domain)]);
}
