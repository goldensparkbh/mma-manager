# Dojo Manager — Native Mobile Apps

Two Expo (React Native) apps live alongside the web platform:

| App | Folder | Users |
|-----|--------|-------|
| **Dojo Member** | `apps/dojo-member` | Members — book classes, camps, show check-in QR |
| **Dojo Staff** | `apps/dojo-staff` | Staff/coaches — scan QR check-in, view schedule |

## Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on a physical device, or Xcode / Android Studio for simulators
- The API server running (`npm run dev` or `npm run start` from repo root)

## API URL

Mobile apps call the same backend as the web app. Set the base URL before starting Expo:

By default both apps point at the production API (`apps/dojo-member/.env` and `apps/dojo-staff/.env`).

To use a **local** API instead:

```bash
# iOS Simulator — server on same machine
export EXPO_PUBLIC_API_URL=http://localhost:3000

# Android Emulator — host loopback
export EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Physical device — your machine's LAN IP
export EXPO_PUBLIC_API_URL=http://192.168.1.42:3000
```

You can also edit `extra.apiUrl` in each app's `app.json`.

## Member app

```bash
cd apps/dojo-member
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npm start
```

1. Enter your club portal slug (same as `/portal/:slug` on web).
2. Sign in with OTP or password.
3. **Classes** — browse and book upcoming sessions.
4. **Bookings** — view or cancel your bookings.
5. **Camps** — register for public events.
6. **Profile** — membership QR for club check-in, family member switch.

## Staff app

```bash
cd apps/dojo-staff
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npm start
```

1. Sign in with staff email/password (same as web dashboard).
2. **Scan** — camera QR scanner for member check-in (requires `publicSlug` in booking settings).
3. **Schedule** — upcoming classes (coach role sees only assigned sessions).
4. **Profile** — account info and sign out.

Platform admin accounts must use the web dashboard.

## Root scripts

From the monorepo root:

```bash
npm run mobile:member    # start member app
npm run mobile:staff     # start staff app
```

## Building for stores

Use [EAS Build](https://docs.expo.dev/build/introduction/) for production binaries:

```bash
cd apps/dojo-member   # or dojo-staff
npx eas build --platform ios
npx eas build --platform android
```

Update bundle identifiers in `app.json` before submitting to App Store / Play Store.
