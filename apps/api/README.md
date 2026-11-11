# API

Express + TypeScript + Zod + Prisma. As rotas de tarefas ficam em `/api/v1/tasks`. Os corpos das requisições são validados estritamente. Os testes das rotas usam repositório em memória e não exigem PostgreSQL.

## Banco local

1. Configure `.env` na raiz usando `.env.example`.
2. Inicie o PostgreSQL: `docker compose up -d postgres`.
3. Gere o Prisma Client: `npm run db:generate`.
4. Aplique as migrações versionadas: `npm run db:migrate`.

A migração inicial cria `Task`, `TaskActivity`, enums, índices e a chave estrangeira com exclusão em cascata para atividades da tarefa.

## Rotas

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id`
- `DELETE /api/v1/tasks/:id`

Autenticação e autorização por usuário ainda não estão implementadas. Não exponha a API com dados pessoais.

## Testes de persistência

Defina `TEST_DATABASE_URL` apenas para um PostgreSQL descartável e aplique as migrations nele antes de executar `npm test`. A suíte verifica atomicidade, rollback e concorrência; cria um trigger temporário de falha e nunca deve apontar para produção. Sem essa variável, os testes de integração são pulados.
