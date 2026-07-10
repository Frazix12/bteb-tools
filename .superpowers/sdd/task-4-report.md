# Task 4 Report

## Outcome

- Added a stress variant of the development index fixture with a long mixed-script caret-math name.
- Added Chromium containment, viewport-height, superscript, and row-overflow assertions at 390x844, 844x390, 1024x768, and 1440x900.
- Corrected the screen preview grid/flex shrink integration with `min-width: 0` and a host-width wrapper; print rules and the 11px font floor are unchanged.
- Kept existing print snapshots unchanged.
- Added the missing `ResizeObserver.unobserve` method to the Task 2 test double so the required TypeScript verification can complete.

## TDD evidence

- RED: `bun run test:visual` — 6 failed, 2 passed. All four new viewport assertions exposed unscaled intrinsic A4 overflow; the intentional fixture change also demonstrated why the stress content must remain isolated from the static print-parity fixture.
- Focused GREEN: `bun x playwright test tests/visual/print-layout.spec.ts --grep 'fits'` — 4 passed.
- Final visual GREEN: `bun run test:visual` — 8 passed.

## Full verification

Command:

`bun run test && bun run test:visual && bun run check && bun x tsc --noEmit && bun run build`

Results:

- Vitest: 23 files passed, 107 tests passed.
- Playwright Chromium: 8 tests passed.
- Biome: 105 files checked, no fixes required.
- TypeScript: passed with no diagnostics.
- Vite/Nitro production build: passed.

## Self-review

- Scope is limited to the stress fixture, browser regression, screen-only sizing integration, and the test-double typing correction required by the release gate.
- Assertions wait for observer-driven scaling under parallel browser load and then inspect every page/name cell.
- No native A4 dimensions, print CSS geometry, minimum auto-fit font size, or snapshots changed.
- Concerns: none.

## Review fixes

- Changed overflow checks from the clipping `.idx-cell.name` parent to every inner `.auto-fit-experiment-name`, with polling for `ResizeObserver` completion.
- Included preview-host padding in horizontal and vertical content bounds and asserted each frame's actual top/bottom against its viewport-height budget.
- Scoped exponent checks to the first stressed name and asserted exactly five superscripts, each containing `2`.
- Asserted every computed preview scale is within `(0, 1]` and every transformed `.a4-page` edge coincides with its `.page-frame` edge within 0.5px, detecting internal clipping.
- Reserved the existing 4px scale gutter as short-landscape bottom padding so the transformed page remains inside the padded viewport budget; print CSS is unchanged.

Review verification:

- `bun x playwright test tests/visual/print-layout.spec.ts --grep 'fits'` — 4 passed.
- `bun run test:visual` — 8 passed.
- `bun run test src/features/preview/preview-css.test.ts` — 1 file passed, 4 tests passed.
- `bun run check` — 105 files checked, no fixes required.
- `bun x tsc --noEmit` — passed with exit code 0.
