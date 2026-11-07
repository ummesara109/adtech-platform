# AutoAds API (NestJS)

Advertiser-scoped REST API for the AutoAds client portal.

## Stack

- NestJS + TypeScript
- PostgreSQL (Supabase-compatible via `DATABASE_URL`)
- JWT auth (Supabase Auth secret in production; local `AUTH_DEV_MODE` for testing)
- Prisma ORM
- Company membership RBAC (never trust client `companyId`)

## Quick start

```bash
cd apps/api
cp .env.example .env
npm install
npm run db:up          # requires Docker
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Health: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

## Dev login (local only)

```bash
curl -X POST http://localhost:3000/api/v1/auth/dev-login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"live@autoads.test\"}"
```

Seeded test advertisers:

| Email | Scenario |
| --- | --- |
| `new@autoads.test` | Empty workspace |
| `drafts@autoads.test` | Draft campaign |
| `pending@autoads.test` | Under review + pending payment |
| `live@autoads.test` | Live + Proof of Play |
| `completed@autoads.test` | Completed campaign |

## Key endpoints

All advertiser routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/advertiser/workspace` | Full dashboard snapshot |
| GET/POST | `/api/v1/advertiser/campaigns` | List / create |
| POST | `/api/v1/advertiser/campaigns/:id/pause\|resume\|cancel\|duplicate` | Lifecycle actions |
| GET/POST | `/api/v1/advertiser/creatives` | Creative library |
| GET | `/api/v1/advertiser/inventory` | Bengaluru area inventory |

## Security notes

- Company scope comes from JWT → `CompanyMember` lookup.
- Campaigns cannot be marked `Live` via advertiser create/submit.
- Operating hours validated: end time must be later than start time.
- KYC must be `Verified` before campaign submission.
