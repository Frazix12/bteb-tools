# Admin Dashboard, Google Authentication, and Database Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Google-only authentication, server-enforced admin features, database-backed presets, AI cost telemetry, consistent Lucide UI, and editors without import/export controls.

**Architecture:** Extend the Drizzle schema with roles, presets, and immutable AI usage events, then expose focused oRPC repositories and routers behind reusable authorization middleware. Keep public preset consumption separate from admin CRUD, calculate versioned estimated AI costs server-side, and compose the admin route from small section components.

**Tech Stack:** TypeScript 6, React 19, TanStack Start/Router/Query/Form, Better Auth, oRPC, Drizzle ORM/PostgreSQL, Zod 4, Lucide React, Vitest, Testing Library, Playwright, Biome.

## Global Constraints

- Google OAuth is the only sign-in method.
- `frazixgaming22@gmail.com` is the bootstrap admin.
- Roles are exactly `user` and `admin`.
- Only server-authorized admins may read or mutate admin data.
- Admins may delete but never edit user documents.
- The bootstrap admin cannot demote themself.
- AI prompts, pasted text, and extracted document content must never be stored in telemetry.
- AI costs are labeled estimated and historical rate-limit rows are not backfilled.
- Preset application creates an unsaved document; only enabled presets are public.
- Import and Export are removed; Save and Print remain.

---

### Task 1: Database schema and migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0003_admin_presets_ai_usage.sql` (generated name prefix must be `0003`)
- Modify: `drizzle/meta/_journal.json` and generated snapshot
- Test: `src/db/schema.test.ts`

**Interfaces:**
- Produces: `userRoleEnum`, `preset`, `aiUsageEvent`, and `user.role` used by all later tasks.
- AI money is stored as integer micro-US-dollars (`costMicros`) to avoid floating-point aggregation.

- [ ] **Step 1: Write a schema-shape test**

```ts
import { getTableColumns } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { aiUsageEvent, preset, user } from "./schema";

describe("admin schema", () => {
  test("exposes role, presets, and usage accounting columns", () => {
    expect(Object.keys(getTableColumns(user))).toContain("role");
    expect(Object.keys(getTableColumns(preset))).toEqual(expect.arrayContaining(["slug", "type", "data", "enabled"]));
    expect(Object.keys(getTableColumns(aiUsageEvent))).toEqual(expect.arrayContaining(["ownerId", "model", "inputTokens", "outputTokens", "costMicros", "pricingVersion", "outcome"]));
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `pnpm vitest run src/db/schema.test.ts`
Expected: FAIL because `preset` and `aiUsageEvent` are not exported.

- [ ] **Step 3: Add schema definitions**

Add `userRoleEnum = pgEnum("user_role", ["user", "admin"])`, a non-null `role` defaulting to `user`, a `preset` table with UUID id, unique slug, title, description, `documentTypeEnum`, JSONB data, enabled boolean, creator/updater foreign keys and timestamps, and `aiUsageEvent` with bigint token/cost counters, provider/model/outcome/pricing version, owner foreign key, and timestamp. Add indexes for preset enabled/type and usage owner/created/model queries.

- [ ] **Step 4: Generate and inspect the migration**

Run: `pnpm db:generate`
Expected: a `0003_*.sql` migration that creates enum/table/index/foreign-key objects and adds `user.role` with a `user` default. Rename only if needed to the declared plan path and keep journal metadata consistent.

- [ ] **Step 5: Run focused and schema checks**

Run: `pnpm vitest run src/db/schema.test.ts && pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle
git commit -m "feat(db): add admin presets and AI usage schema"
```

### Task 2: Google-only authentication and bootstrap role

**Files:**
- Modify: `src/env.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/features/auth/auth-flow.ts`
- Modify: `src/features/auth/auth-flow.test.ts`
- Modify: `src/features/auth/auth-page.tsx`
- Modify: `src/routes/login.tsx`
- Modify: `src/routes/signup.tsx`
- Test: `src/features/auth/auth-page.test.tsx`

**Interfaces:**
- Produces: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`; `startGoogleSignIn(redirect?: string)`; sessions whose `user.role` is available.
- Consumes: `user.role` from Task 1.

- [ ] **Step 1: Replace credential-flow tests with OAuth redirect tests**

```ts
test("accepts only local post-auth paths", () => {
  expect(normalizeRedirectTarget("/presets?p=1")).toBe("/presets?p=1");
  expect(normalizeRedirectTarget("https://evil.example")).toBe("/dashboard");
  expect(normalizeRedirectTarget("//evil.example")).toBe("/dashboard");
});
```

