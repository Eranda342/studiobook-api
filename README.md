# StudioBook API

StudioBook API is a RESTful backend for a Recording and Podcast Studio Booking Management System. It is built with NestJS, TypeScript, PostgreSQL, Prisma, and JWT authentication.

This project is being developed as a backend technical assignment. The goal is to demonstrate clean architecture, maintainable code, validation, authentication, database design, and REST API best practices.

## Project Status

| Module | Status |
|---|---|
| Project setup | Complete |
| PostgreSQL + Prisma | Complete |
| JWT authentication | Complete |
| Service management | Complete |
| Booking management | Next phase |
| Swagger documentation | Complete for implemented modules |

## Features Implemented

### Authentication

- User registration
- User login
- JWT access token generation
- Password hashing with bcrypt
- Protected profile endpoint
- Duplicate email validation
- Swagger Bearer Auth support

### Service Management

- Create recording studio services
- List active services publicly
- Get service by ID publicly
- Update services with authentication
- Delete services with authentication
- Prevent duplicate service titles using case-insensitive checking
- Prevent deletion when related bookings exist
- Prisma Decimal price handling

### Platform Foundation

- Global validation pipe
- Environment variable validation with Joi
- PostgreSQL database support
- Prisma migrations
- Swagger API documentation
- Clean NestJS module structure
- ESLint and Prettier support

## Tech Stack

| Technology | Purpose |
|---|---|
| NestJS | Backend framework |
| TypeScript | Programming language |
| PostgreSQL | Relational database |
| Prisma | ORM and database migrations |
| JWT | Authentication |
| Passport JWT | JWT strategy integration |
| bcrypt | Password hashing |
| class-validator | Request DTO validation |
| class-transformer | DTO transformation |
| Swagger | API documentation |
| Joi | Environment variable validation |
| Docker | Local PostgreSQL database testing |

## Folder Structure

```text
src/
├── auth/
│   ├── dto/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── common/
│   ├── constants/
│   ├── decorators/
│   ├── enums/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── utils/
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── services/
│   ├── dto/
│   ├── services.controller.ts
│   ├── services.module.ts
│   └── services.service.ts
├── users/
│   ├── users.module.ts
│   └── users.service.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

## Database Models

### User

```text
id
name
email
password
createdAt
updatedAt
```

### Service

```text
id
title
description
duration
price
isActive
createdAt
updatedAt
```

### Booking

```text
id
customerName
customerEmail
customerPhone
serviceId
bookingDate
bookingTime
status
notes
createdAt
updatedAt
```

### Booking Status Enum

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

## Prerequisites

Make sure these are installed:

- Node.js
- npm
- Docker Desktop
- Git

PostgreSQL can be installed locally, but Docker is recommended for predictable local testing.

## Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/studiobook_db?schema=public"
JWT_SECRET="studiobook-super-secret-key"
PORT=3000
```

A safe template is provided in `.env.example`.

Never commit `.env` to version control.

## Local Database Setup with Docker

The verified local setup uses PostgreSQL inside Docker on host port `5434`.

```bash
docker run --name studiobook-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=studiobook_db \
  -p 5434:5432 \
  -d postgres:16
```

If the container already exists, start it with:

```bash
docker start studiobook-postgres
```

To check the container:

```bash
docker ps
```

## Installation

```bash
npm install
```

## Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Running the Application

Development mode:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

The API runs by default on:

```text
http://localhost:3000/api
```

Swagger documentation is available at:

```text
http://localhost:3000/docs
```

## Available Scripts

```bash
npm run build
npm run start
npm run start:dev
npm run start:prod
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

## API Endpoints

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Check API health |

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT access token |
| GET | `/api/auth/me` | Protected | Get current authenticated user |

### Services

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/services` | Protected | Create a service |
| GET | `/api/services` | Public | Get active services |
| GET | `/api/services/:id` | Public | Get service by ID |
| PATCH | `/api/services/:id` | Protected | Update service |
| DELETE | `/api/services/:id` | Protected | Delete service |

## Example Requests

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Studio Admin",
    "email": "admin@studiobook.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@studiobook.com",
    "password": "password123"
  }'
```

### Get Current User

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Service

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Podcast Recording Session",
    "description": "Professional podcast recording session with studio-grade microphones.",
    "duration": 60,
    "price": 50,
    "isActive": true
  }'
```

### Get Services

```bash
curl http://localhost:3000/api/services
```

## Validation and Error Handling

The API uses a global validation pipe with:

```text
whitelist: true
transform: true
forbidNonWhitelisted: true
```

This means:

- Unknown request fields are rejected.
- DTO validation is enforced globally.
- Query and body values can be transformed into expected types.

Common responses include:

| Status | Meaning |
|---|---|
| 400 | Invalid request or business rule violation |
| 401 | Missing or invalid authentication token |
| 404 | Resource not found |
| 409 | Duplicate resource conflict |

## Business Rules Implemented

### Authentication

- Passwords are hashed before storage.
- Duplicate email registration is blocked.
- Password hashes are never returned in API responses.
- Protected routes require a valid JWT Bearer token.

### Services

- Service title duplicates are blocked using case-insensitive comparison.
- Public service listing returns active services by default.
- Service creation, update, and deletion require authentication.
- Services with existing bookings cannot be deleted.

## Assumptions Made

- Admin/studio staff users are represented by authenticated users.
- Customers do not need an account to create bookings.
- Prices are stored as Prisma `Decimal` values in the database and returned as API-friendly values.
- Service duration is stored in minutes.
- Service deletion is allowed only when the service has no related bookings.
- Booking management is planned as the next feature module.

## Future Improvements

- Complete booking management endpoints
- Add booking pagination, search, and status filtering
- Add global response interceptor for consistent API responses
- Add global exception filter for custom error response shape
- Add Docker Compose for API and PostgreSQL
- Add seed data for common studio services
- Add unit tests for Auth, Services, and Bookings modules
- Add refresh token support
- Add role-based access control for admin users
- Add email notifications for booking confirmation
- Add payment support

## Git Workflow

Recommended commit style:

```text
feat: implement booking management
fix: correct validation rule
docs: update README
chore: update dependencies
```

## Submission Notes

This repository should include:

- Source code
- Prisma schema
- Prisma migration files
- `.env.example`
- README documentation
- Swagger API documentation through `/docs`

Do not commit:

- `.env`
- `node_modules`
- `dist`
- local database files

## License

This project is created for a technical assignment.