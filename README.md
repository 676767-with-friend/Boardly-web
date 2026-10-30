# Boardly

Boardly is a board-game shop and cafe: customers can shop and reserve tables, while staff manage live tables, sessions, reservations, orders, and checkout.

## Run with Docker Compose

Requirements: Docker Desktop with Compose.

```powershell
docker compose up --build
```

Open <http://localhost:8443>. The backend is at <http://localhost:8080> and its health endpoint is <http://localhost:8080/api/health>.

Stop without deleting the database:

```powershell
docker compose down
```

To intentionally delete local development data, use `docker compose down -v`.

## Development accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@boardly.com` | `customer` |
| Staff | `staff@boardly.com` | `staff` |
| Manager | `manager@boardly.com` | `manager` |
| Admin | `admin@boardly.com` | `admin` |

These accounts are for local development only.

## Run locally

Start PostgreSQL first:

```powershell
docker compose up -d db
```

Backend:

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE="dev"
$env:DB_URL="jdbc:postgresql://localhost:5433/boardly_db"
$env:DB_USERNAME="boardly"
$env:DB_PASSWORD="boardly"
$env:JWT_SECRET="boardly-local-development-jwt-secret-at-least-32-characters"
mvn spring-boot:run
```

Frontend:

```powershell
cd frontend
pnpm install
pnpm dev
```

## Checks

```powershell
cd frontend; npm ci; npm run build; npm test
cd ../backend; mvn -B verify
```

GitHub Actions runs the frontend checks, backend tests, and Cypress. Jenkins additionally builds/pushes both images and deploys the manifests in `k8s/` to Kubernetes on `main`.

## Backend tests and coverage

The backend tests are integration tests that need PostgreSQL with the schema and dev seed loaded, which `compose.yaml` does automatically.

```powershell
docker compose up -d db
```

Run the whole backend suite in a container (no local Java or Maven needed). Run it from the repository root; it joins the `boardly_default` network that Compose creates:

```powershell
docker run --rm --network boardly_default `
  -v "${PWD}/backend:/app" -v boardly-m2:/root/.m2 -w /app `
  -e DB_URL=jdbc:postgresql://db:5432/boardly_db `
  -e DB_USERNAME=boardly -e DB_PASSWORD=boardly `
  -e JWT_SECRET=local-test-jwt-secret-at-least-32-characters-long `
  maven:3.9-eclipse-temurin-21 mvn -B verify
```

Expected result: `BUILD SUCCESS` with no failing tests. The first run downloads dependencies and is slower; `boardly-m2` caches them for later runs.

If Java 21 and Maven are installed locally, use the environment variables from "Run locally" (database on `localhost:5433`) and run `mvn -B verify` in `backend/`.

### Coverage report

JaCoCo records coverage while the tests run and writes a report afterwards. It is report-only: there is no minimum threshold, so it never fails the build.

Open this file in a web browser (not in a code editor, which shows the raw HTML):

```text
backend/target/site/jacoco/index.html
```

Click through package, class, method, then the source view. In the source view, green lines are covered, yellow lines have only some branches covered, and red lines were never run. The most useful columns are **Missed Instructions** and **Missed Branches**; branches are mostly `if`/`else` error paths. `jacoco.csv` and `jacoco.xml` in the same folder hold the same numbers for tools. `backend/target/` is git-ignored.

## Kubernetes

Jenkins creates the database ConfigMap from `database/Boardly_schema.sql` and `database/seed-dev.sql`, creates the `boardly-registry` image-pull secret from its registry credentials, then applies `k8s/00-namespace.yaml` through `k8s/30-frontend.yaml`. Configure the Jenkins `boardly-registry-url` credential as the registry host and optional namespace (for example, `docker.io/yourorg`, without a scheme), and `boardly-registry-creds` as a username/password credential. The cluster also needs `kubectl` and a configured Kubernetes context.

The `Tests/` manifests are retained as historical test fixtures; production deployment uses `k8s/`.
