// @vitest-environment jsdom
// The session lives in the browser's sessionStorage, so this unit test needs jsdom (no React).
import { clearSession, getSession, setSession, type Session } from '../../../src/core/auth/session';

const IN_ONE_HOUR = () => new Date(Date.now() + 3_600_000).toISOString();

// Login response of the API contract (D-C3), with a name that carries accents.
function aSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'header.payload.signature',
    refreshToken: 'refresh-token',
    expiresAt: IN_ONE_HOUR(),
    user: {
      id: '7b1c8f3e-2d4a-4f6b-9c1e-0a2b3c4d5e6f',
      name: 'María Peña',
      email: 'maria@example.co',
      role: 'PRODUCER',
    },
    ...overrides,
  };
}

describe('session', () => {
  afterEach(() => sessionStorage.clear());

  it('has no session at the start', () => {
    expect(getSession()).toBeNull();
  });

  it('keeps the login response, accents included', () => {
    setSession(aSession());
    expect(getSession()?.user.name).toBe('María Peña');
  });

  it('forgets the session when it is cleared', () => {
    setSession(aSession());
    clearSession();
    expect(getSession()).toBeNull();
  });

  it('treats an expired session as no session', () => {
    setSession(aSession({ expiresAt: '2020-01-01T00:00:00Z' }));
    expect(getSession()).toBeNull();
  });

  it('treats a corrupted stored value as no session', () => {
    sessionStorage.setItem('market-agri.session', '{not json');
    expect(getSession()).toBeNull();
  });
});
