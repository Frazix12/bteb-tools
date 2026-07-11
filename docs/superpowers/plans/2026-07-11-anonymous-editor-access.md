# Anonymous Editor Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anonymous visitors browse presets and use new-page editors while requiring sign-in for persistence and AI Autofill.

**Architecture:** Keep the existing `/_auth` pathless application shell but change its session from required to optional. Add a reusable route guard to account-owned pages, expose enabled preset reads through public oRPC procedures, and pass explicit editor capabilities to shared editor controls. Server-side document and AI procedures remain protected.

**Tech Stack:** Bun, TypeScript, React 19, TanStack Start/Router/Query/Form, Better Auth, oRPC, Vitest, Testing Library, Biome.

## Global Constraints

- Anonymous work exists only in current React/browser state; create no Better Auth anonymous user or database record.
- Anonymous visitors may browse enabled presets, create/edit/preview pages, print, and save as PDF.
- Anonymous visitors may not persist documents or invoke AI Autofill.
- Save and AI controls remain visible and lead to `/login` with a validated redirect back to the editor.
- Dashboard, saved-document, and admin routes remain authenticated.
- Document mutations and AI extraction remain protected by server-side authentication.
- Do not edit `src/routeTree.gen.ts` manually; run `bun run generate-routes` after route changes.
- Use tabs and double quotes in TypeScript/TSX.

---

### Task 1: Public Enabled-Preset Reads

**Files:**
- Modify: `src/orpc/router/presets.test.ts`
- Modify: `src/orpc/router/presets.ts`

**Interfaces:**
- Consumes: `publicProcedure` from `#/orpc/context` and `PresetRepository.listEnabled/findEnabled`.
- Produces: public `presets.list({})` and `presets.getEnabled({ slug, type })`; no write procedures are added.

- [ ] **Step 1: Replace the authentication test with failing public-read tests**

```ts
test("allows anonymous visitors to query enabled presets", async () => {
	getSessionMock.mockResolvedValue(null);
	const repo = repository();
	vi.mocked(repo.listEnabled).mockResolvedValue([]);
	const client = createRouterClient(createPresetRouter(repo), {
		context: { headers: new Headers() },
	});

	await expect(client.list({})).resolves.toEqual([]);
	expect(repo.listEnabled).toHaveBeenCalledOnce();
});

test("allows anonymous visitors to query an enabled preset", async () => {
	getSessionMock.mockResolvedValue(null);
	const repo = repository();
	vi.mocked(repo.findEnabled).mockResolvedValue({
		slug: "cover",
		title: "Cover",
		description: "Cover preset",
		type: "cover_page",
		data: validCoverPageData,
		enabled: true,
	});
	const client = createRouterClient(createPresetRouter(repo), {
		context: { headers: new Headers() },
	});

	await expect(
		client.getEnabled({ slug: "cover", type: "cover_page" }),
	).resolves.toMatchObject({ slug: "cover", type: "cover_page" });
});
```

Reuse a schema-valid cover-page fixture already present in the repository tests, or define it with `createBlankCoverPage()` imported from `#/features/cover-page/defaults`.

- [ ] **Step 2: Run the tests and verify RED**

Run: `bun run test src/orpc/router/presets.test.ts`

Expected: both new tests fail with `UNAUTHORIZED` and repository methods are not called.

- [ ] **Step 3: Make only enabled preset reads public**

```ts
import { publicProcedure } from "#/orpc/context";

const list = publicProcedure
	.input(z.object({}))
	.handler(() => repository.listEnabled());
const getEnabled = publicProcedure
	.input(z.object({ slug: z.string().trim().min(1), type: DocumentTypeSchema }))
	.handler(async ({ input }) => {
		// Keep the existing find, NOT_FOUND, and schema-parse implementation.
	});
```

Remove the unused `protectedProcedure` import. Do not alter admin preset procedures in `src/orpc/router/admin.ts`.

- [ ] **Step 4: Run the focused router tests**

Run: `bun run test src/orpc/router/presets.test.ts src/orpc/router/documents.test.ts src/orpc/router/autofill.test.ts`

Expected: PASS, including existing anonymous rejection tests for document writes and AI extraction.

- [ ] **Step 5: Commit**

```bash
git add src/orpc/router/presets.ts src/orpc/router/presets.test.ts
git commit -m "feat(presets): allow anonymous enabled reads"
```

