import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/**
 * Status pill with the five variants of the design system. Which variant a status gets is decided
 * by the domain that owns the status (each portal's model, the status panel), following the
 * "Status badges" table of design-system.md: the shared UI knows colours, not domain states.
 */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return <span className={cx(styles.badge, styles[variant], className)}>{children}</span>;
}
