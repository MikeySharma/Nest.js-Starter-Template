# Unlocked — NestJS + Prisma Boilerplate

A production-ready NestJS boilerplate with Prisma, PostgreSQL, and JWT authentication.

## Stack

- **NestJS 11** — API framework
- **Prisma 6** — ORM
- **PostgreSQL** — Database
- **JWT** — Token-based authentication
- **Swagger** — API documentation
- **pnpm** — Package manager

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

Copy the example env file and update values as needed:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `1d`, `7d`) |
| `PORT` | Server port (default: `3000`) |

### 3. Run database migrations

```bash
pnpm db:migrate
```

For a clean slate during development:

```bash
pnpm exec prisma migrate reset
```

### 4. Start the server

```bash
pnpm run start:dev
```

The API runs at `http://localhost:3000`.

Swagger docs are available at `http://localhost:3000/api`.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Health check |
| POST | `/auth/register` | Register and receive JWT |
| POST | `/auth/login` | Login and receive JWT |

### Example: Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Example: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Project Structure

```
src/
├── modules/
│   ├── auth/       # Register and login
│   └── prisma/     # Prisma module and service
├── config/         # Environment configuration, validation, and Swagger
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
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run end-to-end tests |
| `pnpm run lint` | Lint and fix |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Docker

Start PostgreSQL locally:

```bash
cp .env.example .env
docker compose up -d
```

Then run migrations and start the API on your machine:

```bash
pnpm db:migrate
pnpm run start:dev
```

## Testing

E2e tests require a running PostgreSQL instance with `DATABASE_URL` set in `.env`:

```bash
pnpm run test:e2e
```
