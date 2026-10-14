# Build with the exact dependencies that were tested (Annex H, rule 6: npm ci).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Domains answered by the simulated mode (HU-PLAT-009), fixed at build time; empty = all real.
ARG VITE_API_MOCKS=""
ENV VITE_API_MOCKS=$VITE_API_MOCKS
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
