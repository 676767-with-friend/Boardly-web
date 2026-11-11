# Phase 2 handoff

## Branch and baseline

- Branch: `chore/phase2-maintainability`, based on verified Phase 1 commit `4e9628df94ec59e4eb1c888e6c2bb9da1ecffed2`.
- Phase 1 remains unmerged in draft [PR #8](https://github.com/676767-with-friend/Boardly-web/pull/8). Its [final CI run](https://github.com/676767-with-friend/Boardly-web/actions/runs/42956208466) passed frontend, backend, and Cypress. Phase 2 is draft [PR #9](https://github.com/676767-with-friend/Boardly-web/pull/9), targeting the Phase 1 branch.
- Current implementation commit: `8ca9dc8830b50495e3f0cd826ff0e07fcefcac8b` (batch 3); previous implementation commits: `db0dab2e5b1b3be00957400099bd938209120fc2`, `4b2a300ab6d7e3264685317a89d28c16a17ade2e`.

## Continuation from verified checkpoint

- The previous Phase 2 head `75866cfeda645bc6bbcaa57312109732b31cda65` passed all three jobs in [PR #9 CI run #48](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958784133). The work below continues from that commit; Phase 1 remains unmerged.
- Current implementation commit: `6ef026ffb634301728e9bdd18ff4e8d548bd62d7` (batch 4). It has focused local verification; GitHub CI is pending.
- This is a **Phase 2 checkpoint**, with broader page cleanup and legacy test coverage triage still open.

### Batch 4 — reservation floor plan

`ReservationPage` now imports `ReservationFloorPlan.tsx`, which owns the existing zone grouping, table buttons, and selection appearance. This gives the stateful reservation wizard a clear UI boundary without changing classes, text, props, routes, or API calls. `ReservationFloorPlan.test.tsx` checks displayed zone/table order and selection. The existing reservation page suite still exercises the full wizard.

Verification at `6ef026f`: local focused Vitest run passed (13/13 tests across the new component and existing reservation page suite); local Vite production build passed; `git diff --check` passed. GitHub frontend, backend, and Cypress checks have not yet run for this commit.

Next unit: review the three historical `Tests/*.yaml` manifests and the standalone `Tests/AdminOperationsApiTests.java` against active deployment paths and Maven coverage. Remove only proven obsolete manifests; retain unique Java coverage for deliberate triage.

## Prioritized plan and checkpoints

1. Consolidate duplicate live-table status styling without changing rendered classes. **Done in batch 1.**
2. Simplify cart response media lookup while retaining primary-image and first-image fallback. **Done in batch 2.**
3. Remove the empty root npm lockfile after confirming all setup paths use the frontend pnpm lockfile. **Done in batch 3.**
4. Evaluate larger frontend page splits and legacy `Tests/` files separately. Do not change the schema or migration without an upgrade-path review.

### Batch 1 — `db0dab2`

`ReservationPages.tsx` and `StaffOperationalPages.tsx` contained identical four-status style maps. Both now import `tableStatusStyle.ts`; the values and iteration order are unchanged. CI also accepts pull requests targeting the still-open Phase 1 branch, while retaining validation for `main` and the existing job names.

Verification: `node node_modules/vitest/vitest.mjs run src/features/ReservationPages.test.tsx src/features/StaffOperationalPages.test.tsx` passed locally (22/22 tests) with elevated process permission; `git diff --check` passed before commit. The sandboxed Vitest invocation could not start (`spawn EPERM`). The complete frontend suite and PR CI passed at the Phase 2 head; see below.

### Batch 2 — `4b2a300`

`CartService.toResponse` now reuses the ordered media list for the existing primary-image selection and first-media fallback. The cart API tests assert the seeded primary image and the fallback after clearing the primary flag inside a rollback-only test transaction. No endpoint, payload, error, or persistent data changes were intended.

Verification: `git diff --check` passed before commit. Backend tests could not run locally: Maven and a usable Docker daemon are unavailable. The PR CI backend job passed on the Phase 2 head; see below.

### Batch 3 — `8ca9dc8`

Removed the empty root `package-lock.json`. There is no root `package.json`; the README, CI jobs, and frontend Dockerfile all use `frontend/pnpm-lock.yaml`. No dependency or install command changed.

Verification: reference search and `git diff --check` passed. No package install was needed for this deletion. PR CI passed on the Phase 2 implementation head; see below.

## Observed Phase 2 verification

At implementation head `69c655c085d62e94fa243416830e68aa6a78d32d`, [PR #9 CI run #47](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958160585) completed successfully: `Frontend (build + Vitest)`, `Backend (mvn verify)`, and `E2E (Cypress)` each passed. This confirms the PR trigger works with the Phase 1 branch as base. Locally, the full Vite production build passed and Vitest coverage passed (41 test files, 226 tests). `git diff --check origin/chore/phase1-verified-ci-baseline...HEAD` passed. The final documentation update after this observation must receive its own CI check before calling the latest PR head verified.

## Known limits and existing issues

- Maven is not installed locally and Docker Desktop's daemon was unavailable in Phase 1; backend and Cypress will need GitHub Actions unless this environment changes.
- Phase 1 documents a pre-existing disabled auth logout test. This refactor does not change auth behavior.
- Image publication and Minikube deployment remain manual-only and unverified.

## Resume

From this repository, run `git switch chore/phase2-maintainability` and `git status --short --branch`. Read this file and `PHASE1_HANDOFF.md`. Check the latest [PR #9](https://github.com/676767-with-friend/Boardly-web/pull/9) CI run for the documentation-only head commit; if all three jobs pass, this is a verified checkpoint. For further work, choose the next pending item above, run focused checks, commit only task files, update this handoff with the implementation commit and actual results, and push. Keep the PR draft and based on the Phase 1 branch until that branch merges. Recheck all three suites on any new final implementation commit. Do not merge or dispatch release.
