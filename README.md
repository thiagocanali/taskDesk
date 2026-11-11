# taskDesk

Plataforma pessoal de organização de tarefas a partir de mensagens acionáveis, sem transformar todo e-mail em chamado.

**Status atual:** CRUD, histórico e isolamento por usuário implementados, com login por Supabase Auth. A ativação hospedada depende de um projeto Supabase dedicado e das variáveis de ambiente. Gmail e Microsoft 365 ainda não estão conectados.

## Stack
- Web: Vue 3, Vite, TypeScript e CSS puro.
- API: Node.js, Express, TypeScript e Zod.
- Banco: PostgreSQL 16 e Prisma 6.
- Testes: Vitest e Supertest.

## Requisitos
Node.js 22+, npm 10+ e Docker Engine com Docker Compose para PostgreSQL local.

## Executar localmente
```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

- Frontend: http://localhost:5173
- API: http://127.0.0.1:3000
- Health check: http://127.0.0.1:3000/health

## Comandos
```bash
npm run typecheck
npm test
npm run build
npm run db:studio
```

## API de tarefas
- `GET /api/v1/tasks` — listar, com filtros opcionais `status` e `priority`.
- `POST /api/v1/tasks` — criar.
- `GET /api/v1/tasks/:id` — consultar.
- `PATCH /api/v1/tasks/:id` — atualizar.
- `DELETE /api/v1/tasks/:id` — excluir explicitamente.

Status: `NEW`, `IN_PROGRESS`, `WAITING`, `COMPLETED`.
Prioridades: `LOW`, `NORMAL`, `HIGH`, `URGENT`.

## Segurança e escopo
O modo local usa uma identidade fixa e só funciona com `NODE_ENV=development`, `AUTH_MODE=local` e API em loopback. Nunca exponha esse modo na rede. Em produção, a API valida tokens com Supabase Auth e restringe tarefas e histórico ao usuário autenticado. A configuração de deploy está em [deployment](docs/DEPLOYMENT.md). Integrações de e-mail permanecem desativadas.

Consulte [AGENTS.md](AGENTS.md), [arquitetura](docs/ARCHITECTURE.md), [segurança](docs/SECURITY.md) e [roadmap](docs/ROADMAP.md).

A revisão técnica e as próximas prioridades estão em [engineering review](docs/ENGINEERING_REVIEW.md). Testes de persistência PostgreSQL são habilitados por `TEST_DATABASE_URL`, apenas em um banco descartável com as migrations aplicadas.
