import { NavLink } from 'react-router-dom';

/** Shown for any route that neither the container nor a portal owns (Annex H: "404"). */
export function NotFoundPage() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La dirección no existe.</p>
      <NavLink to="/">Volver al inicio</NavLink>
    </section>
  );
}
