# Project Guidelines

## Code Style
- Keep changes scoped and feature-focused. Avoid broad refactors unless requested.
- Frontend uses React + TypeScript with feature folders in `client/src` (`pages`, `components`, `hooks`, `services`, `store`, `types`, `utils`).
- Backend uses NestJS + TypeScript with module boundaries in `server/src` (`auth`, `game`, `forum`, `leaderboard`, `profile`, `common`, `database`).
- Prefer existing patterns before introducing new abstractions:
  - Frontend API access through service files under `client/src/services`.
  - Frontend shared state through Context providers in `client/src/store`.
  - Backend domain logic in module services, with persistence behind repository ports/adapters.

## Architecture
- Monorepo-style layout with independently managed apps:
  - `client/`: Vite React SPA.
  - `server/`: NestJS API and realtime game backend.
- Backend follows Hexagonal Architecture (Ports and Adapters). Keep domain logic decoupled from infrastructure.
- Realtime/game flow and auth are split by module; maintain clean module boundaries and explicit imports/exports.
- Prefer linking to existing architecture docs over duplicating details:
  - `client/docs/architecture.md`
  - `server/docs/architecture.md`
  - `.docs/README.md`

## Build And Test
- Run commands from each project directory (there is no root `package.json`).

- Client (`client/`):
  - Install: `npm install`
  - Dev: `npm run dev`
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Preview: `npm run preview`

- Server (`server/`):
  - Install: `npm install`
  - Dev: `npm run start:dev`
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Unit tests: `npm run test`
  - E2E tests: `npm run test:e2e`
  - Coverage: `npm run test:cov`
  - Migrations: `npm run migration:generate`, `npm run migration:run`, `npm run migration:revert`

- Docker stacks:
  - Dev: `docker-compose up -d`
  - Prod-like: `docker-compose -f docker-compose.prod.yml up -d`

## Conventions
- Frontend auth/session behavior:
  - Use `client/src/services/axios.ts` and `client/src/services/interceptors.ts` for token + refresh flow.
  - Keep `withCredentials: true` for refresh-cookie flow.
- Frontend context hooks should guard provider usage (example: `client/src/hooks/useGlobalContext.ts`).
- Backend database config supports either `DATABASE_URL` or explicit `DB_*` variables (see `server/src/database/database.config.ts`).
- For schema changes, always generate and commit TypeORM migrations in `server/src/database/migrations`.
- Keep repository methods specific (for example `findByEmail`) rather than generic "universal" query methods, matching `server/docs/architecture.md` guidance.

## Environment And Pitfalls
- Check required env templates:
  - Root/server env baseline: `.env.production.example`
  - Client env baseline: `client/.env.example`
- Typical local integration assumptions:
  - Client runs on Vite dev server.
  - Server runs on `PORT` (default mapping to 3000 in compose).
  - Postgres and Redis are expected for full backend behavior.
- If auth refresh appears broken, verify:
  - API base URL is correct in client env.
  - CORS origin and credentials settings match frontend URL.
  - Cookie-related env values are appropriate for local HTTP vs production HTTPS.

## Key References
- API/module composition: `server/src/app.module.ts`
- Client route map: `client/src/routes/index.tsx`
- Compose orchestration: `docker-compose.yml`, `docker-compose.prod.yml`
- Planning docs by domain: `.docs/README.md`