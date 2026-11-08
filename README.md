# taskDesk

A personal task management platform designed to turn actionable messages into clear, trackable work — without turning every email into a ticket.

> **Project status:** manual-task API foundation. The web dashboard still contains demonstration data. Real Gmail and Microsoft 365 connections are intentionally out of scope.

## Stack

- Web: Vue 3, Vite, TypeScript, plain CSS.
- API: Node.js, Express, TypeScript, Zod.
- Database: PostgreSQL 16, Prisma 6.
- Tests: Vitest and Supertest.

## Requirements

- Node.js 20.15 or newer.
- npm 10 or newer.
- Docker Engine and Docker Compose (for local PostgreSQL).

## Run locally

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

The web app is available at http://localhost:5173 and the API at http://127.0.0.1:3000.

Useful commands:

```bash
npm run dev:web
npm run dev:api
npm run typecheck
npm test
npm run build
npm run db:studio
```

## API

All task endpoints are under `/api/v1/tasks`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/tasks` | List tasks; optional `status` and `priority` filters |
| POST | `/api/v1/tasks` | Create a task |
| GET | `/api/v1/tasks/:id` | Get task details |
| PATCH | `/api/v1/tasks/:id` | Update task fields |
| DELETE | `/api/v1/tasks/:id` | Delete a task after explicit user action |

Allowed statuses: `NEW`, `IN_PROGRESS`, `WAITING`, `COMPLETED`.

Allowed priorities: `LOW`, `NORMAL`, `HIGH`, `URGENT`.

The API validates request payloads and returns JSON errors. Authentication is not implemented yet; do not expose this API publicly with real user data until authentication and per-user authorization are added.

## Documentation

- [Agent instructions](AGENTS.md)
- [Product definition](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Security baseline](docs/SECURITY.md)
