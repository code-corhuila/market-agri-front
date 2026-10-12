/**
 * The session of the person, kept only in the container (Annex H): the portals read it through
 * `shell/session` and never store tokens of their own. Taken from the login response (D-C3)
 * without its `refreshToken`: there is no refresh flow in this delivery (HU-AUTH-003), so it is
 * not kept where any script of the page could read it.
 */
export type Role = 'PRODUCER' | 'BUYER' | 'ADMIN';

export interface Session {
  accessToken: string;
  /** ISO 8601 instant; after it the session no longer counts. */
  expiresAt: string;
  user: { id: string; name: string; email: string; role: Role };
}

const STORAGE_KEY = 'market-agri.session';
const listeners = new Set<() => void>();

// Cache by the stored text: useSyncExternalStore needs the same object while nothing changed.
let cachedText: string | null = null;
let cachedSession: Session | null = null;

function parse(text: string | null): Session | null {
  if (text === null) return null;
  try {
    return JSON.parse(text) as Session;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSession(): Session | null {
  const text = sessionStorage.getItem(STORAGE_KEY);
  if (text !== cachedText) {
    cachedText = text;
    cachedSession = parse(text);
  }
  if (cachedSession && Date.parse(cachedSession.expiresAt) <= Date.now()) {
    // An expired token is removed at once: it is never sent nor left in storage. No notify here:
    // this runs while React reads the snapshot, and the result (null) is already what it returns.
    sessionStorage.removeItem(STORAGE_KEY);
    cachedText = null;
    cachedSession = null;
  }
  return cachedSession;
}

export function setSession({ accessToken, expiresAt, user }: Session): void {
  // Only these fields: whatever else the caller passes (the login's refreshToken) is dropped.
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, expiresAt, user }));
  notify();
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
