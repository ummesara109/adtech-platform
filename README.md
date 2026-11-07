# AutoAds

AdTech platform for auto-rickshaw screen advertising in Bengaluru — advertiser dashboard first.

## Technology stack

| Component | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS |
| Mobile | React Native (`apps/mobile` scaffold) |
| Backend | Node.js, NestJS |
| API | REST (`/api/v1`) |
| Database | Supabase PostgreSQL (local Docker Postgres) |
| Authentication | Supabase Auth JWT (dev-login locally) |
| Authorization | RBAC (`MembershipRole`) + PostgreSQL RLS |
| Cache | Redis |
| Device communication | MQTT |
| MQTT broker | EMQX (local) / AWS IoT Core (prod) |
| Background jobs | BullMQ |
| Event queue | AWS SQS |
| Analytics | ClickHouse |
| File storage | Amazon S3 (MinIO locally) |
| Media delivery | CloudFront CDN |
| Hosting | AWS |
| Containers | Docker |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus metrics + Grafana scrape config + Sentry hook |

## Apps

| App | Path | Role |
| --- | --- | --- |
| Advertiser portal | `apps/advertiser-web` | Dashboard, campaigns, creatives, billing UI |
| Advertiser API | `apps/api` | NestJS REST + Prisma + platform adapters |
| Driver mobile | `apps/driver-mobile` | React Native + Expo partner app |
| Driver partner web | `apps/driver-partner-web` | Key Modules presentation UI (Vite + Tailwind) |
| Mobile (legacy scaffold) | `apps/mobile` | Advertiser companion placeholder |

## How to run (local)

### Prerequisites

- Node.js 22+
- Docker Desktop running
- npm

### 1) Start infrastructure

From the repo root — **core stack** (enough for the advertiser dashboard):

```bash
docker compose up -d
docker compose ps
```

This starts:

| Service | Port | Purpose |
| --- | --- | --- |
| Postgres | `5435` | Advertiser data (Supabase-compatible) |
| Redis | `6379` | Cache + BullMQ |

Optional MQTT / analytics / S3 (extras profile):

```bash
docker compose --profile extras up -d
```

| Service | Port | Purpose |
| --- | --- | --- |
| EMQX | `1883` / `18083` | MQTT + dashboard |
| ClickHouse | `8123` | Analytics |
| MinIO (Bitnami) | `9002` / `9001` | S3-compatible creatives |

> Note: Official `minio/minio` images are no longer publicly pullable; local S3 uses `bitnamilegacy/minio`.

Optional ClickHouse schema:

```bash
docker exec -i autoads-clickhouse clickhouse-client --queries-file=/dev/stdin < infra/clickhouse/init.sql
```

### 2) API (NestJS)

```bash
cd apps/api
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

- Health: http://localhost:3000/api/v1/health  
- Platform deps: http://localhost:3000/api/v1/platform/health  
- Prometheus: http://localhost:3000/api/v1/metrics  

Dev login (no Supabase required):

```bash
curl -X POST http://localhost:3000/api/v1/auth/dev-login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"live@autoads.test\"}"
```

### 3) Frontend (React + Vite + Tailwind)

```bash
cd apps/advertiser-web
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

Open http://localhost:5173

1. Go to **Settings → Security**
2. Login with a seeded email (e.g. `live@autoads.test`)
3. Dashboard loads company-scoped workspace from NestJS + Postgres

### 4) Root shortcuts

```bash
npm run stack:up
npm run setup:api
npm run setup:web
npm run dev:api
npm run dev:web
```

### 5) Production-style containers

```bash
docker compose up -d
docker build -t autoads-api ./apps/api
docker build -t autoads-web ./apps/advertiser-web
```

## Seeded advertisers

| Email | Dashboard state |
| --- | --- |
| `new@autoads.test` | Empty / new advertiser |
| `drafts@autoads.test` | Draft campaign |
| `pending@autoads.test` | Under review + pending payment |
| `live@autoads.test` | Live + Proof of Play |
| `completed@autoads.test` | Completed campaign |

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) builds API + web and validates Compose config on push/PR.

## Monitoring

- Prometheus scrape: `infra/monitoring/prometheus.yml` → `/api/v1/metrics`
- Grafana: add Prometheus datasource and import API up/custom counters
- Sentry: set `SENTRY_DSN` on the API

## Production mapping

| Local | Production |
| --- | --- |
| Docker Postgres | Supabase PostgreSQL + RLS |
| Dev JWT / `AUTH_DEV_MODE` | Supabase Auth |
| EMQX | AWS IoT Core |
| MinIO | S3 + CloudFront |
| Logged SQS stub | AWS SQS |
| Docker Compose | ECS/EKS / AWS hosting |
