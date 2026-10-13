import { DOMAINS, parseMockedDomains } from '../../../src/mocks/domains';

// HU-PLAT-009, scenario 1: VITE_API_MOCKS lists the domains answered by the simulated mode
// (ADR-021). The routes of the API contract are /api/v1/<domain>/… (D-C4).
describe('parseMockedDomains', () => {
  it('knows the domains of the API contract that the interface calls', () => {
    expect([...DOMAINS]).toEqual(['auth', 'catalog', 'chat', 'transactions', 'workflow']);
  });

  it('simulates nothing when the variable is empty or missing', () => {
    expect(parseMockedDomains(undefined)).toEqual([]);
    expect(parseMockedDomains('')).toEqual([]);
    expect(parseMockedDomains(' , ')).toEqual([]);
  });

  it('reads a comma list without spaces, case or repetitions, in the order of DOMAINS', () => {
    expect(parseMockedDomains(' Workflow, auth ,AUTH')).toEqual(['auth', 'workflow']);
  });

  it('fails on a domain the contract does not have, instead of ignoring it in silence', () => {
    expect(() => parseMockedDomains('auth,catalogo')).toThrow(
      'VITE_API_MOCKS: unknown domain "catalogo" (known: auth, catalog, chat, transactions, workflow)',
    );
  });
});
