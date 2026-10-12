import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from './session';
import { useSession } from './useSession';

interface RequireAuthProps {
  children: ReactNode;
  /** Roles allowed; omitted = any person with a session. */
  roles?: Role[];
}

/**
 * Guards a route (Annex H): without a session it goes to the login portal and comes back to the
 * route asked for (`?next=`). Exposed as `shell/RequireAuth`, so a portal guards its pages
 * (the ADMIN views) with the container's session, never with its own.
 */
export function RequireAuth({ children, roles }: RequireAuthProps) {
  const session = useSession();
  const { pathname, search } = useLocation();

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  }
  if (roles && !roles.includes(session.user.role)) {
    return (
      <section>
        <h1>Acceso no permitido</h1>
        <p>Su cuenta no tiene permiso para ver esta página.</p>
      </section>
    );
  }
  return <>{children}</>;
}
