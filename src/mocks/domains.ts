/** Domains of the API contract the interface calls: routes /api/v1/<domain>/… (D-C4). */
export const DOMAINS = ['auth', 'catalog', 'chat', 'transactions', 'workflow'] as const;
export type Domain = (typeof DOMAINS)[number];

/**
 * Reads VITE_API_MOCKS ("auth,workflow"): the domains the simulated mode answers (ADR-021).
 * A misspelt domain fails at start-up: ignored, it would reach the gateway without anyone noticing.
 */
export function parseMockedDomains(value: string | undefined): Domain[] {
  const asked = new Set(
    (value ?? '')
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );
  for (const name of asked) {
    if (!(DOMAINS as readonly string[]).includes(name)) {
      throw new Error(`VITE_API_MOCKS: unknown domain "${name}" (known: ${DOMAINS.join(', ')})`);
    }
  }
  return DOMAINS.filter((domain) => asked.has(domain));
}
