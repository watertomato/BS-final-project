#!/bin/bash
set -e

DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-3306}

echo "Waiting for database ${DB_HOST}:${DB_PORT}..."
until nc -z ${DB_HOST} ${DB_PORT}; do
  >&2 echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is up - running migrations (if any) and starting server"
# Run prisma migrate deploy if migrations exist
if [ -d "./prisma/migrations" ]; then
  npx prisma migrate deploy || true
fi

# Ensure Prisma client is generated
npx prisma generate || true

npm run start


