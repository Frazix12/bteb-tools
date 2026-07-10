# PRD: Sheet Generator v1 (Full-Stack Migration)

## 1. Summary

Migrate the existing static, single-file "Index Sheet Generator" (index sheets + cover pages for academic assignments) from a client-only HTML tool into a full-stack, multi-user web app. Users get accounts, their documents persist in a database, and they get AI-assisted autofill when creating a new document. The printed output must remain visually identical to today's tool — that's the core value the product already delivers and must not regress.

## 2. Background

The current tool (`Refrence/index.html`) is a single HTML file with no backend:

- **Index Sheet Generator**: add rows (experiment name, optional page no., issue/submit dates), live A4 preview, print via browser print dialog, export/import the row list as JSON.
- **Cover Page Generator**: institution/department/logo/doc-type/submitted-by/submitted-to fields, live A4 preview, same print/export/import pattern.

Everything is in-memory; state is lost on refresh unless the user manually exports JSON. There are no accounts, no server, and logos are held as base64 in the browser only.

## 3. Goals

- Preserve pixel-identical printed output for both document types.
- Let any student, anywhere, create an account and use the tool.
- Persist documents server-side so users don't lose work and can come back to edit/reprint later.
- Add AI autofill: paste freeform text (e.g. an assignment brief), get form fields filled automatically.
- Ship a "fuller v1" — not just a lift-and-shift, but migration + dashboard + AI + polish.

## 4. Non-Goals (out of scope for v1)

- No institution/admin-level accounts, shared presets, or org templates — every user's data is fully private to them.
- No server-side PDF rendering — `window.print()` stays as the print mechanism.
- No file/PDF upload for AI autofill — text paste only in v1.
- No collaboration/sharing between users on a single document.
- No payments/billing.

## 5. Target Users

General public — any student, anywhere, who needs to produce an index sheet or cover page for coursework. No institutional affiliation or approval required to sign up. This means:

- Signup must be self-serve (email/password and/or OAuth via Better Auth, no invite-only gating).
- No assumptions baked into the UI about a specific institution (the current hardcoded default of "Institute of Science Trade & Technology" becomes a blank/placeholder or an editable default, not a fixed value).

## 6. Features & Requirements

### 6.1 Accounts
- Sign up, log in, log out via Better Auth.
- Sessions protect all document routes; unauthenticated users are redirected to login.
- Each user only ever sees/edits/deletes their own documents — enforced server-side in every oRPC procedure, not just hidden in the UI.

### 6.2 Dashboard
- Landing page after login: list of the user's saved documents, both types together, most-recently-updated first.
- Each item shows title, type (Index Sheet / Cover Page), last updated date.
- Actions per item: open (continue editing), duplicate, delete (with confirmation).
- Empty state with a clear call-to-action to create a new document of either type.
- "New Index Sheet" / "New Cover Page" entry points visible from the dashboard.

### 6.3 Index Sheet Generator
- Same fields and behavior as today: sheet title, optional page-no column toggle, add/edit/delete rows (experiment name, optional page no., issue date, submit date).
- Live A4 preview matching current layout, fonts (Noto Sans / Noto Sans Bengali / Kalpurush for Bengali text), zebra striping, borders.
- Save to account (create new / update existing) via TanStack Query mutations against oRPC.
- Print via `window.print()`, unchanged.
- JSON export/import retained as a secondary option, using the same JSON shape as the current tool so old exported files remain importable.

### 6.4 Cover Page Generator
- Same fields as today: institution name/short name, department, logo upload, doc type, submitted-by fields, submitted-to fields.
- Live A4 preview matching current layout exactly.
- Logo stored server-side (base64 in the document row for v1, behind a swappable storage interface for a future upgrade to real object storage) so it persists across sessions/devices — today it's lost on refresh.
- Save/print/export/import behavior mirrors the Index Sheet requirements above.

### 6.5 AI Autofill
- On both the Index Sheet and Cover Page forms, a "Paste text to autofill" action.
- User pastes freeform text (e.g. an assignment brief, a course syllabus excerpt); AI extracts and returns structured fields matching the relevant form schema (Zod-validated).
- Extracted fields populate the form for the user to review/edit before saving — AI output is never saved directly without user review.
- Rate-limited per user to prevent abuse/cost overrun.
- Failure (AI can't extract meaningful fields) shows a clear message rather than silently filling garbage.
- Model: Gemini, using a cheap/lightweight tier (e.g. Flash-class model) rather than a premium model — cost efficiency matters more than raw extraction quality for this use case, since output is always reviewed by the user before saving.

### 6.6 Data Persistence
- Postgres + Drizzle. One `document` table covering both types (see technical notes) tied to the owning user.
- All reads/writes go through TanStack Query + oRPC — no ad hoc fetches.

## 7. Non-Functional Requirements

- **Visual parity**: printed A4 output for both document types must match the original tool exactly — same fonts, spacing, borders, page size/margins. This is the primary acceptance test for the migration.
- **Data isolation**: a user must never be able to read/write another user's documents, verified server-side on every procedure.
- **Availability of old data**: JSON files exported from the original static tool must import cleanly into the new app with no data loss.
- **Reasonable AI cost control**: per-user rate limiting on autofill.
- **Responsive**: usable on mobile for filling forms, though print/PDF workflows are expected primarily from desktop.

## 8. Technical Notes (already decided)

- Framework: TanStack Start (React, file-router), Nitro deploy adapter.
- Add-ons in use: Postgres, Drizzle, Better Auth, oRPC, TanStack Query, TanStack Form, Shadcn, T3Env, AI, Store, Biome.
- `document` table: `id, ownerId, type ('index_sheet'|'cover_page'), title, data (jsonb), logoDataUrl (nullable text), createdAt, updatedAt`. The `data` column reuses the existing JSON export shape verbatim.
- Routes: `/login`, `/signup`, `/dashboard`, `/index-sheet/new`, `/index-sheet/$id`, `/cover-page/new`, `/cover-page/$id`.
- AI provider: Gemini API, cheap/Flash-class model (via the AI add-on's provider config), not a premium model.
- Auth: email/password only for v1 (via Better Auth's built-in email/password provider), no OAuth.
- Deletes are permanent (hard delete), no soft-delete/trash/recovery in v1.
- No cap on number of saved documents per user in v1.

## 9. Success Criteria for v1

- A new visitor can sign up, create an account, and produce a printed index sheet or cover page with no prior knowledge of the tool.
- A returning user can log in and see/reopen everything they made previously.
- AI autofill measurably reduces the number of fields a user has to type by hand for a typical assignment brief.
- Side-by-side print comparison against the original static tool shows no visible difference for equivalent input data.

## 10. Milestones

1. Auth + protected shell
2. Schema + oRPC CRUD + TanStack Query wiring
3. Dashboard
4. Index Sheet Generator (parity)
5. Cover Page Generator (parity, incl. logo persistence)
6. AI autofill (both forms) + rate limiting
7. Visual parity pass + responsive polish

## 11. Decisions Log

- AI model: Gemini, cheap/Flash-class tier.
- Document limit: unlimited per user for now.
- Delete behavior: permanent (hard delete), no trash/recovery.
- Auth: email/password only for v1.