# My Support — Web app

Next.js (App Router, TypeScript) front end for the "My Support" ticket platform.
It talks to the existing Python support agent at `PYTHON_API_URL` and stores
data in PostgreSQL.

## Local development

```bash
cp .env.example .env     # then fill in DATABASE_URL (and PYTHON_API_URL)
npm install
npm run migrate          # create tables
npm run seed             # create initial admin/officer accounts
npm run dev              # http://localhost:3000
```

## Scripts

- `npm run migrate` — applies `db/schema.sql` (idempotent).
- `npm run seed` — creates admin/officer accounts from env vars.
- `npm run build` / `npm start` — production build & serve.

## Environment variables

| Name             | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string                          |
| `PYTHON_API_URL` | Base URL of the support agent (default: Render URL) |
| `SESSION_DAYS`   | Session lifetime in days (default 7)                |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`     | seed admin account            |
| `OFFICER_EMAIL` / `OFFICER_PASSWORD` | seed officer account          |

## Deploy on Render

1. Create a **PostgreSQL** instance on Render; copy its internal URL.
2. Create a new **Web Service** with:
   - Root directory: `web`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Env vars: `DATABASE_URL`, `PYTHON_API_URL`, `SESSION_DAYS`
3. After first deploy, run the schema migration:
   `DATABASE_URL=<url> npm run migrate` (or run it as a one-off job).
4. Seed staff: `DATABASE_URL=<url> npm run seed`.

The Python agent is deployed separately at the URL above and called
server-side when an officer processes a ticket.
