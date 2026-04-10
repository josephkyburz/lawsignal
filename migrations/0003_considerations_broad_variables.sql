-- Migration: 0003_considerations_broad_variables.sql
-- Seeds additional variables from Considerations Broad analysis.
-- Run via: npx wrangler d1 execute lawsignal-db --remote --file=migrations/0003_considerations_broad_variables.sql

-- ─── Employment — deeper cuts ────────────────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('aba509:biglaw_100plus', 'BigLaw 100+ Rate', 'Placement at firms of 100+ attorneys', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:biglaw_250plus', 'BigLaw 250+ Rate', 'Placement at firms of 250+ attorneys', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:state_clerkship', 'State Clerkship Rate', 'State/local clerkship placement rate', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:ft_lt_employment', 'FT/LT Employment Rate', 'Full-time long-term bar-passage-required employment', 'employment', 'rate', 'pct', 'aba509', 1),
  ('aba509:school_funded_pct', 'School-Funded Positions %', 'Share of employment that is school-funded (inflates raw rates)', 'employment', 'rate', 'pct', 'aba509', 1),
  ('nalp:salary_median', 'Median Starting Salary', 'Median starting salary for graduates', 'employment', 'currency', 'USD', 'nalp', 1),
  ('nalp:salary_25th', 'Salary 25th Percentile', '25th percentile starting salary', 'employment', 'currency', 'USD', 'nalp', 1),
  ('nalp:salary_75th', 'Salary 75th Percentile', '75th percentile starting salary', 'employment', 'currency', 'USD', 'nalp', 1),
  ('school:oci_firm_count', 'OCI Firm Count', 'Number of firms participating in on-campus interviews', 'employment', 'number', NULL, 'school_website', 1),
  ('school:career_services_staff_ratio', 'Career Services Staff Ratio', 'Career services staff per student', 'employment', 'ratio', NULL, 'school_website', 1),
  ('school:pi_fellowship_count', 'PI Fellowship Count', 'School-funded post-grad public interest fellowships', 'employment', 'number', NULL, 'school_website', 1),
  ('external:clerkship_feeder_score', 'Clerkship Feeder Score', 'Strength of feeder pipeline to federal judges', 'employment', 'number', NULL, 'external', 1),
  ('aba509:employment_academia', 'Academia Placement Rate', 'Graduates entering legal academia', 'employment', 'rate', 'pct', 'aba509', 1);

-- ─── Cost — deeper cuts ──────────────────────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('aba509:conditional_scholarship_pct', 'Conditional Scholarship %', 'Share of scholarships requiring GPA maintenance', 'cost', 'rate', 'pct', 'aba509', 1),
  ('aba509:scholarship_retention_rate', 'Scholarship Retention Rate', 'Rate at which conditional scholarships are retained', 'cost', 'rate', 'pct', 'aba509', 1),
  ('lst:debt_to_income', 'Debt-to-Income Ratio', 'Expected debt / realistic starting salary', 'cost', 'ratio', NULL, 'lst', 1),
  ('lst:npv_outcome', 'NPV (Debt vs Earnings)', 'Net present value under various repayment scenarios', 'cost', 'currency', 'USD', 'lst', 1),
  ('external:pslf_eligible', 'PSLF Eligibility', 'Whether career path qualifies for Public Service Loan Forgiveness', 'cost', 'text', NULL, 'external', 1),
  ('aba509:median_net_price', 'Median Net Price', 'Median net tuition after all grants/scholarships', 'cost', 'currency', 'USD', 'aba509', 1);

-- ─── Academic — deeper cuts ──────────────────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('school:grading_curve_median', 'Curve Median GPA', 'Mandatory or typical median GPA on the curve', 'academic', 'number', NULL, 'school_website', 1),
  ('school:law_review_access', 'Law Review Access Method', 'Write-on, grade-on, hybrid', 'academic', 'text', NULL, 'school_website', 1),
  ('school:externship_count', 'Externship Placements', 'Number of externship placements available', 'academic', 'number', NULL, 'school_website', 1),
  ('school:simulation_credits', 'Simulation/Practice Credits', 'Credits in trial advocacy, negotiation, clinic simulation', 'academic', 'number', NULL, 'school_website', 1),
  ('aba509:attrition_rate', 'Attrition Rate', 'Percentage of students dropping or transferring out', 'academic', 'rate', 'pct', 'aba509', 1),
  ('aba509:transfer_in_count', 'Transfers In', 'Number of transfer students accepted', 'academic', 'number', NULL, 'aba509', 1),
  ('school:faculty_publications', 'Faculty Research Output', 'Faculty publications and citation metrics', 'academic', 'number', NULL, 'external', 1);

-- ─── Prestige — deeper cuts ──────────────────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('usnews:tier', 'Tier Classification', 'T6/T14/T20/T50 tier membership', 'rankings', 'text', NULL, 'usnews', 1);

-- ─── Culture — deeper cuts ───────────────────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('school:first_gen_support', 'First-Gen Support Programs', 'Dedicated programs for first-generation law students', 'culture', 'text', NULL, 'school_website', 1),
  ('school:diversity_infrastructure', 'Diversity Support', 'Affinity groups, DEI office, support infrastructure', 'culture', 'text', NULL, 'school_website', 1);

-- ─── Application Process (new category) ──────────────────────────────────
INSERT OR IGNORE INTO variables (id, display_name, description, category, data_type, unit, source_name, is_observable)
VALUES
  ('school:status_checker', 'Status Checker Available', 'Whether school provides an online application status checker', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:interview_required', 'Interview Required', 'Whether interview is required, invitation-only, optional, or none', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:interview_format', 'Interview Format', 'Kira, phone, Zoom, in-person, etc.', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:decision_method', 'Decision Communication', 'How admissions decisions are communicated (phone, email, mail)', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:merit_aid_timeline', 'Merit Aid Timeline', 'When scholarship/merit aid information is released', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:need_based_aid', 'Need-Based Aid Available', 'Whether need-based financial aid is offered', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:deposit_amount_1', 'Seat Deposit Amount (1st)', 'First seat deposit amount in USD', 'application_process', 'currency', 'USD', 'school_website', 1),
  ('school:deposit_deadline_1', 'Seat Deposit Deadline (1st)', 'First seat deposit deadline', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:deposit_amount_2', 'Seat Deposit Amount (2nd)', 'Second seat deposit amount in USD (if applicable)', 'application_process', 'currency', 'USD', 'school_website', 1),
  ('school:deposit_deadline_2', 'Seat Deposit Deadline (2nd)', 'Second seat deposit deadline', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:military_fee_waiver', 'Military Fee Waiver', 'Application fee waiver policy for military service members', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:asw_dates', 'Admitted Student Weekend Dates', 'Dates of admitted student visit events', 'application_process', 'text', NULL, 'school_website', 1),
  ('school:asw_travel_reimbursement', 'ASW Travel Reimbursement', 'Whether school reimburses travel for admitted student visits', 'application_process', 'text', NULL, 'school_website', 1),
  ('aba509:yield_rate', 'Yield Rate', 'Percentage of admitted students who enroll', 'admissions', 'rate', 'pct', 'aba509', 1),
  ('lsac:applicants_per_seat', 'Applicants Per Seat', 'Number of applicants per available seat in the cycle', 'admissions', 'ratio', NULL, 'lsac', 1);
