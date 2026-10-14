import type { Domain } from './domains';

/**
 * Starts Mock Service Worker before the application, only when some domain is simulated: it sits
 * under apiClient (ADR-021), so the container and the portals keep their definitive code.
 */
export async function startMocks(domains: readonly Domain[]): Promise<void> {
  if (domains.length === 0) return;
  const [{ setupWorker }, { handlersFor }] = await Promise.all([
    import('msw/browser'),
    import('./handlers'),
  ]);
  await setupWorker(...handlersFor(domains)).start({
    onUnhandledFrame: 'bypass',
    quiet: true,
  });
}
