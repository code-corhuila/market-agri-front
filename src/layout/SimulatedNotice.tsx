import { Alert } from '../shared/ui/Alert';
import type { Domain } from '../mocks/domains';

/** On every page while a domain is simulated (HU-PLAT-009, ADR-021): simulated is not integrated. */
export function SimulatedNotice({ domains }: { domains: readonly Domain[] }) {
  if (domains.length === 0) return null;
  return (
    <Alert variant="info">
      Datos simulados: {domains.join(', ')}. Estas respuestas no vienen de los servicios.
    </Alert>
  );
}
