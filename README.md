# Boardly

**Current Version: v1.1.0**

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
| Manager | `manager@boardly.com` | `manager` |
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
- **Staff:** customer/table operations (walk-in sessions, reservation check-in, session checkout preview and payment confirmation, orders, products, and customer lookup) on assigned branches without adding or removing physical tables.
- **Manager:** all Staff operational capabilities plus assigned-branch physical-table management (add, edit, and deactivate physical tables, zone alignment, and capacity settings).
- **Admin:** full system permissions including all Staff and Manager capabilities, branch management, staff account creation and role assignment (Staff vs Manager), product catalog, global inventory, and back-office administration.

## Planned Improvements / Future Work

Future roadmap items following the `v1.1.0` role model implementation:

- Multi-branch manager assignments with per-branch granular permission overrides.
- Advanced reporting and analytics dashboards (revenue per table, peak hour utilization, popular board games).
- Automated table turn notifications and customer SMS/email reservation reminders.
- Split-bill payments and partial payment settlements during session checkout.

## Versioning

Boardly uses Semantic Versioning (`MAJOR.MINOR.PATCH`). Current release is `v1.1.0`.
