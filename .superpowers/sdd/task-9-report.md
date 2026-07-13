# Task 9 Report

## Result

- Added nested-route authorization coverage for all six admin destinations.
- Added desktop admin navigation, active-link, shell isolation, and Back to site coverage.
- Added mobile drawer focus containment, navigation/close, and Escape coverage.
- Added explicit Light/Dark persistence, System resolution, and computed-color coverage.
- Updated the AI-key browser mock to use the oRPC `{ json: ... }` request/response envelope.
- Repaired two verification-only unit-test issues: the admin shell test now mocks `UserMenu` at its component boundary, and the cooling-key fixture uses a future relative timestamp.

## Verification evidence

- Focused browser suite: `bun run test:visual -- tests/admin-dashboard.spec.ts tests/admin-access.spec.ts tests/admin-ai-keys.spec.ts` — exit 0, 14 passed in 49.4s.
- Focused unit regressions: `bun x vitest run src/features/admin/admin-shell.test.tsx src/features/admin/ai-keys-panel.test.tsx` — exit 0, 2 files and 8 tests passed.
- Unit/component suite: `bun run test` — exit 0, 58 files and 272 tests passed in 36.73s.
- Formatting/lint: `bun run check` — exit 0, 190 files checked, no fixes applied.
- TypeScript: `bun x tsc --noEmit` — exit 0.
- Production build: `bun run build` — exit 0; client, SSR, and Nitro production output generated.
- Full browser/visual suite: `bun run test:visual` — exit 0, 22 passed in 55.0s; existing print snapshots passed unchanged.
- `git diff --check` — exit 0.

## Production preview inspection

`bun run preview -- --host 127.0.0.1 --port 4173` initially failed inside the sandbox with `listen EPERM`; after approved escalation it reported `http://127.0.0.1:4173/`. The preview response emitted a 307 header but did not complete its streamed body in this environment. A Playwright navigation using `waitUntil: "commit"` received the response but no `[data-metric]` markup within 10 seconds, so production screenshots could not be captured reliably. The server was stopped cleanly.

The equivalent dev-server browser coverage did verify desktop and mobile layouts, absence of the regular primary navbar, no horizontal overflow in the exercised flows, semantic computed colors in Light and Dark, and theme initialization attributes. No visual snapshots changed.

## Concerns observed

- TanStack Router reports existing code-splitting warnings for named exports in several route modules.

## Hydration follow-up

The stored-theme hydration concern is resolved. `ThemeProvider` now renders System deterministically on the server and first client pass, reads the stored mode in a layout effect, and enables persistence/root/media effects only after initialization. The inline initialization script remains responsible for applying the saved root class and `color-scheme` before hydration, so the synchronization does not introduce a wrong-color frame.

Fresh follow-up evidence:

- Theme hydration tests: `bun x vitest run src/features/theme/theme-provider.test.tsx src/features/theme/theme.test.ts` — exit 0, 2 files and 12 tests passed. The new Light and Dark cases hydrate server markup, require the saved control to be selected, and require no React console errors.
- Full unit/component suite: `bun run test` — exit 0, 58 files and 274 tests passed in 33.98s.
- Admin dashboard Playwright: `bun run test:visual -- tests/admin-dashboard.spec.ts` — exit 0, 3 passed in 34.8s. Reloads require the saved Light/Dark control to retain `aria-pressed="true"` and reject React's hydration-mismatch console signature.
- Full browser/visual suite: `bun run test:visual` — exit 0, 22 passed in 52.4s.
- Formatting/lint: `bun run check` — exit 0, 190 files checked.
- TypeScript: `bun x tsc --noEmit` — exit 0.
- Production build: `bun run build` — exit 0; client, SSR, and Nitro output generated.

Production inspection was retried against the generated server with `env PORT=4174 HOST=127.0.0.1 bun --env-file=.env.local --env-file=.env .output/server/index.mjs`. Nitro started successfully, but the Playwright admin storage state was rejected and `/admin` returned HTTP 200 at `/login?redirect=%2Fadmin`; therefore authenticated production admin screenshots could not be captured without creating a new production-server login session. The attempt was bounded and the server stopped cleanly. This is an external inspection limitation, not a claimed screenshot pass.