Add a component test that clicks `Continue with Google`, expects `authClient.signIn.social` with `{ provider: "google", callbackURL: "/dashboard" }`, and asserts no email, password, signup, or credential submit controls exist.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/auth/auth-flow.test.ts src/features/auth/auth-page.test.tsx`
Expected: FAIL because the page still renders credential fields.

- [ ] **Step 3: Configure Google and bootstrap promotion**

In `env.ts`, require Google client credentials and default `BOOTSTRAP_ADMIN_EMAIL` to `frazixgaming22@gmail.com`. In `auth.ts`, remove `emailAndPassword`, configure `socialProviders.google`, expose `role` through Better Auth additional user fields if required by its inferred session type, and use a database hook that promotes the normalized bootstrap email on user creation/sign-in without demoting existing admins.

- [ ] **Step 4: Build the Google-only page**

Change `AuthPage` to accept only `redirect?: string`, render a Lucide `Chrome` icon and visible `Continue with Google` label, invoke `authClient.signIn.social`, and show a retryable generic error. Make `/signup` redirect to `/login` while preserving validated search. Delete `submitCredentials` and credential schemas.

- [ ] **Step 5: Verify auth behavior**

Run: `pnpm vitest run src/features/auth/auth-flow.test.ts src/features/auth/auth-page.test.tsx src/lib/session.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/env.ts src/lib/auth.ts src/features/auth src/routes/login.tsx src/routes/signup.tsx
git commit -m "feat(auth): switch to Google OAuth only"
```

### Task 3: Admin authorization boundary

**Files:**
- Modify: `src/orpc/middleware/auth.ts`
- Create: `src/orpc/middleware/admin.test.ts`
- Create: `src/features/admin/authorization.ts`
- Create: `src/features/admin/authorization.test.ts`
- Create: `src/routes/_auth/admin.tsx`

**Interfaces:**
- Produces: `adminProcedure`; `assertAdminUser(user): void`; protected `/_auth/admin` route context.
- Consumes: session `user.role` from Task 2.

- [ ] **Step 1: Write denial and bootstrap-protection tests**

```ts
expect(() => assertAdminUser({ role: "user" })).toThrow("FORBIDDEN");
expect(() => assertAdminUser({ role: "admin" })).not.toThrow();
expect(canChangeRole({ actorId: "a", targetId: "a", targetEmail: BOOTSTRAP_ADMIN_EMAIL })).toBe(false);
```

Test `adminProcedure` with anonymous, ordinary, and admin sessions; expect `UNAUTHORIZED`, `FORBIDDEN`, and success respectively.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/admin/authorization.test.ts src/orpc/middleware/admin.test.ts`
Expected: FAIL because the authorization helpers do not exist.

- [ ] **Step 3: Implement authorization**

Add `assertAdminUser`, `isBootstrapAdminEmail`, and `canChangeRole` as pure helpers. Extend auth middleware with `adminMiddleware` after session resolution and export `adminProcedure = protectedProcedure.use(adminMiddleware)`. Add `/admin` route `beforeLoad` that redirects non-admins to `/dashboard`; render a temporary accessible heading for later replacement.

- [ ] **Step 4: Verify**

Run: `pnpm vitest run src/features/admin/authorization.test.ts src/orpc/middleware/admin.test.ts && pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/orpc/middleware src/features/admin src/routes/_auth/admin.tsx
git commit -m "feat(admin): enforce role-based access"
```

### Task 4: Database preset repository, seed, and public API

**Files:**
- Create: `src/features/presets/preset-repository.ts`
- Create: `src/features/presets/preset-repository.test.ts`
- Create: `src/features/presets/seed-data.ts`
- Create: `src/features/presets/seed.ts`
- Create: `src/features/presets/seed.test.ts`
- Create: `src/orpc/router/presets.ts`
- Create: `src/orpc/router/presets.test.ts`
- Modify: `src/orpc/router/index.ts`
- Modify: `src/features/presets/presets.ts`

**Interfaces:**
- Produces: `PresetSummary`, `PresetRecord`, `PresetRepository`; public procedures `presets.list` and `presets.getEnabled`; `seedPresets(repository)`.
- `getEnabled({ slug, type })` parses `data` with `CoverPageDataSchema` or `IndexSheetDataSchema` before returning it.

- [ ] **Step 1: Write repository/router contract tests**

