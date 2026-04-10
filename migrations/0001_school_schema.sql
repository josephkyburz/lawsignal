-- Migration: 0001_school_schema.sql
-- Creates the core tables for the LawSignal law school data pipeline.
-- Run via: npx wrangler d1 execute lawsignal-db --remote --file=migrations/0001_school_schema.sql

-- ─── schools_raw_sources ─────────────────────────────────────────────────
-- Stores the original scraped payload for each school from each source.
-- Acts as an immutable audit log; never updated after insert.
CREATE TABLE IF NOT EXISTS schools_raw_sources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name    TEXT NOT NULL,          -- e.g. 'aba509_2025', 'usnews_2026', 'lst_2025'
  source_url     TEXT,                   -- original page URL
  school_ipeds_id TEXT,                  -- IPEDS unit ID (federal identifier)
  payload_json   TEXT NOT NULL,          -- full raw JSON blob
  scraped_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── schools ─────────────────────────────────────────────────────────────
-- Canonical school registry. One row per real-world law school.
CREATE TABLE IF NOT EXISTS schools (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_name   TEXT NOT NULL,           -- "Harvard Law School"
  short_name       TEXT,                    -- "Harvard"
  university_name  TEXT,                    -- "Harvard University"
  slug             TEXT UNIQUE,             -- "harvard"
  ipeds_id         TEXT,                    -- IPEDS unit ID
  aba_id           TEXT,                    -- ABA school code
  lsac_id          TEXT,                    -- LSAC school code
  city             TEXT,
  state            TEXT,                    -- 2-letter code
  region           TEXT,                    -- Northeast / South / Midwest / West
  school_type      TEXT,                    -- 'private' | 'public'
  website_url      TEXT,
  is_visible       INTEGER NOT NULL DEFAULT 0,
  review_status    TEXT NOT NULL DEFAULT 'needs_review',
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools(state);

-- ─── school_identities ───────────────────────────────────────────────────
-- Cross-source identity spine. Maps external IDs to our canonical school.
CREATE TABLE IF NOT EXISTS school_identities (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id       INTEGER NOT NULL,
  id_type         TEXT NOT NULL,           -- 'ipeds' | 'aba' | 'lsac' | 'usnews' | 'lst'
  external_id     TEXT NOT NULL,
  source_name     TEXT NOT NULL,           -- which ingest added this
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE(id_type, external_id)
);

-- ─── school_metrics ──────────────────────────────────────────────────────
-- Observed factual data points for a school, keyed to a source and year.
-- Multiple rows per school expected (one per source/year combo).
CREATE TABLE IF NOT EXISTS school_metrics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id       INTEGER NOT NULL,
  metric_year     INTEGER,                 -- academic year the data pertains to

  -- Rankings
  usnews_rank         INTEGER,
  usnews_peer_score   REAL,
  usnews_lawyer_score REAL,

  -- Admissions
  median_lsat         INTEGER,
  lsat_25th           INTEGER,
  lsat_75th           INTEGER,
  median_gpa          REAL,
  gpa_25th            REAL,
  gpa_75th            REAL,
  acceptance_rate     REAL,                -- 0.0-1.0
  total_applicants    INTEGER,
  total_enrolled      INTEGER,
  class_size          INTEGER,             -- 1L entering class

  -- Cost & aid
  tuition_resident    INTEGER,             -- USD
  tuition_nonresident INTEGER,
  total_cost_of_attendance INTEGER,
  median_grant        INTEGER,
  pct_receiving_grants REAL,               -- 0.0-1.0
  pct_full_tuition    REAL,                -- 0.0-1.0
  median_debt_at_grad INTEGER,

  -- Employment (10 months post-grad, ABA/NALP)
  employment_biglaw       REAL,            -- 0.0-1.0 (firms 501+)
  employment_fc           REAL,            -- federal clerkship rate
  employment_biglaw_fc    REAL,            -- combined BigLaw + FC
  employment_jd_required  REAL,
  employment_bar_required REAL,
  employment_business     REAL,            -- JD advantage / business
  employment_public_interest REAL,
  employment_government   REAL,
  employment_academia     REAL,
  unemployment_rate       REAL,

  -- Bar passage
  bar_passage_rate        REAL,            -- school-wide first-time
  bar_passage_jurisdiction TEXT,           -- primary jurisdiction tested

  -- Academic environment
  student_faculty_ratio   REAL,
  full_time_faculty       INTEGER,
  clinics_count           INTEGER,
  journals_count          INTEGER,
  library_volumes         INTEGER,

  -- Source attribution
  source_name     TEXT NOT NULL,
  source_url      TEXT,
  confidence      REAL DEFAULT 1.0,        -- 0.0-1.0
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE INDEX IF NOT EXISTS idx_school_metrics_school ON school_metrics(school_id);
CREATE INDEX IF NOT EXISTS idx_school_metrics_year ON school_metrics(metric_year);

-- ─── variables ───────────────────────────────────────────────────────────
-- Catalog of all observable variables across all sources.
CREATE TABLE IF NOT EXISTS variables (
  id              TEXT PRIMARY KEY,        -- e.g. 'aba509:median_lsat'
  display_name    TEXT NOT NULL,
  description     TEXT,
  category        TEXT,                    -- 'admissions' | 'employment' | 'cost' | 'academic' | 'rankings'
  data_type       TEXT DEFAULT 'number',   -- 'number' | 'rate' | 'currency' | 'rank' | 'text'
  unit            TEXT,                    -- 'USD' | 'pct' | 'ratio' | null
  source_name     TEXT,
  is_observable   INTEGER DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── observations ────────────────────────────────────────────────────────
-- Granular per-variable observations. The workhorse table for scoring.
CREATE TABLE IF NOT EXISTS observations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id       INTEGER NOT NULL,
  variable_id     TEXT NOT NULL,
  value_numeric   REAL,
  value_text      TEXT,
  metric_year     INTEGER,
  source_name     TEXT NOT NULL,
  source_url      TEXT,
  confidence      REAL DEFAULT 1.0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (variable_id) REFERENCES variables(id)
);

CREATE INDEX IF NOT EXISTS idx_obs_school ON observations(school_id);
CREATE INDEX IF NOT EXISTS idx_obs_variable ON observations(variable_id);
CREATE INDEX IF NOT EXISTS idx_obs_year ON observations(metric_year);

-- ─── school_review_queue ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_review_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id   INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  priority    INTEGER DEFAULT 3,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);
