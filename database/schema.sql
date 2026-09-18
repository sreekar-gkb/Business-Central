-- BC Deal Sizer persistent storage (Neon Postgres)
-- No per-user accounts: everyone shares one password. Real identity comes
-- from the pair (device_id, name) - device_id is a permanent random id set
-- once per browser (bc_device cookie), name is what the person types in.
-- This means:
--   - same browser + same exact-case name  -> resumes that person's data
--   - same browser + a different name      -> a fresh session, no leakage
--   - a different browser + the same name  -> ALSO a fresh session, so two
--     strangers who both type "John" never end up sharing one dashboard
-- Estimate state and all activity are tied to the session row so work
-- survives server restarts and serverless cold starts (in-memory storage
-- does not).
--
-- Drops leftover tables from an earlier password-based auth prototype
-- (users.passwordHash, old sessions/estimates/activity_logs shape) that
-- nothing in the current codebase reads or writes.
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL DEFAULT 'Anonymous',
  ip_address VARCHAR(64),
  user_agent VARCHAR(500),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_sessions_name ON sessions(name);

CREATE TABLE IF NOT EXISTS estimate_state (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(event_type);
