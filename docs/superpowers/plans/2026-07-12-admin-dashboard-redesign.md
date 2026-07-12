# Admin Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, responsive, multi-page admin dashboard with an admin-only sidebar and correct, persistent light/dark theming across the application.

**Architecture:** Convert `/admin` into a nested route layout whose child routes own focused queries and mutations. Introduce a small theme module and semantic CSS token system shared by the normal application shell and admin shell, while reusing the existing admin domain panels as page content.

**Tech Stack:** Bun, TypeScript, React 19, TanStack Start/Router/Query, oRPC, Tailwind CSS 4, Radix UI, Lucide React, Vitest, Testing Library, Playwright, Biome.

## Global Constraints

- Use tabs and double quotes in TypeScript/TSX and kebab-case filenames.
- Prefer `#/` imports; do not edit `src/routeTree.gen.ts` manually.
- The regular site header must remain on public and normal authenticated pages and must not render inside admin pages.
- Preserve server-side admin authorization and redirect authenticated non-admin users to `/dashboard`.
- Support Light, Dark, and System theme modes and apply the resolved mode before hydration.
- Do not redesign A4 documents or print output.
- Do not change editor, authentication, provider, or document-generation behavior unrelated to this redesign.
- Keep existing admin backend contracts unchanged; build the overview from the current summary, usage, and public AI-key queries.
- Use TDD for every behavioral change and commit after each independently testable task.

## File Structure

**Create:**

- `src/features/theme/theme.ts`: theme types, storage parsing, system resolution, and DOM application.
- `src/features/theme/theme-provider.tsx`: reactive theme context and system-preference listener.
- `src/features/theme/theme-toggle.tsx`: accessible Light/Dark/System selector.
- `src/features/theme/theme.test.ts`: pure theme behavior tests.
- `src/features/theme/theme-provider.test.tsx`: persistence and interaction tests.
- `src/features/admin/admin-shell.tsx`: desktop sidebar, mobile drawer, account controls, and nested outlet.
- `src/features/admin/admin-shell.test.tsx`: admin-only navigation and drawer tests.
- `src/features/admin/admin-page.tsx`: shared page heading, loading, error, message, and content wrappers.
- `src/features/admin/admin-overview.tsx`: summary presentation and management shortcuts.
- `src/features/admin/admin-overview.test.tsx`: overview metrics and links.
- `src/features/admin/use-admin-mutation.ts`: shared mutation feedback and targeted invalidation helper.
- `src/routes/_auth/admin/index.tsx`: overview route.
- `src/routes/_auth/admin/users.tsx`: user management route.
- `src/routes/_auth/admin/usage.tsx`: usage route.
- `src/routes/_auth/admin/ai-keys.tsx`: AI key route.
- `src/routes/_auth/admin/documents.tsx`: document management route.
- `src/routes/_auth/admin/presets.tsx`: preset management route.
- `tests/admin-dashboard.spec.ts`: responsive navigation, route, and theme browser coverage.

**Modify:**

- `src/routes/__root.tsx`: consume shared initialization script and mount theme provider.
- `src/styles.css`: replace conflicting color variables and hard-coded theme surfaces with semantic tokens.
- `src/components/app-shell.tsx`: hide the normal shell chrome for the admin branch and expose theme control normally.
- `src/components/app-shell.test.tsx`: verify admin branch behavior and theme control.
- `src/routes/_auth/admin.tsx`: become the authorization/layout route.
- `src/features/admin/admin-queries.ts`: add focused invalidators while preserving query option factories.
- `src/features/admin/admin-ui.tsx`: use semantic surfaces and shared responsive table styling.
- `src/features/admin/users-panel.tsx`: page-ready semantics and token cleanup.
- `src/features/admin/usage-panel.tsx`: page-ready semantics and token cleanup.
- `src/features/admin/ai-keys-panel.tsx`: page-ready semantics and token cleanup.
- `src/features/admin/data-panel.tsx`: page-ready semantics and token cleanup.
- `src/features/admin/presets-panel.tsx`: page-ready semantics and token cleanup.
- `src/features/admin/admin-dashboard.test.tsx`: retire monolithic assertions in favor of focused page tests.
- `tests/admin-access.spec.ts`: verify all nested admin routes are protected.
- `tests/admin-ai-keys.spec.ts`: update AI key route paths.

