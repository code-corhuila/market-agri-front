import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

/** An item before the current page: always a link. */
export interface CrumbLink {
  label: string;
  to: string;
}

/** The last item: the current page, never a link. */
export interface CurrentCrumb {
  label: string;
  to?: never;
}

/** The type itself says it: every item but the last has a route, the last one has none. */
export type Crumbs = [...CrumbLink[], CurrentCrumb];

/** First element of every page; replaces "← Volver" (design-system.md). */
export function Breadcrumbs({ items }: { items: Crumbs }) {
  return (
    <nav className={styles.nav} aria-label="Ruta de navegación">
      <ol className={styles.list}>
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className={styles.item}>
              {!last && crumb.to ? (
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
