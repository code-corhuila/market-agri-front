import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../cx';
import { ToastContext, type ToastApi, type ToastKind } from './useToast';
import styles from './toast.module.css';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

/** How long a toast stays (design-system.md: about 4 s). */
const DISMISS_MS = 4000;
/** Notices shown at once; a new one removes the oldest, so a burst never fills the screen. */
const MAX_VISIBLE = 3;
const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };

/** Short notices in the top right corner, read politely (`aria-live`) by screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++nextId.current;
      // The timer of a removed oldest notice still fires later and finds nothing to remove.
      setToasts((list) => [...list, { id, kind, message }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => remove(id), DISMISS_MS),
      );
    },
    [remove],
  );

  // No timer outlives the provider (it would update an unmounted component).
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICON[toast.kind];
          return (
            <div key={toast.id} className={cx(styles.toast, styles[toast.kind])}>
              <Icon size={16} aria-hidden="true" />
              <span className={styles.msg}>{toast.message}</span>
              <button
                type="button"
                className={styles.close}
                onClick={() => remove(toast.id)}
                aria-label="Cerrar aviso"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