**Delete after migration:**

- `src/features/admin/admin-dashboard.tsx`: obsolete all-panels composition.

---

### Task 1: Stable Theme Model and Pre-Hydration Initialization

**Files:**
- Create: `src/features/theme/theme.ts`
- Create: `src/features/theme/theme.test.ts`
- Modify: `src/routes/__root.tsx`

**Interfaces:**
- Produces: `ThemeMode = "light" | "dark" | "system"`, `THEME_STORAGE_KEY`, `readThemeMode(value: string | null): ThemeMode`, `resolveTheme(mode: ThemeMode, prefersDark: boolean): "light" | "dark"`, `applyTheme(mode: ThemeMode, root?: HTMLElement): void`, and `THEME_INIT_SCRIPT: string`.
- Consumes: browser `localStorage`, `matchMedia`, and `document.documentElement` only when those globals exist.

- [ ] **Step 1: Write failing pure behavior tests**

```ts
import { describe, expect, test } from "vitest";
import { readThemeMode, resolveTheme } from "./theme";

describe("theme", () => {
	test.each(["light", "dark", "system"] as const)("accepts %s", (mode) => {
		expect(readThemeMode(mode)).toBe(mode);
	});

	test.each([null, "", "auto", "sepia"])("defaults %s to system", (value) => {
		expect(readThemeMode(value)).toBe("system");
	});

	test("resolves system preference", () => {
		expect(resolveTheme("system", true)).toBe("dark");
		expect(resolveTheme("system", false)).toBe("light");
		expect(resolveTheme("light", true)).toBe("light");
	});
});
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `bun run test src/features/theme/theme.test.ts`

Expected: FAIL because `./theme` does not exist.

- [ ] **Step 3: Implement the theme model and exported initialization script**

```ts
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export const THEME_STORAGE_KEY = "theme";

export function readThemeMode(value: string | null): ThemeMode {
	return value === "light" || value === "dark" || value === "system"
		? value
		: "system";
}

export function resolveTheme(
	mode: ThemeMode,
	prefersDark: boolean,
): ResolvedTheme {
	return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

export function applyTheme(mode: ThemeMode, root = document.documentElement) {
	const resolved = resolveTheme(
		mode,
		window.matchMedia("(prefers-color-scheme: dark)").matches,
	);
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
	root.dataset.theme = mode;
	root.style.colorScheme = resolved;
}

export const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem("theme");var mode=stored==="light"||stored==="dark"||stored==="system"?stored:"system";var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=mode==="system"?(dark?"dark":"light"):mode;var root=document.documentElement;root.classList.remove("light","dark");root.classList.add(resolved);root.setAttribute("data-theme",mode);root.style.colorScheme=resolved;}catch(error){}})();`;
```

Treat the obsolete `"auto"` stored value as `"system"` through the fallback branch.

- [ ] **Step 4: Replace the local script in the root document**

Import `THEME_INIT_SCRIPT` from `#/features/theme/theme`, remove the duplicate constant from `src/routes/__root.tsx`, and keep the script before `<HeadContent />`.

- [ ] **Step 5: Run focused tests and formatting**

Run: `bun run test src/features/theme/theme.test.ts && bun run check src/features/theme/theme.ts src/features/theme/theme.test.ts src/routes/__root.tsx`

