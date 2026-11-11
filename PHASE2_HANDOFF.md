# Phase 2 handoff

## Branch and baseline

- Branch: `chore/phase2-maintainability`, based on verified Phase 1 commit `4e9628df94ec59e4eb1c888e6c2bb9da1ecffed2`.
- Phase 1 remains unmerged in draft [PR #8](https://github.com/676767-with-friend/Boardly-web/pull/8). Its [final CI run](https://github.com/676767-with-friend/Boardly-web/actions/runs/42956208466) passed frontend, backend, and Cypress. Phase 2 is draft [PR #9](https://github.com/676767-with-friend/Boardly-web/pull/9), targeting the Phase 1 branch.
- Earlier implementation commits: `db0dab2e5b1b3be00957400099bd938209120fc2`, `4b2a300ab6d7e3264685317a89d28c16a17ade2e`, and `8ca9dc8830b50495e3f0cd826ff0e07fcefcac8b`.

## Continuation from verified checkpoint

- The previous Phase 2 head `75866cfeda645bc6bbcaa57312109732b31cda65` passed all three jobs in [PR #9 CI run #48](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958784133). The work below continues from that commit; Phase 1 remains unmerged.
- Earlier implementation commits `6ef026ffb634301728e9bdd18ff4e8d548bd62d7` and `1966dfc10b1732598086e8b2d765ece700841321` passed all three jobs in [PR #9 CI run #49](https://github.com/676767-with-friend/Boardly-web/actions/runs/42966523985); the documentation head passed [run #50](https://github.com/676767-with-friend/Boardly-web/actions/runs/42967178511).
- The final Phase 2 implementation commits are `03522e623430d3273e489e5515d630af1331c497` (legacy Java test reconciliation), `3d9a701196c9b5bafd50ded99f4047eaec692851` (shared currency formatting), and `3506d0a72adb9f54365552799a1313fe0865c295` (management branch readability). The combined head passed all three jobs in [PR #9 CI run #52](https://github.com/676767-with-friend/Boardly-web/actions/runs/42997935362). Run #51 was cancelled by the workflow's concurrency rule after a newer push; it was not a test failure.

### Batch 6 — legacy Java test reconciliation

The ten scenarios in the standalone `Tests/AdminOperationsApiTests.java` were mapped to active Maven coverage. Branch create/update and manager denial map to `ManagementAdminApiTests` branch cases; product create/update and validation map to its product cases; user status and manager denial map to its user cases; staff search and reassignment map to its staff cases; customer reservation and order lookup map to `MyReservationsApiTests` and `CartCheckoutApiTests`. The active `GlobalInventoryApiTests` covers stock addition, but did not follow a newly created product. The active staff order test covered branch scope using existing orders, but did not assert visibility of a fresh checkout. Those two gaps were added to `ManagementAdminApiTests` with response and branch-scope assertions. Existing active tests also cover authorization, validation, and database effects more thoroughly than the legacy file.

The standalone file and its now-empty `Tests/README.md` were removed; the active tests are transactional and use isolated CI data. No application code or behavior changed in this batch. `git diff --check` passed. Maven is absent locally; the changed tests passed in the backend job of run #52. No legacy assertion remains intentionally unresolved.

### Batch 7 — shared frontend currency formatting

The reservation, live-staff, staff-management, and admin pages used four identical `Intl.NumberFormat("en-TH", { style: "currency", currency, maximumFractionDigits: 0 })` implementations. All now use `frontend/src/utils/currency.ts` with the same default and per-call currency arguments; the older `fmt` utility remains unchanged because its output differs. Focused Vitest tests for the four callers and the new utility passed (36/36), and the Vite production build passed locally. No CSS, text, route, or API call changed. The frontend job in run #52 passed.

### Batch 8 — management branch code

Expanded four dense methods in `ManagementService` into readable blocks: branch response mapping, branch assignment replacement and validation, and branch-scope lookup. Conditions, query calls, iteration order, exception text/codes, timestamps, and transaction annotations are unchanged. Existing active management API tests cover branch responses, assignment updates, role restrictions, and unassigned staff. `git diff --check` and the backend job in run #52 passed.

### Batch 4 — reservation floor plan

`ReservationPage` now imports `ReservationFloorPlan.tsx`, which owns the existing zone grouping, table buttons, and selection appearance. This gives the stateful reservation wizard a clear UI boundary without changing classes, text, props, routes, or API calls. `ReservationFloorPlan.test.tsx` checks displayed zone/table order and selection. The existing reservation page suite still exercises the full wizard.

Verification at `6ef026f`: local focused Vitest run passed (13/13 tests across the new component and existing reservation page suite); local Vite production build passed; `git diff --check` passed. The combined implementation head passed all three GitHub jobs in run #49 above.

### Batch 5 — obsolete legacy manifests

Removed `Tests/10-postgres.yaml`, `Tests/20-backend.yaml`, and `Tests/30-frontend.yaml`. They conflicted with the canonical `k8s/` resources, while the workflow, deployment script, Compose, Dockerfiles, and documented deployment commands use only `k8s/`. Updated `README.md` and `Tests/README.md` accordingly. No deployed resources, schema, or runtime configuration changed. Git history retains the removed examples.

At the end of batch 5, `Tests/AdminOperationsApiTests.java` was kept for review. Batch 6 above accounts for it and removes the standalone copy.

Verification at `1966dfc`: repository reference search confirmed no active path uses `Tests/*.yaml`; `git diff --check` passed. No local runtime test was needed for deletion of inactive examples. The combined implementation head passed all three GitHub jobs in run #49 above.

## Final configuration review and Phase 3

The backend environment example now matches the local Compose host port and user; the frontend example uses the Vite/Nginx `/api` proxy. The README starts the idempotent notification migration before manual backend startup and explains that a pre-existing notification table with a different shape needs a separate reviewed migration. No schema or data changed. The base schema creates the table on fresh databases, while the migration adds it on older databases. The Dockerfiles, Compose service order, canonical Kubernetes manifests, deployment script, pinned tool versions, and manual-only release workflow were reviewed and retained.

The focused frontend review found a cohesive reservation floor plan boundary and genuinely duplicated currency and table styles, now extracted. The remaining large page modules own intertwined form and request state; further splits would add indirection without a clearer independent responsibility. The backend review addressed duplicate media lookup and dense branch management code; reservation, session, checkout, inventory, and authorization logic was left intact because its active API suites already exercise critical behavior and no safe behavior-preserving simplification was identified. The original `fmt` utility formats differently and was retained. No supported dependency, API contract, database schema, or workflow was removed.

Phase 2 refactoring is complete within the reviewed scope. Phase 3 application verification is recorded in `PHASE3_VERIFICATION.md`. Release publication and Minikube deployment remain separate, manual, unverified operations. To resume after this handoff, run `git switch chore/phase2-maintainability`, inspect `git status --short --branch` and draft PR #9, and confirm its latest Frontend, Backend, and Cypress jobs passed. PR #9 still depends on unmerged Phase 1 PR #8 and targets `chore/phase1-verified-ci-baseline`; preserve that base until Phase 1 is merged or retarget carefully afterward.

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

Final implementation head `5f5c21e2d46936a711c616c069efa42d370d0da1` passed all three GitHub jobs in [run #52](https://github.com/676767-with-friend/Boardly-web/actions/runs/42997935362). The local final Vite build and full Vitest coverage run passed; coverage was 86.13% statements, 80.94% branches, 83.23% functions, and 88.29% lines. See `PHASE3_VERIFICATION.md` for the final matrix and limits.

## Known limits and existing issues

- Maven is not installed locally and Docker Desktop's daemon was unavailable in Phase 1; backend and Cypress will need GitHub Actions unless this environment changes.
- Phase 1 documents a pre-existing disabled auth logout test. This refactor does not change auth behavior.
- Image publication and Minikube deployment remain manual-only and unverified.
