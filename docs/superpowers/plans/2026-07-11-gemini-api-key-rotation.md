# Gemini API Key Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add encrypted, admin-managed Gemini API keys with coordinated round-robin selection, health-aware failover, and the existing environment key as the final fallback.

**Architecture:** PostgreSQL stores encrypted keys, health metadata, and a locked rotation cursor. A server-only key-pool module owns encryption, candidate selection, validation, failure classification, and health updates; autofill consumes that module without exposing secrets. Admin-only oRPC endpoints and a dedicated dashboard panel manage safe metadata and validation actions.

**Tech Stack:** Bun, TypeScript, React 19, TanStack Start/Router/Query/AI, oRPC, Zod, PostgreSQL, Drizzle ORM, Vitest, Testing Library, Playwright, Biome.

## Global Constraints

- Gemini only; do not implement cross-provider failover.
- Raw API keys and encrypted payloads must never be returned to clients or logged.
- Use AES-256-GCM with random nonces and a versioned ciphertext format.
- Use a domain-separated keyed fingerprint for duplicate detection.
- A request attempts each eligible managed key at most once, then `GEMINI_API_KEY` at most once.
- Invalid credentials disable a key; quota/rate-limit and transient failures apply cooldowns; content/schema/safety failures do not penalize or rotate keys.
- PostgreSQL coordinates round-robin selection across application instances.
- Use tabs and double quotes in TypeScript/TSX and the `#/` source alias.
- Do not edit `src/routeTree.gen.ts` manually.

---

### Task 1: Persistence and environment contract

**Files:**
- Modify: `.env.example`
- Modify: `src/env.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/db/schema.test.ts`
- Create: `drizzle/0004_gemini_api_key_pool.sql` (generate with Drizzle; use the actual generated filename if it differs)
- Modify: `drizzle/meta/_journal.json` (generated)
- Create: `drizzle/meta/0004_snapshot.json` (generated filename follows Drizzle output)

**Interfaces:**
- Produces: `env.AI_KEY_ENCRYPTION_SECRET?: string`.
- Produces: `aiProviderKey`, `aiKeyRotationState`, `aiKeyValidationStatusEnum` schema exports.

- [ ] **Step 1: Write failing schema and environment tests**

Extend `src/db/schema.test.ts` to assert that `aiProviderKey` exposes `encryptedSecret`, `fingerprint`, `maskedSuffix`, `validationStatus`, `cooldownUntil`, audit fields, and timestamps, and that `aiKeyRotationState` exposes `provider` and `cursor`. Extend or add an env-focused test that imports the schema used by `createEnv` and verifies a 32-character-or-longer secret is accepted while a short non-empty secret is rejected.

```ts
expect(getTableColumns(aiProviderKey)).toMatchObject({
	encryptedSecret: expect.any(Object),
	fingerprint: expect.any(Object),
	maskedSuffix: expect.any(Object),
	validationStatus: expect.any(Object),
	cooldownUntil: expect.any(Object),
});
expect(getTableColumns(aiKeyRotationState)).toMatchObject({
	provider: expect.any(Object),
	cursor: expect.any(Object),
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `bun run test src/db/schema.test.ts`

Expected: FAIL because the new schema exports do not exist.

- [ ] **Step 3: Add the schema and environment variable**

Add `AI_KEY_ENCRYPTION_SECRET=` to `.env.example`. In `src/env.ts`, add:

```ts
AI_KEY_ENCRYPTION_SECRET: z.string().min(32).optional(),
```

In `src/db/schema.ts`, add an enum with `unchecked`, `valid`, `invalid`, and `transient_failure`; add `aiProviderKey` with UUID ID, provider, label, encrypted secret, unique fingerprint, masked suffix, enabled default false, status default unchecked, cooldown and health timestamps, sanitized failure code/message, creator/updater foreign keys, and timestamps. Add indexes for provider/eligibility and provider/last-used. Add `aiKeyRotationState` keyed by provider with a non-negative bigint cursor and updated timestamp.

- [ ] **Step 4: Generate and inspect the migration**

Run: `bun run db:generate`

Expected: a migration creating the enum, both tables, constraints, foreign keys, and indexes. Inspect it to confirm it contains no destructive changes to existing tables.

- [ ] **Step 5: Run focused verification**

Run: `bun run test src/db/schema.test.ts && bun x tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/env.ts src/db/schema.ts src/db/schema.test.ts drizzle
git commit -m "feat(ai): add Gemini key pool schema"
```

---

### Task 2: Server-only key cryptography

**Files:**
- Create: `src/features/ai-keys/crypto.ts`
- Create: `src/features/ai-keys/crypto.test.ts`

**Interfaces:**
- Produces: `createKeyCipher(rootSecret: string): KeyCipher`.
- Produces: `KeyCipher.encrypt(plaintext: string): string`, `decrypt(payload: string): string`, `fingerprint(plaintext: string): string`, and `mask(plaintext: string): string`.

- [ ] **Step 1: Write failing cryptography tests**

Cover round-trip decryption, different ciphertext for the same plaintext, a `v1.<nonce>.<ciphertext>.<tag>` payload, rejection after changing any authenticated byte, stable fingerprints that differ for different keys, and masking that reveals only the final four characters.

```ts
const cipher = createKeyCipher("x".repeat(32));
expect(cipher.decrypt(cipher.encrypt("gemini-secret-1234"))).toBe(
	"gemini-secret-1234",
);
expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
expect(cipher.fingerprint("same")).toBe(cipher.fingerprint("same"));
expect(cipher.mask("gemini-secret-1234")).toBe("••••1234");
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `bun run test src/features/ai-keys/crypto.test.ts`