Expected: theme tests PASS; Biome reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/theme/theme.ts src/features/theme/theme.test.ts src/routes/__root.tsx
git commit -m "fix(theme): stabilize initial color mode"
```

### Task 2: Reactive Theme Provider and Selector

**Files:**
- Create: `src/features/theme/theme-provider.tsx`
- Create: `src/features/theme/theme-provider.test.tsx`
- Create: `src/features/theme/theme-toggle.tsx`
- Modify: `src/routes/__root.tsx`

**Interfaces:**
- Consumes: Task 1 `ThemeMode`, `THEME_STORAGE_KEY`, `readThemeMode`, and `applyTheme`.
- Produces: `ThemeProvider`, `useTheme(): { mode: ThemeMode; setMode(mode: ThemeMode): void }`, and `ThemeToggle`.

- [ ] **Step 1: Write failing provider interaction tests**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";

function Probe() {
	const { mode, setMode } = useTheme();
	return <button onClick={() => setMode("dark")}>{mode}</button>;
}

beforeEach(() => {
	localStorage.clear();
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
	});
});

test("persists and applies an explicit selection", () => {
	render(<ThemeProvider><Probe /></ThemeProvider>);
	fireEvent.click(screen.getByRole("button", { name: "system" }));
	expect(localStorage.getItem("theme")).toBe("dark");
	expect(document.documentElement.classList.contains("dark")).toBe(true);
});
```

Add a second test asserting a media-query `change` callback reapplies the theme only while mode is `system`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test src/features/theme/theme-provider.test.tsx`

Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement provider state and media listener**

Use lazy state initialization from local storage, persist every explicit selection, call `applyTheme`, subscribe to `matchMedia(...).change`, and remove the listener on cleanup. Throw a descriptive error when `useTheme` is called outside the provider.

- [ ] **Step 4: Implement the accessible selector**

Render a labelled control with three options: Light, Dark, System. Use existing `Button` primitives or a Radix menu; each option must expose `aria-pressed` or checked menu-item state and call `setMode`.

- [ ] **Step 5: Mount the provider around application children**

```tsx
<TanstackQueryProvider>
	<ThemeProvider>{children}</ThemeProvider>
</TanstackQueryProvider>
```

- [ ] **Step 6: Run tests and type-check the feature**

Run: `bun run test src/features/theme/theme-provider.test.tsx && bun x tsc --noEmit`

Expected: PASS and no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/theme src/routes/__root.tsx
git commit -m "feat(theme): add persistent mode control"
```

### Task 3: Coherent Semantic Color System

**Files:**
- Modify: `src/styles.css`
- Modify: `src/features/admin/admin-ui.tsx`
- Test: `src/features/preview/preview-css.test.ts`

**Interfaces:**
- Produces CSS tokens `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--input`, `--ring`, and the existing sidebar token family for both `:root` and `.dark`.
- Preserves print selectors and preview CSS behavior.

- [ ] **Step 1: Add a regression assertion for forbidden hard-coded admin surfaces**

Extend a CSS/source regression test to read the admin UI source and assert it does not contain `bg-white/60`, and read `styles.css` to assert both root modes define sidebar/background/card tokens.

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `bun run test src/features/preview/preview-css.test.ts`

Expected: FAIL on the existing `bg-white/60` admin stat surface.

- [ ] **Step 3: Consolidate palette variables**

Define a restrained neutral/teal light palette and equivalent dark palette. Make legacy aliases such as `--surface-strong`, `--line`, and `--sea-ink` reference semantic values during migration rather than contradicting them. Simplify the body gradients and ensure `body`, cards, popovers, inputs, and sidebar have readable foreground pairs.

- [ ] **Step 4: Replace hard-coded admin surfaces**

Use `bg-card`, `text-card-foreground`, `border-border`, and `bg-muted/40` in `admin-ui.tsx`. Update `tableClass` so headers and hover states use semantic tokens and maintain horizontal scrolling at the page wrapper.

- [ ] **Step 5: Verify CSS, print isolation, and formatting**

Run: `bun run test src/features/preview/preview-css.test.ts && bun run check src/styles.css src/features/admin/admin-ui.tsx`

Expected: PASS with no print-layout selector regression and no Biome errors.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/features/admin/admin-ui.tsx src/features/preview/preview-css.test.ts
git commit -m "fix(ui): unify application color tokens"
```

### Task 4: Admin-Only Responsive Shell

**Files:**
- Create: `src/features/admin/admin-shell.tsx`
- Create: `src/features/admin/admin-shell.test.tsx`
- Modify: `src/routes/_auth/admin.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: authenticated route context user, `ThemeToggle`, `UserMenu`, and nested Router `Outlet`.
- Produces: `AdminShell` with links to `/admin`, `/admin/users`, `/admin/usage`, `/admin/ai-keys`, `/admin/documents`, and `/admin/presets`.

