# taskDesk

A personal task management platform designed to turn actionable messages into clear, trackable work — without turning every email into a ticket.

> **Project status:** foundation / MVP. The current dashboard uses demonstration data. Real Gmail and Microsoft 365 connections are intentionally out of scope for this milestone.

## Product direction

taskDesk helps distinguish information from commitments. The first version focuses on manually managed tasks, a reliable workflow, and a clean foundation for future integrations.

### MVP principles

- Manual task creation and management first.
- Human control over task creation and status changes.
- Demo data clearly identified as demo data.
- No real Gmail or Microsoft 365 connections in the initial MVP.
- No automatic email replies, deletion, or external side effects.
- Security and privacy are architectural requirements, not a later add-on.

## Planned stack

| Area | Technology |
| --- | --- |
| Web | Vue 3, Vite, TypeScript |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma (next persistence milestone) |
| Tests | Vitest and API-level tests |
| Styling | Plain CSS (no Tailwind) |

## Workspace

```text
taskDesk/
├── AGENTS.md
├── README.md
├── .env.example
├── docs/
├── apps/
│   ├── web/
│   └── api/
└── packages/
    └── shared/
```

## Requirements

- Node.js 20.15 or newer (Node 20 LTS recommended).
- npm 10 or newer.

## Run locally

From the repository root:

```bash
npm install
cp .env.example .env
npm run dev
```

The web application is available at http://localhost:5173 and the API at http://127.0.0.1:3000.

Useful commands:

```bash
npm run dev:web
npm run dev:api
npm run typecheck
npm run test
npm run build
```

The current API exposes `GET /health` and `GET /api/v1`. Database persistence and task CRUD are planned next; no database or mailbox connection is required yet.

## Documentation

- [Agent and contributor instructions](AGENTS.md)
- [Product definition](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Security baseline](docs/SECURITY.md)

## License

No license has been selected yet. Until one is added, all rights are reserved by the repository owner.
