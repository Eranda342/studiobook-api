# StudioBook API

StudioBook API is a RESTful backend for a Recording and Podcast Studio Booking Management System. It is built with NestJS, TypeScript, PostgreSQL, Prisma, and JWT authentication.

The project focuses on clean backend architecture, maintainable code, validation, authentication, database design, and REST API best practices.

## Status

| Module | Status |
|---|---|
| Project setup | Complete |
| Authentication | Complete |
| Service management | Complete |
| Booking management | In progress |
| API documentation | Available through Swagger |

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Passport JWT
- bcrypt
- class-validator
- class-transformer
- Swagger
- Joi

## Core Features

### Authentication

- User registration
- User login
- JWT-based authentication
- Password hashing
- Protected profile endpoint
- Duplicate email validation

### Service Management

- Create services
- View active services
- View service details
- Update services
- Delete services
- Case-insensitive duplicate title validation
- Protection for admin-only service operations

## Project Structure

```text
src/
├── auth/
├── common/
├── prisma/
├── services/
├── users/
├── app.module.ts
└── main.ts
```

## Database Overview

The application currently uses three main database models:

- `User`
- `Service`
- `Booking`

A service can have many bookings, and each booking belongs to one service.

Booking statuses are represented using an enum:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

## Setup

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Start the application in development mode:

```bash
npm run start:dev
```

## API Documentation

Swagger documentation is available after starting the server:

```text
/docs
```

The API uses a global prefix:

```text
/api
```

## API Endpoints

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | API health check |

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a user |
| POST | `/api/auth/login` | Public | Login user |
| GET | `/api/auth/me` | Protected | Get current user profile |

### Services

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/services` | Protected | Create a service |
| GET | `/api/services` | Public | Get active services |
| GET | `/api/services/:id` | Public | Get service by ID |
| PATCH | `/api/services/:id` | Protected | Update a service |
| DELETE | `/api/services/:id` | Protected | Delete a service |

## Validation and Security

- Request validation is handled globally using DTOs.
- Unknown request fields are rejected.
- Passwords are hashed before storage.
- Protected routes require a valid JWT Bearer token.
- Password hashes are never returned in API responses.

## Business Rules Implemented

- Duplicate user emails are rejected.
- Duplicate service titles are rejected case-insensitively.
- Only authenticated users can create, update, and delete services.
- Public users can view active services.
- Services with existing bookings cannot be deleted.

## Assumptions

- Authenticated users represent studio administrators or staff.
- Customers do not need an account to create bookings.
- Service duration is stored in minutes.
- Prices are stored using Prisma Decimal.
- Booking management will complete the main customer booking flow.

## Future Improvements

- Complete booking management APIs
- Add pagination, search, and filtering for bookings
- Add global response formatting
- Add global exception formatting
- Add Docker Compose support
- Add seed data
- Add unit and integration tests
- Add role-based access control
- Add refresh token support

## Submission Contents

This repository includes:

- NestJS source code
- Prisma schema
- Prisma migration files
- Environment example file
- Swagger API documentation
- Project documentation

Sensitive local configuration files are excluded from version control.