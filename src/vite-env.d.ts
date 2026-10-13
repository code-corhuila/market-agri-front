/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API gateway; empty = same origin. Only the container reads it (Annex H). */
  readonly VITE_GATEWAY_URL?: string;
  /** remoteEntry.js of each portal (read in vite.config.ts). */
  readonly VITE_AUTH_PORTAL_URL?: string;
  readonly VITE_CATALOG_PORTAL_URL?: string;
  readonly VITE_TRANSACTIONS_PORTAL_URL?: string;
  /** Domains answered by the simulated mode ("auth,catalog"); empty = all real (HU-PLAT-009). */
  readonly VITE_API_MOCKS?: string;
}
