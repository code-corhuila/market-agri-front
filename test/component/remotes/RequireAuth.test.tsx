import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth } from '../../../src/core/auth/RequireAuth';
import type { Role } from '../../../src/core/auth/session';
import { signIn } from './session';

function LoginProbe() {
  const { search } = useLocation();
  return <p>Inicio de sesión {search}</p>;
}

function renderProtected(path: string, roles?: Role[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/transacciones/*"
          element={
            <RequireAuth roles={roles}>
              <p>Contenido protegido</p>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('takes a visitor without a session to the login, remembering the route asked for', () => {
    renderProtected('/transacciones/t-1?vista=detalle');
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByText(/Inicio de sesión/)).toHaveTextContent(
      '?next=%2Ftransacciones%2Ft-1%3Fvista%3Ddetalle',
    );
  });

  it('shows the route to a person with a session', () => {
    signIn('BUYER');
    renderProtected('/transacciones');
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('refuses a role that is not allowed, without sending it to the login', () => {
    signIn('BUYER');
    renderProtected('/transacciones/admin', ['ADMIN']);
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acceso no permitido' })).toBeInTheDocument();
  });
});
