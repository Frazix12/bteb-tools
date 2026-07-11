# Task 3 report

## Outcome

Implemented the AI key repository contract, secret-safe public projection, encrypted create/replace/read paths, duplicate and not-found errors, health updates, and PostgreSQL-coordinated round-robin candidate selection.

## Files

- `src/features/ai-keys/types.ts`
- `src/features/ai-keys/repository.ts`
- `src/features/ai-keys/repository.test.ts`

## TDD evidence

- RED: `bun run test src/features/ai-keys/repository.test.ts` failed because `./repository` did not exist.
- Intermediate RED: cipher guard test caught database access occurring before the missing-cipher error.
- GREEN: focused suite passes (2 tests), including explicit secret-free list projection and cipher configuration enforcement.

## Verification

- `bun run test src/features/ai-keys/repository.test.ts` — 1 file, 2 tests passed.
- `bun x tsc --noEmit` — passed.
- `bun run check src/features/ai-keys/types.ts src/features/ai-keys/repository.ts src/features/ai-keys/repository.test.ts` — passed.

## Design notes

- Candidate IDs and encrypted values are selected while holding the provider cursor row lock; decryption occurs after the transaction commits.
- Public list queries use an explicit projection that excludes `encryptedSecret` and `fingerprint`.
- The committed schema does not contain `lastSuccessAt`, so the public mapping currently returns `null` for that field.
- The production singleton is intentionally unconfigured until the environment-level cipher wiring task supplies a cipher; secret-bearing operations fail closed with `AiKeyEncryptionNotConfiguredError`.

## Concerns

- The transaction-capable fake verifies serialized cursor behavior; a live PostgreSQL integration test remains desirable when the project provides a database fixture.

## Review fix

- Added nullable `last_success_at` to the schema, public projection, success update, and generated additive migration (`drizzle/0005_curious_toad_men.sql` plus metadata).
- Wired the production repository to `AI_KEY_ENCRYPTION_SECRET` through `createKeyCipher`, retaining fail-closed behavior when absent.
- Expanded the transaction-capable fake coverage for `23505`, exact rotation, eligibility, decrypted server-only candidates, unique attempts, health updates, and serialized overlapping cursor advancement.

Exact verification commands and results:

- `bun run test src/features/ai-keys/repository.test.ts src/db/schema.test.ts` — 2 files, 10 tests passed.
- `bun x tsc --noEmit` — exit 0.
- `bun run check src/db/schema.ts src/db/schema.test.ts src/features/ai-keys/types.ts src/features/ai-keys/repository.ts src/features/ai-keys/repository.test.ts drizzle/0005_curious_toad_men.sql drizzle/meta/0005_snapshot.json drizzle/meta/_journal.json` — checked source files with no errors (migration/meta files are not handled by Biome).
- `git diff --check` — exit 0.
