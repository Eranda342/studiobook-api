# StudioBook API

A NestJS REST API for managing a recording and podcast studio. Customers can view services and create bookings without an account. Authenticated staff can manage services and booking statuses. PostgreSQL stores all application data, and Swagger provides interactive API documentation.

## Features

| Area | Capability |
|---|---|
| **Auth** | JWT registration, login, protected profile endpoint |
| **Services** | Full CRUD — create, list (public active), get by ID, update, delete |
| **Bookings** | Public creation, protected admin listing, get by ID, status lifecycle, cancellation |
| **Filtering** | Pagination, search by customer name/email, status filter |
| **Validation** | DTO validation on every request — whitelist, transform, forbidNonWhitelisted |
| **Responses** | Standardized success/error envelope, paginated response with meta |
| **Docs** | Swagger/OpenAPI at `/docs` |
| **Infra** | Docker Compose, Prisma migrations, seed data |
| **Tests** | Unit tests (39) and E2E tests (20) |

## Technology Stack

- **NestJS 11** — application framework
- **TypeScript** — language
- **PostgreSQL 16** — database
- **Prisma ORM 7** — data access with PostgreSQL driver adapter
- **JWT & Passport** — authentication
- **bcrypt** — password hashing
- **class-validator / class-transformer** — DTO validation
- **Joi** — environment variable validation
- **Swagger/OpenAPI** (`@nestjs/swagger`) — API documentation
- **Jest & Supertest** — unit and E2E testing
- **Docker & Docker Compose** — containerized development and deployment

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a full description of the system design, request lifecycle, data model, and design decisions.

## Prerequisites

| Tool | Requirement |
|---|---|
| Node.js | 22 or compatible current LTS |
| npm | Included with Node.js |
| Docker Desktop + Compose | Recommended — required for the Docker workflow |
| PostgreSQL | Only when running without Docker |

## Quick Start — Docker (Recommended)

```powershell
git clone https://github.com/Eranda342/studiobook-api.git
cd studiobook-api
Copy-Item .env.example .env
```

Open `.env` and replace `JWT_SECRET` with a long, random value.

```powershell
docker compose up --build -d
docker compose ps
```

Both `studiobook-db` and `studiobook-api` should show `healthy`. Migrations run automatically on startup.

**Optional — seed studio services:**

```powershell
docker compose exec app npm run prisma:seed
```

| URL | Description |
|---|---|
| `http://localhost:3000/api` | API base |
| `http://localhost:3000/api/health` | Health check |
| `http://localhost:3000/docs` | Swagger UI |

## Local Development Setup

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

The host-based NestJS process connects to PostgreSQL on port `5434` (as configured in `.env`). Docker Compose also exposes the database on `5434` on the host.

Use `npm run prisma:migrate:dev` only when you have deliberately changed the Prisma schema and need to create a new migration file.

## Environment Variables

| Variable | Required | Purpose | Example |
|---|---|---|---|
| `PORT` | No | HTTP listen port (default 3000) | `3000` |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens | `replace-with-a-long-random-secret` |
| `DATABASE_URL` | Yes | Prisma PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5434/studiobook_db?schema=public` |
| `POSTGRES_USER` | Docker | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | Docker | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | Docker | PostgreSQL database name | `studiobook_db` |
| `POSTGRES_PORT` | Docker | PostgreSQL host port | `5434` |
| `SEED_ADMIN_NAME` | Optional | Display name for seed admin account | `Studio Admin` |
| `SEED_ADMIN_EMAIL` | Optional | Email for seed admin account | *(leave blank in production)* |
| `SEED_ADMIN_PASSWORD` | Optional | Password for seed admin account | *(leave blank in production)* |

> **Note:** `SEED_ADMIN_*` values are only for local development seed data. Leave all three blank to seed only studio services. Set all three or none — partial configuration is an error.

## Available Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript |
| `npm run start` | Start the compiled application |
| `npm run start:dev` | Start with live reload |
| `npm run start:prod` | Start the production build |
| `npm run lint` | Lint and auto-fix source files |
| `npm test` | Run all Jest tests |
| `npm run test:unit` | Run unit tests sequentially |
| `npm run test:cov` | Run unit tests with coverage |
| `npm run test:e2e` | Run E2E tests (requires `.env` with test DB) |
| `npm run test:e2e:run` | Run E2E tests sequentially (for CI / isolated use) |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate:dev` | Create a new migration from schema changes |
| `npm run prisma:migrate:deploy` | Apply committed migrations |
| `npm run prisma:seed` | Seed the database with studio services |
| `npm run prisma:studio` | Open Prisma Studio |

## API Response Formats

**Success:**

```json
{
  "success": true,
  "message": "Service retrieved successfully",
  "data": {}
}
```

**Paginated success:**

```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

**Validation error:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["bookingTime must be in HH:mm format"],
  "timestamp": "2026-07-10T00:00:00.000Z",
  "path": "/api/bookings"
}
```

## Authentication

1. Register via `POST /api/auth/register` or log in via `POST /api/auth/login`.
2. Read `data.accessToken` from the response.
3. Include the token in subsequent requests:

```http
Authorization: Bearer <token>
```

In Swagger, click the **Authorize** button and paste the token.

## API Endpoints

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | API health check |

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Log in and receive a JWT |
| GET | `/api/auth/me` | Protected | Get the current user profile |

