# Architecture

Single npm-workspace repository; no microservices.
- `apps/web`: Vue 3 + Vite client.
- `apps/api`: Express routes, Zod validation, Prisma persistence.
- `packages/shared`: shared contracts only where needed.

Task model: ID, title, optional description, status (NEW/IN_PROGRESS/WAITING/COMPLETED), priority (LOW/NORMAL/HIGH/URGENT), optional due date and origin, demo marker, timestamps. TaskActivity is related to Task and cascades on deletion.

API: GET /health; GET/POST /api/v1/tasks; GET/PATCH/DELETE /api/v1/tasks/:id. List supports status and priority filters.

PostgreSQL is persistent storage; Prisma manages schema and migrations. Before online use with personal data, tasks must be scoped to an authenticated user. Email providers and AI remain optional adapters outside the core task domain.

Route tests use an in-memory repository. CI generates Prisma Client, type-checks, tests, and builds.


Task history records each changed field independently. Status and priority entries include the previous and new human-readable values; descriptions and origins are recorded as change events without copying their contents into the audit message. No-op updates do not create activity entries.
