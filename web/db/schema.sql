-- My Support database schema
-- Run with: node scripts/migrate.mjs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'officer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL DEFAULT '',
  customer_issue text NOT NULL,
  submitter_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  submitter_email text,
  category text,
  tech_response text,
  email_response text,
  should_handoff boolean,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'pending_approval', 'approved', 'handed_off', 'discarded')),
  processed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_submitter ON tickets(submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
