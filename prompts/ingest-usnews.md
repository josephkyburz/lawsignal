# US News Rankings Ingestion — Self-Contained Prompt

You are working on the LawSignal project at `/Users/joekyburz/Code/lawsignal`.

Read these files first:
- `CLAUDE.md`
- `.claude/skills/source-ingestion-runbook.md`
- `scripts/lib/sources.ts` (find `usnews_2026` entry)
- `apps/lawsignal-worker/migrations/0002_culture_academics.sql` (rankings variables)

## Task

Ingest US News Best Law Schools rankings data. This is the second-priority source after ABA 509.

### Data to collect

- Overall rank (1-200+)
- Peer assessment score (1.0-5.0)
- Lawyer/judge assessment score (1.0-5.0)
- Specialty rankings (IP, tax, clinical, dispute resolution, environmental, health, international, trial advocacy)

### Getting the data

Check `data/raw/usnews/` first. If empty, options:
1. **Scrape**: US News publishes rankings at their website. May need web search + extraction.
2. **Community data**: Law school forums (TLS, Reddit r/lawschooladmissions) often compile rankings in spreadsheets.
3. **Manual**: Ask the user to drop a rankings file.

### Variables to populate

- `usnews:overall_rank` (rank)
- `usnews:peer_score` (number, 1.0-5.0)
- `usnews:lawyer_score` (number, 1.0-5.0)
- `usnews:tier` (text: "T6", "T14", "T20", "T50", etc.)

### Matching

Schools must match against the existing spine (from ABA 509 ingest). Use `school-matcher.ts`. US News uses names like "Yale University" not "Yale Law School" — add aliases as needed.

### Output

- `scripts/output/usnews_ingest.sql`
- Observations for each school with `source_name = 'usnews_2026'`
- Console summary

### Prerequisite

The ABA 509 spine should exist first. If it doesn't, flag this and ask the user to run ABA 509 ingest first.
