#!/usr/bin/env bash

set -e

DB_NAME="crude_server"
DB_USER="postgres"

if ! command -v docker >/dev/null 2>&1; then
  echo "No DOcker found!"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "No Docker Compose found!"
  exit 1
fi
# copy
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "Node dependencies..."
npm install

echo "Pulling PostgreSQL image..."
docker compose pull postgres

echo "Starting PostgreSQL..."
docker compose up -d postgres

echo "Waiting for PostgreSQL..."

until docker compose exec -T postgres \
  pg_isready -U "$DB_USER" -d postgres >/dev/null 2>&1
do
  sleep 1
done

echo "Pg is ready."

echo "Checking database '$DB_NAME'..."

DB_EXISTS=$(
  docker compose exec -T postgres \
    psql \
    -U "$DB_USER" \
    -d postgres \
    -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'"
)

if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating database '$DB_NAME'..."

  docker compose exec -T postgres \
    createdb \
    -U "$DB_USER" \
    "$DB_NAME"
else
  echo "Database '$DB_NAME' already exists."
fi

echo "DB is ready."

echo "Init database schema..."

docker compose exec -T postgres \
  psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  < db/init.sql

echo "Schema is ready."
