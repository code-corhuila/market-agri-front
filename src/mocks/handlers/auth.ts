import { http, HttpResponse } from 'msw';
import { SEED_USERS, mockDb } from '../db';
import { errorBody } from '../errorBody';

const TOKEN_MINUTES = 60;
const LOCK_AFTER_FAILURES = 5;
const INVALID = 'Correo o contraseña incorrectos.';
const LOCKED =
  'La cuenta está bloqueada temporalmente por intentos fallidos. Intente de nuevo en 15 minutos.';

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Unsigned token with the claims of D-C3: only the container accepts it (ADR-021, `kid: simulated`). */
function simulatedToken(user: (typeof SEED_USERS)[number], iat: number, exp: number): string {
  const header = { alg: 'none', typ: 'JWT', kid: 'simulated' };
  const claims = {
    sub: user.id,
    role: user.role,
    name: user.name,
    iss: 'market-agri-simulated',
    iat,
    exp,
  };
  return `${base64url(header)}.${base64url(claims)}.`;
}

/** E-02 · POST /api/v1/auth/login, with its errors in the order of the contract. */
export const authHandlers = [
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const missing = [
      ...(email ? [] : [{ field: 'email', message: 'Es obligatorio.' }]),
      ...(password.trim() ? [] : [{ field: 'password', message: 'Es obligatorio.' }]),
    ];
    if (missing.length > 0) {
      return errorBody(
        request,
        400,
        'VALIDATION_ERROR',
        'La solicitud tiene datos inválidos.',
        missing,
      );
    }

    const user = SEED_USERS.find((candidate) => candidate.email === email);
    if (!user) return errorBody(request, 401, 'INVALID_CREDENTIALS', INVALID);
    const failures = mockDb.failedLogins.get(email) ?? 0;
    if (failures >= LOCK_AFTER_FAILURES) return errorBody(request, 423, 'ACCOUNT_LOCKED', LOCKED);
    if (user.password !== password) {
      mockDb.failedLogins.set(email, failures + 1);
      return errorBody(request, 401, 'INVALID_CREDENTIALS', INVALID);
    }

    mockDb.failedLogins.delete(email);
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + TOKEN_MINUTES * 60;
    return HttpResponse.json({
      accessToken: simulatedToken(user, iat, exp),
      refreshToken: crypto.randomUUID(),
      expiresAt: new Date(exp * 1000).toISOString(),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }),
];
