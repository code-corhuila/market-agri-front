import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cx } from './cx';
import styles from './Field.module.css';

interface ControlProps {
  id?: string;
  className?: string;
  'aria-describedby'?: string;
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  /** Message of the client or the server for this field; replaces the hint while present. */
  error?: ReactNode;
  required?: boolean;
  /**
   * The control: `<input>`, `<select>` or `<textarea>`. A custom control must pass `id`,
   * `aria-invalid` and `aria-describedby` on to its DOM element, or the label and the error lose it.
   */
  children: ReactElement<ControlProps>;
  className?: string;
}

/**
 * Label, hint and error around one control, tied by id: `aria-invalid` and `aria-describedby`
 * make a screen reader say which field failed and why (Annex H).
 */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const generatedId = useId();
  const props: ControlProps = isValidElement(children) ? children.props : {};
  // The control keeps an id or a description it already had (e.g. from a form library).
  const id = props.id ?? generatedId;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [props['aria-describedby'], errorId ?? hintId].filter(Boolean).join(' ');

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        className: cx(styles.control, props.className),
      } as Partial<ControlProps> & Record<string, unknown>)
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
