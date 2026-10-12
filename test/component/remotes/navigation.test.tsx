import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../../src/app/App';
import type { Role } from '../../../src/core/auth/session';
import { signIn } from './session';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

function navLinks() {
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('navigation by role', () => {
  it('offers the catalog and the login to a visitor', () => {
    renderAt('/');
    expect(navLinks()).toEqual(['Catálogo', 'Ingresar']);
  });

  it.each<[Role, string[]]>([
    ['BUYER', ['Catálogo', 'Mis compras']],
    ['PRODUCER', ['Catálogo', 'Mis productos', 'Mis ventas']],
    ['ADMIN', ['Catálogo', 'Administración']],
  ])('shows %s only the links of its role', (role, links) => {
    signIn(role);
    renderAt('/');
    expect(navLinks()).toEqual(links);
  });

  it('closes the session from the header', () => {
    signIn('BUYER', 'Ana Ruiz');
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(navLinks()).toEqual(['Catálogo', 'Ingresar']);
  });
});

describe('portal routes', () => {
  it('mounts a public portal on its route', async () => {
    renderAt('/catalogo');
    expect(await screen.findByRole('heading', { name: 'Portal de prueba' })).toBeInTheDocument();
  });

  it('sends a visitor from a protected portal to the login portal', async () => {
    renderAt('/transacciones');
    expect(await screen.findByRole('heading', { name: 'Portal de prueba' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('aria-current', 'page');
  });

  it('still answers an unknown route with the 404 page', () => {
    renderAt('/no-existe');
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
