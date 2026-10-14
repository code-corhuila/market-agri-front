import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/app/App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('container routes', () => {
  it('shows the home page at the root', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Marketplace Agrícola Huila' })).toBeInTheDocument();
  });

  it('shows the 404 page for an unknown route', () => {
    renderAt('/no-existe');
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
