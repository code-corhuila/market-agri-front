import { useEffect, useState } from 'react';
import { apiClient } from '../core/http/apiClient';
import { MOCKED_DOMAINS } from '../mocks/config';
import type { Domain } from '../mocks/domains';
import { PORTALS, type Portal } from '../remotes/registry';
import { Badge } from '../shared/ui/Badge';
import { Card } from '../shared/ui/Card';
import { PageHeader } from '../shared/ui/PageHeader';
import {
  LIMIT_MS,
  POLL_MS,
  SERVICES,
  formatClock,
  nextState,
  portalBadge,
  serviceBadge,
  type PortalState,
  type ServiceState,
} from './model';
import styles from './StatusPage.module.css';

/** Asks one service, within the time limit: anything but `{ status: 'UP' }` in time is down. */
async function isUp(name: Domain, signal: AbortSignal): Promise<boolean> {
  try {
    const body = await apiClient.get<{ status?: string }>(`/status/${name}`, { signal });
    return body?.status === 'UP';
  } catch {
    return false;
  }
}

/** Polls every service on its own, so one that hangs or fails never holds the others back. */
function useServices(): Partial<Record<Domain, ServiceState>> {
  const [states, setStates] = useState<Partial<Record<Domain, ServiceState>>>({});

  useEffect(() => {
    const pending = new Set<AbortController>();
    let closed = false;

    const probe = async (name: Domain) => {
      const controller = new AbortController();
      pending.add(controller);
      const limit = setTimeout(() => controller.abort(), LIMIT_MS);
      const up = await isUp(name, controller.signal);
      clearTimeout(limit);
      pending.delete(controller);
      if (!closed) setStates((all) => ({ ...all, [name]: nextState(all[name], up, Date.now()) }));
    };
    const round = () => SERVICES.forEach(({ name }) => void probe(name));

    round();
    const every = setInterval(round, POLL_MS);
    return () => {
      closed = true;
      clearInterval(every);
      pending.forEach((controller) => controller.abort());
    };
  }, []);

  return states;
}

/** Tries each portal's remoteEntry with the same loader its route uses. */
function usePortals(portals: readonly Portal[]): Partial<Record<Portal['name'], PortalState>> {
  const [states, setStates] = useState<Partial<Record<Portal['name'], PortalState>>>({});

  useEffect(() => {
    let closed = false;
    for (const portal of portals) {
      portal.load().then(
        () => !closed && setStates((all) => ({ ...all, [portal.name]: 'loaded' })),
        () => !closed && setStates((all) => ({ ...all, [portal.name]: 'failed' })),
      );
    }
    return () => {
      closed = true;
    };
  }, [portals]);

  return states;
}

interface StatusPageProps {
  portals?: readonly Portal[];
  /** The domains this build answers with simulated data (VITE_API_MOCKS). */
  simulated?: readonly Domain[];
}

/** HU-PLAT-010: what is running, at a glance, before a demonstration or a test. */
export function StatusPage({ portals = PORTALS, simulated = MOCKED_DOMAINS }: StatusPageProps) {
  const services = useServices();
  const loaded = usePortals(portals);

  return (
    <section className="stack">
      <PageHeader
        title="Estado de la plataforma"
        subtitle={`Se consulta cada ${POLL_MS / 1000} segundos; sin respuesta en ${LIMIT_MS / 1000} segundos, el servicio se marca caído.`}
      />
      <Card>
        <h2 className={styles.title}>Servicios</h2>
        <ul className={styles.list} aria-label="Servicios">
          {SERVICES.map(({ name, title }) => {
            const state = services[name];
            const badge = serviceBadge(state);
            return (
              <li key={name} className={styles.row} aria-label={title}>
                <span className={styles.name}>{title}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {state && <span className="subtle">Desde las {formatClock(state.since)}</span>}
                {simulated.includes(name) && <span className="subtle">Datos simulados</span>}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className={styles.title}>Portales</h2>
        <ul className={styles.list} aria-label="Portales">
          {portals.map(({ name, title }) => {
            const badge = portalBadge(loaded[name] ?? 'checking');
            return (
              <li key={name} className={styles.row} aria-label={title}>
                <span className={styles.name}>{title}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
