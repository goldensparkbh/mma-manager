# Nawady Platform — Complete Mind Map

End-to-end map of the platform: web, mobile apps, API, and database. Use this document to trace any workflow across layers.

**Last updated:** June 2026

---

## 1. Platform Root

```mermaid
mindmap
  root((Nawady MMA Manager))
    Users
      Platform Admin
        Manage all clubs
        Plans billing support push
      Club Staff
        Web dashboard
        Staff mobile app
      Members
        Web portal PWA
        Member mobile app
      Public
        Landing embed checkin kiosk
    Apps
      Web Client
        Vite React wouter
        client/src
      Server
        Express Node tsx
        server/
      Mobile
        dojo-member Expo 54
        dojo-staff Expo 54
      Shared
        shared/schema planFeatures clubTypes
    Infrastructure
      PostgreSQL schema.sql
      JWT auth Bearer
      Tap Payments BHD
      Expo Push notifications
      File uploads /uploads
      i18n ar en RTL
```

---

## 2. Who Uses What

```mermaid
flowchart LR
  subgraph Public
    L[Landing /]
    E[Embed /embed/:slug]
    K[Check-in /checkin/:slug]
    D[Discover APIs]
  end

  subgraph PlatformAdmin
    PA[Platform Admin UI]
    PA --> PT[tenants plans payments]
    PA --> PS[support push admins leads]
  end

  subgraph ClubStaff
    W[Web Dashboard]
    SA[Staff App]
    W --> API1[/api/* staff/]
    SA --> API1
  end

  subgraph Members
    MP[Web Portal /portal/:slug]
    MA[Member App]
    MP --> API2[/api/portal/*]
    MA --> API2
    MA --> D
  end

  API1 --> DB[(PostgreSQL)]
  API2 --> DB
  PT --> DB
  PS --> DB
  D --> DB
  L --> LEADS[demo_leads]
```

---

## 3. Authentication Flows

```mermaid
mindmap
  root((Auth JWT))
    Staff Web and Staff App
      POST /api/auth/login
      POST /api/auth/register
      accountType staff
      tenantId required
      role admin coach staff custom
      permissions from roles table
      planFeatures from tenant_subscriptions
      GET /api/auth/me
    Platform Admin
      Same login endpoint
      Checked before tenant users
      isPlatformAdmin true
      tenantId null
      platformPermissions RBAC
      Sections not URL routes
    Member Portal Web
      POST /api/portal/:slug/login
      POST /api/portal/:slug/otp/*
      accountType member
      memberId in JWT
      Separate portal token
    Member App
      Same portal auth
      SecureStore portal_token
      club_slug in AsyncStorage
      switchClub leaveClub flows
    Impersonation
      Platform admin only
      POST /api/platform/tenants/:id/impersonate
      Staff JWT with impersonatedBy
      Banner exit restores admin token
    Gates
      SubscriptionGate inactive to /billing
      RequirePermission role based
      RequirePlanFeature SaaS tier
      tenantAccess checkTenantAccess
      planFeatureAccess API 403
```

### JWT Payload (`AuthPayload`)

| Field | Purpose |
|-------|---------|
| `userId` | Staff user, platform admin, or member account ID |
| `tenantId` | Club ID (null for platform admin) |
| `email` | Login email |
| `role` | Tenant role or platform role ID |
| `isPlatformAdmin` | Platform operator flag |
| `platformPermissions` | Platform RBAC array |
| `impersonatedBy` | Platform admin ID when impersonating |
| `accountType` | `"staff"` or `"member"` |
| `memberId` | Member ID for portal sessions |

---

## 4. Database — All 42 Tables

