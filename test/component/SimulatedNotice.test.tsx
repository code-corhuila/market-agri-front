import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SimulatedNotice } from '../../src/layout/SimulatedNotice';

// HU-PLAT-009, scenario 2: with at least one simulated domain, every page says so and names them
// (ADR-021: simulated is not integrated, and the screen must not hide it).
describe('simulated data notice', () => {
  it('names the simulated domains', () => {
    render(<SimulatedNotice domains={['auth', 'catalog']} />);
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Datos simulados');
    expect(notice).toHaveTextContent('auth, catalog');
  });

  it('is not shown when every domain is real', () => {
    const { container } = render(<SimulatedNotice domains={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

vi.mock('../../src/mocks/config', () => ({ MOCKED_DOMAINS: ['auth', 'workflow'] }));

describe('shell with simulated domains', () => {
  it('shows the notice on every page, above the content', async () => {
    const { AppRoutes } = await import('../../src/app/App');
    render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = screen.getByRole('main');
    expect(within(main).getByRole('status')).toHaveTextContent('auth, workflow');
  });
});