Test enabled-only listing, disabled/unknown/type-mismatch not-found behavior, schema rejection, and user authentication. Add a seed test invoking `seedPresets` twice and asserting exactly three stable slugs remain.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/presets/preset-repository.test.ts src/features/presets/seed.test.ts src/orpc/router/presets.test.ts`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the repository and seed boundary**

Define repository methods `listEnabled()`, `findEnabled(slug, type)`, and `upsertSeed(input)`. Move the three existing typed objects into `seed-data.ts`; keep the large logo payload there. Implement Drizzle queries and conflict-safe upsert by slug. Remove runtime lookup exports from `presets.ts` once consumers migrate in Task 5.

- [ ] **Step 4: Implement public procedures**

Expose authenticated list/get procedures, validate slug and type with Zod, parse JSON using existing document schemas, and map missing/disabled/mismatched rows to `NOT_FOUND`.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run src/features/presets src/orpc/router/presets.test.ts`
Expected: PASS, including two seed runs producing three rows.

- [ ] **Step 6: Commit**

```bash
git add src/features/presets src/orpc/router
git commit -m "feat(presets): add database repository and seed"
```

### Task 5: Database-backed preset user flow

**Files:**
- Modify: `src/routes/_auth/presets.tsx`
- Modify: `src/routes/_auth/cover-page/new.tsx`
- Modify: `src/routes/_auth/index-sheet/new.tsx`
- Create: `src/features/presets/queries.ts`
- Create: `src/features/presets/preset-page.test.tsx`
- Delete: `src/features/presets/presets.ts`
- Modify: `src/features/presets/presets.test.ts` (replace with query/route tests or delete)

**Interfaces:**
- Consumes: `presets.list` and `presets.getEnabled` from Task 4.
- Produces: query options `presetListQueryOptions()` and `presetQueryOptions(slug, type)`.

- [ ] **Step 1: Write loading/application tests**

Render the page with two enabled server rows and assert both cards and icon-labeled `Use preset` links. Test each new-document route initializes from fetched typed data, while missing presets show a not-found message and a `Start blank` action instead of silently using blank data.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/presets/preset-page.test.tsx`
Expected: FAIL because routes still read the source registry.

- [ ] **Step 3: Add query adapters and migrate routes**

Use oRPC TanStack query options for list/detail. Preserve `{ preset?: string }` search validation, fetch before editor initialization, and key the initial data so it is not overwritten after user edits. Add explicit loading, empty, and not-found states with Lucide icons and visible text.

- [ ] **Step 4: Remove the runtime registry**

Delete `presets.ts` after `rg 'features/presets/presets' src` returns no consumers. Keep seed data solely in `seed-data.ts`.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run src/features/presets src/routes/_auth/cover-page src/routes/_auth/index-sheet`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/presets src/routes/_auth
git commit -m "feat(presets): load presets from PostgreSQL"
```

### Task 6: AI usage capture and estimated pricing

**Files:**
- Create: `src/features/autofill/pricing.ts`
- Create: `src/features/autofill/pricing.test.ts`
- Create: `src/features/autofill/usage-repository.ts`
- Create: `src/features/autofill/usage-repository.test.ts`
- Modify: `src/features/autofill/extract.ts`
- Modify: `src/features/autofill/extract.test.ts`
- Modify: `src/orpc/router/autofill.ts`
- Modify: `src/orpc/router/autofill.test.ts`

**Interfaces:**
- Produces: `AiGenerationUsage { provider; model; inputTokens: number | null; outputTokens: number | null }`; `estimateCostMicros(usage)`; `AiUsageRepository.record(event)`.
- `AutofillResult` gains `usage`; router records `success`, `no_meaningful_fields`, or `provider_error` without request text.

- [ ] **Step 1: Write exact pricing tests**

```ts
expect(estimateCostMicros({ model: "gemini-3.1-flash-lite", inputTokens: 1_000_000, outputTokens: 1_000_000 })).toEqual({ costMicros: EXPECTED_INPUT_PLUS_OUTPUT_MICROS, pricingVersion: "2026-07-11" });
expect(estimateCostMicros({ model: "unknown", inputTokens: null, outputTokens: null }).costMicros).toBe(0n);
```

Before filling `EXPECTED_INPUT_PLUS_OUTPUT_MICROS`, verify the configured model’s official Google pricing at implementation time and encode the cited rates in comments and test constants. Tests must also prove recorded event objects contain no `text`, `prompt`, or `patch` keys.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/autofill/pricing.test.ts src/features/autofill/usage-repository.test.ts src/orpc/router/autofill.test.ts`
Expected: FAIL because telemetry interfaces do not exist.

- [ ] **Step 3: Capture provider usage**

Adapt the TanStack AI response into `{ value, usage }` rather than returning only structured output. Preserve extractor validation and attach usage to success/error results through a typed provider error so the router can record available tokens even on failure.

- [ ] **Step 4: Implement pricing and persistence**

