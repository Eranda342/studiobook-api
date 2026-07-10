# Assignment Checklist — StudioBook API

This document maps each assignment requirement to its implementation and verification status.

## Mandatory Requirements

| Requirement | Status | Implementation | Verification |
|---|---|---|---|
| NestJS framework | ✅ Complete | `@nestjs/core` v11, modular structure | `npm run build` passes |
| TypeScript | ✅ Complete | Strict TypeScript throughout; `tsconfig.json` with strict settings | `npm run build` passes; 0 type errors |
| PostgreSQL database | ✅ Complete | PostgreSQL 16 via Docker Compose or local install | `docker compose ps` shows `studiobook-db` healthy |
| Prisma ORM | ✅ Complete | Prisma 7 with `@prisma/adapter-pg`; schema in `prisma/schema.prisma` | `npm run prisma:generate` succeeds |
| JWT registration | ✅ Complete | `POST /api/auth/register` creates a user, hashes the password, and returns sanitized user data. (JWT issuance occurs through the login endpoint). | E2E test: `/api/auth/register (POST) - Valid` |
| JWT login | ✅ Complete | `POST /api/auth/login` — bcrypt compare, returns JWT | E2E test: `/api/auth/login (POST) - Valid Login` |
| Service CRUD | ✅ Complete | `POST /api/services`, `GET /api/services`, `GET /api/services/:id`, `PATCH /api/services/:id`, `DELETE /api/services/:id` | E2E tests: Services section |
| Public booking creation | ✅ Complete | `POST /api/bookings` — no auth required | E2E test: `/api/bookings (POST) - Public Creation` |
| Booking list | ✅ Complete | `GET /api/bookings` — protected, paginated | E2E test: `/api/bookings (GET) - With Token` |
| Booking by ID | ✅ Complete | `GET /api/bookings/:id` — protected | Covered by booking service unit tests |
| Booking status update | ✅ Complete | `PATCH /api/bookings/:id/status` — protected | E2E test: `PATCH - Update to CONFIRMED` |
| Booking cancellation | ✅ Complete | `PATCH /api/bookings/:id/cancel` — protected | E2E test: `PATCH - Cancellation` |
| Required booking fields | ✅ Complete | `customerName`, `customerEmail`, `serviceId`, `bookingDate`, `bookingTime` validated in DTO | Validation tests; E2E test: Invalid Request |
| Booking status enum | ✅ Complete | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` in Prisma schema | Migration applied; visible in Swagger |
| Service existence check | ✅ Complete | `NotFoundException` if service not found | Unit test: `should throw NotFoundException if service is missing` |
| Past date rejection | ✅ Complete | `BadRequestException` if booking date is before today | Unit test: `should throw BadRequestException for past booking date` |
| CANCELLED to COMPLETED restriction | ✅ Complete | `BadRequestException` in `BookingsService.updateStatus` | Unit test: `should throw BadRequestException if updating cancelled to completed` |
| Protected service management | ✅ Complete | `JwtAuthGuard` on `POST`, `PATCH`, `DELETE /api/services` | E2E test: `/api/services (POST) - Without Token` |
| Public booking endpoint | ✅ Complete | `POST /api/bookings` has no auth guard | E2E test: `/api/bookings (POST) - Public Creation` |
| DTO validation | ✅ Complete | Global `ValidationPipe` (whitelist, transform, forbidNonWhitelisted); class-validator decorators | E2E test: Invalid Request returns 400 |
| Error handling | ✅ Complete | `AllExceptionsFilter` formats all errors; no stack traces exposed | Unit tests: `all-exceptions.filter.spec.ts` |
| Prisma migrations | ✅ Complete | `prisma/migrations/20260709191805_init/` committed | `prisma migrate deploy` runs in Docker startup |
| `.env.example` | ✅ Complete | All required variables with safe example values | Present in repository root |
| Installation instructions | ✅ Complete | Docker and local setup documented in `README.md` | README reviewed |
| GitHub repository | ✅ Complete | Public repository at `https://github.com/Eranda342/studiobook-api` | `git log` shows clean history |

## Bonus Requirements

| Requirement | Status | Implementation | Verification |
|---|---|---|---|
| Pagination | ✅ Complete | `page` and `limit` query params on `GET /api/bookings`; `meta` in response | Unit test: `findAll should use correct skip/take` |
| Search | ✅ Complete | `?search=` on `GET /api/bookings` — matches customerName or customerEmail (case-insensitive) | Unit test: `should construct correct where structure` |
| Status filter | ✅ Complete | `?status=` on `GET /api/bookings` | Unit test: `should construct correct where structure` |
| Swagger/OpenAPI | ✅ Complete | `@nestjs/swagger`; available at `http://localhost:3000/docs` | `GET /docs` returns HTTP 200 |
| Docker Compose | ✅ Complete | `Dockerfile` (multi-stage) + `docker-compose.yml` with health checks | `docker compose ps` shows both services healthy |
| Global validation | ✅ Complete | `ValidationPipe` registered in `configureApp()` | Applied to all routes |
| Global exception filter | ✅ Complete | `AllExceptionsFilter` registered via `APP_FILTER` in `AppModule` | Unit tests; E2E error responses |
| Standardized responses | ✅ Complete | `ResponseInterceptor` registered via `APP_INTERCEPTOR` in `AppModule` | Unit tests; E2E response shape verification |
| Duplicate-slot prevention | ✅ Complete | Application-level `findFirst` check + database composite unique constraint + `P2002` fallback in `BookingsService.create` | E2E test: `Duplicate Slot`; Unit test: `ConflictException` |
| Unit tests | ✅ Complete | 5 suites, 39 tests in `src/**/*.spec.ts` | `npm run test:unit` — all pass |
| E2E tests | ✅ Complete | 1 suite, 20 tests in `test/app.e2e-spec.ts` | `npm run test:e2e:run` — all pass |
| Seed data | ✅ Complete | `prisma/seed.cjs` — 4 studio services, optional admin, idempotent | Verified twice — no duplicates created |
| Refresh tokens | ❌ Not implemented | Optional bonus — out of scope for this submission | N/A |

## Submission Verification

| Check | Result | Command / Method |
|---|---|---|
| Build | ✅ Pass | `npm run build` |
| Lint | ✅ 0 errors | `npm run lint` |
| Unit tests | ✅ 5 suites, 39 tests | `npm run test:unit` |
| Unit coverage generated | ✅ | `npm run test:cov` |
| E2E tests | ✅ 1 suite, 20 tests | `npm run test:e2e:run` (isolated test DB) |
| Docker — API healthy | ✅ | `docker compose ps` |
| Docker — DB healthy | ✅ | `docker compose ps` |
| Migration status | ✅ Applied | Runs automatically in Docker; manual via `prisma:migrate:deploy` |
| Swagger accessible | ✅ HTTP 200 | `GET http://localhost:3000/docs` |
| Health endpoint | ✅ Correct JSON | `GET http://localhost:3000/api/health` |
| Seed — first run | ✅ 4 services created | `npm run prisma:seed` |
| Seed — second run | ✅ 4 services updated, no duplicates | `npm run prisma:seed` |
| `.env` not tracked | ✅ | `git ls-files .env` — empty |
| `.env.test` not tracked | ✅ | `git ls-files .env.test` — empty |
| `coverage/` not tracked | ✅ | `git ls-files coverage` — empty |
| Working tree clean | ✅ | `git status` |
| Latest submission state | Verified on main branch | `git log -1 --oneline` |