```mermaid
mindmap
  root((PostgreSQL))
    Platform SaaS
      subscription_plans
        free starter pro enterprise
        features maxMembers maxUsers
      tenants
        slug status trial active suspended
      tenant_subscriptions
        denormalized plan snapshot
      platform_admins
      platform_admin_roles
      platform_payments Tap billing
      demo_leads landing CRM
      support_conversations
      support_messages
      platform_settings push config
      platform_broadcasts
      web_notification_receipts
    Tenant Core
      users staff accounts
      roles custom permissions JSONB
      tenant_settings
        club_type branding modules
      tenant_counters member_id seq
      members profiles qr_token branch
      packages duration or sessions
      subscriptions member packages
      attendance checkin records
      belts rank definitions
      member_belts awards stripes
      products store inventory
      sales POS receipts
      expenses
      activity_logs audit
      events calendar camps
    Scheduling
      coaches linked to users
      class_templates recurring
      class_sessions concrete dates
      tenant_booking_settings
        public slug portal branding
      member_accounts portal login
      bookings confirmed waitlist
      portal_otp_codes phone OTP
    Payments Notify
      member_payments Tap charges
      member_payment_methods saved cards
      notification_templates
      notification_queue email SMS WA
    Extensions
      branches multi-location
      families group accounts
      family_members
      event_registrations camps
      coach_commission_rules
      coach_commission_entries
      tenant_webhooks outbound
      push_device_tokens Expo
```

### Table Reference

#### Platform (SaaS operator)

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Nawady SaaS plan catalog (pricing, limits, `features` JSONB) |
| `tenants` | Club accounts (slug, status: active/trial/suspended/cancelled, trial dates) |
| `tenant_subscriptions` | Snapshotted subscription per tenant (plan fields denormalized) |
| `platform_admin_roles` | Platform RBAC presets (`super_admin`, `support`, `billing`, `operations`) |
| `platform_admins` | Platform operator logins |
| `platform_payments` | Tenant→platform billing via Tap |
| `support_conversations` | Tenant support tickets |
| `support_messages` | Messages in support threads (tenant_user / platform_admin / bot) |
| `demo_leads` | Landing-page demo requests CRM |
| `platform_settings` | Key-value platform config (e.g. push) |
| `platform_broadcasts` | Admin broadcast notifications (web + mobile) |
| `web_notification_receipts` | Staff users who dismissed web broadcast popups |

#### Tenant core (staff app)

| Table | Purpose |
|-------|---------|
| `users` | Staff accounts per tenant (email/password, `role`) |
| `roles` | Custom tenant roles with `permissions` JSONB |
| `tenant_settings` | Branding, club type, progression/module/member field config |
| `tenant_counters` | Auto-increment source for `member_id` display numbers |
| `members` | Member profiles (health, docs, `qr_token`, `branch_id`, `custom_fields`) |
| `packages` | Membership products (duration or session-based) |
| `subscriptions` | Active member subscriptions linked to packages |
| `attendance` | Check-in/out records |
| `belts` | Progression rank definitions |
| `member_belts` | Awards per member (with stripes) |
| `products` | Store inventory |
| `sales` | POS transactions / receipts |
| `expenses` | Club expenses |
| `activity_logs` | Audit trail |
| `events` | Calendar notes + camps/tournaments/workshops |

#### Scheduling & bookings

| Table | Purpose |
|-------|---------|
| `coaches` | Coach profiles (optional link to `users`) |
| `class_templates` | Recurring class definitions |
| `class_sessions` | Concrete scheduled sessions |
| `tenant_booking_settings` | Portal config (window, waitlist, Tap, branding, public slug) |
| `member_accounts` | Member portal credentials (phone/password) |
| `bookings` | Session reservations (confirmed/waitlist/cancelled/attended) |
| `portal_otp_codes` | Phone OTP for passwordless portal login |

#### Payments & notifications

| Table | Purpose |
|-------|---------|
| `member_payments` | Member→club Tap charges |
| `member_payment_methods` | Saved Tap cards per member |
| `notification_templates` | Per-event email/WhatsApp/SMS templates |
| `notification_queue` | Outbound notification queue |

#### Phase 2/3 extensions

