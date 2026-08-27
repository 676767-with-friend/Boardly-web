# Boardly Full-Stack Refactor & Backend Implementation Prompt

You are working on an existing prototype project named **Boardly**, a Board Game Store + Board Game Café application.

The current frontend was generated/exported from Figma Make and contains a large monolithic `App.tsx` with mock data and simulated frontend behavior.

I also provide an existing PostgreSQL schema file:

- `App.tsx` — current Figma-generated React prototype
- `Boardly_schema.sql` — authoritative PostgreSQL database schema
- Existing Figma project assets/imports — use them if available

## Primary Goal

Refactor this prototype into a maintainable real full-stack application with:

- **Frontend:** React + TypeScript
- **Backend:** Java + Spring Boot
- **Database:** PostgreSQL
- **Database name:** `boardly_db`
- **API style:** REST + JSON

The target architecture must be:

```text
React Frontend
      |
      | REST API / JSON
      v
Spring Boot Backend
      |
      | Spring Data JPA / Hibernate
      v
PostgreSQL
      |
      v
boardly_db
```

React must **never connect directly to PostgreSQL**.

All database access, authentication, permissions, validation, stock operations, reservations, orders, and other business logic must go through Spring Boot.

---

# 1. IMPORTANT: ANALYZE BEFORE MODIFYING

Before writing or changing code:

1. Read the complete existing `App.tsx`.
2. Read the complete `Boardly_schema.sql`.
3. Inspect the existing Figma-generated project structure, packages, assets, CSS/Tailwind configuration, imports, and supporting files.
4. Identify:
   - all pages
   - all reusable UI components
   - all mock data
   - all local frontend state
   - all simulated CRUD operations
   - all hard-coded calculations
   - all customer flows
   - all staff flows
   - all admin flows
5. Map every important frontend data object to the relevant database tables.
6. Produce a concise implementation plan and proposed directory structure before performing large refactors.

Do NOT invent a second database design.

`Boardly_schema.sql` is the authoritative database schema.

If you find a genuine mismatch between the UI requirements and the SQL schema:

- do not silently change the existing database;
- explain the mismatch;
- propose a separate migration SQL file;
- make the smallest reasonable change;
- document why the migration is necessary.

---

# 2. CURRENT APP.TSX PROBLEMS TO REFACTOR

The Figma prototype currently contains responsibilities that must not remain inside one `App.tsx`, including:

- page navigation
- customer pages
- staff pages
- admin pages
- authentication simulation
- cart state
- reservation state
- product data
- branch data
- store table data
- staff data
- user data
- order mock data
- dashboard mock data
- UI components
- business calculations
- fake login behavior

Do not rewrite the visual design from scratch.

Preserve the current Figma UI, spacing, typography, responsive behavior, Tailwind classes, colors, layouts, dialogs, cards, tables, and user flows as closely as reasonably possible.

The goal is to **separate presentation from real application logic**, not redesign the application.

Before removing the original implementation, preserve it temporarily as a reference, for example:

```text
src/legacy/App.figma.tsx
```

Remove it only after feature parity is verified.

---

# 3. TARGET PROJECT STRUCTURE

Organize the repository approximately as follows.

```text
boardly/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   └── providers.tsx
│   │   │
│   │   ├── layouts/
│   │   │   ├── CustomerLayout.tsx
│   │   │   ├── StaffLayout.tsx
│   │   │   └── AdminLayout.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── navigation/
│   │   │   └── common/
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── branches/
│   │   │   ├── reservations/
│   │   │   ├── account/
│   │   │   ├── staff/
│   │   │   └── admin/
│   │   │
│   │   ├── services/
│   │   │   ├── apiClient.ts
│   │   │   └── ...
│   │   │
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   └── assets/
│   │
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/boardly/
│       │   │   ├── BoardlyApplication.java
│       │   │   │
│       │   │   ├── config/
│       │   │   ├── security/
│       │   │   ├── common/
│       │   │   │   ├── exception/
│       │   │   │   └── response/
│       │   │   │
│       │   │   ├── auth/
│       │   │   ├── user/
│       │   │   ├── product/
│       │   │   ├── branch/
│       │   │   ├── reservation/
│       │   │   ├── session/
│       │   │   ├── cart/
│       │   │   ├── order/
│       │   │   ├── payment/
│       │   │   ├── inventory/
│       │   │   └── dashboard/
│       │   │
│       │   └── resources/
│       │       ├── application.yml
│       │       └── application-dev.yml
│       │
│       └── test/
│
├── database/
│   ├── Boardly_schema.sql
│   └── seed-dev.sql
│
├── .gitignore
└── README.md
```

