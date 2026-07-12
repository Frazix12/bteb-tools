# Final review fixes report

## Prior final-review changes

- Added optimistic health-write ordering: success and failure updates only apply when both stored success/failure timestamps are null or no newer than the operation's `attemptAt`.
- Split validation failures from runtime failures. Validation writes own `lastValidatedAt`; runtime writes own `lastUsedAt`.
- Runtime success no longer changes `lastValidatedAt`.
- Strengthened `validateAll` coverage for ordered IDs/statuses and repository persistence calls.
- Made the mocked Playwright “Check all keys” response visibly change the key to Invalid and asserted that UI result.

Prior verification recorded 38 focused tests passing, 46 files / 223 full-unit tests passing, TypeScript, Biome, build, and diff checks passing. The visual admin test was blocked before execution because `DATABASE_URL` was required.

## Final blocker fix

## Credential replacement race guard

- Added `ai_provider_key.credential_revision` as a private, monotonically increasing integer with additive migration `0006_classy_garia.sql`.
- Included the revision in private validation/runtime candidates and incremented it atomically on credential replacement.
- Required all success/failure and validation completion writes to match both key ID and expected credential revision, while retaining attempt-time ordering. Existing rows with a newer revision make stale completions harmless no-ops.
- Kept the public key projection unchanged; neither plaintext credentials nor credential revisions are exposed.
- Added regression coverage for stale runtime success, runtime failure, validation success, and validation failure completions after replacement.

## Verification (2026-07-12)

- Focused schema/repository/key-pool/admin/autofill validation: `bun run test src/db/schema.test.ts src/features/ai-keys/repository.test.ts src/features/ai-keys/key-pool.test.ts src/features/ai-keys/gemini-validation.test.ts src/orpc/router/admin.test.ts src/features/admin/ai-keys-panel.test.tsx src/features/autofill/extract.test.ts` — PASS, 7 files / 56 tests.
- Full unit suite: `bun run test` — PASS, 46 files / 227 tests.
- TypeScript: `bun x tsc --noEmit` — PASS.
- Biome: `bun run check` — PASS, 161 files checked, no fixes applied.
- Production build: `bun run build` — PASS. Vite emitted the existing informational >500 kB chunk warning.
- Diff whitespace validation: `git diff --check` — PASS.

Playwright/build emitted existing TanStack Router code-splitting warnings for named exports in the two new-document route files; they do not affect correctness and all checks passed.

## Usage dashboard follow-up

- Provider/model usage totals are rendered with request, nullable input/output token, and estimated-cost values.
- Date and user usage breakdowns now have independent query pagination, totals, page metadata, and controls.
- Nullable token totals render as `Unknown` instead of an empty value or zero.
- Bootstrap demotion failures now identify the protected bootstrap account rather than incorrectly referring to the acting administrator's own account.

Verification:

- `pnpm exec vitest run src/features/admin/admin-dashboard.test.tsx src/features/admin/admin-repository.test.ts src/orpc/router/admin.test.ts`: 3 files, 14 tests passed.
- `pnpm check`: passed, 142 files checked.
- `pnpm exec tsc --noEmit`: passed.
- `git diff --check`: passed.
