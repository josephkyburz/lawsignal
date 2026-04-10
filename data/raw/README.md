# Raw Data Inbox

Drop raw source files here for ingestion. Each subfolder corresponds
to a data source. The ingest scripts in `scripts/ingest/` read from
these folders.

## Folders

| Folder | Source | Expected formats | Priority |
|---|---|---|---|
| `aba509/` | ABA 509 Required Disclosures | Excel (.xlsx), CSV, PDF | 1 — do first |
| `usnews/` | US News Best Law Schools | JSON, CSV, scraped HTML | 2 |
| `lst/` | Law School Transparency | CSV, JSON | 3 |
| `nalp/` | NALP Employment Reports | CSV, Excel, PDF | 4 |
| `lsac/` | LSAC Volume Summaries | CSV, Excel | 5 |
| `bar_passage/` | State Bar Passage Rates | CSV, PDF | 5 |
| `school_websites/` | Individual school scrapes | JSON (one per school) | 6 — long tail |

## How it works

1. **Drop a file** into the appropriate folder.
2. **Ask Claude to review it** — the ingest script will parse, validate
   (Zod), match to canonical schools, and emit SQL + wiki markdown.
3. **Dry run first**: `npm run ingest:{source}:dry` — inspect the output
   in `scripts/output/`.
4. **Apply**: `npx wrangler d1 execute lawsignal-db --remote --file=scripts/output/{source}_ingest.sql`

## File naming convention

Use descriptive names with the data year:
- `aba509/aba509_disclosures_2025.xlsx`
- `usnews/usnews_rankings_2026.json`
- `lst/lst_employment_outcomes_2025.csv`

## What NOT to put here

- Processed or cleaned data — the ingest scripts do the cleaning
- Files larger than 100 MB — split them first
- Anything with PII (student names, applicant data)

## Git tracking

Raw data files are NOT gitignored by default — they're small enough
to version and are needed for reproducible ingestion. If a file
exceeds 50 MB, add it to `.gitignore` and document where to
re-download it.
