# Admin Dashboard and Site UI Redesign

## Objective

Replace the single-page administration screen with a dedicated, responsive admin dashboard made of focused pages. Improve the visual consistency and usability of the full application, and eliminate the mixed light/dark styling visible in the hosted build.

## Scope

This project includes:

- A dedicated admin-only layout with sidebar navigation.
- An admin overview and separate pages for users, AI usage, AI keys, documents, and presets.
- A coherent light and dark theme across application UI.
- Shared interaction, feedback, loading, error, and empty-state improvements across the site.
- Production-focused verification of colors and theme initialization.

It does not redesign generated A4 documents or print output. Existing admin backend contracts remain intact unless a small summary extension is required for overview metrics.

## Route Architecture

The admin area will use nested file-based routes:

- `/admin`: overview
- `/admin/users`: user and role management
- `/admin/usage`: AI usage reporting
- `/admin/ai-keys`: provider key management and validation
- `/admin/documents`: stored-document reporting and deletion
- `/admin/presets`: preset creation, editing, activation, and deletion

The authenticated application shell will detect the admin route branch and yield layout ownership to the admin shell. Consequently, the regular site header will remain on public and normal authenticated pages but will not render inside the admin area.

Admin authorization remains enforced before admin content renders. Unauthenticated visitors follow the existing sign-in flow, and authenticated non-admin users are redirected to `/dashboard`.

## Admin Shell and Navigation

On desktop, the admin shell uses a persistent fixed-width sidebar and a flexible content area. The sidebar contains the product identity, links to all six admin pages, a clear active state, a back-to-site action, and the current-user controls.

On smaller screens, the sidebar becomes an accessible modal drawer opened from a compact admin top bar. Opening the drawer moves focus into it, Escape closes it, and selecting a destination closes it. Navigation labels remain visible rather than relying on icon-only controls.

Every page uses a consistent header containing its title, a concise description, and an optional primary action. The content column is wide enough for administration tables but retains readable margins. Page location is conveyed by the active sidebar item and page heading; redundant breadcrumb chains are unnecessary for this shallow hierarchy.

## Overview Page

The overview is a real summary page rather than a duplicate of all management panels. It shows:

- Counts for users, stored documents, active presets, and configured AI keys.
- AI usage and key-health summaries using data already available from admin queries where practical.
- Recent or operationally important status, limited to information supported by current backend contracts.
- Direct shortcuts to common management destinations.

Overview cards link to the relevant detail page. If a desired recent-activity metric is unavailable, the implementation will favor supported aggregate information over introducing an activity-log subsystem.

## Management Pages

Each management page owns only its relevant query, pagination, mutations, and invalidation:

- Users manages roles and protects the bootstrap administrator rules already enforced by the application.
- AI Usage presents date- and user-based usage summaries with independent pagination.
- AI Keys handles creation, replacement, enablement, validation, validation-all, and deletion without exposing secret values.
- Documents shows storage summaries and paginated documents with confirmed deletion.
- Presets handles paginated listing, creation, editing, enablement, and confirmed deletion.

Tables use consistent headers, row hover and focus treatment, action placement, horizontal overflow behavior, and responsive alternatives where a full table is unsuitable. Destructive actions retain confirmation dialogs with specific consequences. Pending actions disable affected controls to prevent duplicates.

## Visual System

The redesign uses a clean professional style: neutral surfaces carry most of the interface, and teal is reserved for brand identity, focus, active navigation, and primary actions. Cards use subtle borders and restrained shadows. Spacing, typography, form sizing, radii, and elevation follow a smaller, documented set of reusable values.

Semantic tokens will cover page background, elevated surface, sidebar, text, muted text, border, input, accent, success, warning, and destructive states. Components must consume these tokens instead of mixing theme-aware variables with hard-coded light colors such as `white/60`.

Both light and dark themes are supported. The theme control offers Light, Dark, and System modes, persists the explicit preference, and resolves System against the browser media query. A small pre-render initialization step applies the resolved theme before React hydration to avoid a flash or mixed theme during hosted startup. Theme state is client-derived and must not depend on deployment environment defaults.

The existing decorative page background will be simplified so it does not overpower content or produce muddy gradients in dark mode. Print-specific UI remains isolated from application theme rules.

## Whole-Site UX Improvements

Public pages, authentication pages, the user dashboard, presets, and document editors retain their current information architecture and top navigation. They adopt the corrected tokens and shared component behavior, including:

- Consistent buttons, inputs, focus rings, and validation messages.
- Clear active navigation and accessible hover/focus states.
- Standard loading skeletons or appropriately shaped progress states.
- Helpful empty states and retryable error states.
- Consistent success and error feedback.
- Responsive spacing and content widths.

This work avoids unrelated functional changes to editors, authentication, AI providers, or document generation.

## Data Flow and Feedback

Admin routes fetch their own data so visiting one section does not load every administration dataset. Mutations invalidate only the queries needed to make affected screens current, plus overview summaries when their metrics may have changed.

Global mutation results use consistent transient feedback, while field validation stays next to its input. Query failures render a page-level error state with a retry action. Empty datasets explain the state and provide a relevant next action when one exists. Loading content uses page-shaped skeletons to preserve layout and avoid abrupt shifts.

## Accessibility

The redesign preserves semantic headings, labelled controls, keyboard navigation, visible focus indicators, sufficient color contrast in both themes, and accessible dialog behavior. Sidebar icons supplement visible labels. Status and error feedback uses appropriate live-region semantics without announcing purely decorative changes.

## Testing and Verification

Implementation verification will include:

- Focused Vitest tests for the admin shell, overview, management routes, theme resolution, and changed shared components.
- Existing and extended admin authorization tests.
- Playwright coverage for sidebar navigation, mobile drawer behavior, core admin flows, and theme persistence.
- Production-mode checks that confirm initial theme application and readable computed colors.
- Updated visual snapshots only where intentional application or print-layout changes require them.
- `bun run test`, `bun run test:visual` where applicable, `bun run check`, `bun x tsc --noEmit`, and `bun run build`.

The hosted color regression is considered resolved only after testing a production build with light, dark, and system preferences rather than relying on development-mode appearance.

## Success Criteria

- Admin navigation is a sidebar used only within the admin area.
- Every admin capability has a stable, directly navigable page URL.
- `/admin` provides a useful overview without loading and rendering all management panels.
- Desktop and mobile admin navigation is usable by keyboard and touch.
- Light and dark modes are visually coherent with no hard-coded surface conflicts.
- The selected theme persists and initializes before the application paints in production.
- Normal site pages retain their top navigation and receive consistent UI polish.
- Authorization and existing admin operations continue to work.
- Required checks and the production build pass.
