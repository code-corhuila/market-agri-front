import { Link, Outlet } from 'react-router-dom';
import styles from './Shell.module.css';
import { Wordmark } from './Wordmark';

const PROJECT_NAME =
  'Marketplace Agrícola Huila · Sistemas Distribuidos 2026-b · Proyecto académico';

/**
 * Frame of the application (design-system.md, "Layout and responsive"): persistent header with
 * the wordmark, the active page or portal in `main`, and the footer. Navigation by role and the
 * backend status join the header and footer in later branches (HU-PLAT-008 remotes, HU-PLAT-010).
 */
export function Shell() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          {/* The visible wordmark is the accessible name (WCAG 2.5.3). A plain Link on purpose:
              the brand is not a navigation item; the role navigation (remotes branch) uses NavLink. */}
          <Link to="/" className={styles.brand}>
            <Wordmark />
          </Link>
        </div>
      </header>
      <main className={`container ${styles.main}`}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <span>{PROJECT_NAME}</span>
        </div>
      </footer>
    </div>
  );
}
