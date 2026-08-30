# Boardly

**Current Version: v1.0.0**

Boardly is a full-stack board game store and cafe application for shopping, reservations, store operations, and administration.

## Quick Start with Docker

Requirements: Git and Docker with Docker Compose.

```powershell
docker compose up --build
```

Open `http://localhost:8443`. No local PostgreSQL, Java, Maven, Node, or pnpm installation is required.

Stop the application without deleting data:

```powershell
docker compose down
```

## Development Login

Development/demo use only. PostgreSQL stores these passwords as BCrypt hashes.

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@boardly.com` | `customer` |
| Staff | `staff@boardly.com` | `staff` |
| Admin | `admin@boardly.com` | `admin` |

## Reset the Docker Database

Only when intentionally deleting all local Docker development data:

```powershell
docker compose down -v
docker compose up --build
```

Warning: `docker compose down -v` permanently removes the Docker development database.

## Manual Development

Start only the Docker PostgreSQL service:

```powershell
docker compose up -d db
```

Run the backend with Java 21 and Maven:

```powershell
cd backend

$env:SPRING_PROFILES_ACTIVE="dev"
$env:DB_URL="jdbc:postgresql://localhost:5433/boardly_db"
$env:DB_USERNAME="boardly"
$env:DB_PASSWORD="boardly"
$env:JWT_SECRET="boardly-local-development-jwt-secret-at-least-32-characters"

mvn spring-boot:run
```

Backend: `http://localhost:8080`

Health: `http://localhost:8080/api/health`

Run the frontend with Node.js and pnpm:

```powershell
cd frontend
pnpm install
pnpm dev
```

Frontend: `http://localhost:8443`

## Current Implementation

- **Customer:** shop, account, cart, pickup checkout, orders, and reservations.
- **Staff:** assigned-branch customer, table, reservation, checkout, and inventory operations.
- **Admin:** current global products, inventory, users, staff, branches, tables, and store administration.

## Planned Improvements / Future Work

The proposed role model is future work and is **not implemented in v1.0.0**:

- **Staff:** customer/table operations without adding or removing physical tables.
- **Manager:** future role with all Staff capabilities plus assigned-branch physical-table management.
- **Admin:** future full system permissions including Staff and Manager capabilities.

Manager does not currently exist.

## Versioning

Boardly currently uses `v1.0.0`. Future releases should update the version using Semantic Versioning (`MAJOR.MINOR.PATCH`).
