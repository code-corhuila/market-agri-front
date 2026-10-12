import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/** Status pill; the variant of each status comes from `statusVariant`. */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return <span className={cx(styles.badge, styles[variant], className)}>{children}</span>;
}
