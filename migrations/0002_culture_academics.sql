-- Migration: 0002_culture_academics.sql
-- Adds culture/academic fields to schools table and seeds initial variables.
-- Run via: npx wrangler d1 execute lawsignal-db --remote --file=migrations/0002_culture_academics.sql

-- ─── Add grading system to schools ───────────────────────────────────────
ALTER TABLE schools ADD COLUMN grading_system TEXT;
-- Values: 'pass_fail', 'curved', 'modified_curve', 'honors_pass_fail', 'other'

ALTER TABLE schools ADD COLUMN political_lean TEXT;
-- Values: 'very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative'
-- Editorial assessment, not a hard metric

-- ─── Seed core variables ─────────────────────────────────────────────────
-- These are the Research Variables identified from the decision analysis.

-- Admissions / Selectivity
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('aba509:median_lsat', 'Median LSAT', '50th percentile LSAT score of entering class', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:lsat_25th', 'LSAT 25th Percentile', '25th percentile LSAT', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:lsat_75th', 'LSAT 75th Percentile', '75th percentile LSAT', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:median_gpa', 'Median GPA', '50th percentile undergraduate GPA', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:gpa_25th', 'GPA 25th Percentile', '25th percentile GPA', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:gpa_75th', 'GPA 75th Percentile', '75th percentile GPA', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:acceptance_rate', 'Acceptance Rate', 'Percentage of applicants offered admission', 'admissions', 'rate', 'pct', 'aba509', 1),
  ('aba509:total_applicants', 'Total Applicants', 'Number of applications received', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:total_enrolled', 'Total Enrolled (1L)', 'Entering 1L class size', 'admissions', 'number', NULL, 'aba509', 1),
  ('aba509:class_size', '1L Class Size', 'Entering class size', 'admissions', 'number', NULL, 'aba509', 1);

-- Cost
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('aba509:tuition_resident', 'Tuition (Resident)', 'Annual in-state tuition', 'cost', 'currency', 'USD', 'aba509', 1),
  ('aba509:tuition_nonresident', 'Tuition (Non-Resident)', 'Annual out-of-state tuition', 'cost', 'currency', 'USD', 'aba509', 1),
  ('aba509:median_grant', 'Median Grant', 'Median scholarship/grant amount', 'cost', 'currency', 'USD', 'aba509', 1),
  ('aba509:pct_receiving_grants', '% Receiving Grants', 'Percentage of students receiving grants', 'cost', 'rate', 'pct', 'aba509', 1),
  ('aba509:pct_full_tuition', '% Full Tuition Scholarship', 'Percentage receiving full tuition', 'cost', 'rate', 'pct', 'aba509', 1),
  ('aba509:median_debt', 'Median Debt at Graduation', 'Median student debt upon graduating', 'cost', 'currency', 'USD', 'aba509', 1),
  ('lst:total_coa', 'Total Cost of Attendance', 'Annual total cost including living expenses', 'cost', 'currency', 'USD', 'lst', 1),
  ('external:col_index', 'Cost of Living Index', 'City/metro cost of living index (national avg = 100)', 'cost', 'number', NULL, 'external', 1);

-- Employment
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('aba509:employment_biglaw', 'BigLaw Placement Rate', 'Percent employed at firms of 501+ attorneys', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:employment_fc', 'Federal Clerkship Rate', 'Percent obtaining federal clerkships', 'employment', 'rate', 'pct', 'aba509', 1),
  ('lst:employment_biglaw_fc', 'BigLaw + FC Rate', 'Combined BigLaw and federal clerkship rate', 'employment', 'rate', 'pct', 'lst', 1),
  ('aba509:employment_jd_required', 'JD-Required Rate', 'Percent in jobs requiring a JD', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:unemployment_rate', 'Unemployment Rate', 'Percent unemployed and seeking at 10 months', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:bar_passage_rate', 'Bar Passage Rate', 'First-time bar passage rate', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:employment_government', 'Government Placement Rate', 'Percent employed in government', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:employment_pi', 'Public Interest Rate', 'Percent employed in public interest', 'employment', 'rate', 'pct', 'aba509', 1);

-- Academic
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('aba509:student_faculty_ratio', 'Student-Faculty Ratio', 'Ratio of students to full-time faculty', 'academic', 'ratio', NULL, 'aba509', 1),
  ('aba509:full_time_faculty', 'Full-Time Faculty', 'Number of full-time faculty members', 'academic', 'number', NULL, 'aba509', 1),
  ('school:clinics_count', 'Clinics', 'Number of clinical programs offered', 'academic', 'number', NULL, 'school_website', 1),
  ('school:journals_count', 'Journals', 'Number of student-edited journals', 'academic', 'number', NULL, 'school_website', 1),
  ('school:study_abroad_count', 'Study Abroad Programs', 'Number of study abroad or semester-away programs', 'academic', 'number', NULL, 'school_website', 1),
  ('school:dual_degree_count', 'Dual Degree Programs', 'Number of joint/dual degree programs offered', 'academic', 'number', NULL, 'school_website', 1),
  ('school:first_year_section_size', '1L Section Size', 'Typical first-year section size', 'academic', 'number', NULL, 'school_website', 1);

-- Rankings / Prestige
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('usnews:overall_rank', 'US News Rank', 'US News & World Report overall ranking', 'rankings', 'rank', NULL, 'usnews', 1),
  ('usnews:peer_score', 'Peer Assessment Score', 'US News peer assessment (1.0-5.0)', 'rankings', 'number', NULL, 'usnews', 1),
  ('usnews:lawyer_score', 'Lawyer/Judge Assessment', 'US News lawyer/judge assessment (1.0-5.0)', 'rankings', 'number', NULL, 'usnews', 1);

-- Culture
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('school:grading_system', 'Grading System', 'Pass/fail, curved, modified curve, etc.', 'culture', 'text', NULL, 'school_website', 1),
  ('school:veteran_enrollment', 'Veteran Enrollment', 'Number of enrolled military veterans', 'culture', 'number', NULL, 'school_website', 1),
  ('aba509:minority_pct', 'Minority Enrollment %', 'Percentage of minority students', 'culture', 'rate', 'pct', 'aba509', 1);

-- Geographic
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('external:city_climate_index', 'Climate Index', 'City climate desirability index', 'geographic', 'number', NULL, 'external', 1),
  ('external:bah_rate', 'BAH Rate (E5)', 'Basic Allowance for Housing for the school ZIP', 'geographic', 'currency', 'USD', 'dod', 1);
