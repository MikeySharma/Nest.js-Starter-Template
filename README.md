# Unlocked — NestJS + Prisma Boilerplate

A production-ready NestJS boilerplate with Prisma, PostgreSQL, and hybrid JWT authentication.

## Stack

- **NestJS 11** — API framework
- **Prisma 6** — ORM
- **PostgreSQL** — Database
- **JWT** — Hybrid access + refresh token authentication
- **Swagger** — API documentation
- **pnpm** — Package manager

## Authentication model

| Token | Type | Storage | Purpose |
|-------|------|---------|---------|
| Access | Short-lived JWT (15m) | Stateless | API requests, `GET /auth/me` |
| Refresh | Long-lived JWT (7d) | SHA-256 hash in PostgreSQL | Token renewal, server-side logout |

On login/register, both tokens are set as **HttpOnly cookies** (`access_token`, `refresh_token`) with expiry matching the JWT TTL. The JSON response contains only the user profile. Browsers send cookies automatically; for API clients, forward the `Cookie` header. When the access token expires, call `POST /auth/refresh` (sends the refresh cookie). Refresh tokens are rotated on each refresh — the old one is revoked in the database.

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16 (or use Docker Compose)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access JWTs |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh JWTs (must differ from access) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PORT` | Server port (default: `3000`) |

### 3. Run database migrations

```bash
pnpm db:migrate:dev
```

### 4. Start the server

```bash
pnpm run start:dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api`

To test protected routes in Swagger: login in a browser (cookies are set automatically) or use **Authorize** with a Bearer token for manual testing.

### Cookie details

| Cookie | HttpOnly | Expiry | Purpose |
|--------|----------|--------|---------|
| `access_token` | Yes | `JWT_ACCESS_EXPIRES_IN` (default 15m) | Authenticated API requests |
| `refresh_token` | Yes | `JWT_REFRESH_EXPIRES_IN` (default 7d) | Token refresh and logout |

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | Public | Health check |
| POST | `/auth/register` | Public | Register; sets auth cookies |
| POST | `/auth/login` | Public | Login; sets auth cookies |
| POST | `/auth/refresh` | Refresh cookie | Rotate tokens; sets new cookies |
| POST | `/auth/logout` | Refresh cookie | Revoke refresh token; clears cookies |
| GET | `/auth/me` | Access JWT | Current user profile |

## Project Structure

```
src/
├── modules/
│   ├── auth/       # Register, login, refresh, logout, /me
│   └── prisma/     # Prisma module and service
├── common/         # Guards, decorators, shared DTOs
├── config/         # Environment configuration, validation, Swagger
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
prisma/
├── schema.prisma
└── migrations/
test/
└── app.e2e-spec.ts
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run start:dev` | Start in watch mode |
| `pnpm run build` | Build for production |
| `pnpm run start:prod` | Run production build |
| `pnpm run test:e2e` | Run end-to-end tests |
| `pnpm db:migrate:dev` | Run Prisma migrations (dev) |
| `pnpm db:migrate:prod` | Deploy migrations (prod) |
| `pnpm db:studio` | Open Prisma Studio |

## Docker

```bash
cp .env.example .env
docker compose up -d
pnpm db:migrate:dev
pnpm run start:dev
```

## Testing

```bash
pnpm run test:e2e
```
