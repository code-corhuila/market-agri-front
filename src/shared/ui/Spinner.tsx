import { cx } from './cx';
import styles from './Spinner.module.css';

interface SpinnerProps {
  /** Diameter in px. */
  size?: number;
  /** Ring width in px. */
  thickness?: number;
  className?: string;
}

/** Visual only: the accessible text is given by whoever shows it (Button, LoadingBlock). */
export function Spinner({ size = 18, thickness = 2, className }: SpinnerProps) {
  return (
    <span
      className={cx(styles.spinner, className)}
      style={{ width: size, height: size, borderWidth: thickness }}
      aria-hidden="true"
    />
  );
}