Expected: FAIL because `crypto.ts` does not exist.

- [ ] **Step 3: Implement the cipher**

Use `node:crypto` only. Derive independent 32-byte encryption and fingerprint keys with HKDF-SHA256 and fixed domain strings such as `bteb-tools/ai-key/encryption/v1` and `bteb-tools/ai-key/fingerprint/v1`. Encrypt with AES-256-GCM and a fresh 12-byte nonce. Encode binary fields as base64url. Validate version and segment count before decrypting. Fingerprint with HMAC-SHA256. Reject blank plaintext keys.

```ts
export interface KeyCipher {
	encrypt(plaintext: string): string;
	decrypt(payload: string): string;
	fingerprint(plaintext: string): string;
	mask(plaintext: string): string;
}

export function createKeyCipher(rootSecret: string): KeyCipher {
	if (rootSecret.length < 32) throw new Error("AI key encryption secret is too short.");
	// HKDF-derived keys; AES-256-GCM and HMAC implementations.
}
```

- [ ] **Step 4: Run focused tests**

Run: `bun run test src/features/ai-keys/crypto.test.ts`

Expected: PASS, including tamper rejection.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-keys/crypto.ts src/features/ai-keys/crypto.test.ts
git commit -m "feat(ai): encrypt managed API keys"
```

---

### Task 3: Key repository and coordinated candidate selection

**Files:**
- Create: `src/features/ai-keys/types.ts`
- Create: `src/features/ai-keys/repository.ts`
- Create: `src/features/ai-keys/repository.test.ts`

**Interfaces:**
- Produces: `PublicAiKey`, `ManagedAiKeyCandidate`, `KeyHealthUpdate`, and `AiKeyRepository`.
- Produces: `createDrizzleAiKeyRepository(db, cipher): AiKeyRepository` and `drizzleAiKeyRepository`.
- Consumes: schema and `KeyCipher` from Tasks 1–2.

- [ ] **Step 1: Define types and write failing repository tests**

Define the public type without any secret-bearing fields:

```ts
export type PublicAiKey = {
	id: string;
	provider: "google";
	label: string;
	maskedSuffix: string;
	enabled: boolean;
	validationStatus: "unchecked" | "valid" | "invalid" | "transient_failure";
	cooldownUntil: Date | null;
	lastCheckedAt: Date | null;
	lastUsedAt: Date | null;
	lastSuccessAt: Date | null;
	lastFailureAt: Date | null;
	failureCode: string | null;
	failureMessage: string | null;
};

