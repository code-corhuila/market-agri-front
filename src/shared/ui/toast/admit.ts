import type { ToastKind } from './useToast';

/**
 * Adds a notice to the visible ones without passing `max`. When there is one too many, the oldest
 * notice that is not an error leaves (the new one included): newer, less severe notices never
 * push an error out. Only when every notice is an error does the oldest error leave.
 */
export function admit<T extends { kind: ToastKind }>(
  visible: readonly T[],
  next: T,
  max: number,
): T[] {
  const all = [...visible, next];
  if (all.length <= max) return all;
  const leaving = Math.max(
    0,
    all.findIndex((toast) => toast.kind !== 'error'),
  );
  return all.filter((_, index) => index !== leaving);
}
