# Build with the exact dependencies that were tested (Annex H, rule 6: npm ci).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Domains answered by the simulated mode (HU-PLAT-009), fixed at build time; empty = all real.
ARG VITE_API_MOCKS=""
ENV VITE_API_MOCKS=$VITE_API_MOCKS
# Where each portal publishes its remoteEntry.js: /portals/<name>/remoteEntry.js on the platform
# (one origin, ADR-017). Required: without them the container would look on localhost (R-24).
ARG VITE_AUTH_PORTAL_URL
ARG VITE_CATALOG_PORTAL_URL
ARG VITE_TRANSACTIONS_PORTAL_URL
RUN : "${VITE_AUTH_PORTAL_URL:?build with --build-arg VITE_AUTH_PORTAL_URL}" \
  "${VITE_CATALOG_PORTAL_URL:?build with --build-arg VITE_CATALOG_PORTAL_URL}" \
  "${VITE_TRANSACTIONS_PORTAL_URL:?build with --build-arg VITE_TRANSACTIONS_PORTAL_URL}"
ENV VITE_AUTH_PORTAL_URL=$VITE_AUTH_PORTAL_URL \
  VITE_CATALOG_PORTAL_URL=$VITE_CATALOG_PORTAL_URL \
  VITE_TRANSACTIONS_PORTAL_URL=$VITE_TRANSACTIONS_PORTAL_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
