import { Link, NavLink, Outlet } from 'react-router-dom';
import { clearSession } from '../core/auth/session';
import { useSession } from '../core/auth/useSession';
import { MOCKED_DOMAINS } from '../mocks/config';
import { navItemsFor } from '../remotes/registry';
import { Button } from '../shared/ui/Button';
import { cx } from '../shared/ui/cx';
import styles from './Shell.module.css';
import { SimulatedNotice } from './SimulatedNotice';
import { Wordmark } from './Wordmark';

const PROJECT_NAME =
  'Marketplace Agrícola Huila · Sistemas Distribuidos 2026-b · Proyecto académico';

/**
 * Frame of the application (design-system.md, "Layout and responsive"): persistent header with
 * the wordmark and the navigation by role, the active page or portal in `main`, and the footer.
 * The footer links the status panel of the platform (HU-PLAT-010).
 */
export function Shell() {
  const session = useSession();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    cx(styles.navLink, isActive && styles.navLinkActive);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          {/* The visible wordmark is the accessible name (WCAG 2.5.3). A plain Link on purpose:
              the brand is not a navigation item; the navigation by role uses NavLink. */}
          <Link to="/" className={styles.brand}>
            <Wordmark />
          </Link>
          <nav className={styles.nav} aria-label="Navegación principal">
            {navItemsFor(session?.user.role).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/catalogo'}
                className={navClass}
              >
                {item.label}
              </NavLink>
            ))}
            {session && (
              <>
                <span className={styles.userName}>{session.user.name}</span>
                <Button variant="ghost" size="sm" onClick={clearSession}>
                  Salir
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className={`container ${styles.main}`}>
        <SimulatedNotice domains={MOCKED_DOMAINS} />
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <span>{PROJECT_NAME}</span>
          <Link to="/estado">Estado de la plataforma</Link>
        </div>
      </footer>
    </div>
  );
}
