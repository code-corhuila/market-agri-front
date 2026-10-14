import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs, type Crumbs } from '../../../src/shared/ui/Breadcrumbs';
import { Button } from '../../../src/shared/ui/Button';
import { ConfirmDialog } from '../../../src/shared/ui/ConfirmDialog';
import { PageHeader } from '../../../src/shared/ui/PageHeader';

describe('PageHeader', () => {
  it('gives the page its h1, subtitle and actions', () => {
    render(
      <PageHeader
        title="Mis productos"
        subtitle="Lo que usted publica en el catálogo."
        actions={<Button>Publicar producto</Button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Mis productos' })).toBeInTheDocument();
    expect(screen.getByText('Lo que usted publica en el catálogo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar producto' })).toBeInTheDocument();
  });
});

describe('Breadcrumbs', () => {
  const items: Crumbs = [
    { label: 'Inicio', to: '/' },
    { label: 'Catálogo', to: '/catalogo' },
    { label: 'Café especial' },
  ];

  it('links every item but the last, which is the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={items} />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
    expect(within(nav).queryByRole('link', { name: 'Café especial' })).not.toBeInTheDocument();
    expect(within(nav).getByText('Café especial')).toHaveAttribute('aria-current', 'page');
  });

  it('only accepts a route on every item but the last (checked by npm run typecheck)', () => {
    // @ts-expect-error a crumb before the current page needs its route
    const missingRoute: Crumbs = [{ label: 'Inicio' }, { label: 'Café especial' }];
    // @ts-expect-error the current page is never a link
    const linkedCurrent: Crumbs = [
      { label: 'Inicio', to: '/' },
      { label: 'Café', to: '/c' },
    ];
    expect([missingRoute, linkedCurrent]).toHaveLength(2);
  });
});

describe('ConfirmDialog', () => {
  function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="¿Eliminar el producto?"
        body="Ya no aparecerá en el catálogo."
        confirmLabel="Eliminar"
        danger
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />,
    );
    return { onConfirm, onCancel };
  }

  it('is not shown while closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens named by its title and never confirms on its own', () => {
    const { onConfirm } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar el producto?' });
    expect(dialog).toHaveTextContent('Ya no aparecerá en el catálogo.');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms only with a click on the confirm button', () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirms once even if the button is clicked twice before the parent reacts', () => {
    const { onConfirm } = renderDialog();
    const confirm = screen.getByRole('button', { name: 'Eliminar' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('can confirm again once a confirmation in progress ends (retry after an error)', () => {
    const onConfirm = vi.fn();
    const props = { open: true, title: '¿Eliminar?', onCancel: vi.fn(), onConfirm };
    const { rerender } = render(<ConfirmDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    rerender(<ConfirmDialog {...props} loading />);
    rerender(<ConfirmDialog {...props} loading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('cancels with the cancel button and with Escape', () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('blocks both actions while the confirmation is in progress', () => {
    const { onCancel } = renderDialog({ loading: true });
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