### Task 2: Optional Shell Session and Protected Page Guard

**Files:**
- Create: `src/features/auth/require-session.ts`
- Create: `src/features/auth/require-session.test.ts`
- Modify: `src/routes/_auth.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/_auth/dashboard.tsx`
- Modify: `src/routes/_auth/admin.tsx`
- Modify: `src/routes/_auth/cover-page/$id.tsx`
- Modify: `src/routes/_auth/index-sheet/$id.tsx`

**Interfaces:**
- Produces: `requireSession(locationHref: string): Promise<{ user: SessionUser }>` which redirects anonymous requests to `/login`.
- Produces: `/_auth` route context `{ user: SessionUser | null }`.
- Consumes: `getCurrentSession()` and TanStack Router `redirect`.

- [ ] **Step 1: Write failing guard tests**

```ts
const { getCurrentSessionMock } = vi.hoisted(() => ({
	getCurrentSessionMock: vi.fn(),
}));
vi.mock("./current-session", () => ({
	getCurrentSession: getCurrentSessionMock,
}));

test("redirects anonymous visitors to login with the current URL", async () => {
	getCurrentSessionMock.mockResolvedValue(null);
	await expect(requireSession("/dashboard?tab=recent")).rejects.toMatchObject({
		options: {
			to: "/login",
			search: { redirect: "/dashboard?tab=recent" },
		},
	});
});

test("returns the signed-in user", async () => {
	const user = { id: "user-1", role: "user" };
	getCurrentSessionMock.mockResolvedValue({ user, session: { id: "s" } });
	await expect(requireSession("/dashboard")).resolves.toEqual({ user });
});
```

- [ ] **Step 2: Run the guard test and verify RED**

Run: `bun run test src/features/auth/require-session.test.ts`

Expected: FAIL because `require-session.ts` does not exist.

- [ ] **Step 3: Implement the guard**

```ts
import { redirect } from "@tanstack/react-router";
import { getCurrentSession } from "./current-session";

export async function requireSession(locationHref: string) {
	const session = await getCurrentSession();
	if (!session) {
		throw redirect({
			to: "/login",
			search: { redirect: locationHref },
		});
	}
	return { user: session.user };
}
```

- [ ] **Step 4: Make the shell optional and guard account-owned routes**

Change `src/routes/_auth.tsx` to return an optional user without redirecting:

```ts
beforeLoad: async () => ({
	user: (await getCurrentSession())?.user ?? null,
}),
```

Add this to each account-owned route definition (`dashboard`, `admin`, both `$id` routes):

```ts
beforeLoad: ({ location }) => requireSession(location.href),
```

Change the anonymous root destination from `/login` to `/presets`:

```ts
to: (await getCurrentSession()) ? "/dashboard" : "/presets",
```

In `AppShell`, render dashboard/home, admin, and `UserMenu` only when `user` exists. Link the brand to `user ? "/dashboard" : "/presets"`, keep Browse Presets for everyone, and render this guest action when `user` is null:

```tsx
<Button asChild>
	<Link to="/login">Sign in</Link>
</Button>
```

- [ ] **Step 5: Generate routes and run focused tests/type-check**

Run: `bun run generate-routes && bun run test src/features/auth/require-session.test.ts && bun x tsc --noEmit`

Expected: route generation succeeds, guard tests PASS, and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/require-session.ts src/features/auth/require-session.test.ts src/routes/_auth.tsx src/components/app-shell.tsx src/routes/index.tsx src/routes/_auth/dashboard.tsx src/routes/_auth/admin.tsx 'src/routes/_auth/cover-page/$id.tsx' 'src/routes/_auth/index-sheet/$id.tsx' src/routeTree.gen.ts
git commit -m "feat(auth): allow guest application access"
```

### Task 3: Reusable Sign-In-Gated Editor Actions

**Files:**
- Create: `src/features/auth/sign-in-action.tsx`
- Create: `src/features/auth/sign-in-action.test.tsx`
- Modify: `src/features/autofill/autofill-dialog.tsx`
- Modify: `src/features/autofill/autofill-dialog.test.tsx`

**Interfaces:**
- Produces: `SignInAction({ children, redirect, variant? })`, a button-styled link to `/login?redirect=...`.
- Extends `AutofillDialog` props with `canUseAi?: boolean` and `signInRedirect?: string`; defaults preserve authenticated callers.

- [ ] **Step 1: Write failing sign-in action and Autofill gating tests**

```tsx
test("links a restricted action to login with its editor return URL", () => {
	render(
		<SignInAction redirect="/cover-page/new?preset=cover">
			Sign in to save
		</SignInAction>,
	);
	expect(screen.getByRole("link", { name: "Sign in to save" })).toHaveAttribute(
		"href",
		"/login?redirect=%2Fcover-page%2Fnew%3Fpreset%3Dcover",
	);
});

