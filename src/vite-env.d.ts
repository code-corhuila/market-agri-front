/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API gateway; empty = same origin. Only the container reads it (Annex H). */
  readonly VITE_GATEWAY_URL?: string;
}
