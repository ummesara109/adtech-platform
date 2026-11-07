# Driver / Partner API (`/api/v1`)

All driver routes require `Authorization: Bearer <token>` and a user with the **Driver** platform role.

## Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/driver/register` | Public | Create user + driver profile (local/dev; production pairs with Supabase signup) |
| POST | `/auth/driver/dev-login` | Public | Dev-only login (`AUTH_DEV_MODE=true`) |
| GET | `/auth/me` | JWT | Current user (advertiser or driver) |

### Dev login (seeded driver)

```bash
curl -X POST http://localhost:3000/api/v1/auth/driver/dev-login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"driver@autoads.test\"}"
```

## Driver workspace

| Method | Path | Description |
| --- | --- | --- |
| GET | `/driver/dashboard` | Partner home: IST reporting day, validated≠completed playback, earnings (no invented deductions), status-derived alerts |
| GET | `/driver/profile` | Profile + KYC checklist |
| PATCH | `/driver/profile` | Update driver fields |
| GET | `/driver/kyc` | KYC status |
| POST | `/driver/kyc/submit` | Submit KYC for review |
| POST | `/driver/kyc/documents` | Attach storage key to a KYC checklist item |
| GET | `/driver/activity/summary` | Running hours buckets, weekly playback, earnings trend, payouts |
| POST | `/driver/device/disconnect` | Unassign / unpair active device |
| GET | `/driver/vehicle` | Registered vehicle |
| POST | `/driver/vehicle` | Register vehicle (once) |
| GET | `/driver/device` | Assignment + connectivity snapshot |
| POST | `/driver/device/pair` | Confirm pairing code |
| GET | `/driver/playback?limit=50` | Playback history |
| POST | `/driver/playback/events` | Idempotent playback ingest |
| GET | `/driver/earnings` | Monthly partner earnings |
| GET | `/driver/incentives` | Incentive rows |
| GET | `/driver/payouts` | Payout history |
| POST | `/driver/support/issues` | Support ticket |

## Sample test cases

1. **Registration** — POST `/auth/driver/register` with new email → 201 + token + `driverId`.
2. **Login** — POST `/auth/driver/dev-login` with `driver@autoads.test` → token.
3. **Dashboard** — GET `/driver/dashboard` → seeded vehicle, device Online, earnings > 0.
4. **Authorization** — Use advertiser token on `/driver/dashboard` → 403 Driver profile required.
5. **Idempotent playback** — POST same `idempotencyKey` twice → second response `duplicate: true`.
6. **Cross-driver** — Driver A token cannot read Driver B earnings (scoped by JWT + service layer).

## Security notes

- Never ship Supabase **service role** keys to the mobile app (anon key + user JWT only).
- Apply `apps/api/prisma/sql/rls_policies.sql` on Supabase for defense-in-depth (`app.driver_id` session var).
- MQTT device telemetry remains a later phase; `GET /driver/device` reads DB snapshot only.
