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
