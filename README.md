> [!WARNING]
> **Hosted Version Currently Unavailable**
>
> The hosted version of this project is currently down and may not be accessible. You can still explore the source code in this repository.

# BTEB Sheet Generator

A Bun-powered TanStack Start application for creating, saving, and printing BTEB-style index sheets and cover pages. Documents are private to each authenticated user, and optional Gemini autofill always requires review before it changes a draft.

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
pnpm install
```

Copy `.env.example` to `.env.local`. The required authentication settings are:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BOOTSTRAP_ADMIN_EMAIL=frazixgaming22@gmail.com
GEMINI_API_KEY=optional
GEMINI_MODEL=gemini-3.1-flash-lite
```

In Google Cloud, register the Better Auth callback URL by appending
`/api/auth/callback/google` to `BETTER_AUTH_URL`. For the local value above, the
exact authorized redirect URI is `http://localhost:3000/api/auth/callback/google`.
The bootstrap email receives the admin role when that Google account signs in.

Apply committed migrations, idempotently seed the three built-in presets, and
start the app:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Run `pnpm db:seed` after every deployment migration; its slug-based upserts make
repeat runs safe. AI usage and cost reporting begins after the usage migration is
applied. Costs are estimates calculated from the versioned model pricing stored
by the application, not provider invoices; activity before migration is absent.

## Verification

```bash
pnpm test
pnpm test:visual
pnpm check
pnpm exec tsc --noEmit
pnpm build
```

Install Chromium once before running visual tests on a new machine:

```bash
pnpm exec playwright install chromium
```

The visual suite runs deterministic, development-only preview fixtures and checks exact A4 print geometry and committed screenshots. The `/visual-fixtures` route returns not found in production builds.

## Database changes

Generate migrations with `pnpm db:generate`; apply them with `pnpm db:migrate`.
Do not use `db:push` against production.
