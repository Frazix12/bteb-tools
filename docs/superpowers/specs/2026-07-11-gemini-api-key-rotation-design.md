# Gemini API Key Rotation Design

## Goal

Allow administrators to manage multiple Gemini API keys and keep AI autofill available when a key becomes invalid, exhausted, or temporarily rate limited. Requests rotate across healthy keys and use the deployment's `GEMINI_API_KEY` once as a final bootstrap fallback.

This release supports Gemini only. It does not introduce cross-provider failover.

## Architecture

The feature has four focused units:

1. A database-backed Gemini key repository stores encrypted secrets, operational state, and rotation metadata.
2. A server-only cryptography module encrypts, decrypts, fingerprints, and masks keys.
3. A Gemini key-pool service selects candidates, validates keys, classifies failures, and updates key health.
4. Admin oRPC procedures and an admin dashboard panel expose secret-safe management operations.

The existing autofill generator asks the key-pool service for an ordered candidate set instead of reading only `GEMINI_API_KEY`. The key-pool boundary remains Gemini-specific while keeping selection and health logic separate from autofill extraction.

## Persistence

Add an `ai_provider_key` table containing:

- UUID primary key.
- Provider, constrained by application logic to `google` in this release.
- Administrator-supplied label.
- Versioned encrypted secret payload.
- Keyed fingerprint for duplicate detection.
- Masked suffix for display.
- Enabled flag.
- Validation status: unchecked, valid, invalid, or transient failure.
- Cooldown expiration.
- Last checked, last used, last success, and last failure timestamps.
- Sanitized failure code and short failure message.
- Creator/updater user references and created/updated timestamps.

Add a singleton rotation-state record for Gemini. Candidate selection locks this record in a transaction, advances its cursor, and returns currently eligible managed keys in round-robin order. This coordinates ordering across concurrent application instances.

Keys are eligible when enabled, validated as usable, and not in an active cooldown. A request receives a bounded snapshot of eligible candidates, so no key can be retried more than once during that request.

## Secret Protection

`AI_KEY_ENCRYPTION_SECRET` is a required server environment variable when managed keys are used. The cryptography module derives a 32-byte encryption key from it and uses AES-256-GCM with a random nonce and authenticated, versioned payload. Altered ciphertext must fail closed.

A separate domain-separated keyed digest derived from the same root secret produces the duplicate-detection fingerprint. Plaintext hashes are not stored. Raw keys are never returned by oRPC, rendered in the browser, or written to logs. Admin responses expose only the label and masked suffix.

Replacing a key overwrites its encrypted value and fingerprint. Existing secrets cannot be retrieved or edited in place.

## Admin Experience

Add an **AI API keys** panel to the administration page. It supports:

- Adding a labeled Gemini key.
- Replacing an existing key's secret.
- Enabling and disabling a key.
- Deleting a key with confirmation.
- Validating one key.
- Running **Check all** with bounded concurrency.

The list displays label, masked ending, enabled state, health status, last checked, last used, cooldown, and a sanitized error summary. It never displays the secret.

Adding or replacing a key immediately performs a lightweight Gemini generation request. Successful validation marks it valid and eligible. Failed validation retains the record but disables it, so an administrator can replace or explicitly recheck it. The UI explains that validation may consume a very small amount of quota because Gemini has no universal zero-cost credential-validation operation.

## Request and Failover Flow

For an autofill request:

1. Atomically obtain eligible managed keys in round-robin order.
2. Attempt generation with each candidate at most once.
3. On success, record last-used and last-success metadata and return normally.
4. When all managed candidates are unavailable or exhausted, try `GEMINI_API_KEY` once if configured.
5. If the fallback also fails, return the existing sanitized `AI extraction is temporarily unavailable` error.

The environment fallback is not shown or editable in the dashboard. It preserves existing deployments and provides recovery while managed keys are being configured.

## Failure Classification

Provider errors are classified before deciding whether another key could help:

- Invalid or revoked credentials: mark invalid, disable the key, and try the next candidate.
- Quota exhausted or rate limited: apply a cooldown using provider retry metadata when available, otherwise a conservative default, then try the next candidate.
- Network errors or Gemini 5xx responses: record a transient failure, apply a short cooldown, and try the next candidate.
- Content rejection, safety refusal, malformed structured output, or request/schema errors: do not penalize the key and do not fan the same request across every key, because another credential is not expected to fix it.

Errors and stored messages use normalized internal codes and sanitized summaries. Raw provider bodies are not persisted or sent to clients.

## Concurrency and Operational Rules

- Round-robin state is coordinated in PostgreSQL, not process memory.
- Selection transactions remain short; provider calls occur after the transaction is released.
- Health updates tolerate another request updating the same key concurrently.
- Validation-all uses bounded concurrency to avoid provider bursts.
- Attempts are capped at the candidate count plus one optional environment fallback.
- Disabled and invalid keys require an administrator action before becoming eligible again. Cooldown keys become eligible automatically after expiry.

## API Boundaries

Admin-only oRPC procedures provide list, create-and-validate, replace-and-validate, enable/disable, delete, validate-one, and validate-all operations. Inputs use Zod validation. Outputs use a public key-metadata type that cannot contain encrypted or plaintext secret fields.

The key-pool service exposes operations for obtaining candidates, recording success, recording classified failure, and validating stored credentials. Autofill depends on this interface rather than on database details.

## Testing and Verification

Focused tests cover:

- Encryption round trips, nonce uniqueness, authentication/tamper rejection, masking, and stable keyed fingerprints.
- Duplicate detection without secret disclosure.
- Round-robin ordering, concurrent cursor advancement, and filtering of disabled, invalid, and cooling-down keys.
- Failure classification for authentication, quota/rate limiting, transient provider errors, and non-key request failures.
- Retry bounds, next-key failover, environment fallback, and the no-retry behavior for content/schema failures.
- Admin authorization and every management procedure, including assertions that secrets and ciphertext never appear in responses.
- Dashboard creation, replacement, validation, status, enable/disable, and deletion interactions.
- Existing autofill usage capture and sanitized user-facing failure behavior.

Verification includes the focused Vitest suites, full unit suite, Biome checks, TypeScript type-checking, migration validation, production build, and focused Playwright coverage for the admin workflow. Intentional visual changes include updated snapshots where applicable.

## Out of Scope

- OpenAI, Anthropic, Ollama, or cross-provider failover.
- Per-user keys or user-visible key management.
- Predicting remaining provider quota before a request.
- A separate queue or AI proxy service.
- Displaying or recovering stored plaintext keys.
