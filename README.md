# EDMFire Host Panel

> Firebase connected — Apply form data ab Firestore mein store hota hai

A production-ready **Free Fire Tournament Host Management Panel** built with Next.js 16, TypeScript, and Tailwind CSS. Converted from Android Kotlin XML layouts to a modern responsive web application.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 (oklch dark/gaming theme) |
| UI Components | shadcn/ui (45+ Radix UI components) |
| Icons | Lucide React |
| Toast Notifications | Sonner |
| Auth | React Context (Demo) — Firebase Auth (upcoming) |
| Database | Prisma ORM — Firebase Firestore (upcoming) |
| State | React useState + Context API + Zustand |
| Deployment | Vercel |

---

## Project Structure

```
EDMFire-Host-Panel/
│
├── .env.local.example            # Environment variables template
├── .gitignore
├── README.md
├── components.json               # shadcn/ui config
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   ├── favicon.ico               # Browser tab icon
│   ├── logo.png                  # App display logo (clear)
│   ├── logo.svg                  # SVG logo
│   └── robots.txt
│
├── prisma/
│   └── schema.prisma             # Database schema
│
└── src/
    ├── globals.css               # Global styles + scrollbar-none utility
    │
    ├── context/
    │   └── AuthContext.tsx        # Auth state (login/logout/demo bypass)
    │
    ├── lib/
    │   ├── utils.ts              # cn() — Tailwind class merge helper
    │   └── db.ts                 # PrismaClient singleton
    │
    ├── hooks/
    │   ├── use-mobile.ts         # Mobile detection hook
    │   └── use-toast.ts          # Toast hook
    │
    ├── components/
    │   ├── Navbar.tsx             # Sticky top header
    │   ├── Sidebar.tsx            # Desktop collapsible sidebar
    │   ├── BottomTabs.tsx         # Mobile bottom navigation (5 tabs)
    │   ├── ActionCard.tsx         # Reusable gradient card
    │   ├── ComingSoonPage.tsx     # Reusable coming soon page
    │   └── ui/                    # 45+ shadcn/ui components
    │
    └── app/
        ├── layout.tsx             # Root layout (AuthProvider, dark mode)
        │
        ├── login/                 # PUBLIC — Login page
        │   └── page.tsx           #   Login form + "View Demo" bypass
        │
        ├── apply/                 # PUBLIC — Host Application
        │   └── page.tsx           #   7-step application form
        │
        └── (panel)/               # AUTHENTICATED ROUTE GROUP
            ├── layout.tsx         #   Auth guard + Sidebar + BottomTabs
            │
            ├── page.tsx           #   / — Dashboard (7 step cards)
            │
            ├── thumbnail/         #   /thumbnail — STEP 1: Upload Thumbnail
            │   └── page.tsx       #     Pick/Upload image, thumbnail list
            │
            ├── create-tournament/ #   /create-tournament — STEP 2: Create/Update
            │   └── page.tsx       #     Mode toggle, form, status control
            │
            ├── send-notification/ #   /send-notification — STEP 3: Notify Players
            │   └── page.tsx       #     FCM/InApp, title/body, activity log
            │
            ├── results/           #   /results — STEP 4: Update Result
            │   └── page.tsx       #     Player cards, locked fields, editable stats
            │
            ├── prize/             #   /prize — STEP 5: Prize Distribution
            │   └── page.tsx       #     Start distribution, logcat viewer
            │
            ├── refund-coins/      #   /refund-coins — STEP 6: Refund Coins
            │   └── page.tsx       #     Player cards, refund % slider dialog
            │
            ├── settings/          #   /settings — STEP 7: Other Settings
            │   └── page.tsx       #     Coming Soon
            │
            ├── tournaments/       #   /tournaments — All Tournaments
            │   ├── page.tsx       #     List with search
            │   └── [id]/page.tsx  #     /tournaments/:id — Tournament detail
            │
            ├── notification/      #   /notification — Alerts
            │   └── page.tsx       #     Search, filter tabs, empty state
            │
            ├── wallet/            #   /wallet — Full Wallet
            │   └── page.tsx       #     Balance, stats, transaction history
            │
            ├── withdrawal/        #   /withdrawal — Coming Soon
            │   └── page.tsx
            │
            ├── deposit/           #   /deposit — Coming Soon
            │   └── page.tsx
            │
            └── profile/           #   /profile — Host Profile
                └── page.tsx       #     Profile card + menu + Logout
```

