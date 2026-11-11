# Phase 2 handoff

## Branch and baseline

- Branch: `chore/phase2-maintainability`, based on verified Phase 1 commit `4e9628df94ec59e4eb1c888e6c2bb9da1ecffed2`.
- Phase 1 remains unmerged in draft [PR #8](https://github.com/676767-with-friend/Boardly-web/pull/8). Its [final CI run](https://github.com/676767-with-friend/Boardly-web/actions/runs/42956208466) passed frontend, backend, and Cypress. Phase 2 is draft [PR #9](https://github.com/676767-with-friend/Boardly-web/pull/9), targeting the Phase 1 branch.
- Earlier implementation commits: `db0dab2e5b1b3be00957400099bd938209120fc2`, `4b2a300ab6d7e3264685317a89d28c16a17ade2e`, and `8ca9dc8830b50495e3f0cd826ff0e07fcefcac8b`.

## Continuation from verified checkpoint

- The previous Phase 2 head `75866cfeda645bc6bbcaa57312109732b31cda65` passed all three jobs in [PR #9 CI run #48](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958784133). The work below continues from that commit; Phase 1 remains unmerged.
- Current implementation commit: `03522e623430d3273e489e5515d630af1331c497` (batch 6), awaiting CI. Previous implementation commits: `6ef026ffb634301728e9bdd18ff4e8d548bd62d7` and `1966dfc10b1732598086e8b2d765ece700841321`. [PR #9 CI run #49](https://github.com/676767-with-friend/Boardly-web/actions/runs/42966523985) passed Frontend, Backend, and Cypress on the prior combined implementation head `e288c0556e6c053a8663e48e465e1272cf91f11a`; the later documentation-only head also passed [run #50](https://github.com/676767-with-friend/Boardly-web/actions/runs/42967178511).
- The legacy Java test was reconciled in `03522e623430d3273e489e5515d630af1331c497`; GitHub verification of that commit is pending.
- This remains a Phase 2 checkpoint while final code review and system verification are in progress.

### Batch 6 — legacy Java test reconciliation

The ten scenarios in the standalone `Tests/AdminOperationsApiTests.java` were mapped to active Maven coverage. Branch create/update and manager denial map to `ManagementAdminApiTests` branch cases; product create/update and validation map to its product cases; user status and manager denial map to its user cases; staff search and reassignment map to its staff cases; customer reservation and order lookup map to `MyReservationsApiTests` and `CartCheckoutApiTests`. The active `GlobalInventoryApiTests` covers stock addition, but did not follow a newly created product. The active staff order test covered branch scope using existing orders, but did not assert visibility of a fresh checkout. Those two gaps were added to `ManagementAdminApiTests` with response and branch-scope assertions. Existing active tests also cover authorization, validation, and database effects more thoroughly than the legacy file.

The standalone file and its now-empty `Tests/README.md` were removed; the active tests are transactional and use isolated CI data. No application code or behavior changed in this batch. `git diff --check` passed. Maven is absent locally, so the changed tests have **not yet run**; GitHub CI is required. No legacy assertion remains intentionally unresolved.

### Batch 4 — reservation floor plan

`ReservationPage` now imports `ReservationFloorPlan.tsx`, which owns the existing zone grouping, table buttons, and selection appearance. This gives the stateful reservation wizard a clear UI boundary without changing classes, text, props, routes, or API calls. `ReservationFloorPlan.test.tsx` checks displayed zone/table order and selection. The existing reservation page suite still exercises the full wizard.

Verification at `6ef026f`: local focused Vitest run passed (13/13 tests across the new component and existing reservation page suite); local Vite production build passed; `git diff --check` passed. The combined implementation head passed all three GitHub jobs in run #49 above.

### Batch 5 — obsolete legacy manifests

Removed `Tests/10-postgres.yaml`, `Tests/20-backend.yaml`, and `Tests/30-frontend.yaml`. They conflicted with the canonical `k8s/` resources, while the workflow, deployment script, Compose, Dockerfiles, and documented deployment commands use only `k8s/`. Updated `README.md` and `Tests/README.md` accordingly. No deployed resources, schema, or runtime configuration changed. Git history retains the removed examples.

At the end of batch 5, `Tests/AdminOperationsApiTests.java` was kept for review. Batch 6 above accounts for it and removes the standalone copy.

Verification at `1966dfc`: repository reference search confirmed no active path uses `Tests/*.yaml`; `git diff --check` passed. No local runtime test was needed for deletion of inactive examples. The combined implementation head passed all three GitHub jobs in run #49 above.

## Remaining cleanup and resume steps

In priority order: (1) verify batch 6 on GitHub; (2) complete a focused frontend and backend maintainability pass; (3) document the notification schema/migration upgrade path without changing data; (4) run the full Phase 3 validation matrix and record actual results in `PHASE3_VERIFICATION.md`.

Resume with `git switch chore/phase2-maintainability`, `git status --short --branch`, and `git log -5 --oneline`. Read this file and inspect draft PR #9 targeting `chore/phase1-verified-ci-baseline`. For each new implementation batch, run its focused tests, commit task files, update this handoff with the commit and results, push, and check the PR's Frontend, Backend, and Cypress jobs. Keep release manual-only; do not merge, publish, or deploy.

## Prioritized plan and checkpoints

1. Consolidate duplicate live-table status styling without changing rendered classes. **Done in batch 1.**
2. Simplify cart response media lookup while retaining primary-image and first-image fallback. **Done in batch 2.**
3. Remove the empty root npm lockfile after confirming all setup paths use the frontend pnpm lockfile. **Done in batch 3.**
4. Extract a cohesive reservation UI component and remove confirmed obsolete `Tests/` manifests. **Done in batches 4 and 5.** Do not change the schema or migration without an upgrade-path review.

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

At implementation head `69c655c085d62e94fa243416830e68aa6a78d32d`, [PR #9 CI run #47](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958160585) completed successfully: `Frontend (build + Vitest)`, `Backend (mvn verify)`, and `E2E (Cypress)` each passed. The subsequent documentation-only head `75866cfeda645bc6bbcaa57312109732b31cda65` also passed all three jobs in [run #48](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958784133). This confirms the PR trigger works with the Phase 1 branch as base. Locally, the full Vite production build passed and Vitest coverage passed (41 test files, 226 tests). `git diff --check origin/chore/phase1-verified-ci-baseline...HEAD` passed at that checkpoint.

## Known limits and existing issues

- Maven is not installed locally and Docker Desktop's daemon was unavailable in Phase 1; backend and Cypress will need GitHub Actions unless this environment changes.
- Phase 1 documents a pre-existing disabled auth logout test. This refactor does not change auth behavior.
- Image publication and Minikube deployment remain manual-only and unverified.
