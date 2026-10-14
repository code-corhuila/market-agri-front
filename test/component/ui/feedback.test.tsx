import { render, screen } from '@testing-library/react';
import { Alert } from '../../../src/shared/ui/Alert';
import { Badge } from '../../../src/shared/ui/Badge';
import { LoadingBlock } from '../../../src/shared/ui/LoadingBlock';

describe('Alert', () => {
  it.each(['error', 'warning'] as const)('announces a %s at once (role alert)', (variant) => {
    render(<Alert variant={variant}>No se pudo guardar.</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.');
  });

  it.each(['info', 'success'] as const)('announces %s politely (role status)', (variant) => {
    render(<Alert variant={variant}>Datos simulados.</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Datos simulados.');
  });
});

describe('Badge', () => {
  it('shows its text', () => {
    render(<Badge variant="warning">Pendiente</Badge>);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });
});

describe('LoadingBlock', () => {
  it('tells assistive technology that the view is loading', () => {
    render(<LoadingBlock />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('accepts a specific label', () => {
    render(<LoadingBlock label="Cargando productos…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos…');
  });
});