| Table | Purpose |
|-------|---------|
| `branches` | Multi-location clubs |
| `families` | Family group accounts |
| `family_members` | Members in a family |
| `event_registrations` | Camp/event sign-ups |
| `coach_commission_rules` | Commission config per tenant |
| `coach_commission_entries` | Calculated commission ledger |
| `tenant_webhooks` | Outbound webhook endpoints |
| `push_device_tokens` | Expo push tokens (member + staff) |

---

## 5. Web Client — Routes & Features

```mermaid
mindmap
  root((Web Client))
    Public Unauthenticated
      / Landing marketing leads
      /login staff login
      /register new club signup
      /payment/result Tap callback
    Platform Admin no URLs
      overview stats
      leads demo_leads
      tenants impersonate edit
      plans CRUD
      payments platform_payments
      support chat inbox
      push broadcasts config
      admins RBAC
    Club Staff Dashboard
      / Dashboard KPIs calendar
      Membership
        /members CRUD belts docs QR
        /attendance daily log
        /scan QR camera checkin
        /schedule classes coaches bookings
        /camps events registrations
        /belts progression ranks
      Finance
        /subscriptions packages
        /store POS inventory
        /sales history receipts
        /expenses
        /analytics reports
        /finance P and L
      System
        /users staff roles
        /system-settings club type webhooks backup
        /billing SaaS subscription
        /logs audit trail
      Overlays
        WebBroadcastListener popups
        SupportChatWidget
        ScreenSaver
        ImpersonationBanner
    Member Portal
      /portal/:slug login OTP password
      /portal/:slug/home classes bookings camps pay profile
      /portal/:slug/payment/result
    Public Tools
      /embed/:slug schedule packages camps
      /checkin/:slug kiosk QR
    Contexts
      AuthProvider staff session
      PortalAuthProvider member session
      LanguageProvider ar en RTL
      SupportChatProvider
      TanStack Query apiJson
```

### Shell Routing (`client/src/App.tsx`)

| Path prefix | Shell | File |
|-------------|-------|------|
| `/portal/*` | Member portal | `client/src/pages/portal/index.tsx` |
| `/embed/*` | Public embed widget | `client/src/pages/embed.tsx` |
| `/checkin/*` | Public QR check-in kiosk | `client/src/pages/checkin.tsx` |
| Unauthenticated | Public marketing/auth | `PublicRoutes` |
| `user.isPlatformAdmin` | Platform admin | `client/src/pages/platform-admin.tsx` |
| Authenticated club user | Sidebar + Router | Club staff app |

### Club Staff Routes

| Route | Page | Gate | Purpose |
|-------|------|------|---------|
| `/` | `dashboard.tsx` | — | KPI dashboard |
| `/members` | `members.tsx` | `members.view` | Member CRUD |
| `/attendance` | `attendance.tsx` | `attendance.view` | Daily attendance |
| `/scan` | `scan.tsx` | `attendance.add` | QR scanner |
| `/schedule` | `schedule.tsx` | `classes.view` | Class schedule |
| `/subscriptions` | `subscriptions.tsx` | `subscriptions.view` | Packages + subs |
| `/store` | `store.tsx` | `store.view` + plan `store` | Store + POS |
| `/sales` | `sales.tsx` | `sales.view` + plan `sales` | Sales history |
| `/belts` | `belts.tsx` | `belts.view` + plan `belts` | Belt progression |
| `/analytics` | `analytics.tsx` | `finance.view` + plan `analytics` | Reports |
| `/camps` | `camps.tsx` | `classes.view` + plan `camps` | Camps/events |
| `/finance` | `finance.tsx` | `finance.view` + plan `finance` | P&L report |
| `/expenses` | `expenses.tsx` | `finance.view` + plan `finance` | Expenses |
| `/users` | `users.tsx` | `users.view` | Staff + roles |
| `/logs` | `logs.tsx` | `logs.view` + plan `logs` | Audit log |
| `/system-settings` | `system-settings.tsx` | `settings.view` | Club config |
| `/billing` | `billing.tsx` | — | SaaS subscription |

