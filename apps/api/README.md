# API

Express + TypeScript + Zod + Prisma. Task routes are mounted at `/api/v1/tasks`. Request bodies are strictly validated. Route tests use an in-memory repository and need no PostgreSQL. Production persistence uses PrismaTaskRepository.

Local database: configure root `.env`, run `docker compose up -d postgres`, `npm run db:generate`, then `npm run db:migrate`.