Use integer arithmetic and a versioned model-rate map. Persist only owner, provider/model, token counts, cost micros, pricing version, outcome, and timestamp. Never pass input text to the repository.

- [ ] **Step 5: Wire logging into autofill**

Inject the usage repository into `createAutofillRouter`; record exactly once per provider attempt after quota acceptance. Telemetry failure is logged server-side and must not duplicate an AI request or expose input.

- [ ] **Step 6: Verify**

Run: `pnpm vitest run src/features/autofill src/orpc/router/autofill.test.ts`
Expected: PASS for success, semantic failure, provider failure, unknown usage, and privacy assertions.

- [ ] **Step 7: Commit**

```bash
git add src/features/autofill src/orpc/router/autofill.ts src/orpc/router/autofill.test.ts
git commit -m "feat(ai): record versioned usage costs"
```

### Task 7: Admin repositories and APIs

**Files:**
- Create: `src/features/admin/admin-repository.ts`
- Create: `src/features/admin/admin-repository.test.ts`
- Create: `src/orpc/router/admin.ts`
- Create: `src/orpc/router/admin.test.ts`
- Modify: `src/orpc/router/index.ts`

**Interfaces:**
- Produces: `admin.users.list`, `admin.users.setRole`, `admin.usage.summary`, `admin.data.summary`, `admin.data.listDocuments`, `admin.data.deleteDocument`, and preset CRUD procedures.
- All inputs use `{ page: int >= 1, pageSize: int 1..100 }`; destructive IDs are UUIDs; all procedures use `adminProcedure`.

- [ ] **Step 1: Write API contract tests**

Cover anonymous/user denial for every branch, pagination bounds, user aggregate fields, bootstrap self-demotion rejection, usage totals/breakdowns, data counts, document deletion, preset create/update/enable/delete, duplicate slug conflict, and typed JSON validation.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/admin/admin-repository.test.ts src/orpc/router/admin.test.ts`
Expected: FAIL because admin APIs do not exist.

- [ ] **Step 3: Implement repository queries**

Use Drizzle aggregate queries and transactions for role and destructive mutations. Return DTOs rather than raw tables. Document deletion filters by document id; no update-document admin method exists. Preset writes set creator/updater from the acting admin and validate data before repository calls.

- [ ] **Step 4: Implement router schemas and error mapping**

Use `adminProcedure` for every endpoint. Map duplicate slug to `CONFLICT`, missing targets to `NOT_FOUND`, invalid role transitions to `FORBIDDEN`, and schema errors to `BAD_REQUEST` with field paths.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run src/features/admin src/orpc/router/admin.test.ts`
Expected: PASS and no admin procedure callable by ordinary users.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin src/orpc/router
git commit -m "feat(admin): add management APIs"
```

### Task 8: Admin dashboard UI

**Files:**
- Modify: `src/routes/_auth/admin.tsx`
- Create: `src/features/admin/admin-dashboard.tsx`
- Create: `src/features/admin/users-panel.tsx`
- Create: `src/features/admin/usage-panel.tsx`
- Create: `src/features/admin/data-panel.tsx`
- Create: `src/features/admin/presets-panel.tsx`
- Create: `src/features/admin/admin-queries.ts`
- Create: `src/features/admin/admin-dashboard.test.tsx`
- Create as needed: `src/components/ui/table.tsx`, `src/components/ui/tabs.tsx`

**Interfaces:**
- Consumes: Task 7 admin procedures.
- Produces: responsive Users, AI Usage, Data, and Presets panels with confirmations and accessible status feedback.

- [ ] **Step 1: Write dashboard interaction tests**

Assert four labeled sections, paginated user/document rows, estimated-cost label, role confirmation, protected bootstrap role control, preset validation messages, enable/disable actions, and destructive document/preset confirmations. Assert icons are `aria-hidden` when decorative and every icon-only control has an accessible name.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/admin/admin-dashboard.test.tsx`
Expected: FAIL because the dashboard panels do not exist.

- [ ] **Step 3: Implement query/mutation adapters**

Centralize oRPC query options and invalidation keys in `admin-queries.ts`. Do not optimistically remove destructive rows; show pending state, await success, then invalidate summaries and lists.

- [ ] **Step 4: Implement focused panels**