This is a guideline, not an excuse to create unnecessary files.

Prefer **package-by-feature** in Spring Boot.

For example:

```text
product/
├── Product.java
├── ProductRepository.java
├── ProductService.java
├── ProductController.java
├── ProductResponse.java
└── ProductMapper.java
```

Each module should have a clear responsibility.

---

# 4. FRONTEND REQUIREMENTS

Use:

- React
- TypeScript
- Vite if the current project can be migrated without breaking the Figma styling
- React Router
- existing Tailwind/CSS setup where possible

Do not use `useState<Page>` as the application's router.

Replace the current simulated routing with real URL routes.

Suggested routes:

```text
/
 /shop
 /products/:productId
 /cart
 /checkout
 /orders/:orderNumber/confirmation

 /reserve
 /reservations/:reservationNumber/confirmation

 /login
 /register

 /account
 /account/orders
 /account/reservations

 /stores

 /staff
 /staff/tables
 /staff/check-in
 /staff/orders
 /staff/products
 /staff/users

 /admin
 /admin/tables
 /admin/check-in
 /admin/orders
 /admin/products
 /admin/users
 /admin/staff
 /admin/branches
```

Use nested layouts where appropriate.

Implement route guards for:

```text
CUSTOMER
STAFF
ADMIN
```

A user must not gain admin/staff access simply by entering an admin URL.

Authorization must ultimately be verified by Spring Security on the backend as well.

---

# 5. FRONTEND API LAYER

Create a centralized HTTP layer.

For example:

```text
src/services/apiClient.ts
```

Use an environment variable:

```text
VITE_API_BASE_URL=http://localhost:8080/api
```

Do not scatter hard-coded URLs throughout components.

Components should not contain raw `fetch()` calls everywhere.

Create feature APIs such as:

```text
productsApi
authApi
branchesApi
cartApi
ordersApi
reservationsApi
staffApi
adminApi
```

Provide:

- loading states
- error states
- empty states
- validation feedback

Do not leave fake successful actions where an API call is required.

---

# 6. REMOVE FRONTEND MOCK DATABASES

The following categories of data currently hard-coded in `App.tsx` must eventually come from Spring Boot/PostgreSQL:

```text
PRODUCTS
TABLES
BRANCHES
STAFF_LIST
USERS_DATA
orders
reservations
reviews
dashboard KPIs
branch details
table availability
inventory
```

Do not simply move these constants into another frontend file and call the task complete.

Convert them into real backend API calls.

The existing mock values may be reused as **development seed data** in `seed-dev.sql`.

---

# 7. DATABASE IS THE SOURCE OF TRUTH

Use the tables and relationships defined in `Boardly_schema.sql`.

Do not tell Hibernate to recreate the database.

Spring Boot must use:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

or equivalent YAML configuration.

Do NOT use:

```text
create
create-drop
update
```

against this database.

The existing PostgreSQL schema has already been created separately.

Treat it as authoritative.

Database credentials must come from environment variables.

Example:

```text
DB_URL=jdbc:postgresql://localhost:5432/boardly_db
DB_USERNAME=postgres
DB_PASSWORD=...
JWT_SECRET=...
```

Never commit real credentials.

Provide `.env.example` / configuration documentation.

---

# 8. SPRING BOOT STACK

Use a stable Spring Boot 3.x version compatible with Java 21.

Use Maven unless the current project has a strong reason to use Gradle.

Dependencies should include at least:

```text
Spring Web
Spring Data JPA
Spring Validation
Spring Security
PostgreSQL JDBC Driver
Spring Boot Test
```

Use Java 21.

Avoid unnecessary libraries.

Do not expose JPA entities directly from REST controllers.

Use request/response DTOs.

Use:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL
```

Business logic belongs in the service layer.

Use `@Transactional` for multi-step database operations.

---

# 9. DATABASE ↔ FRONTEND DATA MAPPING

Do not recreate UI-only fields as duplicate database columns when they can be derived.

## Product

The current frontend `Product` model contains fields such as:

```text
category
price
players
playTime
age
rating
reviewCount
stock
image
isNew
salePrice
```

Map them from the normalized schema.

For example:

```text
category
    <- product_categories.name

