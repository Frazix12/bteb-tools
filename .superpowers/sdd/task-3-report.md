# Task 3 report: Admin authorization boundary

## Final implementation

- Added the typed AI key repository, encrypted create/replace/validation reads, duplicate/not-found/configuration errors, health updates, and deterministic round-robin selection.
- Candidate selection inserts the Google cursor singleton, locks it with `SELECT ... FOR UPDATE`, selects only enabled and valid keys whose cooldown is absent or expired, advances the cursor, commits, and decrypts afterward.
- Public projections explicitly exclude encrypted secrets and fingerprints.
- `ai_provider_key.last_success_at` is nullable, migrated additively, exposed as `lastSuccessAt`, and updated by `recordSuccess`.
- The production repository creates its cipher from `env.AI_KEY_ENCRYPTION_SECRET` when configured and otherwise fails closed for secret-bearing operations.

## Final test coverage

The 10 focused repository/schema tests cover missing cipher configuration, `23505` duplicate translation, exact `[A,B,C]` then `[B,C,A]` rotation, unique candidates, secret decryption only in server candidate results, compiled eligibility SQL and bound parameters, `FOR UPDATE` lock SQL, overlapping selection serialization at the lock call, health timestamps, explicit secret-free public projection, and schema columns.

## Status

Implemented the admin authorization boundary with pure role/bootstrap helpers, an oRPC admin middleware/procedure, and a protected `/admin` route that redirects ordinary authenticated users to `/dashboard`.

## TDD evidence

- RED: focused tests failed because `authorization.ts` and `adminProcedure` did not exist.
- GREEN: `pnpm vitest run src/features/admin/authorization.test.ts src/orpc/middleware/admin.test.ts` passed 6 tests.
- Full verification: `pnpm exec biome check ... && pnpm vitest run && pnpm exec tsc --noEmit` passed; 28 test files and 120 tests passed.

## Exact verification

- `bun run test src/features/ai-keys/repository.test.ts src/db/schema.test.ts` — 2 files passed, 10 tests passed.
- `bun x tsc --noEmit` — exit 0.
- `bun run check src/db/schema.ts src/db/schema.test.ts src/features/ai-keys/types.ts src/features/ai-keys/repository.ts src/features/ai-keys/repository.test.ts drizzle/0005_curious_toad_men.sql drizzle/meta/0005_snapshot.json drizzle/meta/_journal.json` — checked 5 applicable source files, no errors.
- `git diff --check` — exit 0.
- Anonymous, ordinary-user, and admin procedure paths are covered.
- Bootstrap email matching normalizes case and whitespace.
- Bootstrap self-demotion is rejected by `canChangeRole`.
- Admin route uses authenticated parent context and redirects non-admins.
- Authorization imports do not eagerly validate unrelated environment variables.

## Concern

A live PostgreSQL integration test remains useful when the repository gains a database test fixture; current locking and predicate guarantees are tested through compiled Drizzle SQL and a transaction-capable fake.

## Concerns

- None outstanding.

## Eligibility correction

Human decision applied: candidates must be enabled and either `valid`, or `transient_failure` with a null/expired cooldown. `unchecked`, `invalid`, disabled, and transient failures with a future cooldown are excluded. The compiled Drizzle SQL/parameter assertion and eligibility fixtures cover each branch explicitly.

## Eligibility correction verification

- `bun run test src/features/ai-keys/repository.test.ts src/db/schema.test.ts` — 2 files passed, 16 tests passed.
- `bun x tsc --noEmit` — exit 0.
- First `bun run check ...` — exit 1 due only to one formatter change requested in `repository.ts`; formatting was applied before the final verification below.
- Final `bun run check src/db/schema.ts src/db/schema.test.ts src/features/ai-keys/types.ts src/features/ai-keys/repository.ts src/features/ai-keys/repository.test.ts drizzle/0005_curious_toad_men.sql drizzle/meta/0005_snapshot.json drizzle/meta/_journal.json` — checked 5 applicable files, no errors, exit 0.
- Final `git diff --check` — exit 0.

## Reviewer follow-up

- Added validation-free `src/config/bootstrap-admin.ts` as the single source for the bootstrap email default and normalized runtime lookup.
- `src/env.ts` and admin authorization now consume the shared definition; importing admin middleware still does not trigger full environment validation.
- TDD RED: `src/config/bootstrap-admin.test.ts` failed because the shared module did not exist.
- Verification: focused bootstrap/admin/auth tests passed 15 tests across 5 files; `pnpm exec tsc --noEmit` and targeted Biome checks passed.
- Security follow-up: added regressions for empty and whitespace-only bootstrap overrides; the accessor now matches `emptyStringAsUndefined` by falling back to the shared default. Focused verification passed 17 tests across 5 files, TypeScript, and targeted Biome checks.
