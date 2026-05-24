# GetGuac 🥑

**Smart receipt management, rewards tracking & spending insights**
Web: getguac.app | Android + iOS

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Web Framework | **Next.js 14** (App Router) | SSR, API routes, SEO-ready |
| Mobile | **Flutter** (Android + iOS) | Best camera/GPS, single codebase |
| Backend/DB | **Supabase** (PostgreSQL) | ACID, SQL analytics, Row Level Security |
| Auth | **Supabase Auth** | MFA-ready, email verification, built-in |
| Storage | **Supabase Storage** | Receipt images, S3-compatible |
| Server State | **TanStack Query v5** | Caching, background refetch, deduplication |
| Client State | **Zustand** | Lightweight, zero boilerplate |
| Styling | **Tailwind CSS** | Utility-first, responsive |

---

## Project Structure

```
getguac/
├── web/                     <- Next.js 14 web app
│   ├── src/
│   │   ├── app/             <- App Router pages
│   │   │   ├── (auth)/      <- /login, /register
│   │   │   └── (dashboard)/ <- dashboard, receipts, rewards, shopping, car-miles, profile, admin
│   │   ├── hooks/           <- TanStack Query hooks (useReceipts, useRewards...)
│   │   ├── lib/supabase/    <- Browser + Server Supabase clients
│   │   ├── store/           <- Zustand client state
│   │   └── components/      <- Sidebar, TopBar
│   ├── supabase/
│   │   └── schema.sql       <- Complete PostgreSQL schema with RLS
│   ├── middleware.js         <- Auth guard (Supabase SSR)
│   └── .env.local.example   <- Required env vars
│
└── mobile/                  <- Flutter app (Android + iOS)
    ├── lib/
    │   ├── main.dart        <- Supabase.initialize()
    │   ├── providers/       <- auth, receipt, reward providers
    │   ├── screens/         <- All screens
    │   ├── models/          <- Dart models
    │   └── widgets/         <- Bottom nav scaffold
    └── pubspec.yaml         <- supabase_flutter, fl_chart, go_router...
```

---

## Quick Start

### Step 1 — Create Supabase Project

1. Go to supabase.com -> New Project
2. Note your Project URL and anon key (Settings -> API)
3. Go to SQL Editor -> paste and run web/supabase/schema.sql
4. Go to Storage -> Create bucket named receipts (public)
5. Enable Email Auth in Authentication -> Providers

### Step 2 — Web App

```bash
cd getguac/web
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL + anon key

npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
```

### Step 3 — Flutter Mobile

```bash
# Install Flutter: https://flutter.dev/docs/get-started/install/windows
cd getguac/mobile

# Edit lib/main.dart -- replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY
flutter pub get
flutter run
```

---

## Database Schema (PostgreSQL)

| Table | Purpose |
|-------|---------|
| profiles | User profile (auto-created via trigger on signup) |
| receipts | Receipt headers -- store, date, amount, tax |
| receipt_items | Line items -- sku, qty, price, warranty, return |
| rewards | Rewards/coupons -- expiry, type, points |
| shopping_list | Shopping items with frequency & approval |
| car_trips | Mileage tracking -- business/personal |
| payment_options | Saved payment methods |
| stores | Store catalog |
| store_items | Store item catalog |

All tables use Row Level Security -- users can only access their own data.

---

## Admin Setup

In Supabase SQL Editor:
```sql
update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';
```

Admin email for the app: admin@getguac.app

---

## Production Deployment

**Web -> Vercel (recommended)**
```bash
npm install -g vercel
cd web && vercel --prod
```

**Android**
```bash
flutter build appbundle --release
```

**iOS**
```bash
flutter build ios --release
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```
