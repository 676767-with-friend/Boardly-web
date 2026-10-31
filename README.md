# Boardly

Boardly is a full-stack board game store and cafe system. Customers can manage accounts, browse products, place pickup orders, and reserve tables. Staff handle walk-ins, check-ins, sessions, checkout, and inventory, while managers and administrators maintain tables, branches, products, users, and staff.

## Technology Stack

- Frontend: React 19, TypeScript, Vite 8, and Tailwind CSS 4
- Backend: Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA, and Maven
- Database: PostgreSQL 16
- Testing: JUnit, Spring MockMvc, JaCoCo, Vitest, React Testing Library, and Cypress
- Delivery: Docker Compose, GitHub Actions, Jenkins, and Kubernetes manifests

## Prerequisites

For the recommended setup, install Docker with Docker Compose.

For manual development, also install Java 21, Maven 3.9+, Node.js 22, and pnpm 10.34.3. Kubernetes deployment additionally requires `kubectl`, Docker, and a disposable local cluster such as Minikube.

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

Start PostgreSQL:

```powershell
docker compose up -d db
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

## Testing

Backend tests require Java 21 and an isolated PostgreSQL 16 database initialized with `database/Boardly_schema.sql` and `database/seed-dev.sql`. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and a test-only `JWT_SECRET`, then run:

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

Run Cypress only after the complete Docker Compose stack is healthy:

```powershell
cd frontend
corepack pnpm exec cypress run
```

## CI/CD

- `.github/workflows/ci.yml` builds and tests both applications and runs Cypress against Docker Compose. Local commands are verified; a current remote GitHub Actions run has not been verified.
- `Jenkinsfile` builds, tests, publishes commit-tagged images, and deploys through an authorized Kubernetes context. A current remote Jenkins run has not been verified.
- `backend/Dockerfile`, `frontend/Dockerfile`, and `compose.yaml` build the local application images and runtime stack.

Do not treat local success as proof that remote credentials, registries, or deployment agents are configured correctly.

## Local Kubernetes Deployment

Use only the canonical manifests in `k8s/`. The manifests in `Tests/` are legacy artifacts and must not be applied alongside them.

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

Phase 5 verified these manifests locally with Minikube. Production or shared-cluster deployment is outside this guide.

## Troubleshooting

- Docker is unavailable: start Docker Desktop and confirm `docker version` succeeds.
- PostgreSQL is unavailable: run `docker compose ps` and inspect `docker compose logs db`.
- Backend startup fails: check the database variables, schema initialization, Java 21, and the 32-byte minimum for `JWT_SECRET`.
- Nginx reports an upstream/DNS error: confirm the backend container is healthy before testing the frontend proxy.
- Kubernetes shows `ImagePullBackOff`: load the local images into Minikube or configure the intended registry and pull secret.
- A variable is missing: compare the runtime environment with `backend/.env.example` and `frontend/.env.example`; never commit real secrets.

## Project Version

The frontend package is `1.0.0`; the backend artifact is `0.0.1-SNAPSHOT`. This repository currently has no Git release tag, so the README does not claim a separate release version.