export type ManagedAiKeyCandidate = { id: string; apiKey: string };
```

Define repository methods `list`, `create`, `replace`, `setEnabled`, `delete`, `getForValidation`, `selectCandidates`, `recordSuccess`, and `recordFailure`. Test with a narrow fake transaction/database adapter or a test double around query primitives: public mappings omit encrypted values; duplicates throw `DuplicateAiKeyError`; eligible keys rotate `[A,B,C]`, then `[B,C,A]`; disabled, invalid, and unexpired cooldown keys are excluded; decrypted candidates remain server-only; concurrent selections advance distinct cursor values.

- [ ] **Step 2: Run tests and verify failure**

Run: `bun run test src/features/ai-keys/repository.test.ts`

Expected: FAIL because repository behavior is not implemented.

- [ ] **Step 3: Implement repository errors and secret-safe mappings**

Add `AiKeyNotFoundError`, `DuplicateAiKeyError`, and `AiKeyEncryptionNotConfiguredError`. Require a configured cipher for create, replace, validation reads, and candidate selection. Convert database unique violation `23505` on fingerprint to `DuplicateAiKeyError`. Ensure `list()` selects explicit public columns rather than spreading rows.

- [ ] **Step 4: Implement transactional round-robin**

In one short transaction, insert the `google` singleton state if absent, lock it with `SELECT ... FOR UPDATE`, load eligible IDs ordered deterministically, compute the circular ordering from `cursor % count`, advance cursor by one, and commit. Decrypt candidates only after selecting them. Provider calls must never occur inside this transaction.

```ts
selectCandidates(now: Date): Promise<ManagedAiKeyCandidate[]>;
recordSuccess(id: string, now: Date): Promise<void>;
recordFailure(id: string, update: KeyHealthUpdate, now: Date): Promise<void>;
```

- [ ] **Step 5: Run focused tests**

Run: `bun run test src/features/ai-keys/repository.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ai-keys/types.ts src/features/ai-keys/repository.ts src/features/ai-keys/repository.test.ts
git commit -m "feat(ai): add coordinated key repository"
```

---

### Task 4: Gemini validation, failure classification, and failover pool

**Files:**
- Create: `src/features/ai-keys/gemini-errors.ts`
- Create: `src/features/ai-keys/gemini-errors.test.ts`
- Create: `src/features/ai-keys/key-pool.ts`
- Create: `src/features/ai-keys/key-pool.test.ts`

**Interfaces:**
- Produces: `classifyGeminiError(error, now): GeminiFailure` with kinds `invalid`, `quota`, `transient`, and `request`.
- Produces: `createGeminiKeyPool(deps): GeminiKeyPool` with `run`, `validateOne`, and `validateAll`.
- Consumes: `AiKeyRepository` and `env.GEMINI_API_KEY`.

- [ ] **Step 1: Write failing error-classification tests**

Use representative status/code-shaped errors to assert: 401/403 authentication errors classify as invalid; 429 and resource-exhausted errors classify as quota and honor a parseable retry time; network and 5xx errors classify as transient; safety, schema, structured-output, and ordinary 4xx request failures classify as request. Assert sanitized messages never include an API key embedded in the original response.

- [ ] **Step 2: Implement narrow classification**

Normalize only status, stable provider code, retry metadata, and a safe internal message. Default unknown errors to transient rather than persisting raw response text. Use a 60-second default quota cooldown and a 15-second transient cooldown. Request failures have no cooldown and are not retryable.

- [ ] **Step 3: Write failing key-pool tests**

Test these exact flows with fake candidates and a fake `execute(apiKey)` function:

```ts
await pool.run(execute); // A quota failure -> B success
expect(execute).toHaveBeenCalledTimes(2);
expect(repo.recordFailure).toHaveBeenCalledWith("A", expect.objectContaining({
	kind: "quota",
}), expect.any(Date));
expect(repo.recordSuccess).toHaveBeenCalledWith("B", expect.any(Date));
```

Also cover invalid A being disabled, transient A cooling down, request failure stopping immediately, no key attempted twice, the environment fallback running once after managed failures, and no-key/no-fallback producing a typed unavailable error. Validation must use the stored key, mark success valid/enabled, mark invalid disabled, and never return the secret. `validateAll` must keep concurrent executions at or below three.

- [ ] **Step 4: Implement the key pool**

Define:

```ts
export interface GeminiKeyPool {
	run<T>(execute: (apiKey: string) => Promise<T>): Promise<T>;
	validateOne(id: string): Promise<PublicAiKey>;
	validateAll(): Promise<PublicAiKey[]>;
}
```

Inject repository, `getFallbackKey`, clock, classifier, and `validateCredential`. For `run`, snapshot candidates, attempt each once, update health, stop immediately on `request`, and finally try the untracked environment key once. For invalid failure updates set `enabled: false`; for quota/transient set `cooldownUntil`; on success clear failure fields and cooldown. Implement a three-worker validation queue rather than `Promise.all` over every key.

- [ ] **Step 5: Run focused tests**

Run: `bun run test src/features/ai-keys/gemini-errors.test.ts src/features/ai-keys/key-pool.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ai-keys/gemini-errors.ts src/features/ai-keys/gemini-errors.test.ts src/features/ai-keys/key-pool.ts src/features/ai-keys/key-pool.test.ts
git commit -m "feat(ai): rotate and validate Gemini keys"
```

---

### Task 5: Integrate failover with autofill

**Files:**
- Modify: `src/features/autofill/extract.ts`
- Modify: `src/features/autofill/extract.test.ts`
- Modify: `src/orpc/router/autofill.test.ts`

**Interfaces:**
- Consumes: `GeminiKeyPool.run` from Task 4.
- Preserves: `createAutofillExtractor(generate?)`, `ProviderAutofillError`, usage capture, and existing router error messages.

- [ ] **Step 1: Write failing failover integration tests**

Add a test that injects a key pool and Gemini adapter factory: the first key throws a classified quota error, the second returns structured data, and extraction succeeds with the second key's usage. Add a test that a schema/content failure is attempted once and remains sanitized. Preserve existing direct-generator tests.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `bun run test src/features/autofill/extract.test.ts src/orpc/router/autofill.test.ts`

Expected: FAIL because extraction does not use the pool.

- [ ] **Step 3: Separate one-key Gemini execution from rotation**

Refactor the default generator so `generateWithGeminiKey(apiKey, request)` creates the adapter and captures usage, while `geminiGenerate(request)` calls `geminiKeyPool.run((apiKey) => generateWithGeminiKey(apiKey, request))`. Preserve the model from `env.GEMINI_MODEL`. Do not catch and erase provider errors before the key pool classifies them; convert the final pool-unavailable error to `ProviderAutofillError` with sanitized usage.

- [ ] **Step 4: Run focused tests**

Run: `bun run test src/features/autofill/extract.test.ts src/orpc/router/autofill.test.ts`

Expected: PASS; existing public autofill errors remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/features/autofill/extract.ts src/features/autofill/extract.test.ts src/orpc/router/autofill.test.ts
git commit -m "feat(autofill): fail over Gemini credentials"
```

