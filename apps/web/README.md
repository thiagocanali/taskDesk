# Web application

Vue 3 + Vite + TypeScript client.

The dashboard uses Brazilian Portuguese (pt-BR) and plain CSS. Do not add Tailwind.

## Development

Run commands from the repository root:

- `npm run dev:web` starts the Vite development server.
- `npm run build --workspace @taskdesk/web` creates the production build.
- `npm run typecheck --workspace @taskdesk/web` checks TypeScript and Vue types.
- `npm run test --workspace @taskdesk/web` runs component interaction tests with Vitest and jsdom.

The component tests mock the API boundary and do not require a running backend or database.
