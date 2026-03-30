# Diary

A production-grade MVP diary application built as a micro-frontend (MFE) with event streaming architecture.

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌────────────────────┐
│  diary-web   │───▶│  diary-api   │───▶│  Postgres (Prisma) │
│  (Next.js)   │    │  (NestJS)    │    │  entries + outbox   │
└─────────────┘    └─────────────┘    └────────┬───────────┘
                                               │
                                     ┌─────────▼───────────┐
                                     │   diary-worker       │
                                     │   (outbox publisher)  │
                                     └─────────┬───────────┘
                                               │
                                     ┌─────────▼───────────┐
                                     │   NATS JetStream     │
                                     │   DIARY_EVENTS       │
                                     └─────────────────────┘
                                               │
                                     ┌─────────▼───────────┐
                                     │   insights-service   │
                                     │   (external, not     │
                                     │    part of this app)  │
                                     └─────────────────────┘
```

## Monorepo Structure

```
diary/
├── apps/
│   ├── diary-web/        # Next.js MFE (frontend)
│   ├── diary-api/        # NestJS + Fastify (REST API)
│   └── diary-worker/     # Outbox publisher → NATS JetStream
├── packages/
│   ├── shared/           # Zod schemas, types, event contracts
│   └── database/         # Prisma schema, migrations, client setup
├── infra/
│   └── docker-compose.yml  # Postgres, NATS, pgAdmin
├── turbo.json
└── pnpm-workspace.yaml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, BlockNote |
| Backend | NestJS 11, Fastify 5 |
| Database | PostgreSQL 17, Prisma 7 |
| Messaging | NATS JetStream 2.12 |
| Tooling | pnpm workspaces, Turborepo, Biome, TypeScript 5.9 |

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm >= 10
- Docker & Docker Compose

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment files (first time only)
cp packages/database/.env.example packages/database/.env
cp apps/diary-api/.env.example apps/diary-api/.env
cp apps/diary-worker/.env.example apps/diary-worker/.env
cp apps/diary-web/.env.example apps/diary-web/.env.local

# 3. Start everything (Docker + DB migration + all services)
pnpm start
```

`pnpm start` does it all in one command:
1. Starts Docker containers (Postgres, NATS, pgAdmin)
2. Runs any pending database migrations
3. Starts all dev services

This starts:
- **diary-web** on `http://localhost:4280`
- **diary-api** on `http://localhost:4281`
- **diary-worker** polling outbox and publishing to NATS

### Useful Commands

```bash
pnpm dev          # Start all services
pnpm build        # Build all packages & apps
pnpm test         # Run all tests
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint with Biome
pnpm lint:fix     # Auto-fix lint issues
pnpm db:migrate   # Run Prisma migrations
pnpm db:studio    # Open Prisma Studio
pnpm db:generate  # Regenerate Prisma client
```

## Domain Model

Entries are **check-ins** only (`EntryType.checkin`):

- **mood**: integer 1–10 (required)
- **emotions** / **triggers**: 1–5 labels each (required)
- **checkInType**: `morning` | `evening` | `basic` — type-specific structured fields plus optional rich **note** (`contentJson`, `plainText`, `wordCount`) on morning/evening; required note body for basic

