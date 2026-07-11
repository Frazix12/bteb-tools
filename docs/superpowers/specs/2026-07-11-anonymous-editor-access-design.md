# Anonymous Editor Access Design

## Goal

Allow visitors to create, edit, preview, print, and save pages as PDF without signing in. Anonymous visitors cannot persist documents or use AI Autofill. Existing authenticated behavior remains unchanged.

This is guest access, not a persisted Better Auth anonymous account. No anonymous user or session record is created, avoiding account linking, abandoned-user cleanup, and guest-data migration concerns.

## User Experience

The public landing flow exposes the available presets and new-document editors. A visitor can choose a preset, fill in either document type, preview the result, print it, or save it as a PDF.

Save and AI Autofill remain visible so visitors can discover those capabilities. For anonymous visitors, their labels clearly communicate the requirement, such as **Sign in to save** and **Sign in to use AI**. Activating either restricted action sends the visitor to the existing login flow with a safe redirect back to the editor. The editor should preserve in-memory work when navigation is avoidable; no guarantee is made that form state survives a full authentication redirect in this scope.

Anonymous visitors do not receive a dashboard because a dashboard represents persisted documents. Existing-document routes also remain authenticated because anonymous visitors cannot own or retrieve saved documents.

## Architecture and Authorization

Route protection is narrowed so preset browsing and new-document editor routes can render with an optional session. Dashboard, existing-document, admin, and other account-owned routes remain behind the authenticated route boundary.

Editor components receive or derive an explicit capability model rather than treating page visibility as proof of authentication. At minimum, the model distinguishes `canSave` and `canUseAi`. Signed-in users have both capabilities; visitors have neither. Restricted controls use this model to render sign-in actions while print/PDF remains universally available.

Preset reads required to start an anonymous editor become public, read-only operations. Preset administration remains authenticated and admin-only. Document mutations and AI extraction retain their existing server-side authentication middleware. Client gating improves the experience but is never the security boundary: direct unauthenticated requests must continue returning `UNAUTHORIZED`.

## Data Flow

1. A visitor opens the public preset/new-document flow.
2. The server optionally reads the Better Auth session and exposes editor capabilities.
3. Public preset queries provide enabled presets only.
4. Form edits remain React/browser state and are used for live preview and printing.
5. A restricted action starts the existing Google sign-in flow with a validated redirect target.
6. A signed-in user follows the current save and AI request paths without behavioral changes.

## Error Handling and Messaging

Restricted controls proactively explain that sign-in is required rather than attempting a request that will fail. If authentication state becomes stale, server `UNAUTHORIZED` responses remain authoritative and the UI should offer sign-in rather than expose internal errors.

Public preset loading keeps the existing unavailable and retry states. Login failures continue using the existing authentication error presentation.

## Testing

Focused tests will verify:

- Anonymous visitors can reach preset browsing and both new-document editors.
- Anonymous editors expose print/PDF while save and AI actions lead to sign-in.
- Signed-in editors retain working save and AI actions.
- Enabled preset reads work without a session while administrative preset writes remain protected.
- Direct anonymous document writes and AI extraction requests remain unauthorized.
- Authenticated dashboard and existing-document routes remain protected from visitors.

Verification will include focused Vitest tests, the full unit suite, Biome checks, TypeScript type-checking, and a production build. Browser tests will be added or run where route behavior cannot be adequately covered at component level.

## Out of Scope

- Persisting anonymous documents locally or in the database.
- Creating Better Auth anonymous users.
- Migrating guest work into an account after sign-in.
- Allowing anonymous AI usage.
- Allowing anonymous access to saved documents, dashboards, or administration.
