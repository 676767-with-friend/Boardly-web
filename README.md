# Boardly

Boardly is a full-stack board game store and cafe system. Customers can manage accounts, browse products, place pickup orders, and reserve tables. Staff handle walk-ins, check-ins, sessions, checkout, and inventory, while managers and administrators maintain tables, branches, products, users, and staff.

## Technology Stack

- Frontend: React 19, TypeScript, Vite 8, and Tailwind CSS 4
- Backend: Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA, and Maven
- Database: PostgreSQL 16
- Testing: JUnit, Spring MockMvc, JaCoCo, Vitest, React Testing Library, and Cypress
- Delivery: Docker Compose, GitHub Actions, and Kubernetes manifests

## Prerequisites

For the recommended setup, install Docker with Docker Compose.

For manual development, also install Java 21, Maven 3.9+, Node.js 22, and pnpm 10.34.3. Kubernetes deployment additionally requires `kubectl` and access to the existing Minikube cluster.

## Quick Start

From the repository root:

```powershell
docker compose up --build
```

Open:

- Application: `http://localhost:8443`
- Backend health through Nginx: `http://localhost:8443/api/health`
- Backend health directly: `http://localhost:8080/api/health`

Stop the stack without deleting its database:

```powershell
docker compose down
```

Demo accounts are defined in `database/seed-dev.sql` and are intended only for isolated development environments.

## Development Setup

Start PostgreSQL and apply the notification migration:

```powershell
docker compose up -d db
docker compose run --rm db-migrate
```

Start the backend:

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE="dev"
$env:DB_URL="jdbc:postgresql://localhost:5433/boardly_db"
$env:DB_USERNAME="boardly"
$env:DB_PASSWORD="boardly"
$env:JWT_SECRET="replace-with-at-least-32-development-characters"
mvn spring-boot:run
```

In another terminal, start the frontend:

```powershell
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The frontend runs on `http://localhost:8443` and proxies `/api` to the backend on port `8080`.
The environment examples use these local ports and the same `/api` proxy. Set the backend example's placeholder password to `boardly` only for the local Compose database; use separate credentials for any other database.

On a fresh Compose database, `database/Boardly_schema.sql` creates the notification table. The migration in `database/migrations/001-create-notifications.sql` adds it to an older database that does not have the table. Both paths are retained. The migration's `IF NOT EXISTS` clauses do not repair an existing table with a different structure; that case requires a separately reviewed data migration. Do not delete the Compose volume to resolve a schema mismatch.

## Testing

Backend tests require Java 21 and an isolated PostgreSQL 16 database initialized with `database/Boardly_schema.sql` and `database/seed-dev.sql`. For example, set `BOARDLY_DB_PORT=55433` and run `docker compose -p boardly-test up -d db`, then set `DB_URL=jdbc:postgresql://localhost:55433/boardly_db`, `DB_USERNAME=boardly`, `DB_PASSWORD=boardly`, `SPRING_PROFILES_ACTIVE=test`, and a test-only `JWT_SECRET`. Do not point tests at a shared or production database. Then run:

```powershell
cd backend
mvn -B clean verify
```

The JaCoCo report is written to `backend/target/site/jacoco/index.html`.

Run the frontend checks with pinned pnpm:

```powershell
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm test:coverage
```

The frontend coverage report is written to `frontend/coverage/index.html`.

Run Cypress only after the complete Docker Compose stack is healthy. Keep the application stack on its default port 8443 and the isolated backend test database in a separate project/port:

```powershell
cd frontend
corepack pnpm exec cypress run
```

## CI/CD