test("offers sign-in instead of opening AI for a guest", () => {
	render(
		<AutofillDialog
			type="cover_page"
			current={coverPage}
			canUseAi={false}
			signInRedirect="/cover-page/new"
			onExtract={onExtract}
			onApply={vi.fn()}
		/>,
	);
	fireEvent.click(screen.getByRole("link", { name: "Sign in to use AI" }));
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(onExtract).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `bun run test src/features/auth/sign-in-action.test.tsx src/features/autofill/autofill-dialog.test.tsx`

Expected: FAIL because `SignInAction` and `canUseAi` are absent.

- [ ] **Step 3: Implement the reusable action**

```tsx
import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "#/components/ui/button";

export function SignInAction({
	children,
	redirect,
	variant = "default",
}: {
	children: ReactNode;
	redirect: string;
	variant?: ComponentProps<typeof Button>["variant"];
}) {
	return (
		<Button asChild variant={variant}>
			<Link to="/login" search={{ redirect }}>
				{children}
			</Link>
		</Button>
	);
}
```

At the start of `AutofillDialog`, return this when `props.canUseAi === false`:

```tsx
return (
	<SignInAction redirect={props.signInRedirect ?? "/presets"} variant="outline">
		<Sparkles />
		Sign in to use AI
	</SignInAction>
);
```

- [ ] **Step 4: Run focused tests**

Run: `bun run test src/features/auth/sign-in-action.test.tsx src/features/autofill/autofill-dialog.test.tsx`

Expected: PASS; existing authenticated/default Autofill behavior remains green.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/sign-in-action.tsx src/features/auth/sign-in-action.test.tsx src/features/autofill/autofill-dialog.tsx src/features/autofill/autofill-dialog.test.tsx
git commit -m "feat(auth): add sign-in-gated editor actions"
```

### Task 4: Apply Guest Capabilities to Both New Editors

**Files:**
- Modify: `src/features/cover-page/cover-page-editor.tsx`
- Modify: `src/features/cover-page/cover-page-editor.test.tsx`
- Modify: `src/features/index-sheet/index-sheet-editor.tsx`
- Modify: `src/features/index-sheet/index-sheet-editor.test.tsx`
- Modify: `src/routes/_auth/cover-page/new.tsx`
- Modify: `src/routes/_auth/index-sheet/new.tsx`
- Modify: `src/features/presets/preset-page.test.tsx`
- Modify: `src/routes/_auth/presets.tsx`

**Interfaces:**
- Extends both editor props with `canSave?: boolean`, `canUseAi?: boolean`, and `signInRedirect?: string`; defaults are `true` for existing saved-document callers.
- New-page routes consume optional `user` from `/_auth` context and pass capabilities based on `Boolean(user)`.

- [ ] **Step 1: Write failing guest editor tests**

Add the same behavior assertion to each editor test suite:

```tsx
test("keeps print available but gates save and AI for guests", () => {
	const onSave = vi.fn();
	render(
		<CoverPageEditor
			initialData={initialData}
			canSave={false}
			canUseAi={false}
			signInRedirect="/cover-page/new"
			onSave={onSave}
		/,
	);
	expect(screen.getByRole("button", { name: /print or save as pdf/i })).toBeTruthy();
	expect(screen.getByRole("link", { name: /sign in to save/i })).toBeTruthy();
	expect(screen.getByRole("link", { name: /sign in to use ai/i })).toBeTruthy();
	expect(onSave).not.toHaveBeenCalled();
});
```

Use `IndexSheetEditor` and its fixture in the index-sheet suite.

- [ ] **Step 2: Run editor tests and verify RED**

Run: `bun run test src/features/cover-page/cover-page-editor.test.tsx src/features/index-sheet/index-sheet-editor.test.tsx`

Expected: FAIL because the new capability props have no effect.

- [ ] **Step 3: Render capability-aware actions**

Add these optional props to both editors and default them to `true`:

```ts
canSave?: boolean;
canUseAi?: boolean;
signInRedirect?: string;
```

Pass AI capability into `AutofillDialog`. Replace the save button with:

```tsx
{canSave ? (
	<Button disabled={isSaving} onClick={() => void save()}>
		<Save />
		{isSaving ? "Saving…" : saveLabel}
	</Button>
) : (
	<SignInAction redirect={signInRedirect ?? "/presets"}>
		<Save />
		Sign in to save
	</SignInAction>
)}
```

Keep each editor's current authenticated `saveLabel` (`Save cover page` or `Save sheet`) and keep Print/PDF unchanged.

- [ ] **Step 4: Pass route capabilities and improve guest preset copy**

In each new route, read:

```ts
const { user } = Route.useRouteContext();
const location = Route.useLocation();
```

Thread `isAuthenticated={Boolean(user)}` and `signInRedirect={location.href}` through `PresetDocumentState`, then pass `canSave`, `canUseAi`, and `signInRedirect` to the editor. Update test router mocks to provide `useRouteContext` and `useLocation`.

Change preset page text from “then save it as your own document” to wording valid for both visitors and users, such as “Choose a preset, edit the details, then print or save as PDF.” Replace the unconditional Back to dashboard action with a link to `/dashboard` for authenticated users and `/login` for guests.

- [ ] **Step 5: Run focused component tests**

Run: `bun run test src/features/cover-page/cover-page-editor.test.tsx src/features/index-sheet/index-sheet-editor.test.tsx src/features/autofill/autofill-dialog.test.tsx src/features/presets/preset-page.test.tsx`

Expected: PASS for guest gating and all existing signed-in editor behavior.

- [ ] **Step 6: Commit**

```bash
git add src/features/cover-page/cover-page-editor.tsx src/features/cover-page/cover-page-editor.test.tsx src/features/index-sheet/index-sheet-editor.tsx src/features/index-sheet/index-sheet-editor.test.tsx src/routes/_auth/cover-page/new.tsx src/routes/_auth/index-sheet/new.tsx src/features/presets/preset-page.test.tsx src/routes/_auth/presets.tsx
git commit -m "feat(editor): gate guest save and AI actions"
```

### Task 5: Login Discovery and Full Verification

**Files:**
- Modify: `src/features/auth/auth-page.tsx`
- Modify: `src/features/auth/auth-page.test.tsx`
- Modify as required by formatter only: files changed in Tasks 1–4

**Interfaces:**
- Preserves `AuthPage({ redirect?: string })` and existing Google sign-in behavior.
- Adds a public Browse Presets link without altering callback URL validation.

- [ ] **Step 1: Write a failing login discovery test**

```tsx
test("lets visitors continue without signing in", () => {
	render(<AuthPage />);
	expect(
		screen.getByRole("link", { name: /continue without signing in/i }),
	).toHaveAttribute("href", "/presets");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun run test src/features/auth/auth-page.test.tsx`

Expected: FAIL because the guest link is absent.

- [ ] **Step 3: Add the guest entry point**

Under the Google button, add:

```tsx
<Button asChild className="w-full" variant="outline">
	<Link to="/presets">Continue without signing in</Link>
</Button>
```

Update the description to explain that sign-in enables saved documents and AI Autofill.

- [ ] **Step 4: Run all verification commands**

Run:

```bash
bun run test
bun run check
bun x tsc --noEmit
bun run build
```

Expected: every command exits 0. Confirm specifically that `src/orpc/router/documents.test.ts` and `src/orpc/router/autofill.test.ts` still prove anonymous server calls are rejected.

- [ ] **Step 5: Perform a browser smoke test**

Run `bun run dev`, then verify in a signed-out browser:

1. `/` redirects to `/presets`.
2. A preset opens both new editors.
3. Form edits update preview.
4. Print/PDF remains available.
5. Save and AI actions link to login with the current editor URL as `redirect`.
6. `/dashboard`, `/admin`, and a saved-document URL redirect to login.

Then sign in and verify save and AI buttons retain their original behavior.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/auth-page.tsx src/features/auth/auth-page.test.tsx
git commit -m "feat(auth): add guest entry point"
```
