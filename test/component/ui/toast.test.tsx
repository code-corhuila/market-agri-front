import { act, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../../../src/shared/ui/Button';
import { ToastProvider, useToast } from '../../../src/shared/ui/toast';

describe('toast', () => {
  function Trigger() {
    const toast = useToast();
    return <Button onClick={() => toast.success('Producto publicado.')}>Publicar</Button>;
  }

  it('announces the message politely and removes it after about 4 s', () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      const message = screen.getByText('Producto publicado.');
      expect(message.closest('[aria-live="polite"]')).not.toBeNull();

      act(() => vi.advanceTimersByTime(3900));
      expect(screen.getByText('Producto publicado.')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByText('Producto publicado.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('can be closed before it expires', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Producto publicado.')).not.toBeInTheDocument();
  });

  it('fails loudly when used outside its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow('useToast must be used inside <ToastProvider>');
  });
});
