# Task 6 report: AI usage capture and estimated pricing

## Outcome

- Added provider/model/token usage to autofill results and typed failure paths.
- Added versioned integer-micro pricing for every configured Gemini model.
- Added a Drizzle-backed usage repository and exactly-once router recording for success, semantic failure, and provider failure after quota acceptance.
- Usage rows contain only owner, provider/model, token counts, estimated cost, pricing version, outcome, and timestamp. Tests prohibit `text`, `prompt`, and `patch` keys.
- Telemetry persistence failures are logged and do not retry the provider request.

## Pricing source

Verified against Google's official Gemini Developer API pricing page on 2026-07-11:
https://ai.google.dev/gemini-api/docs/pricing

Standard paid-tier text rates per 1M tokens encoded:

- `gemini-3.1-flash-lite`: $0.25 input / $1.50 output
- `gemini-2.5-flash-lite`: $0.10 input / $0.40 output
- `gemini-2.5-flash`: $0.30 input / $2.50 output

## TDD and verification

- Red: focused tests initially failed because `pricing.ts` and `usage-repository.ts` did not exist.
- Green: `pnpm vitest run src/features/autofill src/orpc/router/autofill.test.ts` — 6 files, 27 tests passed.
- Types: `pnpm exec tsc --noEmit` — passed.
- Format/lint: `pnpm biome check src/features/autofill src/orpc/router/autofill.ts src/orpc/router/autofill.test.ts` — passed after formatting.
- `git diff --check` — passed.

## Self-review

No prompt/source text or extracted patch crosses the repository boundary. Null token counts are stored as zero because the existing accounting table uses non-null bigint columns; the typed capture result retains null to distinguish unavailable provider usage. Unknown models estimate zero cost under the current pricing version.