price
    <- products.base_price

salePrice
    <- products.sale_price

players
    <- products.min_players + products.max_players

playTime
    <- products.min_play_time_minutes
       + products.max_play_time_minutes

age
    <- products.min_age

rating
    <- AVG(product_reviews.rating)

reviewCount
    <- COUNT(product_reviews)

image
    <- product_media where is_primary = true

isNew
    <- derive from products.published_at

stock
    <- derive from branch_product_inventory
```

Return a frontend-friendly `ProductResponse` DTO.

Do not force the React UI to understand normalized database joins.

---

# 10. TABLE STATUS IS DERIVED

The frontend prototype currently contains statuses such as:

```text
available
reserved
occupied
unavailable
```

Do not blindly store all four states in `store_tables`.

Follow the SQL design:

```text
unavailable
    <- store_tables.operational_status

reserved
    <- active reservation overlapping requested/current time

occupied
    <- active play_session

available
    <- operationally available
       AND no active reservation/session conflict
```

Similarly, fields such as:

```text
client
players
checkIn
elapsed
fee
```

belong to the current `play_sessions` context, not the physical `store_tables` record.

Create appropriate backend DTO/query logic.

---

# 11. DERIVED DASHBOARD VALUES

Do not store mock dashboard counters simply because the Figma prototype displays them.

Calculate values such as:

```text
branch table count
branch staff count
reservations today
active sessions
available tables
sales today
user order count
user reservation count
user visit count
last activity
product review count
average rating
available inventory
```

from their source tables.

Use repository queries or dedicated read services.

---

# 12. AUTHENTICATION & AUTHORIZATION

Remove the current demo login logic.

Do NOT determine role from an email string such as:

```text
email contains "admin"
```

Implement real authentication.

Use:

```text
users
roles
permissions
user_roles
role_permissions
auth_sessions
password_reset_tokens
user_consents
staff_branch_assignments
```

Passwords must be hashed using BCrypt or an equivalent secure password encoder.

Never store plain-text passwords.

Recommended authentication design:

```text
short-lived JWT access token
+
refresh/session token
```

Persist only a secure hash/reference for refresh/session tokens in `auth_sessions` where appropriate.

Support:

```text
customer
staff
admin
```

Authorization must be enforced with Spring Security.

Frontend route guards are only for UX.

Backend permission checks are mandatory.

Suggested endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password

GET /api/me
```

Registration should create the user and assign the customer role.

Staff/Admin account creation must be restricted appropriately.

---

# 13. PRODUCT API

Implement an actual product API.

Minimum endpoints:

```text
GET /api/products
GET /api/products/{id}
GET /api/product-categories
```

Product list should support query parameters where reasonable:

```text
category
difficulty
maxPrice
sort
page
size
search
```

For example:

```text
GET /api/products?category=Strategy&difficulty=easy&maxPrice=2000
```

Replace the current frontend-only filtering with API-backed filtering where appropriate.

Do not overcomplicate simple local presentation filtering if server filtering is not necessary.

---

# 14. BRANCH API

Suggested endpoints:

```text
GET /api/branches
GET /api/branches/{branchId}
GET /api/branches/{branchId}/tables
GET /api/branches/{branchId}/games
```

Branch responses can aggregate:

```text
operating hours
amenities
rules
playable games
table count
```

These data already have normalized tables in the database.

---

# 15. RESERVATION FLOW

The existing UI flow is approximately:

```text
Branch
  ↓
Date
  ↓
Time
  ↓
Players
  ↓
Table
  ↓
Confirmation
```

Keep this user experience.

Move availability and booking rules to Spring Boot.

Suggested endpoints:

```text
GET /api/branches/{branchId}/available-tables
POST /api/reservations
GET /api/reservations/me
GET /api/reservations/{reservationNumber}
PATCH /api/reservations/{reservationNumber}/cancel
```

Availability queries must consider:

```text
branch operating hours
booking_blackouts
table operational status
existing reservations
active play sessions
player capacity
```

Never trust the frontend alone to determine that a table is available.

When creating a reservation, re-check availability inside the backend transaction to reduce double-booking risk.

---

# 16. PLAY SESSION / CHECK-IN

Staff/Admin workflows must operate on actual `play_sessions`.

Support:

