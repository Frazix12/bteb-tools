# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. TanStack Router pages are under `src/routes/`; reusable UI is in `src/components/`; domain code is grouped by capability in `src/features/` (for example, `cover-page`, `index-sheet`, and `presets`). Database schema and access setup live in `src/db/`, while oRPC schemas, middleware, and routers live in `src/orpc/`. Static files belong in `public/`. Drizzle migrations are committed under `drizzle/`. Unit and component tests sit beside source as `*.test.ts` or `*.test.tsx`; Playwright and visual tests live in `tests/`.

## Project Foundation & Libraries

This project was scaffolded with `bunx @tanstack/cli@latest create`. Treat `.cta.json` as the generator configuration and `package.json` as the authoritative dependency list. The application uses:

- Bun for package management and command execution; TypeScript, React 19, Vite, and Nitro for the application runtime and build.
- TanStack Start and file-based Router for the full-stack framework; Query, Form, Store, React DB/query-db-collection, Devtools, and router SSR integration for client data and state.
- TanStack AI with React/client packages and Anthropic, Gemini, Ollama, and OpenAI adapters. Do not assume a single AI provider outside provider-specific code.
- oRPC client/server with TanStack Query, Zod, JSON Schema, and OpenAPI integrations for typed APIs.
- PostgreSQL (`pg`) with Drizzle ORM and Drizzle Kit for persistence and migrations.
- Better Auth for authentication; T3 Env and Zod for validated environment configuration.
- Tailwind CSS 4, shadcn-style components, Radix UI, Lucide React, CVA, `clsx`, `tailwind-merge`, `tw-animate-css`, and Tailwind Typography for UI.
- Streamdown and Highlight.js for rendered content. Testing uses Vitest, jsdom, Testing Library, Playwright, Pixelmatch, and PNGJS; Biome handles formatting and linting.

## Build, Test, and Development Commands

- `bun install`: install dependencies from `bun.lock`.
- `bun run dev`: run the Vite development server on port 3000.
- `bun run build`: create the production build; `bun run preview` serves it locally.
- `bun run test`: run the Vitest suite once.
- `bun run test:visual`: run Playwright integration and screenshot tests.
- `bun run check`: run Biome formatting and lint checks.
- `bun x tsc --noEmit`: type-check without emitting files.
- `bun run db:migrate && bun run db:seed`: apply migrations and idempotently seed presets.

## Coding Style & Naming Conventions

Write TypeScript/TSX using tabs and double quotes, as configured in `biome.json`. Run `bun run check` before submitting. Use kebab-case filenames (`document-card.tsx`), PascalCase React component names, camelCase functions and variables, and `use-` prefixes for hooks. Prefer the `#/` alias for imports from `src/`. Do not edit generated `src/routeTree.gen.ts`; regenerate routes with `bun run generate-routes`.

## Testing Guidelines

Add focused Vitest tests beside changed code using the `*.test.{ts,tsx}` pattern. Put browser flows in `tests/*.spec.ts`; visual snapshots belong beside their spec in a `*-snapshots/` directory. Install Chromium once with `bun x playwright install chromium`. Run unit tests, Playwright, type-checking, and the production build for behavior that crosses layers. No numeric coverage threshold is configured, but new logic and regressions should be tested.

## Commit & Pull Request Guidelines

History follows Conventional Commits such as `feat(ui): streamline actions` and `fix(admin): restore dashboard layout`. Use an imperative, scoped subject and keep each commit focused. Pull requests should explain the user-visible change, note database or environment impacts, link relevant issues, and list verification performed. Include screenshots for UI or print-layout changes and commit updated visual snapshots when intentional.

## Security & Configuration

Copy `.env.example` to `.env.local`; never commit secrets. Validate required authentication and database variables through `src/env.ts`. Generate and commit migrations with `bun run db:generate`; never use `db:push` against production.
