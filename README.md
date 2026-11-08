# taskDesk

A personal task management platform for turning actionable messages into trackable work, without turning every email into a ticket.

**Current status:** task CRUD API and PostgreSQL foundation. The Vue dashboard still uses demo data. No real Gmail or Microsoft 365 connections exist.

## Stack
- Web: Vue 3, Vite, TypeScript, plain CSS.
- API: Node.js, Express, TypeScript, Zod.
- Database: PostgreSQL 16, Prisma 6.
- Tests: Vitest and Supertest.

## Requirements
Node.js 20.15+, npm 10+, Docker Engine and Compose for local PostgreSQL.

## Run locally
```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```
Web: http://localhost:5173. API: http://127.0.0.1:3000.

Commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run db:studio`.

## Task API
- `GET /api/v1/tasks` — list, optional status/priority filters.
- `POST /api/v1/tasks` — create.
- `GET /api/v1/tasks/:id` — details.
- `PATCH /api/v1/tasks/:id` — update.
- `DELETE /api/v1/tasks/:id` — explicit deletion.

Statuses: NEW, IN_PROGRESS, WAITING, COMPLETED. Priorities: LOW, NORMAL, HIGH, URGENT.

Authentication is not implemented. Do not expose the API publicly with personal data until authentication and per-user authorization exist.

See [AGENTS.md](AGENTS.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and [roadmap](docs/ROADMAP.md).
