# BedWars Fan App: Kit Explorer & Team Counter

A competitive companion app for Roblox BedWars (Easy.gg): browse the 30-kit database, compare kits, get counter recommendations for enemy drafts, and build personal tier lists.

**Master specification:** [docs/SPEC.md](docs/SPEC.md) — game meta (Part A), product spec (Part B), and the fan-project MVP plan with Panel of Experts, 5 domain views, and 10 custom features (Part C).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS 4 (dark slate theme `#0F172A`)
- API: Express 5, session authentication
- DB: PostgreSQL + Drizzle ORM, Zod validation
- Deployment: Replit (public URL)

## Run

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
