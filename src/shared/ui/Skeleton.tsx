import { cx } from './cx';
import styles from './Skeleton.module.css';

/** Grey bar with a shimmer; `width` takes any CSS value. Hidden from assistive technology. */
function Line({ width, className }: { width?: string; className?: string }) {
  return (
    <span
      className={cx(styles.base, styles.line, className)}
      style={width ? { width } : undefined}
      aria-hidden="true"
    />
  );
}

/** Placeholder of one card, with an optional thumbnail (catalog grid). */
function Card({ withThumb = true }: { withThumb?: boolean }) {
  return (
    <div className={styles.card} aria-hidden="true" data-skeleton="card">
      {withThumb && <span className={cx(styles.base, styles.thumb)} />}
      <Line width="70%" />
      <Line width="45%" />
      <Line width="55%" />
    </div>
  );
}

/** `count` card placeholders and a single accessible "loading" announcement for the list. */
function Grid({ count = 6, withThumb = true }: { count?: number; withThumb?: boolean }) {
  return (
    <>
      <span className="visually-hidden" role="status">
        Cargando…
      </span>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} withThumb={withThumb} />
      ))}
    </>
  );
}

/** Loading state of lists and grids (design-system.md): `Skeleton.Line`, `.Card`, `.Grid`. */
export const Skeleton = { Line, Card, Grid };
