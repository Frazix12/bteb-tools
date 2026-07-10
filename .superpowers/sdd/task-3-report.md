# Task 3 report

## RED

- `bun run test src/features/preview/a4-page.test.tsx` — failed as expected: 3 failed, 7 passed. Height-only and smaller-axis assertions exposed width-only scaling; nonpositive width still returned `1`.
- `bun run test src/features/preview/preview-css.test.ts` — failed as expected: 1 failed, 3 passed. The short-landscape preview-host rule was absent.

## GREEN

- `bun run test src/features/preview/a4-page.test.tsx src/features/preview/preview-css.test.ts` — passed: 2 files, 14 tests.
- `bunx biome check src/features/preview/use-page-scale.ts src/features/preview/a4-page.test.tsx src/features/preview/preview.css src/features/preview/preview-css.test.ts` — passed: 4 files checked, no fixes.

## Self-review

- Confirmed scaling uses the minimum of the capped width and positive-height ratios.
- Confirmed the hook derives height from viewport bottom, retains observer/resize/orientation cleanup, and remains server-safe.
- Confirmed short-landscape CSS is outside and does not modify the print block.
- No concerns found.
