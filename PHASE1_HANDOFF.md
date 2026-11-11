# Phase 1 handoff

## Current architecture and baseline

Boardly is a React 19/Vite 8 frontend served by Nginx, a Java 21/Spring Boot 3.3.5 API, and PostgreSQL 16. The frontend calls `/api` through the Nginx proxy in the container stack. Maven builds the backend; pnpm 10.34.3 builds the frontend from `frontend/pnpm-lock.yaml`. `compose.yaml` starts PostgreSQL, applies the notification migration, then starts the API and UI. The canonical cluster manifests are in `k8s/`; `Tests/` contains historical copies.

Before editing, the working tree was clean. Existing validation was attempted before and after the migration with the same local limitations:

| Check | Baseline before changes | After changes |
| --- | --- | --- |
| Frontend `pnpm build`, `pnpm test:coverage` | Blocked: the local pnpm shim could not verify/fetch pinned pnpm 10.34.3; direct installed Vite/Vitest binaries failed to start due to Windows `spawn EPERM` (Vite also reported an unavailable Tailwind native binding). | Same environment limitation; no frontend source or lockfile changed. |
| Backend `mvn -B clean verify` against an isolated PostgreSQL database | Not run: Maven is not installed and the Docker daemon is unavailable. | Not run for the same reasons; no backend runtime behavior changed. |
| Docker builds and Compose end-to-end tests | Not run: Docker client is installed, but Docker Desktop's Linux daemon is unavailable. | Not run for the same reason. `docker compose config -q` passed. |
| Kubernetes validation | Current context is `docker-desktop`; its API is unreachable. No Minikube deployment was attempted. | Same; manifest review was static only. |

No application test failure was observed locally. The local tool/runtime failures above predate this change. Static checks passed: both workflow files and all canonical Kubernetes manifests parsed as YAML with SnakeYAML 2.2; `bash -n .github/scripts/deploy.sh`, `docker compose config -q`, and `git diff --check` passed. A GitHub Actions-specific linter was unavailable. Registry publication and deployment have **not** been run.

The [last CI run on the unchanged `main` commit](https://github.com/676767-with-friend/Boardly-web/actions/runs/42537999536) passed frontend, backend, and Cypress on 9 November 2026. That run predates this migration and is evidence for the pre-Phase 1 remote baseline only. A pull-request run of the Phase 1 changes is still needed before Phase 2 can start.

## Jenkins migration map

| Former Jenkins responsibility | GitHub Actions replacement |
| --- | --- |
| Checkout and commit-based image tag | Checkout in `ci.yml` and `release.yml`; release images use the full validated commit SHA. |
| Start and initialize test PostgreSQL | `CI / Backend (mvn verify)` uses a PostgreSQL 16 service, schema, and seed; E2E uses its isolated Compose database. |
| Backend build, tests, JaCoCo, JUnit XML | `CI / Backend (mvn verify)` runs `mvn -B clean verify` and uploads test and coverage reports. |
| Frontend build, Vitest, coverage, JUnit XML | `CI / Frontend (build + Vitest)` uses Node 22 and frozen pnpm 10.34.3, then uploads reports and coverage. |
| Docker image builds | `CI / E2E (Cypress)` builds both images for integration checks; `Publish Docker images` rebuilds validated source for publication. |
| Registry login and push on `main` | A maintainer must manually dispatch `Publish and deploy` on `main`. Before publication, it checks that the exact commit passed the frontend, backend, and Cypress jobs in the latest push-triggered `CI` run. It uses the existing registry path supplied by the `IMAGE_REGISTRY` secret. |
| Minikube secrets, ConfigMap, database, migration, API/UI rollout | `Deploy to Minikube` runs on an authorized self-hosted runner using `.github/scripts/deploy.sh` and the existing `k8s/` manifests. The old default-ServiceAccount pull-secret patch is obsolete because both Deployments already specify `imagePullSecrets`. |
| In-cluster smoke test | The deployment script checks backend health, frontend HTTP, and proxied backend health from a temporary curl pod. |
| Failure artifacts and cleanup | CI uploads test reports, coverage, Cypress artifacts, and Compose failure logs. Compose stops without deleting its volume; the release job removes its temporary Docker login configuration and secret file. GitHub Actions replaces Jenkins's checkout cleanup, timestamps, and build history. |

The existing branch-protection check names remain `Frontend (build + Vitest)`, `Backend (mvn verify)`, and `E2E (Cypress)`; no check rename is required.

## Setup still required

Image publication and deployment are opt-in through `workflow_dispatch` on `main`; no push, pull request, or successful CI run starts them automatically. Set repository secret `IMAGE_REGISTRY` to the existing registry host/path. Its actual value was stored in Jenkins credentials and is not present in the repository, so it could not be verified here. Set repository secrets `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `K8S_DB_USERNAME`, `K8S_DB_PASSWORD`, and `K8S_JWT_SECRET` with the existing authorized values. Protect the `minikube` GitHub Environment as appropriate.

Attach an authorized Linux self-hosted runner to this repository. It needs Bash, `kubectl`, a kubeconfig with current context `minikube`, network access to the private/local cluster and image registry, and permission to manage the `boardly` namespace. No runner label, credential, cluster access, registry, or infrastructure was created in Phase 1. A GitHub-hosted runner is used for validation and publication only. A manually requested release will leave deployment queued until a suitable runner exists. Verify a controlled release only after this setup is reviewed.

## Phase 2 candidates

- Decide whether to move `Tests/AdminOperationsApiTests.java` into Maven's test tree and retire the legacy Kubernetes copies in `Tests/` after confirming their history is no longer needed.
- Remove the empty root `package-lock.json` if no external tooling relies on it; `frontend/pnpm-lock.yaml` is the actual dependency lockfile.
- Break up the largest frontend feature files, starting with `ReservationPages.tsx` and `AdminPages.tsx`, while preserving routes and behavior.
- Reconcile the duplicated notification table definition in the base schema and migration after checking upgrade paths for existing databases.

These are recommendations only; no application refactor or database schema change was made in Phase 1.
