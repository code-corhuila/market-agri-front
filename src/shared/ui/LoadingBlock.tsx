import { Spinner } from './Spinner';
import styles from './LoadingBlock.module.css';

/** Centred loading state for views that resolve one object (detail, forms). */
export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className={styles.block} role="status">
      <Spinner size={24} thickness={3} />
      <span>{label}</span>
    </div>
  );
}
