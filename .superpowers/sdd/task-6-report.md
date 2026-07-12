# Task 6 Report: Admin key-management API

## Implemented

- Added dependency injection for the admin repository, AI-key repository, and Gemini key pool.
- Added `admin.aiKeys.list`, `create`, `replace`, `setEnabled`, `delete`, `validate`, and `validateAll`.
- Added bounded, trimmed Zod inputs for labels/API keys and UUID validation for IDs.
- Added explicit public-metadata projection so repository/pool extras such as encrypted secrets and fingerprints cannot be serialized.
- Added sanitized `CONFLICT` and `NOT_FOUND` mappings for AI-key repository errors.
- Preserved the existing admin router behavior and expanded middleware rejection coverage to every AI-key procedure.

## TDD evidence

- RED: `bun run test src/orpc/router/admin.test.ts` failed because `aiKeys` did not exist (and the factory still accepted the old dependency shape).
- GREEN: focused admin router tests passed after the implementation.

## Verification

- `bun run test src/orpc/router/admin.test.ts src/orpc/middleware/admin.test.ts` — 2 files, 11 tests passed.
- `bun x tsc --noEmit` — passed.
- `bun run check` — 157 files checked, no fixes required.
- `git diff --check` — passed.

## Notes

- Replacement preserves the existing label because its public API intentionally accepts only `{ id, apiKey }`.
- The production pool follows the existing pool construction pattern; credential validation remains the pool's injected responsibility.
