# AutoAds Mobile (React Native)

Advertiser companion app scaffold for campaign status, creative upload, and Bengaluru inventory checks.

## Stack

- React Native (Expo recommended for speed)
- TypeScript
- Same NestJS REST API + Supabase Auth as `apps/advertiser-web`

## Setup (when you start the app)

```bash
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
npm install @supabase/supabase-js
```

Point the app at:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Use the same `/api/v1/advertiser/*` endpoints as the web dashboard.
