import { NavLink, Outlet } from 'react-router-dom';

/** Frame of the application: the area where the active page or portal is rendered. */
export function Shell() {
  return (
    <>
      <header>
        <NavLink to="/">Marketplace Agrícola Huila</NavLink>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export function Home() {
  return (
    <section>
      <h1>Marketplace Agrícola Huila</h1>
      <p>Compre y venda productos del campo huilense directamente con los productores.</p>
    </section>
  );
}

export function NotFound() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La dirección no existe.</p>
      <NavLink to="/">Volver al inicio</NavLink>
    </section>
  );
}
