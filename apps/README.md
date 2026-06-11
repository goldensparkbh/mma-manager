# Dojo Manager — Native Mobile Apps

Two Expo (React Native) apps live alongside the web platform:

| App | Folder | Users |
|-----|--------|-------|
| **Dojo Member** | `apps/dojo-member` | Members — book classes, camps, show check-in QR |
| **Dojo Staff** | `apps/dojo-staff` | Staff/coaches — scan QR check-in, view schedule |

## Prerequisites

- Node.js 20.19+ (Expo SDK 54)
- [Expo Go](https://expo.dev/go) on a physical device, or Xcode / Android Studio for simulators
- The API server running (`npm run dev` or `npm run start` from repo root)

## API URL

Mobile apps call the same backend as the web app. Set the base URL before starting Expo:

By default both apps point at the production API (`apps/dojo-member/.env` and `apps/dojo-staff/.env`).

## Branding (single app, per-club look)

Members enter their club code once. The app then uses that club's **logo**, **primary color**, and **welcome message** from portal settings — buttons, tabs, headers, and illustrations all follow the club accent.

## Push notifications

On login (physical device), the app registers an Expo push token with the server. Class reminders and member notifications are sent as push + email/SMS.

Run DB migration after pulling:

```bash
npm run db:migrate
```

For production push delivery, configure [EAS Build](https://docs.expo.dev/push-notifications/overview/) with your Expo project ID and add `EXPO_PUBLIC_EAS_PROJECT_ID` to each app's `.env`.

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
3. **Home** — membership status, next class, events, quick QR.
4. **Classes** — search, book, waitlist (grouped by day).
5. **Bookings** — upcoming & past, cancel with confirmation.
6. **Pay** — buy packages via TAP, payment history.
7. **Profile** — fullscreen check-in QR, family switch, sign out.

## Business model

Clubs can use the **staff app for free** to manage members, packages, classes, registrations, and attendance (up to plan limits). The **web dashboard** exposes the same free-tier features; premium modules (finance, store, analytics, camps, belts) unlock with paid Nawady plans.

| Plan | Price | What's included |
|------|-------|-----------------|
| **Free** | $0 | Members, attendance, packages, schedule, registrations, club profile, 3 staff, 50 members |
| **Starter** | $29/mo | Free features + higher limits |
| **Professional** | $59/mo | + Store, finance, analytics, belts, camps |
| **Enterprise** | $99/mo | Everything |

New clubs register on the **Free** plan by default (web `/register` or staff app **Create free club**). Upgrade anytime at `/billing` on the web dashboard.

## Staff app — club signup

```bash
cd apps/dojo-staff
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npm start
```

1. **Create free club** from login screen, or sign in with staff email/password.
2. **Today** — check-in count, today's classes, upgrade prompts for web dashboard.
3. **Scan** — QR check-in with haptic feedback.
4. **Schedule** — upcoming sessions (read-only).
5. **Members** — search and manual check-in.
6. **Club** — profile, packages, registrations, staff team, link to full web dashboard.
7. Premium features (finance, store, analytics) → upgrade on web `/billing`.

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