Use Lucide `Users`, `ChartNoAxesCombined`, `Database`, `LibraryBig`, `Shield`, `Trash2`, `Pencil`, `Plus`, and status icons alongside visible labels. Use responsive overflow for tables, dialogs for destructive/role actions, and a schema-aware JSON textarea in the preset form.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run src/features/admin/admin-dashboard.test.tsx && pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/_auth/admin.tsx src/features/admin src/components/ui
git commit -m "feat(admin): build management dashboard"
```

### Task 9: Site navigation, icons, and import/export removal

**Files:**
- Modify: `src/components/app-shell.tsx`
- Modify: `src/features/dashboard/dashboard-view.tsx`
- Modify: `src/features/dashboard/document-card.tsx`
- Modify: `src/features/cover-page/cover-page-editor.tsx`
- Modify: `src/features/cover-page/cover-page-editor.test.tsx`
- Modify: `src/features/index-sheet/index-sheet-editor.tsx`
- Modify: `src/features/index-sheet/index-sheet-editor.test.tsx`
- Modify: other `src/routes/**/*.tsx` and `src/features/**/*.tsx` surfaced by the icon audit
- Modify: `src/styles.css`
- Test: `src/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: session role and `/admin` route.
- Produces: admin-only navigation and editors exposing Save/Print/AI actions without JSON import/export.

- [ ] **Step 1: Write visibility and editor tests**

Test the shell as a user and admin: both see Dashboard/Presets/Sign out, only admin sees Admin. Replace import/export tests with assertions that `Import JSON`, `Export JSON`, and file inputs are absent while `Save` and `Print` remain.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/components/app-shell.test.tsx src/features/cover-page/cover-page-editor.test.tsx src/features/index-sheet/index-sheet-editor.test.tsx`
Expected: FAIL because import/export still render and shell lacks role navigation.

- [ ] **Step 3: Remove import/export behavior**

Delete `onExport` props, `Download`/`Upload` imports, file refs, import parsing handlers, download calls, hidden inputs, messages, and tests used only by these controls. Retain legacy JSON utilities only when referenced by seed conversion or compatibility tests; verify with `rg 'downloadJson|Import JSON|Export JSON|onExport' src`.

- [ ] **Step 4: Complete the Lucide audit**

Add icons to app navigation, sign-out, primary page actions, empty states, Save/Print/AI controls, and destructive actions. Preserve visible labels, mark decorative SVGs `aria-hidden`, and avoid icons in dense body text or every input label.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run src/components src/features/dashboard src/features/cover-page src/features/index-sheet`
Expected: PASS; `rg -n 'Import JSON|Export JSON' src` prints no matches.

- [ ] **Step 6: Commit**

```bash
git add src/components src/features src/routes src/styles.css
git commit -m "feat(ui): streamline actions and navigation"
```

### Task 10: End-to-end verification and deployment documentation

**Files:**
- Modify: `README.md`
- Modify: `.env.example` if present; otherwise create `.env.example`
- Modify: `tests/visual/print-layout.spec.ts` only if intentional UI changes affect fixtures
- Create: `tests/admin-access.spec.ts`

**Interfaces:**
- Documents required Google OAuth callback configuration, bootstrap email, migration/seed commands, and estimated-cost semantics.

- [ ] **Step 1: Add the access smoke test**

Create Playwright coverage that uses test session fixtures to prove an ordinary user cannot navigate directly to `/admin`, an admin can see all four sections, public preset rows come from seeded database fixtures, and editor action bars omit Import/Export.

- [ ] **Step 2: Document operations**

Add exact environment keys `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BOOTSTRAP_ADMIN_EMAIL=frazixgaming22@gmail.com`; document the Better Auth Google callback URL derived from `BETTER_AUTH_URL`, `pnpm db:migrate`, the idempotent preset seed command established in Task 4, and that AI costs are estimates beginning after migration.

- [ ] **Step 3: Run database and static verification**

Run: `pnpm db:generate && git diff --check && pnpm check && pnpm exec tsc --noEmit`
Expected: no new migration diff, no whitespace errors, and all checks PASS.

- [ ] **Step 4: Run the complete automated suite**

Run: `pnpm test && pnpm build && pnpm test:visual`
Expected: all Vitest tests pass, production build succeeds, and visual tests pass without unreviewed snapshots.

- [ ] **Step 5: Run targeted security/content audits**

Run: `rg -n 'emailAndPassword|signIn\.email|signUp\.email|Import JSON|Export JSON' src`
Expected: no matches.

Run: `rg -n 'prompt|text|patch' src/features/autofill/usage-repository.ts src/db/schema.ts`
Expected: no persisted prompt/text/patch fields.

Run: `rg -n 'adminProcedure' src/orpc/router/admin.ts`
Expected: every admin endpoint branch is rooted in `adminProcedure`.

- [ ] **Step 6: Commit**

```bash
git add README.md .env.example tests
git commit -m "docs: add admin deployment and verification"
```
