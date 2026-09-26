#!/usr/bin/env bash

set -e

if ! docker compose ps postgres | grep -q "Up"; then
  echo "Starting PostgreSQL..."
  docker compose up -d postgres
fi

echo "Waiting for PostgreSQL..."

until docker compose exec -T postgres \
  pg_isready -U postgres -d crude_server >/dev/null 2>&1
do
  sleep 1
done

echo "DB ready."

npm run dev