- [ ] **Step 1: Write failing admin shell tests**

Mock TanStack Router links/location/outlet and assert:

```tsx
expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeTruthy();
expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/admin");
expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin/users");
expect(screen.getByRole("link", { name: "Back to site" })).toHaveAttribute("href", "/dashboard");
expect(screen.getByRole("button", { name: "Open admin navigation" })).toBeTruthy();
```

Also verify the current link receives `aria-current="page"`, drawer navigation closes after selection, and every decorative SVG has `aria-hidden="true"`.

- [ ] **Step 2: Run focused tests to confirm failure**

Run: `bun run test src/features/admin/admin-shell.test.tsx src/components/app-shell.test.tsx`

Expected: FAIL because `AdminShell` and admin branch handling do not exist.

- [ ] **Step 3: Implement responsive admin shell**

Use a CSS-grid desktop layout with an `aside`, visible text labels, Lucide icons, bottom account/theme/back controls, and a compact mobile header. Use Radix Dialog primitives already available through `radix-ui` for a focus-managed drawer; do not add a dependency.

- [ ] **Step 4: Convert `/admin` into the layout route**

Keep `beforeLoad` authorization in `src/routes/_auth/admin.tsx`, change the route component to `AdminShell`, and move all data fetching out of this file.

- [ ] **Step 5: Prevent double navigation chrome**

In `AppShell`, inspect the router location and render only `<Outlet />` for paths equal to `/admin` or beginning `/admin/`; render the normal header elsewhere. Keep authorization in the route, not this visual condition.

- [ ] **Step 6: Run focused tests and accessibility assertions**

Run: `bun run test src/features/admin/admin-shell.test.tsx src/components/app-shell.test.tsx`

Expected: PASS for desktop links, mobile drawer, active state, and normal-shell suppression.

- [ ] **Step 7: Commit**

```bash
git add src/features/admin/admin-shell.tsx src/features/admin/admin-shell.test.tsx src/routes/_auth/admin.tsx src/components/app-shell.tsx src/components/app-shell.test.tsx
git commit -m "feat(admin): add responsive sidebar shell"
```

### Task 5: Admin Page States and Overview

**Files:**
- Create: `src/features/admin/admin-page.tsx`
- Create: `src/features/admin/admin-overview.tsx`
- Create: `src/features/admin/admin-overview.test.tsx`
- Create: `src/routes/_auth/admin/index.tsx`
- Modify: `src/features/admin/admin-queries.ts`

**Interfaces:**
- Consumes: `Summary`, `AdminAiKey[]`, `Usage`, `adminSummaryOptions`, `adminAiKeysOptions`, and `adminUsageOptions`.
- Produces: `AdminPageHeader`, `AdminPageLoading`, `AdminPageError`, `AdminMessage`, and `AdminOverview({ summary, usage, aiKeys })`.

- [ ] **Step 1: Write failing overview tests**

```tsx
render(<AdminOverview summary={summary} usage={usage} aiKeys={keys} />);
expect(screen.getByRole("heading", { name: "Overview" })).toBeTruthy();
expect(screen.getByText("21", { selector: "[data-metric='users'] *" })).toBeTruthy();
expect(screen.getByRole("link", { name: /Manage users/ })).toHaveAttribute("href", "/admin/users");
expect(screen.getByText(/1 enabled preset/)).toBeTruthy();
expect(screen.getByText(/AI key/)).toBeTruthy();
```

Add tests for zero keys and failed key validation so health text is meaningful without revealing secrets.

- [ ] **Step 2: Run tests and verify missing components**

Run: `bun run test src/features/admin/admin-overview.test.tsx`

Expected: FAIL because the overview does not exist.

- [ ] **Step 3: Implement shared page states**

