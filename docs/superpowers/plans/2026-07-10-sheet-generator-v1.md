# Sheet Generator v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the static index-sheet and cover-page generator into a private, multi-user TanStack Start application with persisted documents, Gemini autofill, and print output visually identical to `Refrence/index.html`.

**Architecture:** Keep the legacy JSON formats as the compatibility contract and stored type-specific payloads in a single owner-scoped `document` table. Route components use TanStack Form for local editable drafts and TanStack Query-generated oRPC options for all server state; reusable pure document, import/export, pagination, and preview modules isolate compatibility logic from UI and persistence. Authentication and ownership are enforced in shared server middleware, while Gemini extraction is a separate authenticated, rate-limited oRPC procedure that returns a reviewable draft and never saves it.

**Tech Stack:** Bun, TanStack Start/Router, React 19, TypeScript, Postgres, Drizzle, Better Auth email/password, oRPC, TanStack Query, TanStack Form, Zod 4, TanStack AI Gemini adapter, Shadcn/Tailwind 4, Vitest, Testing Library, Biome, Playwright (to add for print screenshot regression tests).

## Global Constraints

- Preserve `window.print()`; do not add server-side PDF generation.
- Use Bun exclusively for dependency installation, scripts, tests, builds, and one-off package execution; do not introduce npm, pnpm, or Yarn commands or lockfiles.
- Build application forms, dialogs, cards, menus, confirmations, and feedback with Shadcn components and shared design tokens; keep document preview markup/CSS custom where exact reference parity requires it.
- Preserve the two legacy JSON export shapes and accept files produced by `Refrence/index.html` without data loss.
- Store both document types in one table with `type` values exactly `index_sheet` and `cover_page`.
- Enforce the authenticated owner in every document and autofill procedure; never accept `ownerId` from client input.
- Keep cover logos as base64 data URLs for v1, accessed through a swappable storage interface.
- Email/password is the only v1 auth method; deletes are permanent; saved-document count is unlimited.
- AI accepts pasted text only, uses a Gemini Flash-class model, returns Zod-validated draft data, and never writes a document.
- Printed pages are exactly A4 (`210mm × 297mm`) with zero browser page margin and exact print colors.
- Form UI must be usable on mobile; print comparison is desktop/Chromium-first unless the browser matrix is expanded by a decision below.
- Do not retain the reference app's hard-coded ISTT field defaults in new documents.

---

## File and module map

