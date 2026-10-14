import { setSession, type Role } from '../../../src/core/auth/session';

/** Starts a session that has not expired, as the login portal would. */
export function signIn(role: Role, name = 'Ana Ruiz') {
  setSession({
    accessToken: 'token-de-prueba',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 'u-1', name, email: 'ana@finca.co', role },
  });
}
