# taskDesk

Plataforma pessoal de organização de tarefas a partir de mensagens acionáveis, sem transformar todo e-mail em chamado.

**Status atual:** API CRUD e dashboard Vue conectados. O painel lista, cria e atualiza tarefas pela API. Gmail e Microsoft 365 ainda não estão conectados.

## Stack
- Web: Vue 3, Vite, TypeScript e CSS puro.
- API: Node.js, Express, TypeScript e Zod.
- Banco: PostgreSQL 16 e Prisma 6.
- Testes: Vitest e Supertest.

## Requisitos
Node.js 20.15+, npm 10+ e Docker Engine com Docker Compose para PostgreSQL local.

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
A autenticação e autorização por usuário ainda não foram implementadas. Não exponha a API publicamente nem utilize dados pessoais reais até que esses controles estejam prontos. Integrações de e-mail permanecem desativadas; nenhuma mensagem é enviada ou excluída automaticamente.

Consulte [AGENTS.md](AGENTS.md), [arquitetura](docs/ARCHITECTURE.md), [segurança](docs/SECURITY.md) e [roadmap](docs/ROADMAP.md).