```text
reservation check-in
walk-in check-in
assign table
checkout
calculate final fee
```

Possible endpoints:

```text
POST /api/staff/reservations/{reservationId}/check-in

POST /api/staff/play-sessions/walk-in

POST /api/staff/play-sessions/{sessionId}/checkout

GET /api/staff/branches/{branchId}/live-tables
```

A walk-in can have:

```text
registered user
OR
guest name/contact
```

Do not store active customer/session information directly on `store_tables`.

---

# 17. CART

Use the database cart model.

Support both:

```text
authenticated customer cart
guest cart
```

For guest carts, use the schema's guest session key design.

Store the guest identifier safely in the browser, e.g. local storage where reasonable.

Suggested endpoints:

```text
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/{itemId}
DELETE /api/cart/items/{itemId}
DELETE /api/cart
```

Do not trust prices sent by React.

When displaying or processing a cart, obtain authoritative current pricing from the database.

---

# 18. CHECKOUT / ORDERS

The React frontend may send:

```text
contact information
fulfillment method
pickup branch if applicable
selected payment method
cart/order intent
```

The backend must calculate and validate:

```text
item prices
subtotal
shipping fee
total
stock availability
```

Do not accept monetary totals calculated by React as authoritative.

Create:

```text
orders
order_items
payments
inventory movements
```

inside proper backend transactions.

Preserve financial snapshots in:

```text
orders.subtotal
orders.shipping_fee
orders.total_amount
order_items.product_name_snapshot
order_items.sku_snapshot
order_items.unit_price
```

---

# 19. INVENTORY

Use:

```text
branch_product_inventory
inventory_movements
```

Do not add a global mutable `products.stock` field.

Available inventory is:

```text
quantity_on_hand - reserved_quantity
```

Stock modifications must create inventory movement history.

Do not allow quantity to become invalid.

For order fulfillment, perform stock checks and reservation/release updates transactionally.

---

# 20. PAYMENT SAFETY

The current project is a prototype.

Do NOT implement fake storage of card numbers.

Never persist:

```text
full card number
CVV
raw card credentials
```

Use the database `payments` model for:

```text
amount
status
payment method
provider_reference
paid_at
```

If no real payment provider has been specified:

- create a clean payment service abstraction;
- allow a development/mock provider only when clearly marked as DEV;
- do not pretend a real production payment integration exists.

---

# 21. STAFF FEATURES

Convert the Figma staff pages into real APIs and backend authorization.

Expected areas:

```text
Staff Dashboard
Live Tables
Check-In
Orders
Products
Users
```

Staff access must be scoped appropriately.

Use `staff_branch_assignments` to determine which branches a staff member can operate.

Do not rely on branch names stored as plain strings in frontend user records.

---

# 22. ADMIN FEATURES

Convert admin pages into real management functions.

Expected areas:

```text
Admin Dashboard
Live Tables
Check-In
Orders
Products
Users
Staff
Branches
```

Admin APIs can include:

```text
product create/update/activate/deactivate
inventory adjustments
user activate/deactivate
staff create/update
staff branch assignment
branch create/update
table/zone management
branch amenities/rules
branch operating hours
```

Prefer deactivation/soft deletion where historical transactions must be retained.

Do not cascade-delete important transaction history.

---

# 23. REACT PRODUCT DETAILS

The current product detail page uses hard-coded fields and currently selects a mock product instead of routing by real ID.

Change it to:

```text
/products/:productId
```

Load the product from:

```text
GET /api/products/{productId}
```

Include:

```text
product information
media gallery
review summary
reviews
stock status
playable branch information where appropriate
```

Do not select a product with something equivalent to:

```text
PRODUCTS[0]
```

---

# 24. IMAGES / MEDIA

Preserve existing Figma image assets.

Create one consistent strategy for product media.

Preferred options:

1. static assets served consistently by the frontend, with DB `media_url` storing stable relative paths; or
2. static resources served by Spring Boot.

Do not leave individual product image imports embedded in business logic.

Document whichever strategy is selected.

Do not implement cloud file storage unless actually necessary.

---

# 25. API RESPONSE DESIGN

Use consistent JSON.

For ordinary successful resource responses, return clear DTOs rather than JPA objects.

For errors, use a consistent error structure such as:

```json
{
  "timestamp": "...",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": {
    "email": "Email is required"
  }
}
```

