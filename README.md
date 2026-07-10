# BTEB Sheet Generator

A Bun-powered TanStack Start application for creating, saving, importing, exporting, and printing BTEB-style index sheets and cover pages. Documents are private to each authenticated user, and optional Gemini autofill always requires review before it changes a draft.

## Stack

- Bun, TanStack Start/Router/Query/Form
- Shadcn UI, Tailwind CSS
- Better Auth
- PostgreSQL, Drizzle ORM
- oRPC
- Gemini Flash autofill
- Vitest and Playwright

## Local setup

Install dependencies:

```bash
bun install
```

Create `.env.local`:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
GEMINI_API_KEY=optional
GEMINI_MODEL=gemini-3.1-flash-lite
```

Apply the committed migrations and start the app:

```bash
bun run db:migrate
bun run dev
```

## Verification

```bash
bun run test
bun run test:visual
bun run check
bun x tsc --noEmit
bun run build
```

Install Chromium once before running visual tests on a new machine:

```bash
bun x playwright install chromium
```

The visual suite runs deterministic, development-only preview fixtures and checks exact A4 print geometry and committed screenshots. The `/visual-fixtures` route returns not found in production builds.

## Database changes

Generate migrations with `bun run db:generate`; apply them with `bun run db:migrate`. Do not use `db:push` against production.