---

## Routing

| Route | Access | Navigation | Step | Description |
|---|---|---|---|---|
| `/login` | Public | — | — | Login with email/password + View Demo |
| `/apply` | Public | — | — | 7-step Host Application form |
| `/` | Auth | Home tab | — | Dashboard with 7 workflow steps |
| `/thumbnail` | Auth | — | 1 | Upload tournament thumbnails |
| `/create-tournament` | Auth | — | 2 | Create or update tournaments |
| `/send-notification` | Auth | — | 3 | Send FCM notifications to players |
| `/results` | Auth | — | 4 | Enter match results & scores |
| `/prize` | Auth | — | 5 | Distribute prizes to winners |
| `/refund-coins` | Auth | — | 6 | Refund joining fees |
| `/settings` | Auth | — | 7 | Panel settings (Coming Soon) |
| `/tournaments` | Auth | Tourneys tab | — | All tournaments list |
| `/notification` | Auth | Alerts tab | — | Alerts & notifications |
| `/wallet` | Auth | Wallet tab | — | Balance, deposits, withdrawals |
| `/withdrawal` | Auth | — | — | Withdrawal page (Coming Soon) |
| `/deposit` | Auth | — | — | Deposit page (Coming Soon) |
| `/profile` | Auth | Profile tab | — | Host profile & logout |

---

## 7-Step Workflow

```
┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  STEP 1     │──▶│  STEP 2         │──▶│  STEP 3         │
│  Thumbnail  │   │  Create/Update  │   │  Notify Players │
│  Upload     │   │  Tournament     │   │  (FCM)          │
└─────────────┘   └─────────────────┘   └─────────────────┘
                                                │
┌─────────────┐   ┌─────────────────┐   ┌───────▼─────────┐
│  STEP 6     │◀──│  STEP 5         │◀──│  STEP 4         │
│  Refund     │   │  Prize          │   │  Update Result  │
│  Coins      │   │  Distribution   │   │  & Scores       │
└───────┬─────┘   └─────────────────┘   └─────────────────┘
        │
┌───────▼─────┐
│  STEP 7     │
│  Settings   │
│  (Coming    │
│   Soon)     │
└─────────────┘
```

---

## Responsive Design

- **Desktop (lg+):** Collapsible sidebar navigation (64px expanded / 72px collapsed)
- **Mobile (<lg):** Bottom tab bar (5 tabs: Home, Tourneys, Alerts, Wallet, Profile)
- **Dark purple gaming theme** with oklch color system
- All pages are fully mobile-optimized with compact layouts

---

## Tournament Types

| Type | Value |
|---|---|
| BattleRoyal | `BattleRoyal` |
| ClashSquad | `ClashSquad` |
| LoneWolf | `LoneWolf` |
| FreeTournaments | `FreeTournaments` |

---

## Get Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/EDMFire-Host-Panel.git
cd EDMFire-Host-Panel

# Install dependencies
npm install
# or: bun install

# Copy environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Access

Click **"View Demo"** on the login page to bypass authentication.

---

## Build & Deploy

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo directly at [vercel.com/new](https://vercel.com/new).

---

## Key Features

- **Create Tournament** — Dual mode (Create / Update) with auto-generated IDs
- **Update Mode** — Select tournament from dropdown or enter ID manually
- **Status Control** — Create: locked to Upcoming | Update: Upcoming/Ongoing/Completed
- **Notify Players** — FCM push notifications with live activity log
- **Update Result** — Player cards with locked UID/Name/Level/Slot, editable stats
- **Prize Distribution** — Automated distribution with logcat viewer
- **Refund Coins** — Per-player refund with percentage slider (1-100%)
- **Wallet** — Balance card, transaction history with 5 filter categories
- **Responsive** — Mobile-first design with sidebar + bottom tabs

---

## Upcoming Features

- Firebase Authentication (replace demo auth)
- Firebase Firestore (replace Prisma)
- Real tournament CRUD operations
- Real-time player joining notifications
- Payment gateway integration (UPI)
- Hosting provider image upload (Cloudinary)
- Admin analytics dashboard

---

## License

MIT — Free to use for personal and commercial projects.

---

Built with Next.js, Tailwind CSS, and shadcn/ui.
