import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../core/auth/RequireAuth';
import { PORTALS } from '../remotes/registry';
import { RemotePage } from '../remotes/RemotePage';
import { HomePage } from '../layout/HomePage';
import { NotFoundPage } from '../layout/NotFoundPage';
import { Shell } from '../layout/Shell';
import { ToastProvider } from '../shared/ui/toast';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        {PORTALS.map((portal) => (
          <Route
            key={portal.name}
            path={`${portal.path}/*`}
            element={
              portal.requiresSession ? (
                <RequireAuth>
                  <RemotePage portal={portal} />
                </RequireAuth>
              ) : (
                <RemotePage portal={portal} />
              )
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}
