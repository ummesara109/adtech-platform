# Auto Ad Partner — Expo mobile app

Real Android/iOS driver app (`apps/driver-mobile`). The Vite mockup presentation was removed; use this app on a phone.

## Stack

- Expo 52 · React Native · TypeScript
- React Navigation (auth stack + Home / Activity / Earnings / Payments / Support tabs)
- NestJS REST (`apps/api`) · Supabase Auth ready

## Run on Android (Expo Go)

### 1. Backend on your PC

```powershell
cd C:\Users\DELL\adtech-platform
docker compose up -d
cd apps\api
npm run start:dev
```

API binds `0.0.0.0:3000` so LAN devices can connect.

### 2. Set LAN API URL (not localhost)

```powershell
ipconfig
```

Edit `apps/driver-mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.68.106:3000
```

Phone and PC must share Wi‑Fi. Allow Node.js through Windows Firewall on port **3000** if requests fail.

Copy from `.env.example` if needed.

### 3. Start Expo

```powershell
cd C:\Users\DELL\adtech-platform\apps\driver-mobile
npm install
npm start
```

Install **Expo Go** → scan the QR code.

Demo login: `driver@autoads.test`

From repo root: `npm run dev:driver`

### 4. Android APK (EAS)

```powershell
npm install -g eas-cli
eas login
npm run build:apk
```

Uses `eas.json` → `preview` profile (`buildType: apk`).

## Flows

1. Register / Login  
2. KYC → Vehicle → Device pairing  
3. Home dashboard (connectivity, hours, playbacks, earnings, incentives)  
4. Activity · Earnings · Payments · Support (tickets + history)  
5. Profile → logout  

All lists use live API data; empty states when the DB has no rows.
