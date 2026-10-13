import { parseMockedDomains } from './domains';

/** The domains simulated in this build (VITE_API_MOCKS is fixed at build time, like every VITE_). */
export const MOCKED_DOMAINS = parseMockedDomains(import.meta.env.VITE_API_MOCKS);
