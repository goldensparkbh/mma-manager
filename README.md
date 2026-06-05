# MMA Manager — Multi-Tenant SaaS Platform

Club management platform with multi-tenant architecture, PostgreSQL database, and DigitalOcean deployment.

## Architecture

- **Frontend**: React + Vite + TanStack Query
- **Backend**: Express.js REST API
- **Database**: PostgreSQL (multi-tenant with `tenant_id` isolation)
- **Auth**: JWT-based authentication
- **Storage**: Local filesystem (configurable for DigitalOcean Spaces)
- **Deployment**: DigitalOcean App Platform

## Multi-Tenancy

Each customer (tenant) gets a fully isolated instance:
- Own members, users, subscriptions, products, sales, etc.
- Own settings and branding
- Own platform subscription (Starter / Professional / Enterprise)
- 14-day free trial on registration

**Platform Admin** can manage all tenants, plans, and subscriptions at `/platform-admin` (login with platform admin credentials).

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Setup

```bash
# Copy environment file
cp .env.example .env.local

# Edit .env.local with your DATABASE_URL and secrets
# Example local DATABASE_URL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mma_manager

npm install
npm run db:migrate
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

### First Steps

1. **Register a club** at http://localhost:5173/register
2. **Platform admin** logs in with `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` from `.env.local`

## Production (DigitalOcean)

1. Create a **Managed PostgreSQL** database on DigitalOcean
2. Deploy using the App Platform spec in `.do/app.yaml` or connect the repo in the DO dashboard
3. Set environment variables:
   - `DATABASE_URL` — from managed database connection string
   - `DATABASE_SSL=true`
   - `JWT_SECRET` — strong random string
   - `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`
4. Optionally attach a **volume** for persistent file uploads at `/app/uploads`

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new tenant + admin |
| `POST /api/auth/login` | Login (tenant user or platform admin) |
| `GET /api/auth/me` | Current session |
| `GET /api/platform/tenants` | List all tenants (admin) |
| `GET /api/members` | Tenant members |
| `GET /api/settings` | Tenant settings |

All tenant endpoints require `Authorization: Bearer <token>` and are scoped to the authenticated tenant.

## Subscription Plans

| Plan | Price | Members | Users |
|------|-------|---------|-------|
| Starter | $29/mo | 100 | 3 |
| Professional | $59/mo | 500 | 10 |
| Enterprise | $99/mo | 9999 | 50 |

Payment gateway integration (Stripe) can be added to enable self-service billing.