Implement centralized Spring exception handling with:

```text
@RestControllerAdvice
```

Do not leak stack traces or database details to React.

---

# 26. VALIDATION

Frontend validation is useful for UX.

Backend validation is mandatory.

Use Bean Validation where appropriate:

```text
@NotBlank
@Email
@Size
@Positive
@PositiveOrZero
```

Also respect constraints already enforced in PostgreSQL.

Frontend input must never be treated as trusted data.

---

# 27. CORS

During local development:

```text
React:       http://localhost:5173
Spring Boot: http://localhost:8080
PostgreSQL:  localhost:5432
```

Configure CORS explicitly for the frontend development origin.

Do not use unrestricted production CORS.

---

# 28. DEV SEED DATA

Use the useful mock data currently present in `App.tsx` to create realistic development seed data.

Create:

```text
database/seed-dev.sql
```

Map the Figma data into the normalized schema instead of recreating mock frontend constants.

Seed examples may include:

```text
roles
product categories
products
product media
branches
branch operating hours
amenities
rules
table zones
store tables
table features
branch inventory
playable game library
development users
staff branch assignments
example reviews
example reservations/orders if useful
```

Seed data must be explicitly DEVELOPMENT data.

Do not mix it into production initialization.

If development passwords are seeded, document the test credentials and ensure their stored values are BCrypt hashes, never plaintext database passwords.

---

# 29. IMPORTANT BUSINESS RULES — DO NOT SILENTLY GUESS

Some behaviors may not be fully defined by the Figma prototype.

If these become relevant, explicitly report the ambiguity instead of silently inventing production rules:

### Table pricing
Confirm the final café pricing calculation before implementing a production billing engine.

### Delivery inventory branch
The schema tracks inventory per branch.

If a delivery order—not pickup—must consume stock, determine which branch/warehouse fulfills it.

Do not invent a central warehouse that is not present in the schema.

### Store pickup
Pickup must identify the branch used for inventory reservation.

### Guest reservation
If guest table reservations are supported, validate the required contact fields.

### Product reviews
If verified-purchase reviews are required, this needs a clear business rule.

### Payment provider
Do not choose a payment provider without being asked.

For development-only paths, clearly mark assumptions in the README and keep the design replaceable.

---

# 30. IMPLEMENTATION PHASES

Do not attempt an uncontrolled rewrite of everything at once.

Work incrementally.

## Phase 0 — Analysis

Deliver:

- current architecture analysis
- list of mock data
- page/component inventory
- database ↔ frontend mapping
- target directory structure
- API inventory
- known business-rule ambiguities

Then proceed systematically.

---

## Phase 1 — Frontend Refactor Without Backend Behavior Changes

Refactor the monolithic Figma `App.tsx` into:

```text
routes
layouts
pages/features
reusable components
types
services
```

Introduce React Router.

Maintain visual and behavioral parity using temporary mock adapters where necessary.

The UI should still work after this phase.

---

## Phase 2 — Spring Boot Foundation

Create the Spring Boot application.

Configure:

```text
PostgreSQL
Spring Data JPA
Spring Validation
Spring Security foundation
CORS
global exception handling
environment variables
```

Map JPA entities to the provided SQL schema.

Set:

```text
ddl-auto=validate
```

Start the backend and prove it can connect to `boardly_db`.

Do not proceed while schema validation errors remain unresolved.

---

## Phase 3 — Public Read APIs

Implement:

```text
product categories
products
product details
reviews
branches
branch details
```

Replace frontend mock reads with real backend reads.

First integration milestone:

```text
PostgreSQL
   ↓
Spring Boot
   ↓
GET /api/products
   ↓
React Shop
```

The Shop page must display database products instead of the `PRODUCTS` constant.

---

## Phase 4 — Authentication

Implement:

```text
register
login
logout
refresh/session handling
current user
roles
route security
```

Remove all demo role behavior.

---

## Phase 5 — Cart / Checkout / Orders

Implement database-backed carts, checkout validation, order creation, and inventory reservation.

Do not implement a real payment provider unless configured.

---

## Phase 6 — Reservations / Play Sessions

Implement:

```text
table availability
reservation creation
customer reservation history
staff check-in
walk-in
play session
checkout
```

---

## Phase 7 — Staff / Admin

Connect the remaining Figma management screens to real APIs.

Replace all remaining mock datasets and fake buttons.

---

