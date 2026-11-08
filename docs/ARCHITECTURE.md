# Architecture

## Approach

Use a single repository with independently runnable web and API applications plus a small shared package. Keep deployment and operations simple for the MVP. Do not split the system into microservices.

## Workspace

```text
apps/
  web/       Vue 3 + Vite client
  api/       Express HTTP API
    prisma/  PostgreSQL schema and migrations
packages/
  shared/    Shared types and validation contracts
docs/        Product, architecture, roadmap, and security docs
```

## Runtime responsibilities

### Web

- Render the task dashboard and task forms.
- Communicate with the API through a typed client layer.
- Handle loading, empty, success, and error states.
- Keep presentation concerns out of business rules.
- Use plain CSS and accessible semantic HTML.

### API

- Expose versioned HTTP endpoints under `/api/v1`.
- Validate request payloads with Zod.
- Apply application-level business rules.
- Keep persistence behind repository interfaces.
- Enforce authorization when authentication is added.
- Return consistent error responses.
- Expose a lightweight health endpoint that does not leak secrets.

### Database

- PostgreSQL is the persistent store.
- Prisma manages the schema and migrations.
- A task record must become user-owned before personal data is stored online.
- Activity events are append-oriented and must not store sensitive email bodies.

## Initial domain model

### Task

- `id`: generated identifier.
- `title`: required short text (maximum 160 characters).
- `description`: optional text.
- `status`: NEW, IN_PROGRESS, WAITING, COMPLETED.
- `priority`: LOW, NORMAL, HIGH, URGENT.
- `dueAt`: optional timestamp.
- `origin`: optional human-readable source/reference.
- `isDemo`: marks seeded demonstration data.
- `createdAt`, `updatedAt`: timestamps.

### Task activity

- `id`, `taskId`, `type`, `message`, `createdAt`.
- Activity types may include task creation, status change, priority change, and comment.
- Keep activity content concise and avoid storing unnecessary sensitive data.

## API

- `GET /health` — process health.
- `GET /api/v1/tasks` — list tasks with optional status/priority filters.
- `POST /api/v1/tasks` — create a task.
- `GET /api/v1/tasks/:id` — task detail.
- `PATCH /api/v1/tasks/:id` — update task fields.
- `DELETE /api/v1/tasks/:id` — explicit deletion.

Use consistent response shapes and appropriate HTTP status codes. Do not expose database internals.

## Configuration

- Validate required environment variables at startup.
- Keep local secrets in ignored `.env` files.
- Commit `.env.example` with placeholders only.
- Do not make the frontend depend on server secrets.

## Quality strategy

- Unit-test domain rules and validation.
- API-test task routes and error cases.
- Component-test important user interactions.
- Run type checking and production builds.
- Keep migrations reviewed and reversible where practical.

## Future integrations

Email providers and AI classification must be adapters behind explicit application interfaces. The core task domain must remain usable when no provider or AI service is configured.
