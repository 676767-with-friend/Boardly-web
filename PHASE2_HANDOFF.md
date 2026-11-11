# Phase 2 handoff

## Branch and baseline

- Branch: `chore/phase2-maintainability`, based on verified Phase 1 commit `4e9628df94ec59e4eb1c888e6c2bb9da1ecffed2`.
- Phase 1 remains unmerged in draft [PR #8](https://github.com/676767-with-friend/Boardly-web/pull/8). Its [final CI run](https://github.com/676767-with-friend/Boardly-web/actions/runs/42956208466) passed frontend, backend, and Cypress.
- Current implementation commit: `4b2a300ab6d7e3264685317a89d28c16a17ade2e` (batch 2); previous checkpoint `db0dab2e5b1b3be00957400099bd938209120fc2`.

## Prioritized plan and checkpoints

1. Consolidate duplicate live-table status styling without changing rendered classes. **Done in batch 1.**
2. Simplify cart response media lookup while retaining primary-image and first-image fallback. **Implemented in batch 2; GitHub backend verification pending.**
3. Remove the empty root npm lockfile after confirming all setup paths use the frontend pnpm lockfile. Pending.
4. Evaluate larger frontend page splits and legacy `Tests/` files separately. Do not change the schema or migration without an upgrade-path review.

### Batch 1 — `db0dab2`

`ReservationPages.tsx` and `StaffOperationalPages.tsx` contained identical four-status style maps. Both now import `tableStatusStyle.ts`; the values and iteration order are unchanged. CI also accepts pull requests targeting the still-open Phase 1 branch, while retaining validation for `main` and the existing job names.

Verification: `node node_modules/vitest/vitest.mjs run src/features/ReservationPages.test.tsx src/features/StaffOperationalPages.test.tsx` passed locally (22/22 tests) with elevated process permission; `git diff --check` passed before commit. The sandboxed Vitest invocation could not start (`spawn EPERM`). No GitHub CI run has been observed for this Phase 2 commit yet.

### Batch 2 — `4b2a300`

`CartService.toResponse` now reuses the ordered media list for the existing primary-image selection and first-media fallback. The cart API tests assert the seeded primary image and the fallback after clearing the primary flag inside a rollback-only test transaction. No endpoint, payload, error, or persistent data changes were intended.

Verification: `git diff --check` passed before commit. Backend tests could not run locally: Maven and a usable Docker daemon are unavailable. This batch is **not yet verified** by CI; inspect the draft PR's backend job before treating it as a passing checkpoint.

## Known limits and existing issues

- Maven is not installed locally and Docker Desktop's daemon was unavailable in Phase 1; backend and Cypress will need GitHub Actions unless this environment changes.
- Phase 1 documents a pre-existing disabled auth logout test. This refactor does not change auth behavior.
- Image publication and Minikube deployment remain manual-only and unverified.

## Resume

From this repository, run `git switch chore/phase2-maintainability` and `git status --short --branch`. Read this file and `PHASE1_HANDOFF.md`, then complete the next pending batch and its focused checks. Commit only task files, update this handoff with the implementation commit and actual results, and push the branch. Open or update one draft PR targeting `chore/phase1-verified-ci-baseline`; inspect its frontend, backend, and Cypress jobs. Before calling Phase 2 verified, run all three suites on the final implementation commit and link the run here. Do not merge or dispatch release.