Create consistent header, skeleton, retry error, and live-region message components. `AdminPageError` accepts `onRetry: () => void`; `AdminMessage` accepts existing `Message` and uses `role="alert"` only for errors.

- [ ] **Step 4: Implement overview cards and shortcuts**

Render supported metrics only: users, documents, presets/enabled presets, AI requests, key count, and validation health derived from public key statuses. Link every operational card to its management page.

- [ ] **Step 5: Implement overview route-owned queries**

Use only summary, usage page 1, and AI key list queries. Render a skeleton while pending, a retryable state if required data is absent/error, and `AdminOverview` on success.

- [ ] **Step 6: Generate routes and run tests**

Run: `bun run generate-routes && bun run test src/features/admin/admin-overview.test.tsx && bun x tsc --noEmit`

Expected: route tree regenerates; tests and type-check PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/admin/admin-page.tsx src/features/admin/admin-overview.tsx src/features/admin/admin-overview.test.tsx src/routes/_auth/admin/index.tsx src/features/admin/admin-queries.ts src/routeTree.gen.ts
git commit -m "feat(admin): add dashboard overview"
```

### Task 6: Split Users, Usage, and Documents into Routes

**Files:**
- Create: `src/features/admin/use-admin-mutation.ts`
- Create: `src/routes/_auth/admin/users.tsx`
- Create: `src/routes/_auth/admin/usage.tsx`
- Create: `src/routes/_auth/admin/documents.tsx`
- Modify: `src/features/admin/admin-queries.ts`
- Modify: `src/features/admin/users-panel.tsx`
- Modify: `src/features/admin/usage-panel.tsx`
- Modify: `src/features/admin/data-panel.tsx`
- Modify: `src/features/admin/admin-dashboard.test.tsx`

**Interfaces:**
- Produces: `useAdminMutation<TAction>({ mutationFn, invalidate, successMessage })` returning `{ mutate, isPending, message }`.
- Each route owns its page number(s) and invokes one existing panel with only relevant props.

- [ ] **Step 1: Replace monolithic tests with focused page/panel tests**

Retain existing assertions for bootstrap-admin protection, usage date/user pagination, cost formatting, document pagination, and confirmed deletion. Remove assertions requiring all five panels in one render. Add route-level query mocks asserting the Users route does not request usage/documents/presets/keys.

- [ ] **Step 2: Run tests and verify route failures**

Run: `bun run test src/features/admin/admin-dashboard.test.tsx`

Expected: FAIL because focused route modules do not yet exist.

- [ ] **Step 3: Implement targeted invalidators and shared mutation state**

Add `invalidateAdminUsers`, `invalidateAdminUsage`, `invalidateAdminDocuments`, and `invalidateAdminSummary` using exact oRPC query keys. The shared hook must set success/error `Message`, prevent duplicate mutations through exposed pending state, and call only its supplied invalidator.

- [ ] **Step 4: Implement Users route**

Own `page`, call `adminUsersOptions(page)`, and mutate `orpc.admin.users.setRole`. Invalidate users and summary after success. Preserve bootstrap email handling.

- [ ] **Step 5: Implement Usage route**

Own `{ date, user }` pages, call `adminUsageOptions(date, user)`, and render `UsagePanel`. It has no mutations.

- [ ] **Step 6: Implement Documents route**

Own `page`, fetch summary and documents, call `orpc.admin.data.deleteDocument`, and invalidate documents plus summary after success.

- [ ] **Step 7: Normalize page-ready panel markup**

Remove redundant top-level card nesting where it makes the page feel like a panel inside a panel, retain semantic `h2` headings below each route `h1`, and wrap wide tables in labelled overflow regions with `tabIndex={0}`.

- [ ] **Step 8: Generate routes and run focused tests**

Run: `bun run generate-routes && bun run test src/features/admin/admin-dashboard.test.tsx src/orpc/router/admin.test.ts && bun x tsc --noEmit`

Expected: PASS; no backend contract changes.

- [ ] **Step 9: Commit**

```bash
git add src/features/admin src/routes/_auth/admin/users.tsx src/routes/_auth/admin/usage.tsx src/routes/_auth/admin/documents.tsx src/routeTree.gen.ts
git commit -m "refactor(admin): split core management pages"
```

### Task 7: Split AI Keys and Presets into Routes

**Files:**
- Create: `src/routes/_auth/admin/ai-keys.tsx`
- Create: `src/routes/_auth/admin/presets.tsx`
- Modify: `src/features/admin/ai-keys-panel.tsx`
- Modify: `src/features/admin/ai-keys-panel.test.tsx`
- Modify: `src/features/admin/presets-panel.tsx`
- Modify: `src/features/admin/admin-queries.ts`
- Modify: `tests/admin-ai-keys.spec.ts`

**Interfaces:**
- Consumes: `useAdminMutation`, existing AI key and preset oRPC operations, and focused invalidators.
- Produces: stable `/admin/ai-keys` and `/admin/presets` pages with complete existing behavior.

- [ ] **Step 1: Update tests to target the new page URLs**

Change AI key browser navigation from `/admin` to `/admin/ai-keys`. Add focused component assertions for create, replace, enable/disable, validate, validate-all, and confirmed deletion. Add preset assertions for complete edit hydration, JSON validation, server field errors, enable/disable, and confirmed deletion.

- [ ] **Step 2: Run focused tests and confirm route failures**

Run: `bun run test src/features/admin/ai-keys-panel.test.tsx src/features/admin/admin-dashboard.test.tsx`

Expected: FAIL until routes own the handlers and tests no longer require monolithic props.

- [ ] **Step 3: Implement AI Keys route**

Fetch only `adminAiKeysOptions()`. Map existing create, replace, toggle, delete, validate, and validate-all actions through a route-local discriminated union and `useAdminMutation`. Invalidate AI keys and summary when relevant.

- [ ] **Step 4: Implement Presets route**

Own `page`, fetch only `adminPresetsOptions(page)`, and map create, update, toggle, and delete actions through a route-local discriminated union. Preserve `Message.fields` so server field errors remain associated with inputs.

- [ ] **Step 5: Polish both panels with semantic states**

Use shared page heading/state components, labelled dialogs, semantic tokens, helpful empty copy, and disabled pending actions. Never render raw API keys.

- [ ] **Step 6: Generate routes and run feature tests**

Run: `bun run generate-routes && bun run test src/features/admin/ai-keys-panel.test.tsx src/features/admin/admin-dashboard.test.tsx && bun x tsc --noEmit`

Expected: PASS with generated routes present.

- [ ] **Step 7: Commit**

```bash
git add src/routes/_auth/admin/ai-keys.tsx src/routes/_auth/admin/presets.tsx src/features/admin src/routeTree.gen.ts tests/admin-ai-keys.spec.ts
git commit -m "refactor(admin): split keys and presets"
```

### Task 8: Remove Monolith and Polish the Normal Site Shell

**Files:**
- Delete: `src/features/admin/admin-dashboard.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/components/app-shell.test.tsx`
- Modify: `src/components/user-menu.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `ThemeToggle` and the existing authenticated user/logout flow.
- Produces: consistent top navigation outside admin and no references to `AdminDashboardView`.

