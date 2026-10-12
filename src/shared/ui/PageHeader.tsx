import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Actions aligned to the right (buttons, links). */
  actions?: ReactNode;
  className?: string;
}

/** The h1 of the page: one per view. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cx(styles.header, className)}>
      <div className={styles.titleBox}>
        <h1>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
