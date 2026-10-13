import type { Role } from '../core/auth/session';

export interface Caller {
  id: string;
  role: Role;
  name: string;
}

/**
 * Who calls, from the simulated token of the login (claims of D-C3): what each service reads from
 * the JWT. No token, or an expired or unreadable one, is no caller (`401`).
 */
export function callerOf(request: Request): Caller | null {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub: string;
      role: Role;
      name: string;
      exp: number;
    };
    if (claims.exp * 1000 <= Date.now()) return null;
    return { id: claims.sub, role: claims.role, name: claims.name };
  } catch {
    return null;
  }
}
