# ABA 509 Ingestion — Self-Contained Prompt

You are working on the LawSignal project at `/Users/joekyburz/Code/lawsignal`.

Read these files first:
- `CLAUDE.md` (project context, architecture, ingestion pipeline)
- `AGENT.md` (roadmap, workflow loop, tool rules)
- `.claude/skills/source-ingestion-runbook.md` (step-by-step ingestion process)
- `scripts/lib/sources.ts` (source catalog — find the `aba509_2025` entry)
- `scripts/lib/validators/aba509.ts` (Zod schema for ABA 509 records)
- `scripts/lib/school-matcher.ts` (school matching + alias map)
- `scripts/lib/sql-helpers.ts` (SQL generation helpers)
- `scripts/lib/wiki-writer.ts` (wiki markdown writer)
- `scripts/ingest/aba509.ts` (current stub — you'll implement this)
- `apps/lawsignal-worker/migrations/0001_school_schema.sql` (D1 schema)
- `docs/RESEARCH_VARIABLES_V2.md` (variable catalog — know what to extract)

## Task

Implement the ABA 509 Required Disclosures ingestion pipeline. This is the **first and most important** data source — it creates the identity spine (~200 ABA-accredited law schools) that every other source matches against.

### Step 1: Get the data

The ABA publishes 509 disclosures at https://www.abarequireddisclosures.org/. Options:
- **Best**: Download the ABA compilation spreadsheet (Excel) — check if one exists in `data/raw/aba509/`. If not, use web search to find the latest Standard 509 compilation.
- **Alternative**: The ABA site has per-school PDF disclosures. We'd need to scrape and parse these.
- **Alternative**: Law School Transparency or other community sources may have pre-parsed ABA data in CSV/JSON.

Check `data/raw/aba509/` for any files the user has already dropped there. If empty, search for the compilation spreadsheet URL and tell the user where to download it.

### Step 2: Parse and validate

For each school record:
1. Parse the raw data (Excel/CSV) into `Aba509Record` shape
2. Validate with the Zod schema in `scripts/lib/validators/aba509.ts`
3. Log validation failures — don't skip silently

### Step 3: Create the school spine

For each validated school:
1. Generate a slug via `scripts/lib/slug.ts`
2. INSERT into `schools` table (canonical_name, slug, city, state, school_type, etc.)
3. INSERT into `school_identities` (IPEDS ID, ABA code if available)
4. This is the identity spine — every future source matches against these slugs

### Step 4: Populate metrics and observations

For each school:
1. INSERT into `school_metrics` (the denormalized metrics row)
2. INSERT into `observations` for each variable (one row per variable per school per year)
   - Map fields to variable IDs from the `variables` catalog (85 variables seeded)
   - Use `source_name = 'aba509_2025'`, confidence = 1.0
3. Compute derived values:
   - `acceptance_rate` = total_offers / total_applicants
   - `employment_biglaw_fc` = (biglaw_501plus + federal_clerkship) / total_grads

### Step 5: Write wiki files

For each school, use `wiki-writer.ts` to create/update `data/schools/{slug}.md` with a `<!-- BEGIN:aba509_2025 -->` section containing the key metrics in readable format.

### Step 6: Emit SQL

Write all SQL statements to `scripts/output/aba509_ingest.sql`. Use `INSERT ... WHERE NOT EXISTS` guards for idempotency.

### Output

- `scripts/output/aba509_ingest.sql` — ready to apply to D1
- `data/schools/*.md` — one wiki per school
- Console summary: schools processed, observations emitted, validation errors

### Apply

```bash
npx wrangler d1 execute lawsignal-db --remote --file=scripts/output/aba509_ingest.sql
```

### Rules
- Every record through Zod validation
- Idempotent SQL (re-runnable)
- Source attribution on every observation
- Preserve raw payload in `schools_raw_sources`
- Don't modify the variable catalog — use existing variable IDs
- Build verify after: `npm run lawsignal:web:build`
