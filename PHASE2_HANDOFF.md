# Phase 2 handoff

## Branch and baseline

- Branch: `chore/phase2-maintainability`, based on verified Phase 1 commit `4e9628df94ec59e4eb1c888e6c2bb9da1ecffed2`.
- Phase 1 remains unmerged in draft [PR #8](https://github.com/676767-with-friend/Boardly-web/pull/8). Its [final CI run](https://github.com/676767-with-friend/Boardly-web/actions/runs/42956208466) passed frontend, backend, and Cypress. Phase 2 is draft [PR #9](https://github.com/676767-with-friend/Boardly-web/pull/9), targeting the Phase 1 branch.
- Earlier implementation commits: `db0dab2e5b1b3be00957400099bd938209120fc2`, `4b2a300ab6d7e3264685317a89d28c16a17ade2e`, and `8ca9dc8830b50495e3f0cd826ff0e07fcefcac8b`.

## Continuation from verified checkpoint

- The previous Phase 2 head `75866cfeda645bc6bbcaa57312109732b31cda65` passed all three jobs in [PR #9 CI run #48](https://github.com/676767-with-friend/Boardly-web/actions/runs/42958784133). The work below continues from that commit; Phase 1 remains unmerged.
- Current implementation commit: `1966dfc10b1732598086e8b2d765ece700841321` (batch 5); previous implementation commit `6ef026ffb634301728e9bdd18ff4e8d548bd62d7` (batch 4). GitHub CI is pending for these commits.
- This is a **Phase 2 checkpoint**, with broader page cleanup and legacy test coverage triage still open.

### Batch 4 — reservation floor plan

`ReservationPage` now imports `ReservationFloorPlan.tsx`, which owns the existing zone grouping, table buttons, and selection appearance. This gives the stateful reservation wizard a clear UI boundary without changing classes, text, props, routes, or API calls. `ReservationFloorPlan.test.tsx` checks displayed zone/table order and selection. The existing reservation page suite still exercises the full wizard.

Verification at `6ef026f`: local focused Vitest run passed (13/13 tests across the new component and existing reservation page suite); local Vite production build passed; `git diff --check` passed. GitHub frontend, backend, and Cypress checks have not yet run for this commit.

### Batch 5 — obsolete legacy manifests

Removed `Tests/10-postgres.yaml`, `Tests/20-backend.yaml`, and `Tests/30-frontend.yaml`. They conflicted with the canonical `k8s/` resources, while the workflow, deployment script, Compose, Dockerfiles, and documented deployment commands use only `k8s/`. Updated `README.md` and `Tests/README.md` accordingly. No deployed resources, schema, or runtime configuration changed. Git history retains the removed examples.

Kept `Tests/AdminOperationsApiTests.java`: it is outside Maven's test tree and overlaps the active `ManagementAdminApiTests`, `ManagementApiTests`, and customer self-service suites, but exact coverage has not been fully reconciled. It must not be counted as passing CI coverage. Decide whether to migrate any unique assertions in a future focused batch.

Verification at `1966dfc`: repository reference search confirmed no active path uses `Tests/*.yaml`; `git diff --check` passed. No local runtime test was needed for deletion of inactive examples. GitHub CI for the final implementation commit is pending.

## Remaining cleanup and resume steps

This is still a bounded Phase 2 checkpoint. In priority order: (1) verify all three PR checks for the latest implementation and documentation heads; (2) compare the standalone Java test's assertions with active Maven suites and migrate only unique coverage; (3) select another cohesive component or logic boundary in a large frontend page if the benefit justifies the change; (4) review the notification schema/migration compatibility separately before any database edit.

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