- `src/db/schema.ts`: Better Auth tables, `documents`, and `autofillRateLimits` definitions.
- `src/db/index.ts`: singleton Drizzle connection.
- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`: Better Auth configuration, browser client, and server session lookup.
- `src/orpc/context.ts`, `src/orpc/middleware/auth.ts`: request context and authenticated procedure base.
- `src/orpc/schemas/document.ts`: discriminated document payloads and CRUD input/output contracts.
- `src/orpc/router/documents.ts`: owner-scoped list/get/create/update/duplicate/delete procedures.
- `src/orpc/router/autofill.ts`: authenticated, rate-limited Gemini extraction.
- `src/features/documents/types.ts`: shared editor-facing types derived from Zod schemas.
- `src/features/documents/legacy-json.ts`: strict normalization plus backward-compatible import/export.
- `src/features/documents/queries.ts`: the only exported Query option/mutation factories used by pages.
- `src/features/editor/use-document-editor.ts`: create/edit loading, save, invalidation, and navigation orchestration.
- `src/features/preview/a4-page.tsx`, `preview.css`, `use-page-scale.ts`: common A4 frame, print rules, and screen-only scaling.
- `src/features/index-sheet/*`: form, row editor, pagination, preview, defaults, and route-level editor.
- `src/features/cover-page/*`: form, logo adapter, heading derivation, preview, defaults, and route-level editor.
- `src/features/autofill/autofill-dialog.tsx`: paste/review/apply interaction shared by both editors.
- `src/routes/_auth.tsx`: authenticated layout and redirect guard.
- `src/routes/_auth/dashboard.tsx`, `index-sheet/*`, `cover-page/*`: protected pages.
- `src/routes/login.tsx`, `signup.tsx`: public auth pages.
- `tests/fixtures/legacy/*.json`: frozen exports from the static app.
- `tests/visual/*`: deterministic print fixtures and screenshot comparisons.

---

## Milestone 1 — Auth + protected shell

### Task 1: Establish database/auth foundations

**Files:**

- Modify: `src/env.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/db/index.ts`
- Modify: `src/lib/auth.ts`
- Create: `src/lib/session.ts`
- Create: `src/lib/session.test.ts`
- Create: `drizzle/0000_sheet_generator.sql` (generated)

**Interfaces:**

- Produces `getSession(headers: Headers): Promise<Session | null>` and Better Auth's required user/session/account/verification tables.
- Requires `DATABASE_URL` and `BETTER_AUTH_SECRET`; `BETTER_AUTH_URL` is required outside local development.

- [ ] Add env validation and a session test proving missing/valid cookies return null/session respectively.
- [ ] Configure Better Auth's Drizzle adapter with email/password enabled and TanStack Start cookies.
- [ ] Define Better Auth tables using the adapter's required names, keys, indexes, expirations, and relations; generate the migration instead of hand-writing it.
- [ ] Run `bun test src/lib/session.test.ts`; expect all session cases to pass.
- [ ] Run `bun run db:generate && bun run check`; expect a migration and zero diagnostics.
- [ ] Commit as `feat(auth): configure database-backed sessions`.

### Task 2: Build public auth pages and protected route shell

**Files:**

- Create: `src/routes/login.tsx`
- Create: `src/routes/signup.tsx`
- Create: `src/routes/_auth.tsx`
- Create: `src/components/app-shell.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/__root.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Footer.tsx`
- Create: `src/routes/auth.test.tsx`

**Interfaces:**

- `_auth.beforeLoad` resolves the server session and exposes `{ user }` or redirects to `/login?redirect=<path>`.
- Login/signup redirect an authenticated user to `/dashboard`; logout clears Query data before redirecting.

- [ ] Write route tests for unauthenticated redirect, preserving the return URL, authenticated access, failed credentials, signup, and logout.
- [ ] Build separate TanStack Form login and signup forms using `authClient.signIn.email` and `authClient.signUp.email`; render inline server errors and disabled pending state.
- [ ] Replace starter header/footer/devtools chrome with an authenticated shell that remains hidden in print media.
- [ ] Make `/` redirect to `/dashboard` or `/login` based on session.
- [ ] Run `bun test src/routes/auth.test.tsx && bun run check && bun run build`; expect pass.
- [ ] Commit as `feat(auth): add account pages and protected shell`.

---

## Milestone 2 — Schema + oRPC CRUD + TanStack Query wiring

### Task 3: Define canonical document contracts and legacy compatibility

**Files:**

- Create: `src/orpc/schemas/document.ts`
- Create: `src/features/documents/types.ts`
- Create: `src/features/documents/legacy-json.ts`
- Create: `src/features/documents/legacy-json.test.ts`
- Create: `tests/fixtures/legacy/index-sheet.json`
- Create: `tests/fixtures/legacy/cover-page.json`

**Interfaces:**

- `IndexSheetData`: `{ schemaVersion: 1; exportedAt: string; title: string; rowsPerPage: 10; showPageNo: boolean; entries: { name; issueDate; submitDate; pageNo }[] }`.
- `CoverPageData`: `{ schemaVersion: 1; exportedAt: string; type: 'cover-page'; instituteName; instituteShort; department; docType; logoDataUrl; submittedBy; submittedTo }` with legacy field names unchanged.
- `parseLegacyDocument(text, expectedType)` validates and normalizes a file; `serializeLegacyDocument(data)` refreshes only `exportedAt`.

- [ ] Freeze representative JSON files exported directly from the reference tool, including Bengali, empty dates, Page No., and an image data URL.
- [ ] Write failing round-trip tests that assert every legacy key and value survives and malformed/wrong-type data gives a user-safe validation result.
- [ ] Define strict Zod schemas with ISO `YYYY-MM-DD` date-or-empty validation, safe string limits, 10 rows per page, and data-URL validation for supported logo MIME types.
- [ ] Implement normalizers that accept the reference's permissive missing optional values but emit the exact v1 shape.
- [ ] Run `bun test src/features/documents/legacy-json.test.ts`; expect all fixture and rejection cases to pass.
- [ ] Commit as `feat(documents): define legacy-compatible contracts`.

### Task 4: Add the document table and logo storage boundary

**Files:**

- Modify: `src/db/schema.ts`
- Create: `src/features/cover-page/logo-storage.ts`
- Create: `src/features/cover-page/logo-storage.test.ts`
- Create: `drizzle/0001_documents.sql` (generated)

**Interfaces:**

- `documents`: UUID `id`, text `ownerId` FK with cascade, enum `type`, text `title`, `jsonb data`, nullable text `logoDataUrl`, timestamp `createdAt`, timestamp `updatedAt`; index `(ownerId, updatedAt)`.
- `LogoStorage` exposes `normalize(dataUrl): string | null` and `toDocumentData(data, storedLogo): CoverPageData`.

- [ ] Test MIME/size rejection, null removal, and reconstruction of legacy cover JSON from the dedicated logo column.
- [ ] Add the enum/table, ownership FK, updated ordering index, and database constraints.
- [ ] Generate and inspect the migration; verify it does not alter Better Auth tables unexpectedly.
- [ ] Run `bun test src/features/cover-page/logo-storage.test.ts && bun run db:generate && bun run check`.
- [ ] Commit as `feat(documents): add persisted document schema`.

### Task 5: Implement owner-scoped oRPC CRUD

**Files:**

- Create: `src/orpc/context.ts`
- Create: `src/orpc/middleware/auth.ts`
- Create: `src/orpc/router/documents.ts`
- Modify: `src/orpc/router/index.ts`
- Modify: `src/routes/api.rpc.$.ts`
- Create: `src/orpc/router/documents.test.ts`

**Interfaces:**

- Procedures: `documents.list()`, `get({ id, type })`, `create({ type, title, data, logoDataUrl })`, `update({ id, type, title, data, logoDataUrl })`, `duplicate({ id })`, `remove({ id })`.
- Summary output is `{ id, type, title, updatedAt, createdAt }`; full output is the discriminated document record.

- [ ] Write database-backed procedure tests for unauthenticated rejection, list ordering, type/data mismatch, owner-only get/update/delete/duplicate, `updatedAt` refresh, and duplicate ownership/new ID.
- [ ] Resolve the user only in auth middleware, use `(id, ownerId)` in every mutation/read predicate, and return the same not-found response for nonexistent and foreign IDs.
- [ ] Use a transaction for duplicate and validate stored JSON again on read so corrupt rows fail explicitly.
- [ ] Run `bun test src/orpc/router/documents.test.ts`; expect all authorization and CRUD cases to pass.
- [ ] Commit as `feat(api): add private document CRUD`.

### Task 6: Complete oRPC/TanStack Query integration

**Files:**

- Modify: `src/orpc/client.ts`
- Modify: `src/integrations/tanstack-query/root-provider.tsx`
- Modify: `src/router.tsx`
- Create: `src/features/documents/queries.ts`
- Create: `src/features/documents/queries.test.tsx`

**Interfaces:**

- Export stable helpers `documentListOptions()`, `documentOptions(id,type)`, and mutation option factories; UI modules must not use ad hoc `fetch`.
- A QueryClient is created once per browser session and once per SSR request, then supplied by `QueryClientProvider`.

- [ ] Test SSR/client QueryClient lifetime, typed procedure option construction, mutation invalidation, delete cache removal, and duplicate list refresh.
- [ ] Implement the currently empty provider and keep the existing SSR Query integration.
- [ ] Centralize query keys/options and encode post-mutation cache behavior once.
- [ ] Run `bun test src/features/documents/queries.test.tsx && bun run build`; expect pass.
- [ ] Commit as `feat(data): wire orpc through tanstack query`.

---

## Milestone 3 — Dashboard

### Task 7: Build dashboard document management

**Files:**

- Create: `src/routes/_auth/dashboard.tsx`
- Create: `src/features/dashboard/document-card.tsx`
- Create: `src/features/dashboard/delete-document-dialog.tsx`
- Create: `src/features/dashboard/dashboard.test.tsx`

**Interfaces:**

- Consumes document query/mutation factories from Task 6.
- Opens documents through the type-specific route; permanent delete requires explicit confirmation.

- [ ] Test mixed-type ordering, localized updated date, empty state, open links, duplicate pending/error state, confirmed delete, and cancelled delete.
- [ ] Add visible “New Index Sheet” and “New Cover Page” actions in both populated and empty states.
- [ ] Implement accessible cards/list rows with title, human label, date, and action menu; update immediately after duplicate/delete via Query invalidation.
- [ ] Run `bun test src/features/dashboard/dashboard.test.tsx && bun run check`; expect pass.
- [ ] Commit as `feat(dashboard): manage saved documents`.

---

## Milestone 4 — Index Sheet Generator parity

### Task 8: Extract pure index-sheet behavior

**Files:**

- Create: `src/features/index-sheet/defaults.ts`
- Create: `src/features/index-sheet/paginate.ts`
- Create: `src/features/index-sheet/paginate.test.ts`
- Create: `src/features/index-sheet/format-date.ts`
- Create: `src/features/index-sheet/format-date.test.ts`

**Interfaces:**

- `paginateIndexEntries(entries)` always returns at least one page of exactly 10 slots, preserves global sequence numbers, and keeps global zebra parity.
- `formatIndexDate('YYYY-MM-DD')` returns `DD/MM/YY`; empty input returns empty text.

- [ ] Test 0, 1, 10, 11, and 20 entries; verify page counts, blank slots, `01` numbering, and zebra continuation.
- [ ] Test valid and empty date formatting without timezone conversion.
- [ ] Implement minimal pure helpers and blank defaults (`title: 'INDEX'`, no institutional values).
- [ ] Run the two focused test files; expect pass.
- [ ] Commit as `feat(index-sheet): preserve legacy pagination rules`.

### Task 9: Build the reusable A4 preview foundation

**Files:**

- Create: `src/features/preview/a4-page.tsx`
- Create: `src/features/preview/use-page-scale.ts`
- Create: `src/features/preview/preview.css`
- Create: `src/features/preview/a4-page.test.tsx`
- Modify: `src/routes/__root.tsx`

**Interfaces:**

- `A4Page` renders a `.page-frame > .a4-page` at `210mm × 297mm`; screen scaling uses `96/25.4` and never affects print.
- Global print CSS hides `[data-print-hidden]`, sets `@page { size: A4; margin: 0 }`, exact color adjustment, page breaks, and unscaled pages.

- [ ] Test scale calculations for narrow/wide containers and verify resize/orientation observers are cleaned up.
- [ ] Port the reference dimensions and print declarations verbatim, renaming selectors only where necessary.
- [ ] Load Noto Sans, Noto Sans Bengali, and Kalpurush explicitly; do not rely on the starter's Manrope for print content.
- [ ] Run the component test and build; expect pass with no SSR access to `window`.
- [ ] Commit as `feat(preview): add printable A4 page foundation`.

### Task 10: Implement index form, preview, import/export, and save

**Files:**

- Create: `src/features/index-sheet/index-sheet-form.tsx`
- Create: `src/features/index-sheet/row-editor.tsx`
- Create: `src/features/index-sheet/index-sheet-preview.tsx`
- Create: `src/features/index-sheet/index-sheet-editor.tsx`
- Create: `src/features/editor/use-document-editor.ts`
- Create: `src/routes/_auth/index-sheet/new.tsx`
- Create: `src/routes/_auth/index-sheet/$id.tsx`
- Create: `src/features/index-sheet/index-sheet-editor.test.tsx`

**Interfaces:**

- New route starts a local draft; first save calls create and replaces history with `/index-sheet/<id>`; subsequent saves call update.
- Import replaces the reviewed draft only after schema validation; export uses the exact legacy serializer; print calls `window.print()`.

- [ ] Test add/edit/cancel/delete row, required name, conditional required Page No., toggle behavior, live preview, import failure/success, exact export, create/update navigation, foreign/not-found handling, save errors, and print.
- [ ] Build TanStack Form controls and preserve the reference row-editor behavior while adding accessible labels and mutation status.
- [ ] Port exact index markup and CSS: page padding `12mm 10mm`, inner border/padding, title typography, table borders, column templates (`8/40/14/14/24` or `8/34/10/14/14/20`), ten equal body rows, and zebra `#eee`.
- [ ] Run the focused test, check, and build; expect pass.
- [ ] Commit as `feat(index-sheet): add persisted parity editor`.

---

## Milestone 5 — Cover Page Generator parity

### Task 11: Extract cover behavior and logo validation

**Files:**

- Create: `src/features/cover-page/defaults.ts`
- Create: `src/features/cover-page/derive-heading.ts`
- Create: `src/features/cover-page/derive-heading.test.ts`
- Create: `src/features/cover-page/read-logo.ts`
- Create: `src/features/cover-page/read-logo.test.ts`

**Interfaces:**

- `deriveAssignmentHeading(subject, docType)` reproduces the reference's digit/hyphen stripping and one-word prefix rule.
- `readLogo(file)` returns a validated data URL or a typed size/MIME error.

- [ ] Test all heading cases from the reference and logo accept/reject/remove behavior.
- [ ] Use blank institution/department/submission defaults and `docType: 'Assignment'`; omit the reference-only ISTT preset unless product explicitly approves it.
- [ ] Run focused tests; expect pass.
- [ ] Commit as `feat(cover-page): preserve heading and logo behavior`.

### Task 12: Implement cover form, preview, import/export, and save

**Files:**

- Create: `src/features/cover-page/cover-page-form.tsx`
- Create: `src/features/cover-page/cover-page-preview.tsx`
- Create: `src/features/cover-page/cover-page-editor.tsx`
- Create: `src/routes/_auth/cover-page/new.tsx`
- Create: `src/routes/_auth/cover-page/$id.tsx`
- Create: `src/features/cover-page/cover-page-editor.test.tsx`

**Interfaces:**

- Uses the same editor lifecycle as Task 10.
- Persistence stores logo in `documents.logoDataUrl`; legacy export/import includes `data.logoDataUrl`; reads normalize them through `LogoStorage`.

- [ ] Test every submitted-by/to field, conditional short name/department, heading, upload/remove, save/reload logo, legacy import/export, create/update, errors, and print.
- [ ] Build TanStack Form fields and an immediate preview with user review before save.
- [ ] Port exact cover markup/CSS: institution divider, 200px circular logo, heading box, two-column details and center divider, all reference spacing/font sizes.
- [ ] Run focused test, check, and build; expect pass.
- [ ] Commit as `feat(cover-page): add persisted parity editor`.

---

## Milestone 6 — Gemini autofill + rate limiting

### Task 13: Add atomic per-user rate limiting

**Files:**

- Modify: `src/db/schema.ts`
- Create: `src/features/autofill/rate-limit.ts`
- Create: `src/features/autofill/rate-limit.test.ts`
- Create: `drizzle/0002_autofill_rate_limits.sql` (generated)

**Interfaces:**

- `consumeAutofillQuota(ownerId, now)` returns `{ allowed, remaining, retryAt }` using an atomic database transaction/upsert.

- [ ] Write concurrent tests proving requests cannot race past the limit, users are isolated, and quota resets at the configured boundary.
- [ ] Add the minimal persistence needed for the chosen policy and return machine-readable retry metadata.
- [ ] Generate migration and run focused tests/check.
- [ ] Commit as `feat(ai): enforce per-user autofill quota`.

### Task 14: Implement Gemini structured extraction

**Files:**

- Modify: `src/env.ts`
- Create: `src/features/autofill/prompts.ts`
- Create: `src/features/autofill/extract.ts`
- Create: `src/features/autofill/extract.test.ts`
- Create: `src/orpc/router/autofill.ts`
- Modify: `src/orpc/router/index.ts`
- Create: `src/orpc/router/autofill.test.ts`

**Interfaces:**

- `autofill.extract({ type, text })` returns `{ type, patch, extractedFieldCount, warnings }`; it never accepts an ID and never persists.
- `patch` is a partial type-specific form payload, not a complete fabricated document.

- [ ] Test auth, text size bounds, quota consumption, Gemini adapter invocation, Zod rejection, no-meaningful-fields response, provider failure sanitization, and absence of document writes.
- [ ] Configure `GEMINI_API_KEY` and an explicit env-selected Flash model; instruct the model to omit unknowns, retain source language, preserve dates as ISO only when unambiguous, and never invent identity fields.
- [ ] Validate provider output with the same document field schemas and reject results below the meaningful-field threshold.
- [ ] Run autofill tests with a fake adapter; keep live Gemini calls outside the default suite.
- [ ] Commit as `feat(ai): extract document drafts with gemini`.

### Task 15: Add reviewable autofill UI to both editors

**Files:**

- Create: `src/features/autofill/autofill-dialog.tsx`
- Create: `src/features/autofill/autofill-dialog.test.tsx`
- Modify: `src/features/index-sheet/index-sheet-editor.tsx`
- Modify: `src/features/cover-page/cover-page-editor.tsx`

**Interfaces:**

- Dialog states: paste → extracting → preview changes/warnings → apply or cancel.
- Apply updates only the local TanStack Form draft and marks it dirty; it does not invoke a save mutation.

- [ ] Test empty input, pending lock, success diff, cancel, apply, no meaningful extraction, quota retry message, and provider failure on both document types.
- [ ] Keep existing non-empty values by default and require explicit confirmation to overwrite conflicting values.
- [ ] Run focused tests, the full unit suite, and check.
- [ ] Commit as `feat(ai): add reviewable autofill workflow`.

---

## Milestone 7 — Visual parity pass + responsive polish

### Task 16: Establish deterministic print visual regression tests

**Files:**

- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/visual/fixtures.ts`
- Create: `tests/visual/reference-print.spec.ts`
- Create: `tests/visual/migrated-print.spec.ts`
- Create: `tests/visual/baselines/` (generated approved images)

**Interfaces:**

- Both static reference and migrated app render the same deterministic index/cover fixtures at Chromium A4 print media; screenshot diffs use a documented zero-visible-difference threshold.

- [ ] Add Playwright and pin Chromium in CI; wait for all three web fonts before capture.
- [ ] Capture the original static app at index 0/10/11 rows, Page No. on/off, Bengali/Latin content, and cover with/without logo.
- [ ] Capture equivalent migrated routes using seeded authenticated data.
- [ ] Compare whole A4 pages, not editor chrome; fail on geometry, typography, border, zebra, color, overflow, or extra-page drift.
- [ ] Run `bun x playwright test tests/visual`; expect all comparisons to pass after baseline approval.
- [ ] Commit as `test(visual): lock print parity to reference`.

### Task 17: Fix parity differences and responsive editor behavior

**Files:**

- Modify: `src/features/preview/preview.css`
- Modify: `src/features/index-sheet/index-sheet-preview.tsx`
- Modify: `src/features/cover-page/cover-page-preview.tsx`
- Modify: `src/styles.css`
- Create: `tests/visual/responsive.spec.ts`

**Interfaces:**

- Desktop editor uses a `380px + preview` layout equivalent to the reference; at `<=900px` form and scaled preview stack; paired fields stack at `<=420px`.

- [ ] Run visual tests, categorize each diff, and adjust only migrated print selectors until the approved reference fixtures show no visible difference.
- [ ] Test 375px, 768px, and desktop widths for no horizontal form overflow, usable touch targets, scaled A4 preview, and accessible dialogs/actions.
- [ ] Verify print hides shell, controls, dialogs, toasts, and devtools, and produces no blank leading/trailing pages.
- [ ] Run `bun test`, `bun run check`, `bun run build`, and `bun x playwright test`; all must pass.
- [ ] Commit as `fix(ui): complete print parity and responsive polish`.

### Task 18: Final security, compatibility, and acceptance audit

**Files:**

- Create: `docs/acceptance-v1.md`
- Modify tests found deficient during the audit only.

- [ ] Import untouched JSON exported by `Refrence/index.html` for both types, save, reload, export again, and compare all semantic fields.
- [ ] Attempt every oRPC operation as anonymous, owner, and second user; confirm no foreign record existence or contents leak.
- [ ] Exercise signup → dashboard → create → save → logout → login → reopen → duplicate → delete for both types.
- [ ] Exercise valid, meaningless, rate-limited, and provider-failure autofill cases and confirm no automatic save.
- [ ] Print every visual fixture and record browser/version, page count, and parity result in the acceptance document.
- [ ] Run the complete verification command set once more and commit as `docs: record v1 acceptance results`.

---

## Decisions required before implementation

1. **Rate-limit policy:** The PRD requires per-user limiting but gives no quota/window. Recommendation: 10 successful attempts per rolling hour per user, with rejected malformed/empty requests not consuming quota and provider attempts consuming quota.
2. **Logo limits:** Base64-in-Postgres needs an upload ceiling and MIME policy. Recommendation: JPEG/PNG/WebP only, maximum 1 MiB encoded payload, client-side resize to fit within 1000×1000 before save while preserving the original aspect ratio.
3. **Canonical logo representation:** The technical table separates `logoDataUrl`, while the requirement that `data` reuse the legacy shape verbatim implies the logo is duplicated. Recommendation for strict PRD compliance: store the same value in both places and enforce equality in create/update procedures. If avoiding duplicate large storage matters more, approve normalization of `data.logoDataUrl` to an empty string at rest and rehydration on responses/exports.
4. **Document `title` for cover pages:** The legacy shape has no separate title. Recommendation: use trimmed `docType`, falling back to `Cover Page`; changing `docType` updates the dashboard title on save.
5. **Autosave vs explicit save:** The PRD says “Save to account” but does not define autosave. Recommendation: explicit Save button with dirty-state/navigation warning; no autosave in v1.
6. **AI merge semantics:** “Populate the form” does not say whether to overwrite. Recommendation: preserve non-empty fields by default, show conflicts, and let the user explicitly apply overwrites; index entries are offered as a full replacement because row-by-row merging is ambiguous.
7. **Meaningful AI extraction:** No threshold is defined. Recommendation: cover page requires at least two non-empty extracted fields; index sheet requires at least one non-empty experiment name.
8. **Gemini model/version:** “Flash-class” is a class, not a pinned model. Recommendation: require `GEMINI_MODEL` in production so model changes are deliberate; select the currently supported low-cost Flash model at implementation time.
9. **Print browser acceptance matrix:** Pixel parity varies by browser/font rendering. Recommendation: Chromium desktop is the automated acceptance target, with a manual Firefox smoke check; Safari is best-effort for v1.
10. **Font availability/offline behavior:** The reference fetches fonts from Google and Maateen CDN, which can cause print drift or failure offline. Recommendation: self-host the exact font files and weights if licensing permits; otherwise document network-dependent print fidelity.
11. **Legacy ISTT preset:** The PRD forbids institution assumptions but the reference includes an ISTT logo button. Recommendation: remove the preset and hard-coded field defaults while preserving arbitrary logo upload/import; confirm whether the preset itself is considered required behavior.
12. **Destructive navigation/import:** The PRD does not define unsaved-change handling. Recommendation: warn before route exit and require confirmation before import replaces a dirty draft.

## Suggested phase gates

- Gate 1 after Milestone 2: migrations apply cleanly and the two-user ownership suite passes before UI work.
- Gate 2 after Milestone 4: index legacy round-trip and print baselines pass before starting cover migration.
- Gate 3 after Milestone 5: both generators meet functional parity before AI can modify drafts.
- Gate 4 after Milestone 6: quota and “never auto-save” tests pass before enabling autofill in production.
- Release gate after Milestone 7: full automated suite, two-user security audit, legacy import round-trip, and Chromium A4 comparisons all pass.