### Platform Admin Sections (in-app state, not URL routes)

| Section | Panel |
|---------|-------|
| `overview` | Stats + recent tenants |
| `leads` | `platform-leads-panel.tsx` |
| `tenants` | Tenant list, impersonate |
| `plans` | Subscription plan CRUD |
| `payments` | `PlatformPaymentsPanel` |
| `support` | `PlatformSupportPanel` |
| `push` | `platform-push-panel.tsx` |
| `admins` | `PlatformAdminsPanel` |

---

## 6. API Surface

```mermaid
mindmap
  root((API /api))
    Public No Auth
      health plans club-types
      clubs discover schedule
      public/:slug info schedule packages camps checkin
      portal/:slug info otp login
      auth register login
      leads webhook tap
      portal payments confirm
    Auth Required
      auth me password email
      push-token staff Expo
    Member Portal
      portal me classes bookings
      portal packages camps payments
      portal qr attendance progression
      portal family switch-member
      portal push-token
    Platform Admin
      platform stats tenants plans
      platform payments support
      platform push config broadcast
      platform admins leads
    Staff Tenant
      dashboard members attendance
      subscriptions packages belts
      products sales expenses
      users roles logs events
      classes templates sessions
      bookings booking-settings
      member-payments notifications
      branches families analytics camps
      commissions webhooks settings
      tenant subscription payments support
      backup export import
      notifications broadcasts unread ack
    Middleware Chain
      authMiddleware JWT
      requireStaffAccount not member
      tenantAccess subscription check
      planFeatureAccess feature gates
      requireTenant skip platform admin
      requirePlatformAdmin RBAC
```

### Middleware Order

1. **Public** — no auth
2. **`authMiddleware`** — Bearer JWT required
3. **Platform routes** — `requirePlatformAdmin` (+ optional `requirePlatformPermission`)
4. **Tenant routes** — `requireStaffAccount` → `tenantAccess` → `planFeatureAccess` → `requireTenant`

### Plan Feature API Gates (`API_FEATURE_GATES`)

These prefixes return 403 if not on plan: `/products`, `/sales`, `/expenses`, `/finance`, `/analytics`, `/camps`, `/belts`, `/logs`, `/webhooks`, `/branches`.

Inactive tenants can still hit: `/tenant/subscription`, `/tenant/payments/*`, `/tenant/support/*`.

---

## 7. Mobile Apps

```mermaid
mindmap
  root((Mobile Apps))
    dojo-member Member
      Modes
        Discover unauthenticated
        Member authenticated per club
      Discover Tabs
        Explore categories featured
        Clubs search filter
        Schedule cross-club
        Account favorites recent signin
      Member Tabs
        Home subscription next booking
        Classes book waitlist
        Bookings cancel
        Pay TAP checkout history
        Profile QR family progression
      Stack Screens
        onboarding club profile class detail
        login modal payment-result
        notifications local inbox
      Auth
        portal_token SecureStore
        club_slug AsyncStorage
        OTP or password
        switchClub leaveClub
      APIs
        /api/portal/* authenticated
        /api/clubs /api/discover public
        /api/public/:slug public
      Push
        POST /api/portal/push-token
        listeners deep links inbox
    dojo-staff Staff
      Tabs
        Today stats classes quick actions
        Scan camera QR checkin
        Schedule read-only sessions
        Members search manual checkin
        Club plan info links
      Stack Screens
        settings packages registrations team
        login register bootstrap
      Auth
        staff_token POST /api/auth/login
        rejects platform admin
        register planSlug free
        planFeatures planLimits from me
      APIs
        /api/auth/* /api/members
        /api/attendance /api/classes
        /api/bookings /api/packages
        /api/users /api/settings
        /api/public/:slug/checkin no auth
      Push
        POST /api/push-token
        no local inbox listeners
      Free Tier UX
        UpgradeBanner to web /billing
        plan limits display only
        premium modules web-only
    Shared Pattern
      Expo Router 54
      TanStack Query
      duplicated lib/ per app
      EXPO_PUBLIC_API_URL
      no shared workspace package
```

