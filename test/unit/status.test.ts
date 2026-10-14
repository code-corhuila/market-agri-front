import { DOMAINS } from '../../src/mocks/domains';
import {
  SERVICES,
  formatClock,
  nextState,
  portalBadge,
  serviceBadge,
} from '../../src/status/model';

// HU-PLAT-010: the panel shows each service up or down with the time of its LAST CHANGE (not of
// the last reading), and colours them as design-system.md says (up · down = success · danger).
describe('status panel model', () => {
  it('watches the five services of the API contract', () => {
    expect(SERVICES.map((service) => service.name)).toEqual([...DOMAINS]);
  });

  it('keeps the time of the last change while the state stays the same', () => {
    const first = nextState(undefined, true, 1000);
    expect(first).toEqual({ up: true, since: 1000 });
    expect(nextState(first, true, 6000)).toBe(first);
    expect(nextState(first, false, 11000)).toEqual({ up: false, since: 11000 });
  });

  it.each([
    [undefined, 'neutral', 'Consultando…'],
    [true, 'success', 'Activo'],
    [false, 'danger', 'Caído'],
  ] as const)('shows a service %s as %s "%s"', (up, variant, label) => {
    expect(serviceBadge(up === undefined ? undefined : { up, since: 0 })).toEqual({
      variant,
      label,
    });
  });

  it.each([
    ['checking', 'neutral', 'Comprobando…'],
    ['loaded', 'success', 'Cargado'],
    ['failed', 'danger', 'No disponible'],
  ] as const)('shows a portal %s as %s "%s"', (state, variant, label) => {
    expect(portalBadge(state)).toEqual({ variant, label });
  });

  it('writes the time in Colombian time, whatever the zone of the browser', () => {
    expect(formatClock(Date.parse('2026-10-13T15:00:05Z'))).toBe('10:00:05');
    expect(formatClock(Date.parse('2026-10-14T04:59:59Z'))).toBe('23:59:59');
  });
});
