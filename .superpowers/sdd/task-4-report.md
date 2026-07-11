# Task 4 report

## Implemented

- Added `PresetSummary`, `PresetRecord`, and `PresetRepository` with enabled-only Drizzle queries and conflict-safe slug upserts.
- Moved all three existing preset payloads, including the full ISTT logo data URL, into `seed-data.ts` without changing their values.
- Added idempotent `seedPresets(repository)` and retained compatibility exports from `presets.ts` for current consumers.
- Added authenticated `presets.list` and `presets.getEnabled`; the latter validates input, maps unavailable presets to `NOT_FOUND`, and parses stored JSON with the matching document schema.
- Registered the preset router in the root oRPC router.

## TDD evidence

- Initial focused run failed because the repository, seed, and router modules did not exist.
- Focused verification: `pnpm vitest run src/features/presets src/orpc/router/presets.test.ts` — 4 files, 10 tests passed.
- Type verification: `pnpm exec tsc --noEmit` — passed.
- Formatting/lint verification: targeted `pnpm exec biome check --write ...` — passed after formatting.
- `git diff --check` — passed.

## Self-review

- Repository list projections omit the large JSON payload.
- Enabled, slug, and type predicates are applied in the database query.
- Seed upserts update stable fields and cannot duplicate slugs.
- Unrelated existing edits in Task 2 and Task 3 reports were not staged.

## Concerns

- Database integration is exercised through repository contract tests and type checking; this task does not require a live PostgreSQL test database.