---

### Task 6: Admin key-management API

**Files:**
- Modify: `src/orpc/router/admin.ts`
- Modify: `src/orpc/router/admin.test.ts`

**Interfaces:**
- Adds: `admin.aiKeys.list`, `create`, `replace`, `setEnabled`, `delete`, `validate`, and `validateAll`.
- Consumes: `AiKeyRepository`, `GeminiKeyPool`, and public metadata types.

- [ ] **Step 1: Write failing admin router tests**

Inject key repository and pool dependencies into `createAdminRouter`. Test admin success for every endpoint and ordinary-user rejection through existing middleware coverage. Assert `create` accepts `{ label, apiKey }`, `replace` accepts `{ id, apiKey }`, labels are trimmed and capped at 100 characters, keys are nonblank and capped at 500 characters, and IDs are UUIDs. Assert serialized results contain neither input key, `encryptedSecret`, nor `fingerprint`. Test duplicate and missing records map to `CONFLICT` and `NOT_FOUND` with sanitized messages.

- [ ] **Step 2: Run tests and verify failure**

Run: `bun run test src/orpc/router/admin.test.ts`

Expected: FAIL because `aiKeys` procedures do not exist.

- [ ] **Step 3: Add dependency injection and error mapping**

Change the factory to accept an object containing the existing admin repository plus the AI key repository and Gemini key pool. Keep defaults in the exported production router. Add explicit Zod schemas and return only `PublicAiKey` values.

```ts
aiKeys: {
	list: adminProcedure.input(z.object({})).handler(() => keyRepository.list()),
	create: adminProcedure.input(keyCreateSchema).handler(async ({ input, context }) => {
		const row = await keyRepository.create(input, context.user.id);
		return keyPool.validateOne(row.id);
	}),
	// replace, setEnabled, delete, validate, validateAll
}
```

- [ ] **Step 4: Run focused tests**

Run: `bun run test src/orpc/router/admin.test.ts src/orpc/middleware/admin.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/orpc/router/admin.ts src/orpc/router/admin.test.ts
git commit -m "feat(admin): expose AI key management API"
```

---

### Task 7: Admin dashboard key panel

**Files:**
- Create: `src/features/admin/ai-keys-panel.tsx`
- Create: `src/features/admin/ai-keys-panel.test.tsx`
- Modify: `src/features/admin/types.ts`
- Modify: `src/features/admin/admin-queries.ts`
- Modify: `src/features/admin/admin-dashboard.tsx`
- Modify: `src/features/admin/admin-dashboard.test.tsx`
- Modify: `src/routes/_auth/admin.tsx`

**Interfaces:**
- Produces: `AiKeysPanel` accepting public keys, pending state, and create/replace/toggle/delete/validate callbacks.
- Consumes: `admin.aiKeys.*` endpoints from Task 6.

