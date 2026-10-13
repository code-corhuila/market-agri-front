import { Route, Routes } from 'react-router-dom';
import { Button, PageHeader, useToast } from 'shell/ui';
import { useSession } from 'shell/useSession';

/** A portal as the real ones will be: its own routes, the container's session and design system. */
export default function App() {
  const session = useSession();
  const toast = useToast();
  return (
    <Routes>
      <Route
        index
        element={
          <section>
            <PageHeader
              title="Portal de prueba"
              subtitle={session ? `Sesión de ${session.user.name}` : 'Sin sesión'}
              actions={<Button onClick={() => toast.info('Aviso del portal.')}>Avisar</Button>}
            />
          </section>
        }
      />
      <Route path="detalle" element={<h1>Detalle del portal de prueba</h1>} />
    </Routes>
  );
}
