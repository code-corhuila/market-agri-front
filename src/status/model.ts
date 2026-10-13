import type { BadgeVariant } from '../shared/ui/Badge';
import type { Domain } from '../mocks/domains';

/** How often the panel asks every service, and how long it waits for one answer (HU-PLAT-010). */
export const POLL_MS = 5_000;
export const LIMIT_MS = 3_000;

/** The services behind /status/<name> (ADR-017): the domains of the API contract. */
export const SERVICES: readonly { name: Domain; title: string }[] = [
  { name: 'auth', title: 'Autenticación' },
  { name: 'catalog', title: 'Catálogo' },
  { name: 'chat', title: 'Chat' },
  { name: 'transactions', title: 'Transacciones' },
  { name: 'workflow', title: 'Compras (workflow)' },
];

/** A service's last known state and since when it holds (the time of its last change). */
export interface ServiceState {
  up: boolean;
  since: number;
}

/** The same object while nothing changes, so the time shown is that of the change, not the reading. */
export function nextState(
  previous: ServiceState | undefined,
  up: boolean,
  at: number,
): ServiceState {
  return previous?.up === up ? previous : { up, since: at };
}

export type PortalState = 'checking' | 'loaded' | 'failed';

type Look = { variant: BadgeVariant; label: string };

/** design-system.md, "Status badges": a service in the panel, up · down = success · danger. */
export function serviceBadge(state: ServiceState | undefined): Look {
  if (!state) return { variant: 'neutral', label: 'Consultando…' };
  return state.up ? { variant: 'success', label: 'Activo' } : { variant: 'danger', label: 'Caído' };
}

const PORTAL_LOOK: Record<PortalState, Look> = {
  checking: { variant: 'neutral', label: 'Comprobando…' },
  loaded: { variant: 'success', label: 'Cargado' },
  failed: { variant: 'danger', label: 'No disponible' },
};

export function portalBadge(state: PortalState): Look {
  return PORTAL_LOOK[state];
}

const CLOCK = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** `10:00:05`, in Colombian time whatever the browser's zone. */
export function formatClock(at: number): string {
  const part = Object.fromEntries(CLOCK.formatToParts(at).map(({ type, value }) => [type, value]));
  return `${part.hour}:${part.minute}:${part.second}`;
}
