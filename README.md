# taskDesk

A personal task management platform designed to turn actionable messages into clear, trackable work — without turning every email into a ticket.

> **Project status:** foundation / MVP planning. Email integrations and AI-assisted triage are intentionally out of scope for the first milestone.

## Product direction

taskDesk helps a person distinguish between information and commitments. The first version focuses on manually managed tasks, a reliable workflow, and a clean foundation for future integrations.

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
| Database | PostgreSQL, Prisma |
| Tests | Vitest and API-level tests |
| Styling | Plain CSS (no Tailwind) |

## Planned workspace

```text
taskDesk/
├── AGENTS.md
├── README.md
├── .env.example
├── .gitignore
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── SECURITY.md
├── apps/
│   ├── web/
│   └── api/
└── packages/
    └── shared/
```

The workspace will be introduced incrementally. Each milestone must remain understandable, testable, and documented.

## Development principles

1. Work in small, reviewable changes.
2. Keep business logic separate from transport and UI layers.
3. Use English for code identifiers and Portuguese (Brazil) for the interface.
4. Never commit credentials, access tokens, private email content, or production data.
5. Validate inputs at system boundaries.
6. Run available tests, linting, and builds before declaring a task complete.
7. Document any validation that could not be run.

## Getting started

The application workspace is being established. Setup instructions will be added when the first runnable web and API applications land.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the planned milestones and [docs/PRODUCT.md](docs/PRODUCT.md) for MVP behavior.

## License

No license has been selected yet. Until one is added, all rights are reserved by the repository owner.