- `.github/workflows/ci.yml` validates pushes and pull requests targeting `main`; while Phase 1 PR #8 remains open, it also validates pull requests targeting `chore/phase1-verified-ci-baseline`. Its existing check names remain `Frontend (build + Vitest)`, `Backend (mvn verify)`, and `E2E (Cypress)`. It builds the frontend, runs Vitest with coverage, builds/tests the backend against an isolated PostgreSQL service, and runs Cypress against a Compose stack. Test reports, coverage, Cypress screenshots/videos, and failure logs are uploaded when available. Pull requests need no registry or deployment credentials.
- `.github/workflows/release.yml` runs only when a maintainer explicitly starts **Publish and deploy** with **Run workflow** on `main` in the Actions tab. It refuses publication unless the exact `main` commit has a successful push-triggered `CI` run with all three named jobs passing. It then builds and pushes both Docker images to the existing configured registry, tagged with that commit SHA, and deploys those tags to Minikube with in-cluster HTTP smoke checks. A run requested on another ref skips publication. No release has been run or verified.
- `backend/Dockerfile`, `frontend/Dockerfile`, and `compose.yaml` build the local application images and runtime stack.

Configure the repository secret `IMAGE_REGISTRY` with the same registry host/path used by the former pipeline (for example, `registry.example.com/team`, without an image name or trailing slash). Configure repository secrets `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `K8S_DB_USERNAME`, `K8S_DB_PASSWORD`, and `K8S_JWT_SECRET`; the JWT secret must be at least 32 bytes. The release workflow uses only `contents: read` and `actions: read` permissions and does not require a GitHub Packages token. Restrict who can push to `main` and configure approval/protection rules on the `minikube` GitHub Environment as appropriate.

The deployment job requires an **authorized Linux self-hosted GitHub Actions runner** with Bash, `kubectl`, a working kubeconfig whose current context is `minikube`, network access to that Minikube API and to the existing image registry, and permission to create/update the resources in `boardly`. A GitHub-hosted runner cannot be assumed to reach a private/local Minikube cluster. No runner is provisioned here; if someone manually requests a release before one is configured, publication can succeed but deployment will remain queued. Do not store kubeconfig or live credentials in this repository.

## Local Kubernetes Deployment

Use the canonical manifests in `k8s/`. The obsolete, conflicting copies previously stored in `Tests/` were removed; Git history retains them.

First confirm that the active context is a disposable local cluster. Build and load local images:

```powershell
kubectl config current-context
docker build -t boardly-backend:local ./backend
docker build -t boardly-frontend:local -f frontend/Dockerfile .
minikube image load boardly-backend:local boardly-frontend:local
```

Create the `boardly` namespace, a `boardly-secret` containing `DB_USERNAME`, `DB_PASSWORD`, and a `JWT_SECRET` of at least 32 bytes, and a `boardly-db-init` ConfigMap from the SQL files under `database/`. Do not commit these credentials.

Apply the manifests in dependency order:

```powershell
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/10-postgres.yaml
kubectl -n boardly rollout status deployment/boardly-db --timeout=180s
kubectl apply -f k8s/15-db-migrate.yaml
kubectl -n boardly wait --for=condition=complete job/boardly-db-migrate --timeout=120s
kubectl apply -f k8s/20-backend.yaml
kubectl apply -f k8s/30-frontend.yaml
kubectl -n boardly rollout status deployment/boardly-backend --timeout=180s
kubectl -n boardly rollout status deployment/boardly-frontend --timeout=120s
kubectl -n boardly port-forward service/frontend 8443:80
```

Phase 5 previously verified these manifests locally with Minikube; Phase 1 did not re-run deployment. Production or shared-cluster deployment is outside this guide.

## Troubleshooting

- Docker is unavailable: start Docker Desktop and confirm `docker version` succeeds.
- PostgreSQL is unavailable: run `docker compose ps` and inspect `docker compose logs db`.
- Backend startup fails: check the database variables, schema initialization, Java 21, and the 32-byte minimum for `JWT_SECRET`.
- Nginx reports an upstream/DNS error: confirm the backend container is healthy before testing the frontend proxy.
- Kubernetes shows `ImagePullBackOff`: load the local images into Minikube or configure the intended registry and pull secret.
- A variable is missing: compare the runtime environment with `backend/.env.example` and `frontend/.env.example`; never commit real secrets.

## Project Version

**Boardly Project Version: 1.2**

This version includes the integrated frontend and backend improvements, reservation and session management fixes, branch location support, automated testing, and CI/CD enhancements.
