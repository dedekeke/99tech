# Crude Server

ExpressJS + TypeScript backend using PostgreSQL 16 with Docker.

## Requirements

Make sure these are installed:

- Node.js
- npm
- Docker
- Docker Compose

## Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

## Setup

```bash
./setup.sh
```

This will:
 - install Node deps
 - pull PG16 image
 - start PG
 - create/init database (if needed)
 - initialize database schema

## Run

```bash
./start.sh
```
