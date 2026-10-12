import type { BadgeVariant } from './Badge';

/**
 * One colour per status, everywhere (design-system.md, "Status badges"): product status and
 * transaction status of the API contract (§1.2), and service up/down of the status panel.
 */
export const statusVariant = {
  ACTIVE: 'success',
  OUT_OF_STOCK: 'neutral',
  PENDING: 'warning',
  CONFIRMED: 'success',
  FAILED: 'danger',
  UP: 'success',
  DOWN: 'danger',
} as const satisfies Record<string, BadgeVariant>;
