import { render, screen, within } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { Card } from '../../../src/shared/ui/Card';
import { EmptyState } from '../../../src/shared/ui/EmptyState';
import { Field } from '../../../src/shared/ui/Field';
import { Skeleton } from '../../../src/shared/ui/Skeleton';

describe('Field', () => {
  it('labels its control', () => {
    render(
      <Field label="Nombre del producto" required>
        <input />
      </Field>,
    );
    expect(screen.getByLabelText(/Nombre del producto/)).toBeInstanceOf(HTMLInputElement);
  });

  it('links the hint to the control', () => {
    render(
      <Field label="Precio" hint="Solo dígitos, en pesos.">
        <input />
      </Field>,
    );
    expect(screen.getByLabelText('Precio')).toHaveAccessibleDescription('Solo dígitos, en pesos.');
  });

  it('marks the control invalid and reads the error next to it (Annex H)', () => {
    render(
      <Field label="Precio" hint="Solo dígitos, en pesos." error="Escriba un número entero.">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Precio');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Escriba un número entero.');
    expect(screen.queryByText('Solo dígitos, en pesos.')).not.toBeInTheDocument();
  });

  it.each([
    ['select', <select key="s" />],
    ['textarea', <textarea key="t" />],
  ])('wires a %s the same way as an input', (_name, control) => {
    render(
      <Field label="Categoría" error="Elija una categoría.">
        {control}
      </Field>,
    );
    const element = screen.getByLabelText('Categoría');
    expect(element).toHaveAttribute('aria-invalid', 'true');
    expect(element).toHaveAccessibleDescription('Elija una categoría.');
  });

  it('keeps the id and the description the control already had', () => {
    render(
      <>
        <p id="price-rules">Sin decimales.</p>
        <Field label="Precio" error="Escriba un número entero.">
          <input id="price" aria-describedby="price-rules" />
        </Field>
      </>,
    );
    const input = screen.getByLabelText('Precio');
    expect(input).toHaveAttribute('id', 'price');
    expect(input).toHaveAccessibleDescription('Sin decimales. Escriba un número entero.');
  });

  it('is valid when there is no error', () => {
    render(
      <Field label="Precio">
        <input />
      </Field>,
    );
    expect(screen.getByLabelText('Precio')).not.toHaveAttribute('aria-invalid');
  });
});

describe('EmptyState', () => {
  it('guides to the next action', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Aún no tiene productos"
        description="Publique el primero para que los compradores lo vean."
        action={<button type="button">Publicar producto</button>}
      />,
    );
    expect(screen.getByText('Aún no tiene productos')).toBeInTheDocument();
    expect(screen.getByText(/Publique el primero/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar producto' })).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('announces the loading list once and hides the placeholders', () => {
    const { container } = render(<Skeleton.Grid count={3} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(container.querySelectorAll('[aria-hidden="true"][data-skeleton="card"]')).toHaveLength(
      3,
    );
  });
});

describe('Card', () => {
  it('renders as the element it is asked for, so a list stays a list', () => {
    render(
      <ul>
        <Card as="li">Café pergamino</Card>
      </ul>,
    );
    const list = screen.getByRole('list');
    expect(within(list).getByRole('listitem')).toHaveTextContent('Café pergamino');
  });
});
