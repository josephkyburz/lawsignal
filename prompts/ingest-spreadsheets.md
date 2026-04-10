# Spreadsheet Ingestion — Self-Contained Prompt

You are working on the LawSignal project at `/Users/joekyburz/Code/lawsignal`.

Read these files first:
- `CLAUDE.md`
- `.claude/skills/source-ingestion-runbook.md`
- `.claude/skills/raw-data-review.md`
- `scripts/lib/sources.ts`
- `apps/lawsignal-worker/migrations/0003_considerations_broad_variables.sql` (application_process variables)

## Task

Ingest the user's existing law school tracking spreadsheets from `data/research/`. These contain per-school application process data that maps to the `application_process` variable category.

### Source files

1. `data/research/Law School Decision Tracking - Admissions Information.csv`
   - ~50 schools with: USN rank, status checker info, interview requirements, decision communication, scholarship info
   - Maps to variables: `school:status_checker`, `school:interview_required`, `school:interview_format`, `school:decision_method`, `school:merit_aid_timeline`, `school:need_based_aid`

2. `data/research/Law School Decision Tracking - Deposit Amounts and Deadlines.csv`
   - ~30+ schools with: seat deposit amounts (1st and 2nd), deadlines, scholarship deposit deadlines
   - Maps to: `school:deposit_amount_1`, `school:deposit_deadline_1`, `school:deposit_amount_2`, `school:deposit_deadline_2`

3. `data/research/Law School Decision Tracking - Admitted Student Events.csv`
   - ASW dates, financial aid info
   - Maps to: `school:asw_dates`, `school:asw_travel_reimbursement`

4. `data/research/Law School Decision Tracking - Fee Waivers.csv`
   - Fee waiver policies per school

5. `data/research/Military Service Waiver for Application Fee 2022-2023 - Sheet1.csv` (+ Sheet2, Sheet3)
   - Military-specific fee waiver policies
   - Maps to: `school:military_fee_waiver`

### Approach

1. **Read each CSV** and map school names to slugs using `school-matcher.ts`
2. **For unmatched schools**, add aliases to the matcher (these spreadsheets cover ~50 schools including T14 — most should match easily)
3. **Emit observations** for the `application_process` category variables
4. **Note**: These are TEXT observations (not numeric) — use `value_text` column in observations, not `value_numeric`
5. **Source name**: `user_tracking_2023` (these are from the user's 2022-2023 application cycle)
6. **Confidence**: 0.9 (user-collected from official school sources, but may be slightly dated)

### Important

- The spreadsheets use school names like "Yale", "Harvard", "UC Berkeley" — map these through the alias system
- Some fields are multi-line (CSV cells with newlines) — handle parsing carefully
- Deposit amounts contain "$" and commas — strip before storing as numeric
- Dates are in various formats — normalize to ISO 8601
- This data is from the 2022-2023 cycle — note `metric_year = 2023` on observations

### Output

- `scripts/output/spreadsheet_ingest.sql`
- Updated aliases in `scripts/lib/school-matcher.ts` if needed
- Console summary of schools matched/unmatched

### Note

If the ABA 509 school spine doesn't exist yet in D1, this ingest will need to CREATE schools as well (not just observations). Check the schools table first. If empty, create the schools from these spreadsheets as a preliminary spine, then the ABA 509 ingest will fill in the full details.
