import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../../../src/shared/ui/Button';

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
  });

  it('is disabled and busy while loading, so a double click sends nothing twice', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Publicar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Publicar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onClick when it is enabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Publicar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
