# Task 6 Report: Admin key-management API

## Implemented

- Added dependency injection for the admin repository, AI-key repository, and Gemini key pool.
- Added `admin.aiKeys.list`, `create`, `replace`, `setEnabled`, `delete`, `validate`, and `validateAll`.
- Added bounded, trimmed Zod inputs for labels/API keys and UUID validation for IDs.
- Added explicit public-metadata projection so repository/pool extras such as encrypted secrets and fingerprints cannot be serialized.
- Added sanitized `CONFLICT` and `NOT_FOUND` mappings for AI-key repository errors.
- Preserved the existing admin router behavior and expanded middleware rejection coverage to every AI-key procedure.
- Added a server-only Gemini credential validator that performs a minimal non-streaming request with the configured model and supplied credential.
- Wired both admin validation and autofill key pools to real validation instead of unconditional success.

## TDD evidence

- RED: `bun run test src/orpc/router/admin.test.ts` failed because `aiKeys` did not exist (and the factory still accepted the old dependency shape).
- GREEN: focused admin router tests passed after the implementation.
- RED (production wiring follow-up): the focused validator test failed because the Gemini validation module did not exist.
- GREEN (production wiring follow-up): adapter-boundary tests prove model/key forwarding, raw-error preservation, and invalid-key health recording without network access.

## Verification

- `bun run test src/features/ai-keys/gemini-validation.test.ts src/features/ai-keys/key-pool.test.ts src/orpc/router/admin.test.ts src/orpc/middleware/admin.test.ts` — 4 files, 23 tests passed.
- `bun x tsc --noEmit` — passed.
- `bun run check` — 159 files checked, no fixes required.
- `git diff --check` — passed.

## Notes

- Replacement preserves the existing label because its public API intentionally accepts only `{ id, apiKey }`.
- Gemini validation uses the minimal prompt `Reply OK.`, disables streaming, does not log provider payloads or credentials, and rethrows provider errors unchanged for classification.
