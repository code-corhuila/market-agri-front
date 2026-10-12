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
    // The accessible name is the visible text, not a different aria-label (WCAG 2.5.3).
    const home = within(header).getByRole('link', { name: 'Marketplace Agrícola Huila' });
    expect(home).toHaveAttribute('href', '/');
    expect(home).not.toHaveAttribute('aria-label');
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
