-- LawSignal D1 schema — app-layer tables (feedback, supporters, reviews)
-- Run once: wrangler d1 execute lawsignal-db --file=workers/schema.sql

CREATE TABLE IF NOT EXISTS feedback_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id     TEXT,
  session_id  TEXT,
  event_name  TEXT NOT NULL,
  properties  TEXT,           -- JSON blob
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_event_name ON feedback_events(event_name);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_events(created_at);

CREATE TABLE IF NOT EXISTS supporters (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_payment_id  TEXT,
  amount             REAL,
  display_name       TEXT,
  message            TEXT,
  is_public          INTEGER DEFAULT 0,
  is_approved        INTEGER DEFAULT 0,
  created_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_supporters_approved ON supporters(is_public, is_approved);

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  body         TEXT NOT NULL,
  attribution  TEXT,
  is_approved  INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);