- [ ] **Step 1: Add shell UI regression tests**

Assert normal authenticated routes retain Sheet Generator, Home, Browse Presets, Admin for admins, user controls, and theme selection. Assert `/admin/*` renders no normal `<header>` and delegates to the nested outlet.

- [ ] **Step 2: Run shell tests and verify the missing theme control assertion**

Run: `bun run test src/components/app-shell.test.tsx`

Expected: FAIL until `ThemeToggle` is integrated.

- [ ] **Step 3: Integrate theme control and polish navigation**

Add the selector to the user menu or adjacent compact control, strengthen active-link semantics using Router active props, standardize header height/spacing, and retain readable labels on mobile.

- [ ] **Step 4: Remove obsolete monolithic code**

Delete `admin-dashboard.tsx`, remove its imports, and use `rg "AdminDashboardView|admin-dashboard" src tests` to confirm no stale runtime references remain. Rename or split the legacy test file if that makes its new focused responsibility clearer.

- [ ] **Step 5: Run component suite and checks**

Run: `bun run test src/components src/features/admin && bun run check src/components src/features/admin src/styles.css && bun x tsc --noEmit`

Expected: PASS with no stale imports or lint/type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components src/features/admin src/styles.css
git commit -m "feat(ui): polish site navigation and feedback"
```

### Task 9: Browser Coverage, Production Color Verification, and Final Validation

**Files:**
- Create: `tests/admin-dashboard.spec.ts`
- Modify: `tests/admin-access.spec.ts`
- Modify: `tests/admin-ai-keys.spec.ts`
- Modify: visual snapshots only if intentional rendering changes affect tracked fixtures.

**Interfaces:**
- Consumes: completed route hierarchy, theme storage key, admin test fixture, and existing Playwright configuration.
- Produces: regression coverage for authorization, responsive navigation, persistence, and production-readable colors.

- [ ] **Step 1: Add nested-route authorization cases**

```ts
for (const path of [
	"/admin",
	"/admin/users",
	"/admin/usage",
	"/admin/ai-keys",
	"/admin/documents",
	"/admin/presets",
]) {
	test(`protects ${path}`, async ({ page }) => {
		await page.goto(path);
		await expect(page).toHaveURL(/\/dashboard|\/login/);
	});
}
```

Use the appropriate anonymous/non-admin fixture already established in `tests/admin-access.spec.ts` rather than duplicating setup.

- [ ] **Step 2: Add admin sidebar browser flow**

With the admin fixture, assert Overview loads, each sidebar link changes to the stable URL, the regular site header is absent, active navigation is exposed, and Back to site returns to `/dashboard`.

- [ ] **Step 3: Add mobile drawer flow**

Set a phone-sized viewport, open the admin navigation, verify focus/dialog visibility, select Users, assert the drawer closes and `/admin/users` loads, then reopen and close with Escape.

- [ ] **Step 4: Add theme persistence and computed-color regression**

Select Dark, reload, and assert `html.dark`, `data-theme="dark"`, and `color-scheme: dark`; repeat for Light. For each mode, read computed styles from body, an admin card, sidebar, and primary text, assert none are transparent, and assert foreground/background values differ. Set System with emulated dark/light color schemes and verify the resolved class changes without storing a resolved mode.

- [ ] **Step 5: Run focused browser tests**

Run: `bun run test:visual -- tests/admin-dashboard.spec.ts tests/admin-access.spec.ts tests/admin-ai-keys.spec.ts`

Expected: all selected Chromium tests PASS.

- [ ] **Step 6: Run the full required verification suite**

Run in order:

```bash
bun run test
bun run check
bun x tsc --noEmit
bun run build
bun run test:visual
```

Expected: every command exits 0. If an intentional visual change affects a tracked snapshot, inspect the diff before updating it and rerun the owning spec.

- [ ] **Step 7: Inspect the production build manually through Playwright**

Run `bun run preview` in one terminal session, open its reported local URL with Playwright, and capture desktop light, desktop dark, and mobile admin screenshots. Confirm no mixed black/light cards, unreadable muted text, duplicate navbar, layout overflow, or pre-hydration theme flash.

- [ ] **Step 8: Commit final browser coverage**

```bash
git add tests src/routeTree.gen.ts
git commit -m "test(admin): cover dashboard navigation"
```

## Final Review Checklist

- [ ] Every admin capability has one stable nested route and only loads its own data.
- [ ] `/admin` shows summary metrics and operational shortcuts, not all management panels.
- [ ] Admin routes show only the admin shell; all other site routes retain the normal header.
- [ ] Desktop sidebar and mobile drawer are keyboard- and touch-usable.
- [ ] Light, Dark, and System modes persist and initialize before hydration.
- [ ] Application components use semantic theme surfaces without conflicting hard-coded whites.
- [ ] Print and A4 document output remains unchanged.
- [ ] All unit, component, browser, formatting, type, and production-build checks pass.
