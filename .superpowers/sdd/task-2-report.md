# Task 2 report

## Google-only authentication

Implemented Google-only authentication, safe local callback normalization, a credential-free login page, and `/signup` forwarding to `/login`. Better Auth now configures Google, exposes `user.role`, promotes the normalized bootstrap address at user creation and again on session creation for existing users, and never demotes admins.

Verification:

- `pnpm vitest run src/features/auth/auth-flow.test.ts src/features/auth/auth-page.test.tsx src/lib/session.test.ts` — 3 files, 7 tests passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm biome check src/env.ts src/lib/auth.ts src/features/auth src/routes/login.tsx src/routes/signup.tsx` — passed after formatting.
- `git diff --check` — passed.

Self-review: changes are limited to the Task 2 files. The OAuth component test confirms the provider/callback payload and absence of credential controls. Production deployment must supply `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and the Google console callback origin must match `BETTER_AUTH_URL`.

## Redirect hardening follow-up

- `pnpm vitest run src/features/auth/auth-flow.test.ts` — RED: 1 failed, 5 passed; `/\\evil.example` was incorrectly accepted.
- `pnpm biome check src/features/auth/auth-flow.ts src/features/auth/auth-flow.test.ts` — passed, 2 files checked.
- `pnpm vitest run src/features/auth/auth-flow.test.ts src/features/auth/auth-page.test.tsx src/lib/session.test.ts` — passed, 3 files and 9 tests.
- `pnpm exec tsc --noEmit` — passed (exit 0).
- `git diff --check` — passed (exit 0).

The normalizer now parses against a fixed local origin, requires that origin, rejects decoded backslash/protocol-relative separator variants and malformed encoding, and returns only the parsed pathname, search, and hash.

## Server-only key cryptography

Implemented and verified the server-only managed API-key cipher.

## Files

- `src/features/ai-keys/crypto.ts` — `KeyCipher` and `createKeyCipher` implementation.
- `src/features/ai-keys/crypto.test.ts` — focused cryptography and validation tests.

## Decisions

- Used only `node:crypto` primitives.
- Derived independent 32-byte encryption and fingerprint keys with HKDF-SHA256, an empty salt, and fixed domain-separation strings.
- Used AES-256-GCM with a fresh 12-byte nonce and the standard 16-byte authentication tag.
- Serialized encrypted values as `v1.<nonce>.<ciphertext>.<tag>`, with all binary segments encoded as base64url.
- Rejected invalid versions/segment counts and invalid nonce/tag lengths before attempting authenticated decryption.
- Used HMAC-SHA256 encoded as base64url for deterministic, non-reversible fingerprints.
- Applied the same blank-key guard to encryption, fingerprinting, and masking. Masking emits four bullets plus at most the final four plaintext characters.

## TDD evidence and exact outputs

### RED — focused test before implementation

Command: `bun run test src/features/ai-keys/crypto.test.ts`

```text
$ vitest run src/features/ai-keys/crypto.test.ts

 RUN  v4.1.10 /mnt/D/CODE/LINUX/CODE/web-apps/bteb-tools/.worktrees/gemini-api-key-rotation

 ❯ src/features/ai-keys/crypto.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/features/ai-keys/crypto.test.ts [ src/features/ai-keys/crypto.test.ts ]
Error: Cannot find module './crypto' imported from /mnt/D/CODE/LINUX/CODE/web-apps/bteb-tools/.worktrees/gemini-api-key-rotation/src/features/ai-keys/crypto.test.ts
 ❯ src/features/ai-keys/crypto.test.ts:3:1
      1| import { describe, expect, it } from "vitest";
      2|
      3| import { createKeyCipher } from "./crypto";
       | ^
      4|
      5| describe("createKeyCipher", () => {

 Test Files  1 failed (1)
      Tests  no tests
   Duration  274ms

error: script "test" exited with code 1
```

### GREEN — final verification

Command: `bun run test src/features/ai-keys/crypto.test.ts && bun run check src/features/ai-keys/crypto.ts src/features/ai-keys/crypto.test.ts && bun x tsc --noEmit && git diff --check && git status --short`

```text
$ vitest run src/features/ai-keys/crypto.test.ts

 RUN  v4.1.10 /mnt/D/CODE/LINUX/CODE/web-apps/bteb-tools/.worktrees/gemini-api-key-rotation

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Duration  319ms

$ biome check src/features/ai-keys/crypto.ts src/features/ai-keys/crypto.test.ts
Checked 2 files in 12ms. No fixes applied.
?? src/features/ai-keys/
```

The combined command exited 0. `bun x tsc --noEmit` and `git diff --check` produced no output.

## Self-review

- Confirmed encryption round trips without normalizing or trimming valid plaintext.
- Confirmed repeated encryption differs because a new nonce is generated every time.
- Confirmed mutation of each authenticated binary field (nonce, ciphertext, tag) causes rejection.
- Confirmed malformed version and segment count are rejected before decryption.
- Confirmed encryption and fingerprint subkeys are domain-separated.
- Confirmed the implementation has no browser/runtime dependencies and imports cryptography exclusively from `node:crypto`.
- Confirmed no files outside Task 2 source/tests and this report were changed.

## Concerns

None.
