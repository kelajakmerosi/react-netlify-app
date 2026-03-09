# Kelajak Merosi

Full-stack educational platform — **React + Vite** (client) and **Node.js / Express / PostgreSQL** (server).

## Project Structure

```
kelajakmerosi/
├── client/          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── app/         # App entry, router, providers
│   │   ├── components/  # UI, feature, and layout components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Route-level page components
│   │   ├── services/    # API service layer
│   │   ├── styles/      # Global CSS + design tokens
│   │   └── types/       # TypeScript type definitions
│   └── vite.config.ts
│
└── server/          # Node.js / Express REST API
    └── src/
        ├── config/        # DB connection
        ├── controllers/   # Route handlers
        ├── middleware/     # Auth + error middleware
        ├── models/        # PostgreSQL data access modules
        └── routes/        # Express routers
```

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL connection URL

### Install all dependencies
```bash
npm run install:all
```

### Configure environment
```bash
cp server/.env.example server/.env
# Edit server/.env — set DATABASE_URL, JWT_SECRET, etc.
```

### Run in development (client + server concurrently)
```bash
npm install           # install concurrently at root
npm run dev
```

Quick start alias:
```bash
npm start
```

Or run independently:
```bash
npm run dev:client    # Vite on http://localhost:5173
npm run dev:server    # Express on http://localhost:8080
```

Client-only commands:
```bash
cd client
npm start             # same as npm run dev
npm run test
npm run typecheck
```

Server-only commands:
```bash
cd server
npm run dev
npm run test
```

### Build for production
```bash
npm run build:client
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/subjects` | List all subjects |
| GET | `/api/users/profile` | Get user profile |
| GET | `/api/users/progress` | Get user progress |
| PATCH | `/api/users/progress/:subjectId/:topicId` | Upsert lesson progress payload |
| GET | `/api/admin/info` | Admin system info (admin only) |
| GET | `/api/admin/users` | Admin user list (admin only) |

## Admin Access

- Admin route is `/admin`.
- Non-admin authenticated users are redirected to `/dashboard`.
- Promote a user in PostgreSQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

## Troubleshooting

- `Progress sync failed: API server is unreachable`:
  Start the backend: `cd server && npm run dev`.
- `CORS blocked for origin ...`:
  Add your frontend origin to `CLIENT_URL` in `server/.env` (comma-separated values allowed).
- `EADDRINUSE: address already in use :::8080`:
  Another process uses port 8080. Stop it or run server with a different `PORT`.
- `AggregateError [ETIMEDOUT]` / `[db] Connection error` on startup:
  1. Refresh `DATABASE_URL` in `server/.env` from Supabase Dashboard (Transaction pooler URI).
  2. Validate the parsed endpoint from your env: `node -e "const fs=require('fs');const m=fs.readFileSync('server/.env','utf8').match(/^DATABASE_URL=(.*)$/m);const u=new URL(m[1]);console.log(u.hostname,u.port||5432)"`.
  3. Test TCP reachability to that host/port: `nc -vz <db-host> <db-port>`.
  4. If it times out on your normal network, retry using hotspot/VPN to isolate local network path issues, then start again with `cd server && npm run dev`.
