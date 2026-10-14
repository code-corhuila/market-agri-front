import { useSyncExternalStore } from 'react';
import { getSession, subscribe, type Session } from './session';

/** Current session; the component re-renders when it starts or ends. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession);
}
