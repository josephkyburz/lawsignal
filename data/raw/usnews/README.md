# US News raw inputs

This directory holds the raw scraped US News Best Law Schools data that
feeds `scripts/ingest/usnews.ts`.

## Files

- `usnews_scraped.json` — **Not committed.** Gitignored. Produced by
  `npx tsx scripts/scrape/usnews.ts`. This is the file the ingest
  reads.
- `usnews_scraped.example.json` — A small hand-checked sample of ~6
  well-known schools, committed for pipeline verification. Copy it to
  `usnews_scraped.json` if you want to dry-run the ingest without
  running the scraper.

## Workflow

```sh
# 1. Scrape the public rankings page. Also pulls specialty rankings
#    when USNEWS_SCRAPE_SPECIALTIES=1. Hits usnews.com — do not run in CI.
USNEWS_SCRAPE_SPECIALTIES=1 npx tsx scripts/scrape/usnews.ts

# 2. Dry-run the ingest and inspect the generated SQL + wiki diffs.
npm run ingest:usnews:dry
open scripts/output/usnews_ingest.sql   # or just cat it

# 3. After review, live run. This applies SQL to the remote D1 database.
npm run ingest:usnews
```

## Data provenance

The scraper targets the publicly accessible
`https://www.usnews.com/best-graduate-schools/top-law-schools/law-rankings`
page and the sibling specialty ranking pages. Peer assessment and
lawyer/judge assessment scores are Premium-gated on usnews.com and are
recorded as `null` whenever the public page does not surface them — the
ingest pipeline does not fabricate them.

Specialty rankings share the slug vocabulary defined in
`scripts/scrape/usnews.ts::SPECIALTY_PATHS` and must stay in sync with
the variables seeded by
`apps/lawsignal-worker/migrations/0004_usnews_variables.sql`.