# 31. TESTING REQUIREMENTS

After each phase:

1. compile frontend;
2. compile backend;
3. run backend tests;
4. check TypeScript;
5. verify API integration;
6. verify no runtime console errors;
7. verify important workflows manually.

At minimum add backend tests for:

```text
authentication
product reads
reservation availability
reservation creation
stock validation
order creation
role authorization
```

Use JUnit / Spring Boot Test / MockMvc where appropriate.

If Testcontainers/PostgreSQL is already practical in the environment, it may be used for integration tests.

Do not make Docker a mandatory dependency just for a basic local development environment unless explicitly required.

---

# 32. FRONTEND ACCEPTANCE CRITERIA

The final React application must:

- preserve the visual appearance of the Figma prototype;
- use real routes;
- no longer use one 3000+ line `App.tsx`;
- have reusable layouts and components;
- use APIs for server data;
- have loading/error states;
- preserve responsive behavior;
- support customer/staff/admin layouts;
- have role-aware route guards;
- contain no demo `email.includes("admin")` authentication;
- contain no `PRODUCTS`, `TABLES`, `BRANCHES`, `STAFF_LIST`, or `USERS_DATA` as production data sources;
- not contain database passwords.

`App.tsx` should eventually be small and primarily compose application providers/router.

---

# 33. BACKEND ACCEPTANCE CRITERIA

The Spring Boot application must:

- connect successfully to PostgreSQL `boardly_db`;
- map to the existing SQL schema;
- use `ddl-auto=validate`;
- never recreate or silently modify the schema;
- have clear Controller → Service → Repository separation;
- use DTOs;
- validate input;
- use transactions where required;
- use Spring Security;
- use proper password hashing;
- enforce roles/permissions server-side;
- preserve historical orders/reservations/payments;
- not expose raw card data;
- calculate derived fields from source tables;
- keep inventory per branch;
- support real REST endpoints consumed by React.

---

# 34. DOCUMENTATION

Create a root `README.md` for someone with limited backend/database experience.

Document exact steps for:

## PostgreSQL

```text
Database: boardly_db
Host: localhost
Port: 5432
```

Explain that `Boardly_schema.sql` must already have been executed.

## Backend

Document:

```text
Java version
Maven commands
environment variables
how to run Spring Boot
backend URL
```

Example:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows, provide the equivalent command where applicable.

## Frontend

Document:

```bash
cd frontend
npm install
npm run dev
```

State the development URL.

## Verification

Explain how to verify:

```text
GET http://localhost:8080/api/products
```

and then how to verify that the React Shop page displays the same database records.

---

# 35. WORKING RULES

While implementing:

1. Do not destroy the original Figma visual design.
2. Do not rewrite working UI for aesthetic preference.
3. Do not invent database columns without checking the SQL.
4. Do not allow Hibernate to generate the production schema.
5. Do not connect React directly to PostgreSQL.
6. Do not keep business-critical mock data in React.
7. Do not trust prices/totals/roles sent by the frontend.
8. Do not put business logic inside controllers.
9. Do not expose JPA entities directly.
10. Do not hard-code secrets.
11. Do not store plain-text passwords.
12. Do not store CVV/card numbers.
13. Do not silently guess ambiguous business rules.
14. Prefer incremental, testable changes over a complete one-shot rewrite.
15. Preserve git history if the project is already under Git.
16. Before deleting/replacing major existing code, confirm the replacement compiles and preserves required behavior.

---

# 36. FIRST TASK

Start by doing **analysis only**.

Before large code changes, report:

```text
1. Current App.tsx architecture
2. All pages found
3. All mock datasets found
4. All business logic currently running in React
5. UI fields that are derived versus persisted in PostgreSQL
6. Proposed frontend folder structure
7. Proposed Spring Boot folder/package structure
8. Proposed API endpoint inventory
9. Database table ↔ backend entity/module mapping
10. Known ambiguities/blockers
11. Step-by-step migration/refactor plan
```

Then begin Phase 1 and continue incrementally unless a true business-rule blocker requires clarification.

The end goal is a maintainable, working Boardly full-stack application where:

```text
Figma UI
   ↓
React Components
   ↓
REST API
   ↓
Spring Boot
   ↓
JPA/Hibernate
   ↓
PostgreSQL boardly_db
```

and the provided `Boardly_schema.sql` remains the authoritative database contract.