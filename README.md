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

## Kubernetes

Jenkins creates the database ConfigMap from `database/Boardly_schema.sql` and `database/seed-dev.sql`, then applies `k8s/00-namespace.yaml` through `k8s/30-frontend.yaml`. The cluster needs Docker image registry credentials, `kubectl`, and a configured Kubernetes context.

The `Tests/` manifests are retained as historical test fixtures; production deployment uses `k8s/`.