- [ ] **Step 1: Write failing component tests**

Test rendering label, `••••1234`, status, last checked/used, and cooldown without any secret field. Test add form submission, replacement via password input, enable/disable, validate-one, check-all, and confirmed deletion callbacks. Assert the note “Validation may consume a small amount of Gemini quota.” is visible. Test that invalid keys are visually marked and disabled.

- [ ] **Step 2: Run component tests and verify failure**

Run: `bun run test src/features/admin/ai-keys-panel.test.tsx src/features/admin/admin-dashboard.test.tsx`

Expected: FAIL because the panel and props do not exist.

- [ ] **Step 3: Implement public UI types and panel**

Add `AdminAiKey` matching `PublicAiKey`. Build `AiKeysPanel` with existing `AdminPanel`, table styles, shadcn inputs/buttons, and `Confirm`. Use `type="password"`, `autoComplete="off"`, and clear local secret state after submission. Never initialize a secret input from server data. Show dates with the existing admin formatting conventions and status copy: Valid, Invalid, Cooling down, Transient failure, or Unchecked.

- [ ] **Step 4: Wire query, mutations, and invalidation**

Add `adminAiKeysOptions()` and invalidate `orpc.admin.aiKeys.list.key()` in `invalidateAdmin`. Extend the route action union with create/replace/toggle/delete/validate/check-all actions and call the matching oRPC methods. Load keys alongside current queries and pass callbacks to `AdminDashboardView`. Add the panel after Usage and before Data so AI configuration and AI monitoring remain adjacent.

- [ ] **Step 5: Run focused tests**

Run: `bun run test src/features/admin/ai-keys-panel.test.tsx src/features/admin/admin-dashboard.test.tsx`

Expected: PASS, including assertions that no full secret is rendered.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/ai-keys-panel.tsx src/features/admin/ai-keys-panel.test.tsx src/features/admin/types.ts src/features/admin/admin-queries.ts src/features/admin/admin-dashboard.tsx src/features/admin/admin-dashboard.test.tsx src/routes/_auth/admin.tsx
git commit -m "feat(admin): manage Gemini API keys"
```

---

### Task 8: Browser coverage and end-to-end verification

**Files:**
- Create or Modify: `tests/admin-ai-keys.spec.ts`
- Create or Modify: matching `tests/admin-ai-keys.spec.ts-snapshots/` files only if the project test harness uses a visual assertion for this page
- Modify: `README.md` only if it currently documents environment setup; otherwise keep `.env.example` as the configuration reference

**Interfaces:**
- Verifies the complete admin workflow and production build.

- [ ] **Step 1: Add focused Playwright coverage**

Using the existing authenticated-admin test setup, mock or seed the admin key endpoints so the test can add a masked key, see validation status, disable/enable it, run Check all, replace it, and delete it. Intercept browser-visible text and assert the supplied plaintext key never appears after form submission.

```ts
await page.getByRole("button", { name: "Add Gemini key" }).click();
await page.getByLabel("Label").fill("Primary");
await page.getByLabel("API key").fill("test-secret-1234");
await page.getByRole("button", { name: "Save and validate" }).click();
await expect(page.getByText("••••1234")).toBeVisible();
await expect(page.getByText("test-secret-1234")).toHaveCount(0);
```

- [ ] **Step 2: Run the browser test**

Run: `bun x playwright test tests/admin-ai-keys.spec.ts`

Expected: PASS. If Chromium is absent, run `bun x playwright install chromium` once and rerun.

- [ ] **Step 3: Run all repository verification**

Run these commands separately so failures are attributable:

```bash
bun run check
bun x tsc --noEmit
bun run test
bun run build
bun run test:visual
```

Expected: every command exits 0. Review warnings for accidental secret logging or client bundling of `node:crypto`/decryption code.

- [ ] **Step 4: Inspect final security boundaries**

Run:

```bash
rg -n "encryptedSecret|fingerprint|apiKey" src/features/admin src/routes src/orpc
rg -n "console\.(log|error).*key|GEMINI_API_KEY" src
git diff --check
```

Expected: `encryptedSecret` and `fingerprint` occur only in server repository/schema code or negative tests; `apiKey` occurs only in write inputs and server calls; no logging contains secrets; diff check is clean.

- [ ] **Step 5: Commit final verification assets**

```bash
git add tests .env.example README.md
git commit -m "test(ai): cover admin key rotation flow"
```

Do not add unchanged files. If `README.md` and snapshots were not changed, omit them from `git add`.