### Services

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/services` | Protected | Create a service |
| GET | `/api/services` | Public | List active services (`?includeInactive=true` for all) |
| GET | `/api/services/:id` | Public | Get a service by ID |
| PATCH | `/api/services/:id` | Protected | Update a service |
| DELETE | `/api/services/:id` | Protected | Delete a service (fails if bookings exist) |

### Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | Public | Create a booking |
| GET | `/api/bookings` | Protected | List bookings (paginated) |
| GET | `/api/bookings/:id` | Protected | Get a booking by ID |
| PATCH | `/api/bookings/:id/status` | Protected | Update booking status |
| PATCH | `/api/bookings/:id/cancel` | Protected | Cancel a booking |

**Booking query parameters:** `page`, `limit`, `status`, `search`

## Booking Status Lifecycle

```
PENDING -> CONFIRMED -> COMPLETED
        -> CANCELLED
```

| Rule | Description |
|---|---|
| Completed bookings | Cannot be updated or cancelled |
| Cancelled bookings | Cannot be moved to COMPLETED |

## Business Rules

- Service must exist and be active to accept a booking
- Booking date cannot be in the past
- Booking time must be in `HH:mm` format
- Duplicate service/date/time slots are rejected (409 Conflict)
- Service titles must be unique (case-insensitive)
- Services with existing bookings cannot be deleted
- Public users may create bookings
- Listing, status updates, and cancellations require JWT authentication
- Passwords are never returned in any response

## Testing

**Unit tests:**

```powershell
npm run test:unit
npm run test:cov
```

**E2E tests (isolated database):**

```powershell
docker compose -f docker-compose.test.yml up -d
```

Then set the test environment:

```powershell
$env:NODE_ENV = "test"
$env:JWT_SECRET = "test-only-jwt-secret"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5435/studiobook_test?schema=public"

npm run prisma:migrate:deploy
npm run test:e2e:run
```

**Cleanup:**

```powershell
docker compose -f docker-compose.test.yml down -v
```

**Verified results:**

| Suite | Count |
|---|---|
| Unit suites | 5 |
| Unit tests | 39 |
| E2E suites | 1 |
| E2E tests | 20 |

**Unit test coverage (from `npm run test:cov`):**

| Metric | % |
|---|---|
| Statements | 42.18 |
| Branches | 50.00 |
| Functions | 38.70 |
| Lines | 43.23 |

Coverage reflects unit tests only. E2E tests provide additional runtime coverage not captured here.

## Docker Operations

```powershell
# Build and start
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs app
docker compose logs db

# Restart services
docker compose restart

# Stop (preserve data)
docker compose down
```

> **Warning:** `docker compose down -v` deletes the PostgreSQL data volume.

## Database Migrations

- **Development (schema changes):** `npm run prisma:migrate:dev`
- **Deployment (apply committed migrations):** `npm run prisma:migrate:deploy`
- The Docker Compose startup command runs `prisma migrate deploy` automatically before starting the API
- Seeding is always explicit — run `npm run prisma:seed` manually

## Project Structure

```text
studiobook-api/
├── docs/                        Architecture and checklist docs
├── prisma/
│   ├── migrations/              Committed migration files
│   ├── schema.prisma            Data model
│   └── seed.cjs                 Idempotent development seed
├── src/
│   ├── auth/                    JWT registration, login, profile
│   ├── bookings/                Booking creation and management
│   ├── common/                  Decorators, filters, guards, interceptors
│   ├── prisma/                  PrismaService (pg adapter + lifecycle)
│   ├── services/                Studio service CRUD
│   ├── users/                   User data access
│   ├── app.module.ts
│   ├── configure-app.ts         Shared app configuration (pipes, prefix, hooks)
│   └── main.ts
├── test/
│   ├── app.e2e-spec.ts          Full E2E test suite
│   ├── jest-e2e.json
│   └── setup-env.ts             E2E safety guards
├── Dockerfile
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
├── .env.test.example
└── prisma.config.ts
```

## Security Notes

- Passwords are bcrypt-hashed with cost factor 10 — plaintext is never stored
- JWT secret must be changed before any real deployment
- `.env` and `.env.test` are git-ignored and never committed
- Unexpected internal errors return `Internal server error` without stack traces
- Docker Compose defaults use development-only credentials
- Seed admin credentials are optional, development-only, and never stored in the repository

## Assumptions and Limitations

- Authenticated users represent studio staff — there is no role-based authorization
- No refresh tokens are implemented
- Customers do not need an account to create bookings
- Booking availability is determined by exact service/date/time collision only
- Service deletion is blocked when bookings exist (any status)

## Additional Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design and request lifecycle
- [docs/ASSIGNMENT_CHECKLIST.md](docs/ASSIGNMENT_CHECKLIST.md) — requirement verification matrix

## Submission Contents

This repository contains:

- NestJS TypeScript source code
- Prisma schema and committed migrations
- Environment example files (`.env.example`, `.env.test.example`)
- `Dockerfile` and Docker Compose files
- Swagger API documentation (available at `/docs` after starting)
- Idempotent database seed script
- Unit tests (5 suites, 39 tests)
- E2E tests (1 suite, 20 tests)
- Architecture documentation and assignment checklist

Sensitive configuration files (`.env`, `.env.test`) are excluded from version control.