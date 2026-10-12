import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button: the action destroys something. */
  danger?: boolean;
  /** The confirmation is running: both buttons and Escape wait for it. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Required before any destructive action (design-system.md). Native modal <dialog>: it traps the
 * focus and Escape fires `cancel`, which the parent turns into closing it through `open`.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Set on the first click, before the parent can re-render with `loading`: a double click never
  // confirms twice. Released when the dialog opens again or a confirmation in progress ends.
  const confirmed = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    confirmed.current = false;
  }, [open]);

  useEffect(() => {
    if (!loading) confirmed.current = false;
  }, [loading]);

  const confirm = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    onConfirm();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // the parent decides through `open`
        if (!loading) onCancel();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {body && <div className={styles.body}>{body}</div>}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
