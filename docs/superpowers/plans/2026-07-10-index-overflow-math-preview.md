# Index Overflow, Math, and Adaptive Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep long index names inside fixed rows, render caret exponents semantically, and fit every complete A4 preview page within the available screen area.

**Architecture:** Add a pure caret tokenizer and a focused `AutoFitExperimentName` component that owns DOM measurement. Extend the shared A4 scale calculation to use both width and available viewport height, while CSS grants short landscape previews the full grid width. Preserve native A4 print CSS unchanged.

**Tech Stack:** Bun, React 19, TanStack Start, TypeScript, Vitest, Testing Library, Playwright, CSS print media.

## Global Constraints

- Keep exactly ten index rows per printed A4 page.
- Start experiment names at 19px and never shrink below 11px.
- Preserve original caret text in forms, persistence, import, and export.
- Never interpret user text as HTML.
- Never enlarge an A4 preview beyond 100%.
- Print output remains exactly 210mm × 297mm and ignores screen scaling.

---

### Task 1: Safe caret exponent rendering

**Files:**
- Create: `src/features/index-sheet/format-math.tsx`
- Create: `src/features/index-sheet/format-math.test.tsx`

**Interfaces:**
- Produces: `renderCaretMath(value: string): ReactNode[]`
- Consumes: plain experiment-name strings only.

- [ ] **Step 1: Write failing tokenizer/render tests**

Test `y^2`, `x^10`, Bengali mixed text, unmatched `^`, and literal HTML text. Assert rendered markup contains semantic `<sup>` only for valid exponents and never injects an element from the source string.

- [ ] **Step 2: Verify RED**

Run: `bun run test src/features/index-sheet/format-math.test.tsx`
Expected: FAIL because `renderCaretMath` does not exist.

- [ ] **Step 3: Implement the minimal tokenizer**

Scan with `/\^([\p{L}\p{N}]+)/gu`, emit preceding strings and `<sup key={...}>{match[1]}</sup>`, and preserve unmatched carets as text. React performs escaping.

- [ ] **Step 4: Verify GREEN and commit**

Run: `bun run test src/features/index-sheet/format-math.test.tsx`
Expected: all math-format tests pass.

Commit: `feat(index-sheet): render caret exponents`

### Task 2: Per-cell overflow fitting

**Files:**
- Create: `src/features/index-sheet/auto-fit-experiment-name.tsx`
- Create: `src/features/index-sheet/auto-fit-experiment-name.test.tsx`
- Modify: `src/features/index-sheet/index-sheet-preview.tsx`
- Modify: `src/features/preview/preview.css`

**Interfaces:**
- Consumes: `value: string` and `renderCaretMath`.
- Produces: `<AutoFitExperimentName value={name} />`, with inline font size from 19px down to 11px.

- [ ] **Step 1: Write failing DOM tests**

Stub `clientHeight` and `scrollHeight`. Assert a fitting value remains 19px; an overflowing value repeatedly shrinks; persistent overflow stops at 11px; and resize observation triggers another fit.

- [ ] **Step 2: Verify RED**

Run: `bun run test src/features/index-sheet/auto-fit-experiment-name.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement minimal measurement behavior**

Use `useLayoutEffect`, a content ref, and `ResizeObserver`. Reset to 19px before measurement, then decrement while `scrollHeight > clientHeight` and size is above 11. Render caret math as children.

- [ ] **Step 4: Integrate with preview and safety CSS**

Replace `{row.entry?.name ?? ""}` with `<AutoFitExperimentName value={row.entry?.name ?? ""} />`. Set `.idx-cell.name { overflow: hidden; }`, and ensure the inner fitter occupies the cell width without changing row sizing.

- [ ] **Step 5: Verify GREEN and commit**

Run: `bun run test src/features/index-sheet/auto-fit-experiment-name.test.tsx src/features/index-sheet/index-sheet-editor.test.tsx`
Expected: all focused tests pass.

Commit: `fix(index-sheet): fit long names inside rows`

### Task 3: Width-and-height aware A4 scaling

**Files:**
- Modify: `src/features/preview/use-page-scale.ts`
- Modify: `src/features/preview/a4-page.test.tsx`
- Modify: `src/features/preview/preview.css`

**Interfaces:**
- Changes: `calculatePageScale(containerWidth: number, availableHeight?: number): number`.
- `usePageScale` supplies the preview container width and the viewport space from the container top to the viewport bottom.

- [ ] **Step 1: Add failing scale tests**

Assert width-limited scaling, height-limited scaling, the smaller of both ratios, nonpositive-dimension handling, and the 1.0 ceiling. Update the observer test to provide `clientWidth`, `getBoundingClientRect().top`, and `window.innerHeight`.

- [ ] **Step 2: Verify RED**

Run: `bun run test src/features/preview/a4-page.test.tsx`
Expected: height-limited cases fail because scaling is width-only.

- [ ] **Step 3: Implement two-axis scaling**

Compute `widthScale = max(0, width - 4) / A4_WIDTH_PX` and, when height is positive, `heightScale = max(0, height - 4) / A4_HEIGHT_PX`; return `min(1, widthScale, heightScale)`. In the hook, calculate available height as `window.innerHeight - container.getBoundingClientRect().top - 4` and retain resize/orientation/observer cleanup.

- [ ] **Step 4: Add focused short-landscape CSS**

At a short-landscape media query, make `[data-preview-host]` span the editor grid and give it the viewport-height budget. Do not alter `@media print` rules.

- [ ] **Step 5: Verify GREEN and commit**

Run: `bun run test src/features/preview/a4-page.test.tsx src/features/preview/preview-css.test.ts`
Expected: all focused preview tests pass.

Commit: `feat(preview): fit complete A4 pages on screen`

### Task 4: Browser regressions and release verification

**Files:**
- Modify: `src/routes/visual-fixtures.tsx`
- Modify: `tests/visual/print-layout.spec.ts`
- Modify only when intentional: `tests/visual/print-layout.spec.ts-snapshots/*.png`

**Interfaces:**
- Uses the development-only visual fixture route.
- Produces browser assertions for containment, superscripts, and unchanged print geometry.

- [ ] **Step 1: Add failing browser assertions**

Add a long caret-math name to the index fixture. For 390×844, 844×390, 1024×768, and 1440×900 viewports, assert every `.page-frame` bounding box is fully inside `[data-preview-host]` horizontally and each individual page height is no greater than the available viewport budget. Assert `sup` contains `2` and each `.idx-cell.name` has `scrollHeight <= clientHeight`.

- [ ] **Step 2: Verify RED or expose integration gaps**

Run: `bun run test:visual`
Expected: new containment/overflow assertions fail until Tasks 1–3 are fully integrated.

- [ ] **Step 3: Make only integration-level corrections**

Adjust fixture content, preview host sizing, or observer timing without changing native print dimensions or the 11px minimum.

- [ ] **Step 4: Run full verification**

Run: `bun run test && bun run test:visual && bun run check && bun x tsc --noEmit && bun run build`
Expected: unit/integration tests, Chromium tests, Biome, TypeScript, and production build all pass.

- [ ] **Step 5: Commit**

Commit: `test(preview): cover overflow math and responsive fit`
