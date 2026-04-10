# Source Ingestion Runbook

Trigger: adding a new data source to LawSignal (ABA 509, US News, LST, NALP, etc.)

## Prerequisites
- Source documented in `scripts/lib/sources.ts`
- Raw data file available (JSON, CSV, Excel, or scrape target identified)

## Steps

1. **Add source catalog entry** to `scripts/lib/sources.ts` with id, name, URL, frequency, data_year, fields.
2. **Write Zod validator** in `scripts/lib/validators/{source_id}.ts`.
3. **Write ingest script** at `scripts/ingest/{source_id}.ts` following the pattern in `scripts/ingest/aba509.ts`:
   - Parse raw data
   - Validate each record with Zod
   - Match to canonical school via `school-matcher.ts`
   - Emit SQL: raw_sources, schools (new only), school_identities, school_metrics, observations
   - Write wiki sections via `wiki-writer.ts`
4. **Add npm scripts** to `package.json`: `ingest:{id}` and `ingest:{id}:dry`.
5. **Dry run**: `npm run ingest:{id}:dry` — inspect output SQL and wiki files.
6. **Apply**: `npx wrangler d1 execute lawsignal-db --remote --file=scripts/output/{id}_ingest.sql`
7. **Verify**: spot-check D1 with `npx wrangler d1 execute lawsignal-db --remote --command "SELECT COUNT(*) FROM observations WHERE source_name = '{id}'"`.

## Rules
- Every record goes through Zod validation — no unvalidated data enters D1.
- `schools_raw_sources.payload_json` preserves the full raw payload — immutable audit log.
- Idempotent: `INSERT ... WHERE NOT EXISTS` guards on all statements.
- Source attribution on every `observation` and `school_metric` row.
- Wiki sections use HTML-comment delimiters: `<!-- BEGIN:{source_id} -->` / `<!-- END:{source_id} -->`.
