import { statusVariant } from '../../../src/shared/ui/statusVariant';

// design-system.md, "Status badges".
describe('statusVariant', () => {
  it.each([
    ['ACTIVE', 'success'],
    ['OUT_OF_STOCK', 'neutral'],
    ['PENDING', 'warning'],
    ['CONFIRMED', 'success'],
    ['FAILED', 'danger'],
    ['UP', 'success'],
    ['DOWN', 'danger'],
  ] as const)('shows %s as %s', (status, variant) => {
    expect(statusVariant[status]).toBe(variant);
  });
});