### dojo-member API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/portal/:slug/info` | Club branding |
| GET | `/api/portal/me` | Member session |
| POST | `/api/portal/:slug/login` | Password login |
| POST | `/api/portal/:slug/otp/request` | OTP request |
| POST | `/api/portal/:slug/otp/verify` | OTP verify |
| GET | `/api/portal/classes` | Bookable classes |
| GET/POST/DELETE | `/api/portal/bookings` | Reservations |
| GET | `/api/portal/camps` | Camp list |
| POST | `/api/portal/camps/:id/register` | Camp signup |
| GET | `/api/portal/packages` | Packages |
| GET/POST | `/api/portal/payments` | Payment history + checkout |
| GET | `/api/portal/qr` | Check-in QR |
| POST | `/api/portal/push-token` | Expo token |
| GET | `/api/clubs`, `/api/discover/schedule` | Discover mode |

### dojo-staff API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Staff login |
| POST | `/api/auth/register` | New club (`planSlug: "free"`) |
| GET | `/api/auth/me` | Session + plan features |
| GET | `/api/attendance?date=` | Today's attendance |
| POST | `/api/attendance` | Manual check-in |
| POST | `/api/public/:slug/checkin` | QR scan (no auth) |
| GET | `/api/members` | Member list |
| GET/PATCH | `/api/settings` | Club settings |
| GET/POST/PATCH | `/api/packages` | Package CRUD |
| GET | `/api/bookings` | Class bookings |
| GET/POST | `/api/users` | Staff + invite |
| POST | `/api/push-token` | Expo token |

---

## 8. Plan Tiers & Feature Gates

```mermaid
mindmap
  root((SaaS Plans))
    Free 0 BHD
      members attendance subscriptions
      schedule registrations settings users
      Staff app free limited
      Web same limited features
    Starter 29
      Paid entry tier
    Professional 59
      store sales finance analytics
      belts camps
    Enterprise 99
      logs integrations webhooks branches
    Gates Web
      Sidebar lock icons
      RequirePlanFeature pages
      UpgradeBanner staff app
    Gates API
      API_FEATURE_GATES 403
      products sales expenses finance
      analytics camps belts logs webhooks branches
    Tenant Access
      checkTenantAccess
      free never expires
      trial suspended blocked
      billing support still work
```

### Feature Matrix

| Feature key | Free | Min paid plan |
|-------------|------|---------------|
| `members` | ✓ | — |
| `attendance` | ✓ | — |
| `subscriptions` | ✓ | — |
| `schedule` | ✓ | — |
| `registrations` | ✓ | — |
| `settings` | ✓ | — |
| `users` | ✓ | — |
| `store` | ✗ | professional |
| `sales` | ✗ | professional |
| `finance` | ✗ | professional |
| `analytics` | ✗ | professional |
| `belts` | ✗ | professional |
| `camps` | ✗ | professional |
| `logs` | ✗ | enterprise |
| `integrations` | ✗ | enterprise |

---

## 9. Club Types (25 Templates)

```mermaid
mindmap
  root((Club Types))
    Martial Arts 12
      karate taekwondo judo bjj
      aikido muay_thai boxing mma
      wrestling krav_maga kung_fu capoeira
    Team Sports 4
      football basketball handball volleyball
    Fitness 5
      swimming gymnastics weightlifting
      general_gym crossfit
    Specialty 3
      tennis parkour climbing
    Hybrid
      hybrid default yoga_pilates legacy
    Per Template Config
      progressionConfig belts levels ranks badges none
      moduleConfig progression store belts toggles
      memberFieldConfig custom fields
      default belts and packages
    Storage
      tenant_settings.club_type
      apply-club-type endpoint
      club-type-picker registration
```

---

## 10. End-to-End Workflows

