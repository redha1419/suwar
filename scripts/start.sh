#!/usr/bin/env bash
# One-shot local startup: make sure Postgres is up, the dev database and
# schema exist, an owner account is seeded, then launch the dev server.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="suwar_dev"

if ! pg_isready -q; then
  echo "Postgres isn't running. Starting postgresql@14 via brew services..."
  brew services start postgresql@14
  for _ in $(seq 1 15); do
    pg_isready -q && break
    sleep 1
  done
fi

if ! psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "Creating database ${DB_NAME}..."
  createdb "${DB_NAME}"
fi

echo "Applying migrations..."
npm run db:migrate --silent

echo "Ensuring owner account exists..."
npm run seed:owner --silent

echo ""
echo "Starting dev server — http://localhost:3000"
echo "Log in with the OWNER_EMAIL / OWNER_PASSWORD from .env.local"
echo ""
npm run dev
