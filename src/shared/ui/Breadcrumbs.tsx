import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  /** Route of the item; ignored on the last one, which is the current page. */
  to?: string;
}

/** First element of every page; replaces "← Volver" (design-system.md). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className={styles.nav} aria-label="Ruta de navegación">
      <ol className={styles.list}>
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className={styles.item}>
              {crumb.to && !last ? (
                <Link className={styles.link} to={crumb.to}>
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={last ? styles.current : undefined}
                  aria-current={last ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!last && <ChevronRight className={styles.sep} size={14} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