### A. New Club Signup → First Member

```mermaid
sequenceDiagram
  participant W as Web /register
  participant API as Server
  participant DB as PostgreSQL

  W->>API: POST /api/auth/register
  API->>DB: tenants + users admin + tenant_settings
  API->>DB: roles admin staff coach + default belts packages
  API->>DB: tenant_subscriptions plan free
  API-->>W: JWT staff token
  W->>W: Dashboard if active else /billing

  Note over W,DB: Staff adds member
  W->>API: POST /api/members
  API->>DB: members + tenant_counters member_id
  API->>DB: qr_token generated

  Note over W,DB: Optional portal access
  W->>API: POST /api/members/:id/portal-access
  API->>DB: member_accounts phone password
```

### B. Member Check-in (3 Paths)

```mermaid
flowchart TD
  A[Check-in] --> B[Staff Scan /scan]
  A --> C[Kiosk /checkin/:slug]
  A --> D[Member QR portal or app]

  B --> E[POST /api/attendance or scan resolves member]
  C --> F[POST /api/public/:slug/checkin token]
  D --> G[Staff scans member QR token]

  E --> H[(attendance table)]
  F --> H
  G --> H

  H --> I[Dashboard stats update]
  H --> J[Member app /api/portal/attendance]
```

### C. Class Booking

```mermaid
sequenceDiagram
  participant M as Member App or Portal
  participant API as bookings.ts
  participant DB as PostgreSQL

  M->>API: GET /api/portal/classes
  API->>DB: class_sessions + capacity
  M->>API: POST /api/portal/bookings
  API->>DB: check window waitlist rules
  alt spots available
    API->>DB: bookings status confirmed
  else full + waitlist on
    API->>DB: bookings status waitlist
  end
  API-->>M: booking result

  Note over M,DB: Staff sees bookings
  Staff->>API: GET /api/bookings
  API->>DB: bookings for tenant
```

### D. Billing Chain

```mermaid
flowchart LR
  subgraph Club pays Nawady
    B1[/billing web/] --> T1[POST /api/tenant/payments/checkout]
    T1 --> TAP1[Tap Payment]
    TAP1 --> T2[platform_payments]
    T2 --> TS[tenant_subscriptions active]
  end

  subgraph Member pays Club
    P1[Portal or Member App Pay tab] --> T3[POST /api/portal/payments/checkout]
    T3 --> TAP2[Tap Payment]
    TAP2 --> T4[member_payments]
    T4 --> SUB[subscriptions optional package]
  end
```

### E. Push Notifications (Platform → Users)

```mermaid
sequenceDiagram
  participant PA as Platform Admin Push page
  participant PP as platformPush.ts
  participant DB as PostgreSQL
  participant Web as WebBroadcastListener
  participant Expo as Expo Push API
  participant Apps as Member and Staff Apps

  PA->>PP: POST /api/platform/push/broadcast
  PP->>DB: platform_broadcasts

  alt target web_staff
    PP->>DB: count staff users
    Web->>PP: GET /api/notifications/broadcasts/unread poll 45s
    Web->>Web: AlertDialog popup
    Web->>PP: POST ack
    PP->>DB: web_notification_receipts
  end

  alt target mobile_member or mobile_staff
    PP->>DB: push_device_tokens
    PP->>Expo: sendExpoPush with access token
    Expo->>Apps: device notification
  end
```

### F. Support Chat

```mermaid
flowchart LR
  Staff[Club staff widget] --> TC[POST /api/tenant/support/messages]
  TC --> SC[(support_conversations)]
  SC --> SM[(support_messages)]
  PA[Platform admin Support panel] --> PM[GET/POST /api/platform/support/*]
  PM --> SM
```

---

## 11. Permissions Layers

