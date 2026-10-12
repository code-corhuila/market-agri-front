import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/app/App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

// Layout of design-system.md: persistent header with the wordmark, the page in `main`, and a
// footer with the project name.
describe('shell layout', () => {
  it('shows a header whose wordmark links to the home page', () => {
    renderAt('/no-existe');
    const header = screen.getByRole('banner');
    const home = within(header).getByRole('link', { name: 'Ir al inicio' });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toHaveTextContent('Marketplace Agrícola Huila');
  });

  it('renders the active page inside main', () => {
    renderAt('/');
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('shows a footer with the project name', () => {
    renderAt('/');
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Marketplace Agrícola Huila · Sistemas Distribuidos 2026-b · Proyecto académico',
    );
  });
});
