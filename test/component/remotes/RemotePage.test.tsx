import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RemotePage } from '../../../src/remotes/RemotePage';
import type { Portal } from '../../../src/remotes/registry';

function portal(load: Portal['load']): Portal {
  return { name: 'catalog', title: 'Catálogo', path: '/catalogo', requiresSession: false, load };
}

const Remote: ComponentType = () => <h1>Productos</h1>;

function renderPortal(load: Portal['load']) {
  return render(
    <MemoryRouter>
      <header>Encabezado del contenedor</header>
      <RemotePage portal={portal(load)} />
    </MemoryRouter>,
  );
}

describe('RemotePage', () => {
  it('says the portal is loading, then shows it', async () => {
    renderPortal(() => Promise.resolve({ default: Remote }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando Catálogo…');
    expect(await screen.findByRole('heading', { name: 'Productos' })).toBeInTheDocument();
  });

  it('contains a portal that cannot be loaded: only its area warns, the rest stays', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPortal(() => Promise.reject(new Error('remoteEntry.js: 503')));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Catálogo no está disponible en este momento.',
    );
    expect(screen.getByText('Encabezado del contenedor')).toBeInTheDocument();
  });

  it('contains a portal that fails while rendering', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken: ComponentType = () => {
      throw new Error('falla del portal');
    };
    renderPortal(() => Promise.resolve({ default: Broken }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Catálogo no está disponible');
  });

  it('retries the download when asked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = vi
      .fn<Portal['load']>()
      .mockRejectedValueOnce(new Error('caído'))
      .mockResolvedValue({ default: Remote });
    renderPortal(load);
    fireEvent.click(await screen.findByRole('button', { name: 'Intentar de nuevo' }));
    expect(await screen.findByRole('heading', { name: 'Productos' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
