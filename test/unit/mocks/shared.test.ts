// @vitest-environment jsdom
import { requireRole } from '../../../src/mocks/caller';
import { pageOf, readPage } from '../../../src/mocks/paging';

// What every simulated domain shares (HU-PLAT-009): the pages of D-C24 and the §2.1 checks of who
// calls, written once before the purchase domains (G1.10) use them.
const url = (query: string) => new URL(`http://localhost/api/v1/x${query}`);

describe('readPage (D-C24)', () => {
  it('takes the defaults and the values of the request', () => {
    expect(readPage(url(''), [], {})).toEqual({ page: 1, limit: 20 });
    expect(readPage(url('?page=3&limit=100&status=A'), ['status'], { status: ['A'] })).toEqual({
      page: 3,
      limit: 100,
    });
  });

  it('names every field out of range, unknown or with a value not allowed', () => {
    const result = readPage(url('?page=0&limit=101&color=x&status=Z'), ['status'], {
      status: ['A'],
    });
    expect('details' in result && result.details.map((detail) => detail.field)).toEqual([
      'color',
      'page',
      'limit',
      'status',
    ]);
  });
});

describe('pageOf', () => {
  const item = (id: string, createdAt: string) => ({ id, createdAt, secret: true });

  it('sorts newest first then by id, slices the page and projects each item', () => {
    const items = [item('b', '2026-10-01'), item('a', '2026-10-02'), item('c', '2026-10-02')];
    expect(pageOf(items, { page: 1, limit: 2 }, ({ id }) => id)).toEqual({
      data: ['a', 'c'],
      meta: { page: 1, limit: 2, total: 3, totalPages: 2 },
    });
    expect(pageOf([], { page: 1, limit: 20 }, ({ id }) => id).meta.totalPages).toBe(0);
  });
});

describe('requireRole (§2.1)', () => {
  const token = (claims: object) =>
    `x.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 60, ...claims }))}.`;
  const request = (authorization?: string) =>
    new Request('http://localhost/api/v1/x', {
      headers: authorization ? { Authorization: authorization } : {},
    });

  it('answers 401 without a session or with an expired one', async () => {
    for (const candidate of [request(), request(`Bearer ${token({ exp: 1 })}`)]) {
      const result = requireRole(candidate, ['BUYER']);
      expect('refusal' in result && result.refusal.status).toBe(401);
    }
  });

  it('answers 403 FORBIDDEN to a role the card excludes, and returns the caller otherwise', async () => {
    const buyer = request(`Bearer ${token({ sub: 'u-1', role: 'BUYER', name: 'Carlos' })}`);
    const refused = requireRole(buyer, ['PRODUCER']);
    expect('refusal' in refused && (await refused.refusal.json()).error).toBe('FORBIDDEN');
    expect(requireRole(buyer, ['BUYER', 'PRODUCER'])).toEqual({
      caller: { id: 'u-1', role: 'BUYER', name: 'Carlos' },
    });
  });
});