| Layer | Where | What |
|-------|--------|------|
| Platform RBAC | `shared/platformPermissions.ts` | tenants, plans, payments, support, push, admins |
| Tenant roles | `roles.permissions` JSONB | members.*, attendance.*, store.*, etc. |
| SaaS plan | `subscription_plans.features` | store, finance, analytics, belts, camps, logs… |
| Club modules | `tenant_settings` club type | progression/store/belts toggles per sport |
| API gates | `API_FEATURE_GATES` | Server 403 on premium endpoints |
| Client gates | `RequirePermission`, `RequirePlanFeature` | Route + sidebar locks |

### Platform Permissions

| Permission | Purpose |
|------------|---------|
| `platform.tenants.view` | List/view tenants |
| `platform.tenants.edit` | Edit tenant status/plan |
| `platform.tenants.impersonate` | Login as tenant admin |
| `platform.plans.view` / `.edit` | SaaS plan management |
| `platform.payments.view` | Platform payment history |
| `platform.support.view` / `.reply` | Support inbox |
| `platform.admins.view` / `.edit` | Platform admin users |
| `platform.push.view` / `.edit` / `.send` | Push broadcasts |

### Tenant Staff Permission Groups

`members.*`, `attendance.*`, `belts.*`, `subscriptions.*`, `store.*`, `sales.*`, `finance.*`, `users.*`, `settings.*`, `classes.*`, `coaches.*`, `bookings.*`, `logs.view`

**System roles seeded per tenant:** `admin` (`["*"]`), `staff` (`[]`), `coach` (classes/bookings/attendance view+add).

---

## 12. File Map (Quick Reference)

| Layer | Path |
|-------|------|
| Web entry | `client/src/App.tsx` |
| Web pages | `client/src/pages/*` |
| Platform admin | `client/src/pages/platform-admin.tsx` |
| API routes | `server/routes.ts` |
| Business logic | `server/data.ts` |
| Bookings | `server/bookings.ts` |
| Push (Expo) | `server/push.ts` |
| Push (platform) | `server/platformPush.ts` |
| Member payments | `server/memberPayments.ts` |
| Tap integration | `server/tap.ts` |
| DB schema | `server/db/schema.sql` |
| Shared types | `shared/schema.ts` |
| Plan features | `shared/planFeatures.ts` |
| Club types | `shared/clubTypes.ts` |
| Platform permissions | `shared/platformPermissions.ts` |
| Member app | `apps/dojo-member/app/*` |
| Staff app | `apps/dojo-staff/app/*` |
| i18n | `client/src/lib/i18n/translations.ts` |

### NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Server + client concurrently |
| `npm run build` | Vite production build |
| `npm start` | Production server |
| `npm run check` | TypeScript check |
| `npm run db:migrate` | Run DB migrations |
| `npm run db:seed` | Seed demo data |
| `npm run mobile:member` | Start member Expo app |
| `npm run mobile:staff` | Start staff Expo app |

---

## 13. Known Gaps & Nuances

- Web portal members do **not** receive platform push popups — only club **staff** on the web dashboard.
- Staff app shows upgrade banners but has **no hard feature gates** on screens (limits are informational).
- Tenant staff permissions are enforced **client-side**; the server does not middleware-check `members.view` etc.
- Member app notification inbox is **local only** (AsyncStorage), not synced from the server.
- `apps/mobile-shared` exists but both mobile apps use duplicated local `lib/` copies.
- Platform admin uses **section state**, not URL routes — `/` means Landing when logged out, Dashboard when logged in as club staff.
- `requireTenant` skips platform admins (`tenantId: null`) so platform routes after tenant middleware work correctly.

---

## 14. Provider Tree (Web)

```
LanguageProvider
  └── QueryClientProvider
        └── AuthProvider
              └── AppShell
                    ├── PortalApp (portal paths)
                    ├── EmbedWidget (embed paths)
                    ├── CheckInPage (checkin paths)
                    ├── PublicRoutes (unauthenticated)
                    ├── PlatformAdmin (platform admin user)
                    └── SubscriptionGate → SupportChatProvider → ThemeProvider → club shell
                          └── WebBroadcastListener
```
