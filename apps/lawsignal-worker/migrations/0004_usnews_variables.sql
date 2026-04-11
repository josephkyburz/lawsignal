-- Migration: 0004_usnews_variables.sql
-- Seeds the variables catalog for the US News ingestion pipeline (L1-4).
-- Run via:
--   npx wrangler d1 execute lawsignal-db --remote --file=apps/lawsignal-worker/migrations/0004_usnews_variables.sql
--
-- Variables are INSERT OR IGNORE so the migration is safe to re-run.
-- The existing `usnews:tier` variable from 0003 is left in place; the
-- authoritative tier variable going forward is `usnews:tier_membership`.

-- ─── Core rankings variables ─────────────────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('usnews:overall_rank',
   'US News Overall Rank',
   'US News & World Report overall Best Law Schools rank. Lower is better (rank 1 = most prestigious). Scoring layer must invert.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:peer_assessment',
   'Peer Assessment Score',
   'US News peer assessment score (1.0-5.0). Survey of law school deans and faculty. Paywalled data — recorded as null where unobservable.',
   'rankings', 'number', NULL, 'us_news', 1),

  ('usnews:lawyer_judge_assessment',
   'Lawyer/Judge Assessment Score',
   'US News lawyer and judge assessment score (1.0-5.0). Survey of practicing attorneys and judges. Paywalled data — recorded as null where unobservable.',
   'rankings', 'number', NULL, 'us_news', 1),

  ('usnews:tier_membership',
   'US News Tier Membership',
   'Bright-line tier classification derived from US News rank: T6/T14/T20/T50/other. Encoded as a 0-4 integer score for the (future) scoring layer.',
   'rankings', 'number', NULL, 'us_news', 1);

-- ─── Specialty rankings ──────────────────────────────────────────────────
-- One variable per US News law specialty. Specialty slug → variable id
-- mapping is mirrored in scripts/ingest/usnews.ts. Add a row here when
-- US News publishes a new specialty; the ingest will skip slugs that
-- have no matching variable row.
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('usnews:specialty_rank_biz',
   'Specialty Rank — Business/Corporate Law',
   'US News specialty rank for Business/Corporate Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_clinical',
   'Specialty Rank — Clinical Training',
   'US News specialty rank for Clinical Training. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_constitutional',
   'Specialty Rank — Constitutional Law',
   'US News specialty rank for Constitutional Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_contracts',
   'Specialty Rank — Contracts/Commercial Law',
   'US News specialty rank for Contracts/Commercial Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_criminal',
   'Specialty Rank — Criminal Law',
   'US News specialty rank for Criminal Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_dispute',
   'Specialty Rank — Dispute Resolution',
   'US News specialty rank for Dispute Resolution. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_environmental',
   'Specialty Rank — Environmental Law',
   'US News specialty rank for Environmental Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_family',
   'Specialty Rank — Family Law',
   'US News specialty rank for Family Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_health',
   'Specialty Rank — Health Care Law',
   'US News specialty rank for Health Care Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_international',
   'Specialty Rank — International Law',
   'US News specialty rank for International Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_ip',
   'Specialty Rank — Intellectual Property Law',
   'US News specialty rank for Intellectual Property Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_legal_writing',
   'Specialty Rank — Legal Writing',
   'US News specialty rank for Legal Writing. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_part_time',
   'Specialty Rank — Part-Time Program',
   'US News specialty rank for Part-Time Law programs. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_tax',
   'Specialty Rank — Tax Law',
   'US News specialty rank for Tax Law. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1),

  ('usnews:specialty_rank_trial',
   'Specialty Rank — Trial Advocacy',
   'US News specialty rank for Trial Advocacy. Lower is better.',
   'rankings', 'rank', NULL, 'us_news', 1);
