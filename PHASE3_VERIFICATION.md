# Phase 3 verification

## Scope and reference

Phase 2 is draft [PR #9](https://github.com/676767-with-friend/Boardly-web/pull/9), based on the still-open Phase 1 [PR #8](https://github.com/676767-with-friend/Boardly-web/pull/8). The last application implementation head, `5f5c21e2d46936a711c616c069efa42d370d0da1`, passed all three jobs in [CI run #52](https://github.com/676767-with-friend/Boardly-web/actions/runs/42997935362). The run included the reconciled Java tests, shared frontend formatting, and management service readability changes. This file records observed checks, not a guarantee of all behavior.

## Results

| Check | Observed result | Scope and limit |
| --- | --- | --- |
| Frontend production build | Passed locally (`node node_modules/vite/bin/vite.js build`) and in CI run #52 | Vite compiled the production UI. |
| Complete frontend tests and coverage | Passed locally (`node node_modules/vitest/vitest.mjs run --coverage`) and in CI run #52 | Local coverage: 86.13% statements, 80.94% branches, 83.23% functions, 88.29% lines. Existing page, route, auth, cart, and API-mock suites ran. |
| Complete backend Maven verification | Passed in CI run #52 (`mvn -B clean verify`) | Java 21, isolated PostgreSQL 16, base schema, and seed. Maven and an isolated local database were unavailable here. The new inventory and fresh-checkout branch-scope assertions ran in this job. |
| Cypress end-to-end | Passed in CI run #52 | CI built both Docker images and ran the Cypress suite against an isolated Compose stack. It covers login and customer shopping, product, cart, and checkout journeys. It does not exhaustively exercise staff and administrator UI flows. |
| Compose configuration | Passed locally (`docker compose config --quiet`) | Validates Compose configuration; local Docker image builds and stack startup could not run because the Docker daemon is unavailable. CI's Cypress job built and started the stack successfully. |
| Workflow, Compose, and Kubernetes YAML | Passed local SnakeYAML 2.2 parsing of both workflows, `compose.yaml`, and every canonical `k8s/*.yaml` document | Syntax parsing is not GitHub Actions or Kubernetes semantic validation. The CI workflow executed successfully in run #52. |
| Deployment shell script | Passed `bash -n .github/scripts/deploy.sh` locally | Syntax only; no release was dispatched. |
| Kubernetes manifests | Static YAML parsing passed; `kubectl create --dry-run=client --validate=false -f k8s/ -o name` could not complete | The configured Kubernetes API at `127.0.0.1:65258` refused connections, including discovery needed for client dry-run. No manifests were applied. |
| Reference and diff review | `git diff --check` passed; repository search found no active Jenkins or `Tests/` dependency | Active CI and release files remain GitHub Actions. Historical handoff text retains Jenkins and removed-file references for context. |
| Visual comparison | Could not run locally | The preview at `http://localhost:8443/` was unreachable and there is no available baseline screenshot. Existing component tests and CI Cypress exercise behavior, but they do not establish pixel equivalence. |

## Flow coverage and remaining limits

Customer account/authentication, catalog, reservation, notification, cart, checkout, and order behavior are exercised by the frontend suites and backend API tests. Staff check-in, live tables, sessions, inventory, and branch scoping are exercised by the active management, reservation, session, and inventory API suites; manager and administrator permissions, validation, and management responses are exercised by `ManagementApiTests` and `ManagementAdminApiTests`. The new tests cover inventory for a newly created product and visibility of a fresh checkout order for assigned staff versus another branch and an administrator. The Cypress suite supplies an additional full-stack customer path, not a full UI journey for every role.

The pre-existing `@Disabled` logout test in `AuthSessionApiTests` records a separate session-revocation bug; it was neither changed nor enabled for this refactor. Publication, registry access, the self-hosted Minikube runner, Kubernetes deployment, and in-cluster smoke checks remain unverified and opt-in under `workflow_dispatch`. The notification migration creates a missing table but does not reconcile a different pre-existing table shape; that would require a separately reviewed functional migration. No database schema or data was changed.
