import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
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

describe('toast kinds and limit', () => {
  function KindTrigger() {
    const toast = useToast();
    return (
      <>
        <Button onClick={() => toast.error('No se pudo guardar.')}>Error</Button>
        <Button onClick={() => toast.info('Datos simulados.')}>Información</Button>
      </>
    );
  }

  it.each([
    ['Error', 'No se pudo guardar.', 'lucide-circle-alert'],
    ['Información', 'Datos simulados.', 'lucide-info'],
  ])('shows a %s notice with its own icon in the polite region', (button, message, icon) => {
    render(
      <ToastProvider>
        <KindTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: button }));
    const notice = screen.getByText(message).parentElement!;
    expect(notice.querySelector('svg')).toHaveClass(icon);
    expect(notice.closest('[aria-live="polite"]')).not.toBeNull();
  });

  it('keeps at most 3 notices: a new one removes the oldest', () => {
    function Counter() {
      const toast = useToast();
      const count = useRef(0);
      return <Button onClick={() => toast.info(`Aviso ${++count.current}`)}>Avisar</Button>;
    }
    render(
      <ToastProvider>
        <Counter />
      </ToastProvider>,
    );
    const button = screen.getByRole('button', { name: 'Avisar' });
    for (let i = 0; i < 4; i++) fireEvent.click(button);
    expect(screen.queryByText('Aviso 1')).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Aviso [234]$/)).toHaveLength(3);
  });
});
