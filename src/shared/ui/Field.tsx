import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cx } from './cx';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  /** Message of the client or the server for this field; replaces the hint while present. */
  error?: ReactNode;
  required?: boolean;
  /** The control: `<input>`, `<select>` or `<textarea>`. */
  children: ReactElement<{ className?: string }>;
  className?: string;
}

/**
 * Label, hint and error around one control, tied by id: `aria-invalid` and `aria-describedby`
 * make a screen reader say which field failed and why (Annex H).
 */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': errorId ?? hintId,
        className: cx(styles.control, children.props.className),
      } as Partial<typeof children.props> & Record<string, unknown>)
    : children;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.req} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {control}
      {hintId && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
