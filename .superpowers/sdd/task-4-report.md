# Task 4 Report: Gemini validation, failure classification, and failover pool

## Status

Complete. Implemented Gemini error classification, managed-key failover, environment fallback, credential validation, and a three-worker validation queue. Existing human eligibility behavior was not changed.

## Changes

- Added narrow `classifyGeminiError` normalization for invalid, quota, transient, and request failures.
- Added fixed sanitized internal messages; provider response text is never persisted.
- Added quota retry parsing with a 60-second default and a 15-second transient cooldown.
- Added `createGeminiKeyPool` with one-attempt-per-managed-key rotation, health recording, request short-circuiting, and one environment fallback attempt.
- Added stored-secret validation returning only `PublicAiKey` and bounded `validateAll` concurrency of three.
- Added 19 focused tests covering all brief flows.

## TDD evidence

### Red

Command:

```text
bun run test src/features/ai-keys/gemini-errors.test.ts src/features/ai-keys/key-pool.test.ts
```

Result: exit 1. Both suites failed to import the intentionally absent `./gemini-errors` and `./key-pool` modules; 0 tests ran. This was the expected missing-feature failure before production code was created.

### Green and final verification

Command:

```text
bun run test src/features/ai-keys/gemini-errors.test.ts src/features/ai-keys/key-pool.test.ts
```

Result: exit 0; 2 test files passed, 19 tests passed, 0 failed (final committed-state run at 11:47:01, duration 408ms).

Command:

```text
bun x tsc --noEmit
```

Result: exit 0; no diagnostics.

Command:

```text
bun x biome check src/features/ai-keys/gemini-errors.ts src/features/ai-keys/gemini-errors.test.ts src/features/ai-keys/key-pool.ts src/features/ai-keys/key-pool.test.ts
```

Result: exit 0; 4 files checked, no fixes required.

Command:

```text
git diff --cached --check
```

Result: exit 0 before the implementation commit; no whitespace errors.

## Commit

- `82bda1b feat(ai): rotate and validate Gemini keys`

## Self-review

- Confirmed authentication failures disable managed keys.
- Confirmed quota and transient failures write cooldown timestamps, while request failures do not retry.
- Confirmed candidate IDs are deduplicated and the environment fallback is never tracked in repository health.
- Confirmed validation uses `getForValidation` and returns only repository/public shapes without secret material.
- Confirmed the queue starts at most three validation workers.
- Confirmed only the four Task 4 source/test files were included in the implementation commit.

## Concerns

- The worktree already contained an unrelated modification to `.superpowers/sdd/task-2-report.md`; it was preserved and excluded from the Task 4 implementation commit.
- No live Gemini API integration test was run; provider-shaped errors and credentials are exercised with deterministic fakes as required by the brief.

## Review fixes

- Runtime request/content failures are classified and rethrown before any repository health write. The regression test asserts neither `recordFailure` nor `recordSuccess` is called.
- Added `recordValidationSuccess(id, now)` as a distinct repository operation. Successful admin validation now atomically sets `enabled: true` and `validationStatus: "valid"`, and clears cooldown and failure fields.
- Runtime `recordSuccess` remains separate and does not enable a key, so runtime traffic cannot silently override an administrator-disabled key.

### Review-fix TDD evidence

Red command:

```text
bun run test src/features/ai-keys/key-pool.test.ts src/features/ai-keys/repository.test.ts
```

Result: exit 1; 3 expected failures (request health was written, validation used runtime success, and `recordValidationSuccess` did not exist).

Green command:

```text
bun run test src/features/ai-keys/key-pool.test.ts src/features/ai-keys/repository.test.ts
```

Result: exit 0; 2 files and 23 tests passed.

Final requested test command:

```text
bun run test src/features/ai-keys/key-pool.test.ts src/features/ai-keys/gemini-errors.test.ts src/features/ai-keys/repository.test.ts
```

Result: exit 0; 3 files and 33 tests passed.

Additional verification:

- `bun x tsc --noEmit`: exit 0, no diagnostics.
- `bun x biome check` over the seven affected Task 4 files: exit 0, 7 files checked, no fixes required.
