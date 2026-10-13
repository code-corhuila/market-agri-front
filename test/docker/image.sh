#!/usr/bin/env bash
# Checks the image of the front (R-21): the build context leaves out what must never reach the
# image, keeps what the build needs, and the image builds. Run from the root of the repository:
#   bash test/docker/image.sh
# Needs only bash and docker (BuildKit, the default builder).
set -uo pipefail

failures=0
pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; failures=$((failures + 1)); }

# Leftovers a developer machine always has. Created only if missing, removed only if created here.
created=()
plant() {
  if [ ! -e "$1" ]; then
    mkdir -p "$(dirname "$1")" && echo "planted by test/docker/image.sh" > "$1" && created+=("$1")
  fi
}
cleanup() {
  for path in "${created[@]}"; do rm -f "$path"; rmdir -p "$(dirname "$path")" 2> /dev/null; done
  rm -rf "$context"
}
context="$(mktemp -d)"
trap cleanup EXIT
plant node_modules/.planted
plant dist/.planted
plant debug.log
# Where secrets live on a developer machine: Vite's local env files and private keys.
SECRETS=(.env .env.local .env.production.local server.key cert.p12 cert.pfx tls.crt id_rsa
  deploy/tls/server.key src/.env.local)
for secret in "${SECRETS[@]}"; do plant "$secret"; done

# Git Bash passes the path to docker.exe untranslated inside "dest=…": cygpath gives C:/… there.
dest="$(cygpath -m "$context" 2> /dev/null || echo "$context")"
docker build -q -f test/docker/context.Dockerfile --output "type=local,dest=$dest" . > /dev/null \
  || { echo "FAIL - the build context could not be exported"; exit 1; }

for excluded in node_modules dist .git debug.log "${SECRETS[@]}"; do
  if [ -e "$context/$excluded" ]; then fail "the context leaves out $excluded"; else pass "the context leaves out $excluded"; fi
done
# What deploy/Dockerfile and `tsc -b` read: excluding any of it would break the build.
for needed in package.json package-lock.json index.html src public test tsconfig.json vite.config.ts vitest.config.ts deploy/nginx.conf deploy/compose.yml config; do
  if [ -e "$context/$needed" ]; then pass "the context keeps $needed"; else fail "the context keeps $needed"; fi
done

# R-24: without the portals' addresses the container would look for them on localhost.
if docker build -q -f deploy/Dockerfile -t market-agri-front:check . > /dev/null 2>&1; then
  fail "the image does not build without the portals' addresses"
else
  pass "the image does not build without the portals' addresses"
fi

if docker build -q -f deploy/Dockerfile \
  --build-arg VITE_AUTH_PORTAL_URL=/portals/auth/remoteEntry.js \
  --build-arg VITE_CATALOG_PORTAL_URL=/portals/catalog/remoteEntry.js \
  --build-arg VITE_TRANSACTIONS_PORTAL_URL=/portals/transactions/remoteEntry.js \
  -t market-agri-front:check . > /dev/null; then
  pass "deploy/Dockerfile builds the image"
else
  fail "deploy/Dockerfile builds the image"
fi

# Review of #20: a missing chunk is a 404, not the page (polled: nginx may take a moment to listen).
docker run -d --rm --name front-check market-agri-front:check > /dev/null
missing=""
for _ in $(seq 1 15); do
  missing="$(docker exec front-check wget -qSO /dev/null http://127.0.0.1/assets/no-existe.js 2>&1)"
  grep -q 'HTTP/' <<< "$missing" && break
  sleep 1
done
docker stop front-check > /dev/null
if grep -q 'HTTP/1.1 404' <<< "$missing"; then
  pass "a missing file under /assets/ answers 404, not the page"
else
  fail "a missing file under /assets/ answers 404, not the page"
fi

echo
if [ "$failures" -eq 0 ]; then echo "all checks passed"; else echo "$failures check(s) failed"; fi
exit $((failures > 0))
