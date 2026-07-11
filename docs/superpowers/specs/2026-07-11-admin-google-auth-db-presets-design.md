# Admin Dashboard, Google Authentication, and Database Presets Design

## Goal

Replace credential authentication with Google OAuth, add a server-protected admin dashboard, move presets from source code into PostgreSQL, track estimated AI usage costs, remove document import/export controls, and improve site-wide usability with consistent Lucide icons.

## Scope

- Google OAuth is the only sign-in method.
- `frazixgaming22@gmail.com` is the bootstrap admin.
- Authenticated users have either a `user` or `admin` database role.
- Only admins can discover, open, or call APIs for the admin dashboard.
- Admins can view users, promote or demote non-bootstrap users, inspect AI usage and estimated costs, inspect database statistics, delete user documents, and manage presets.
- Admins cannot edit user documents.
- The bootstrap admin cannot demote themself.
- Existing code-backed presets migrate into PostgreSQL.
- Import/export controls and their now-unused client behavior are removed throughout the editors.
- Print and Save remain available.

## Authentication and Authorization

Configure Better Auth with Google as the only provider. The login screen contains a Google sign-in action; credential login, signup forms, and links are removed. Legacy `/signup` and credential-login entry points lead to the Google-only login experience while preserving safe in-app return URLs.

Add a `role` column to the user table using the values `user` and `admin`, defaulting to `user`. On authentication, normalize the email address to lowercase and ensure `frazixgaming22@gmail.com` has the `admin` role. The bootstrap identity is also configured server-side so the rule is explicit and testable rather than trusted to client code.

Admin authorization has two independent layers:

1. The authenticated app shell shows an Admin navigation link only when the session user is an admin.
2. The `/admin` route loader and every admin oRPC procedure enforce the admin role on the server. A non-admin direct request receives a forbidden response or a redirect to `/dashboard` without admin data.

Reusable `adminProcedure` middleware centralizes API authorization. Admin role changes are allowed for users other than the bootstrap admin. The bootstrap admin cannot demote themself, preventing accidental lockout.

## Admin Dashboard

The `/admin` experience has four focused sections:

### Users

Show a paginated list with name, email, role, join date, document count, and aggregate AI usage. Admins can promote or demote eligible users. Role mutations require confirmation and invalidate the relevant user and session-aware queries.

### AI Usage

Show totals and breakdowns by date, user, provider, and model. Each autofill execution records the requesting user, provider, model, input tokens, output tokens, total tokens, outcome, estimated cost, timestamp, and the pricing-version identifier used for calculation. Do not store prompts, source text, or extracted document content.

Costs are explicitly labeled estimated. A versioned server-side pricing table computes cost in a fixed precise unit suitable for aggregation. Reporting begins when the migration ships because existing rate-limit rows do not contain token usage. Failed requests are logged when usage metadata is available; otherwise they are recorded with zero or unknown token counts and a failure outcome.

### Data

Show counts for users, documents, enabled presets, disabled presets, and AI requests, followed by a paginated recent-document list. Each document row shows owner, document type, title, and update time. Admins may permanently delete a document after a destructive confirmation dialog. They cannot open an administrative editing flow or modify its contents.

### Presets

Provide create, edit, enable/disable, and delete actions. Preset fields are slug, title, description, document type, typed JSON data, enabled status, creator/updater, and timestamps. Slugs are unique. The server validates JSON against the existing cover-page or index-sheet schema selected by document type and returns actionable validation errors. Deletion requires confirmation.

## Database Presets and Migration

Replace `src/features/presets/presets.ts` as the runtime source of truth with a `presets` table and protected read procedures. The public `/presets` page queries enabled presets from the server. Applying a preset continues to create an unsaved new document in the matching editor; users then edit and save through the normal document workflow.

Create an idempotent seed mechanism for the three current presets: ISTT Cover Page, Math Index Sheet, and Physics Index Sheet. The seed uses stable slugs and upsert/conflict-safe behavior so repeated deployments do not duplicate records. After database-backed reads are active and seed data is preserved, remove the hard-coded runtime registry.

Unknown, disabled, deleted, or type-mismatched presets produce a safe not-found response and never inject invalid editor state.

## UI and Navigation

Use Lucide icons consistently for navigation, page headings, primary actions, empty states, status indicators, and destructive actions. Icons supplement visible labels rather than replacing them, and decorative icons are hidden from assistive technology. Keep icon sizing and button spacing consistent with the existing component system.

The app shell receives clearer navigation for Dashboard, Presets, and conditionally Admin, plus an icon-labeled sign-out action. Admin section navigation remains usable on narrow screens.

Remove Import and Export buttons from all document pages along with dialogs, hidden file inputs, parsing/download handlers, and tests that exist solely for those controls. Preserve printing, saving, unsaved-change protection, and compatibility helpers still needed for database documents or preset seed conversion.

## Data Flow

1. A visitor signs in with Google.
2. Better Auth creates or loads the user; server logic applies the bootstrap-admin rule.
3. The authenticated shell loads session capabilities and exposes Admin navigation only for admins.
4. An admin route/API request passes through server-side admin middleware.
5. Preset browsing reads enabled rows from PostgreSQL; applying a preset fetches and validates its typed data before initializing a new editor.
6. An AI autofill request runs under the existing authenticated/rate-limited flow, captures provider usage metadata, calculates estimated cost using the current pricing version, and writes an AI usage event.
7. Admin queries aggregate users, documents, presets, and AI events without exposing prompt content.

## Error Handling and Security

- OAuth failures return to a retryable Google-only login screen with a generic error.
- Return URLs must be local application paths to prevent open redirects.
- Missing authentication returns unauthorized; missing admin role returns forbidden.
- UI visibility is never treated as authorization.
- Duplicate preset slugs and schema-invalid preset JSON return field-level errors.
- Destructive preset and document actions require confirmation and report server failures without optimistic disappearance.
- AI logging failure must not expose request text. The primary autofill result and telemetry failure are handled deliberately so telemetry cannot leak secrets or corrupt usage totals.
- Admin list endpoints are paginated and return only fields required by the interface.

## Testing and Verification

- Google-only auth-flow and safe-redirect tests.
- Role bootstrap, normalization, admin middleware, and bootstrap self-demotion tests.
- Admin route and API denial tests for anonymous and ordinary users.
- User listing and role-mutation tests.
- Preset CRUD, unique slug, enable/disable, schema validation, application, and seed-idempotency tests.
- AI usage event and versioned cost-calculation tests, including failures and unavailable usage metadata.
- Data summary, pagination, document deletion, and no-document-editing tests.
- UI tests proving Import and Export controls are absent while Save and Print remain.
- Responsive and accessibility checks for icon labels, focus behavior, dialogs, and admin navigation.
- Run database migration generation, unit/integration tests, lint/check, build, and relevant Playwright visual tests before completion.

## Out of Scope

- Editing user documents from the admin dashboard.
- Storing AI prompts or document text for analytics.
- Reconstructing historical AI costs from rate-limit records.
- Multiple roles or granular permissions beyond `user` and `admin`.
- User suspension, deletion, impersonation, billing, or payment collection.
- User-created private presets.