Rich text uses **BlockNote** (stored as `contentJson`); `plainText` and `wordCount` support search and backups.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/entries/checkins` | Create a check-in |
| `GET` | `/entries` | List check-ins (cursor pagination) |
| `GET` | `/entries/:id` | Get single entry |
| `PATCH` | `/entries/:id` | Update check-in |
| `GET` | `/events/outbox` | Debug: list outbox events |
| `POST` | `/events/replay` | Admin: re-queue events for publishing |

### Query Parameters (GET /entries)

- `cursor` — entry ID for cursor-based pagination (ULID, time-ordered)
- `limit` — items per page (1-100, default 20)

### Replay Endpoint (POST /events/replay)

Re-queues historical outbox events so the worker re-publishes them to NATS.
NATS JetStream deduplication (`Nats-Msg-Id`) prevents true duplicates within the
dedup window; beyond that, consumers should be idempotent.

```json
{
  "fromGlobalSequence": 1,
  "toGlobalSequence": 100,
  "dryRun": true
}
```

## Event Streaming Architecture

### Transactional Outbox Pattern

Every entry create/update is atomic with an outbox event write in the same
database transaction. This guarantees at-least-once delivery without distributed
transactions.

```
┌─ DB Transaction ────────────────────┐
│  1. INSERT/UPDATE entries            │
│  2. INSERT outbox_events (payload)  │
│  3. UPDATE outbox_events (payload   │
│     with globalSequence)             │
└─────────────────────────────────────┘
```

### Outbox Table (Permanent Event Log)

The `outbox_events` table is the **canonical event history**. Events are never
deleted. The table serves as a durable log similar to Kafka topics.

| Column | Purpose |
|--------|---------|
| `globalSequence` | BIGSERIAL PK — total ordering for replay |
| `eventId` | ULID — globally unique, used for NATS dedup |
| `aggregateVersion` | Per-entry version counter |
| `payload` | Full event JSON including snapshot + derived data |
| `publishedAt` | Set when successfully published to NATS |
| `publishAttempts` | Retry counter |

### Publisher (diary-worker)

The worker continuously polls for unpublished outbox events and publishes them
to NATS JetStream:

1. Reads unpublished events ordered by `globalSequence`
2. Publishes each event with `Nats-Msg-Id` header for JetStream deduplication
3. Marks event as published on successful ack
4. On failure: increments retry counter and stores error
5. Safe to restart — idempotent via `Nats-Msg-Id`

Configuration (env vars):
- `NATS_URL` — NATS server (default: `nats://localhost:42220`)
- `PUBLISH_BATCH_SIZE` — events per poll (default: 100)
- `PUBLISH_POLL_INTERVAL_MS` — idle poll interval (default: 500)

### Event Contract (v1)

```json
{
  "eventName": "diary.entry.created",
  "eventVersion": 1,
  "eventId": "01JMFH...",
  "occurredAt": "2026-02-20T10:00:00.000Z",
  "aggregate": { "type": "checkin", "id": "01JMFG..." },
  "actor": { "userId": "local-user" },
  "globalSequence": 42,
  "aggregateVersion": 1,
  "data": {
    "entrySnapshot": { "...full entry fields..." },
    "derived": {
      "plainText": "...",
      "wordCount": 150,
      "localDateTime": "2026-02-20T09:30",
      "mood": 7,
      "emotions": ["grateful", "calm"],
      "triggers": ["meditation"]
    },
    "metadata": { "source": "diary", "schema": "diary.event.v1" }
  }
}
```

### NATS Headers

| Header | Value |
|--------|-------|
| `Nats-Msg-Id` | eventId (ULID) — enables JetStream dedup |
| `diary-event-version` | `1` |
| `diary-aggregate-id` | entry ID |
| `diary-aggregate-type` | `checkin` |

## MFE (Micro-Frontend) Notes

The diary-web app is designed to be mounted inside a shell application:

- **basePath**: Configurable via `NEXT_PUBLIC_DIARY_BASE_PATH` (empty by default for standalone dev; set to `/diary` when mounted in a shell app)
- **API URL**: Configurable via `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:4281`)
- **Scoped styles**: Uses Tailwind CSS v4 with design tokens from `@madecki/ui`
- **No global CSS pollution**: All custom styles are scoped to component classes

## Database Migrations

Migrations are managed by Prisma and stored in `packages/database/prisma/migrations/`.

```bash
# Create a new migration after schema changes
pnpm db:migrate -- --name your_migration_name

# Apply migrations (also runs on `pnpm db:migrate`)
pnpm db:migrate

# Open Prisma Studio for visual DB browsing
pnpm db:studio

# Regenerate client after manual schema edits
pnpm db:generate
```

## Design Decisions

1. **Single entry type** — the `entries` table stores check-ins only; standalone notes and note folders were removed in favour of a separate Notepad app.

2. **ULID for IDs** — Time-sortable, globally unique, used for cursor pagination. No sequential integer exposure.

3. **Two-step outbox write** — Insert outbox event with empty payload, get the DB-generated `globalSequence`, then update with full payload including the sequence. Both happen in the same transaction.

4. **Replay via re-queue** — The replay endpoint resets `publishedAt` to NULL so the worker re-publishes events. This keeps NATS concerns isolated in the worker.

5. **Prisma v7 adapter pattern** — Uses `@prisma/adapter-pg` for direct PostgreSQL connection. Connection URL is configured in `prisma.config.ts` for CLI and passed to `PrismaPg` adapter in application code.

6. **No auth (pluggable)** — Actor is hardcoded to `local-user` but the event contract includes `actor.userId` for future auth integration.
