

---

## 🚀 Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build
npm run typecheck  # TypeScript check
```

**Test credentials:** `user` / `1234`

---

## 🏗 Folder Structure

```
src/
├── app/
│   ├── App.tsx                    # Root component
│   ├── router.tsx                 # App router (state-based, React Router ready)
│   └── providers/
│       ├── ThemeProvider.tsx      # Light/dark + CSS vars
│       ├── LanguageProvider.tsx   # i18n with JSON locale files
│       ├── AuthProvider.tsx       # JWT-ready mock auth
│       └── AppProvider.tsx        # Progress + history state
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx             # Reusable button (primary / ghost / danger)
│   │   ├── Input.tsx              # Controlled input with error state
│   │   ├── GlassCard.tsx          # 3D glass morphism card
│   │   ├── ThemeToggle.tsx        # Light/dark toggle
│   │   ├── LanguageSwitcher.tsx   # UZ / EN / RU switcher
│   │   └── index.tsx              # Avatar, StatusBadge, ProgressBar, Alert, Tabs, StatCard
│   ├── layout/
│   │   ├── AppShell.tsx           # Root layout + page router
│   │   ├── Sidebar.tsx            # Nav sidebar (drawer on mobile)
│   │   └── Topbar.tsx             # Sticky header
│   └── features/
│       ├── SubjectCard.tsx        # Subject overview card
│       ├── TopicRow.tsx           # Topic list item with status actions
│       ├── QuizPanel.tsx          # Interactive quiz state machine
│       ├── QuizResult.tsx         # Score + review display
│       └── VideoPlayer.tsx        # YouTube iframe + watched toggle
│
├── pages/
│   ├── AuthPage.tsx               # Login / Register / Guest
│   ├── DashboardPage.tsx          # Stats + recent history
│   ├── SubjectsPage.tsx           # Subject grid
│   ├── SubjectPage.tsx            # Topic list for a subject
│   ├── TopicPage.tsx              # Video + Quiz tabs
│   └── ProfilePage.tsx            # Per-subject stats
│
├── services/
│   ├── api.ts                     # Fetch-based HTTP client (Axios-ready)
│   ├── auth.service.ts            # Login / register / token store
│   └── lesson.service.ts          # Progress + history persistence
│
├── hooks/
│   ├── index.ts                   # useTheme, useLang, useAuth, useApp
│   ├── useAuth.ts                 # Convenience re-export
│   ├── useSubjectStats.ts         # Derived stats hook
│   └── useQuiz.ts                 # Quiz state machine hook
│
├── constants/
│   └── index.ts                   # SUBJECTS data, names, status colors
│
├── locales/
│   ├── uz.json                    # Uzbek (default)
│   ├── en.json                    # English
│   └── ru.json                    # Russian
│
├── utils/
│   └── index.ts                   # pct, cn, truncate, relativeTime
│
├── types/
│   └── index.ts                   # All TypeScript types
│
└── styles/
    ├── tokens.css                 # CSS design tokens (light/dark)
    ├── globals.css                # Reset + utility classes
    └── components.module.css      # Shared component styles
```

---

## 🔐 Auth System

- Mock credentials: `user` / `1234` (email or username)  
- Wrong password → shows `"Parol noto'g'ri"` error  
- JWT-ready structure (`tokenStore` in `auth.service.ts`)  
- `AuthProvider` → `useAuth` → protected routing in `App.tsx`  
- Replace `mockLogin()` with real API call when backend is ready

---

## 🎯 Topic Status Logic

| Status | How Set | Color |
|---|---|---|
| 🔵 `completed` | Auto — video watched + all 10 questions correct | Blue |
| 🟢 `inprogress` | User manually | Green |
| 🟡 `onhold` | User manually | Yellow |
| ⚪ `locked` | Default | Gray |

> Users **cannot** manually set `completed`. It's set automatically by the system.

---

## 🌍 Language System

- 3 locales: **UZ 🇺🇿** (default), **EN 🇬🇧**, **RU 🇷🇺**
- JSON-based (`src/locales/*.json`)
- `LanguageProvider` + `useLang()` hook + `t(key)` function
- Persisted in `localStorage`

---

## 🔌 Backend Integration Points

| File | What to replace |
|---|---|
| `services/auth.service.ts` | `mockLogin()` → `api.post('/auth/login', ...)` |
| `services/auth.service.ts` | `mockRegister()` → `api.post('/auth/register', ...)` |
| `services/lesson.service.ts` | `localStorage` → `api.patch('/progress', ...)` |
| `services/api.ts` | `fetch` → `axios` instance |

---

## 📦 Tech Stack

- **React 18** + TypeScript  
- **Vite 4** with path aliases  
- **Context API** (no extra state library needed at this scale)  
- **CSS Modules** + CSS custom properties (token-based theming)  
- **No external UI library** — fully custom design system

---

## 🧠 Scalability Notes

- Max ~180–220 lines per file (enforced by architecture)
- Hooks are pure and reusable
- Services are completely decoupled from UI
- Adding React Router: replace `useRouter()` in `router.tsx` with `react-router-dom` hooks
- Adding Zustand: replace `AppProvider` context with a Zustand store
=======
# react-netlify-app
>>>>>>> 625bda0ef620090a699a8a2983eeb53cafd404ec
