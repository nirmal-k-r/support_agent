# My Support — Implementation Plan

Website: "My Support", a support ticket management platform.
The site wraps an existing Python FastAPI agent (`https://support-agent-zkz4.onrender.com`,
exposing `POST /ticket`) with a user-facing submission flow and a staff dashboard.

## Architecture

- **Frontend + app server**: Next.js (App Router, TypeScript) in `web/`, deployed as its own Render service.
- **Database**: PostgreSQL on Render (schema authored here, run as migration).
- **Auth**: Custom email + password. Passwords hashed with bcrypt. Sessions are DB-backed
  (`sessions` table) and identified by an httpOnly cookie.
- **Agent integration**: Next.js calls the Python `/ticket` route server-side via `PYTHON_API_URL`.
- **Libraries**: `pg` (DB), `bcryptjs` (hashing), `zod` (validation), `jose` (token signing), `nanoid` (ids).

## Data model (PostgreSQL)

### users
- `id` uuid pk
- `email` text unique (lowercase)
- `password_hash` text
- `name` text
- `role` text — `user` | `officer` | `admin`
- `created_at` timestamptz default now()

### tickets
- `id` uuid pk
- `conversation_id` text
- `customer_issue` text
- `submitter_user_id` uuid nullable → users.id (null for anonymous)
- `submitter_email` text (required for anonymous)
- `category` text
- `tech_response` text
- `email_response` text
- `should_handoff` boolean
- `status` text — `new` | `pending_approval` | `approved` | `handed_off` | `discarded`
- `processed_by` uuid nullable → users.id
- `approved_by` uuid nullable → users.id
- `approved_at` timestamptz nullable
- `created_at` / `updated_at` timestamptz default now()

### sessions
- `token` text pk
- `user_id` uuid → users.id
- `expires_at` timestamptz
- `created_at` timestamptz default now()

## API (Next.js route handlers)

Auth:
- `POST /api/auth/signup` — public self-registration (role forced to `user`)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

Tickets:
- `POST /api/tickets` — submit; accepts anon (requires `submitter_email`) or logged-in user
- `GET  /api/tickets` — `officer`/`admin` see all; `user` sees own
- `POST /api/tickets/[id]/process` — `officer`/`admin`: call Python `/ticket`, store result.
  - `Should_Handoff == true`  → status `handed_off`
  - `Should_Handoff == false` → store response, status `pending_approval`
- `POST /api/tickets/[id]/approve` — `officer`/`admin`: status `approved`, set `approved_by`/`approved_at`.
  Email send is **deferred** (stubbed with a log/placeholder for now).

Admin (admin only):
- `GET  /api/admin/users`
- `POST /api/admin/users` — create staff (`officer` | `admin`)
- `POST /api/admin/users/[id]/role` — change role

## Pages

- `/` — landing / overview
- `/login`, `/signup` — auth
- `/submit` — ticket submission (anonymous form requests email; logged-in pre-fills user)
- `/dashboard` — ticket list (officer/admin); `/dashboard/[id]` detail with **Process** and **Approve** actions
- `/admin` — staff/user management (admin only)

## Auth / access control

- `user`: submit tickets, view own.
- `officer`: dashboard (all tickets), process, approve.
- `admin`: everything officers can do + `/admin` user/staff management.
- Server components / route handlers read the session cookie; unauthenticated access to
  protected pages redirects to `/login`.

## Environment variables

- `DATABASE_URL` — Postgres connection string (provided by user on Render)
- `PYTHON_API_URL` — `https://support-agent-zkz4.onrender.com`
- `SESSION_SECRET` — used to sign session tokens
- `SESSION_DAYS` — session lifetime (default 7)

## Deployment (Render)

- New **Web Service** pointed at `web/` (build `npm install && npm run build`, start `npm start`).
- Add the env vars above; provision a Render Postgres and run the schema migration on first deploy.
- Existing Python service remains deployed separately at the URL above.

## Build order

1. Scaffold Next.js app in `web/` (TypeScript, App Router).
2. DB schema SQL + migration runner; connection helper.
3. Auth: hashing, sessions, cookie middleware, `/api/auth/*` + `/login` + `/signup`.
4. Ticket submit: `/api/tickets` + `/submit` page (anon + logged-in).
5. Dashboard: `/api/tickets` list, `/dashboard` + detail, process + approve actions.
6. Admin: user/staff management.
7. Seed initial admin/officer accounts; wire env; document Render deploy.
