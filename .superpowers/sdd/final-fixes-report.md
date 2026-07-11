# Final review fixes report

## Result

All final-review findings were addressed in one pass.

- Bootstrap admin protection now rejects demotion by every actor, not only self-demotion, at the repository/API boundary.
- User rows load document and AI aggregates in separate grouped queries, preventing document/usage join multiplication. The UI shows request, input/output token, and estimated-cost totals.
- AI reporting now supports bounded date filters and paginated date/user breakdowns, plus a bounded outcome breakdown. The dashboard renders all three.
- Data summary separately reports total/enabled/disabled presets and AI requests.
- Unknown input/output token metadata remains `null` in schema, migration, repository, reports, and UI instead of becoming zero. Estimated cost remains zero when usage is unavailable.
- Google Gemini standard paid-tier text rates were re-verified against the official pricing page on 2026-07-11; current rates remain correct ($0.25/$1.50 for Gemini 3.1 Flash-Lite, $0.10/$0.40 for Gemini 2.5 Flash-Lite, and $0.30/$2.50 for Gemini 2.5 Flash).
- Every `@tanstack/ai*` dependency is pinned to its exact installed version and `pnpm-lock.yaml` was generated.
- Preset slugs enforce a maximum of 80 characters and lowercase kebab-case. Local JSON errors are connected to the textarea through `aria-describedby`.
- Single document and preset deletes now use `DELETE ... RETURNING` directly without transactions.

## Verification

- `pnpm test`: 38 files, 155 tests passed.
- `pnpm check`: passed, 142 files checked.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed (client, SSR, and Nitro production output).
- `pnpm exec playwright test`: 13 passed, including PostgreSQL seed/admin access and visual/print coverage.
- `pnpm db:generate`: no schema changes/no migration drift.
- Diff/status review: unrelated pre-existing edits to `.superpowers/sdd/task-2-report.md` and `task-3-report.md` were preserved and excluded from the commit.

## Notes

Playwright/build emitted existing TanStack Router code-splitting warnings for named exports in the two new-document route files; they do not affect correctness and all checks passed.
