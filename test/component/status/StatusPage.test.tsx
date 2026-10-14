import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../../src/app/App';
import { apiClient } from '../../../src/core/http/apiClient';
import { ApiError } from '../../../src/core/http/apiError';
import type { Portal } from '../../../src/remotes/registry';
import { StatusPage } from '../../../src/status/StatusPage';

// HU-PLAT-010: a panel in the container with the state of every service (/status/<service>,
// ADR-017) and of every portal. Scenario 1 polling with a time limit, 2 portals, 3 one service down.
const UP = { status: 'UP' };
const down = () => ApiError.of(503, 'SERVICE_UNAVAILABLE', 't-1');
const flush = () => act(() => vi.advanceTimersByTimeAsync(0));
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/** apiClient.get answering per service; `answers` maps a service to a function of the round. */
function stubStatus(answer: (service: string) => Promise<unknown>) {
  return vi
    .spyOn(apiClient, 'get')
    .mockImplementation((path: string) => answer(path.replace('/status/', '')) as Promise<never>);
}

const services = () => screen.getByRole('list', { name: 'Servicios' });
const service = (name: string) => within(services()).getByRole('listitem', { name });
const portals = () => screen.getByRole('list', { name: 'Portales' });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T15:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('services status panel (HU-PLAT-010)', () => {
  it('asks every service and shows each one up or down with the time of its last change', async () => {
    const spy = stubStatus(async (name) => {
      if (name === 'chat') throw down();
      return UP;
    });
    render(
      <MemoryRouter initialEntries={['/estado']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Estado de la plataforma' }),
    ).toBeVisible();
    await flush();

    for (const name of ['auth', 'catalog', 'chat', 'transactions', 'workflow']) {
      expect(spy).toHaveBeenCalledWith(`/status/${name}`, { signal: expect.any(AbortSignal) });
    }
    expect(within(service('Catálogo')).getByText('Activo')).toBeVisible();
    // Scenario 3: the one that does not answer is down, and the others are still shown.
    expect(within(service('Chat')).getByText('Caído')).toBeVisible();
    expect(within(service('Autenticación')).getByText('Activo')).toBeVisible();
    expect(within(service('Chat')).getByText('Desde las 10:00:00')).toBeVisible();
  });

  it('asks again every 5 seconds and keeps the time until the state changes', async () => {
    let round = 0;
    const spy = stubStatus(async (name) => {
      if (name === 'catalog' && round >= 2) throw down();
      return UP;
    });
    render(<StatusPage portals={[]} />);
    await flush();
    expect(spy).toHaveBeenCalledTimes(5);

    round = 1;
    await advance(5000);
    expect(spy).toHaveBeenCalledTimes(10);
    expect(within(service('Catálogo')).getByText('Desde las 10:00:00')).toBeVisible();

    round = 2;
    await advance(5000);
    expect(within(service('Catálogo')).getByText('Caído')).toBeVisible();
    expect(within(service('Catálogo')).getByText('Desde las 10:00:10')).toBeVisible();
    expect(within(service('Transacciones')).getByText('Desde las 10:00:00')).toBeVisible();
  });

  it('marks down a service that does not answer within 3 seconds', async () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(apiClient, 'get').mockImplementation(((
      path: string,
      options?: { signal?: AbortSignal },
    ) => {
      if (path !== '/status/transactions') return Promise.resolve(UP);
      signal = options?.signal;
      return new Promise((_, reject) =>
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
      );
    }) as typeof apiClient.get);
    render(<StatusPage portals={[]} />);
    await flush();
    expect(within(service('Transacciones')).getByText('Consultando…')).toBeVisible();
    // Each service on its own: the one asked after the hanging one is already shown.
    expect(within(service('Compras (workflow)')).getByText('Activo')).toBeVisible();

    await advance(3000);
    expect(signal?.aborted).toBe(true);
    expect(within(service('Transacciones')).getByText('Caído')).toBeVisible();
    expect(within(service('Catálogo')).getByText('Activo')).toBeVisible();
  });

  it('shows whether each portal could be loaded', async () => {
    stubStatus(async () => UP);
    const portal = (name: Portal['name'], title: string, load: Portal['load']): Portal => ({
      name,
      title,
      path: `/${name}`,
      requiresSession: false,
      load,
    });
    render(
      <StatusPage
        portals={[
          portal('catalog', 'Catálogo', () => Promise.resolve({ default: () => null })),
          portal('transactions', 'Transacciones', () =>
            Promise.reject(new Error('remoteEntry 503')),
          ),
        ]}
      />,
    );
    await flush();
    expect(within(portals()).getByRole('listitem', { name: 'Catálogo' })).toHaveTextContent(
      'Cargado',
    );
    expect(within(portals()).getByRole('listitem', { name: 'Transacciones' })).toHaveTextContent(
      'No disponible',
    );
  });

  it('says which services answer with simulated data', async () => {
    stubStatus(async () => UP);
    render(<StatusPage portals={[]} simulated={['catalog']} />);
    await flush();
    expect(service('Catálogo')).toHaveTextContent('Datos simulados');
    expect(service('Chat')).not.toHaveTextContent('Datos simulados');
  });

  it('stops asking when the panel is closed', async () => {
    const spy = stubStatus(async () => UP);
    const { unmount } = render(<StatusPage portals={[]} />);
    await flush();
    unmount();
    await advance(15000);
    expect(spy).toHaveBeenCalledTimes(5);
  });

  it('is linked from the footer of every page', () => {
    vi.useRealTimers();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Estado de la plataforma' })).toHaveAttribute(
      'href',
      '/estado',
    );
  });
});
