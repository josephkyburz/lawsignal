# Open Questions

Parking lot for unresolved items noticed during development but not
in scope for the current task. Review at session start. Promote to
a roadmap item in AGENT.md or close with a one-line resolution.

---

## 2026-04-11 — Run the US News scraper + live dry-run  `ingest`

L1-4 shipped the US News ingest pipeline on
`claude/L1-4-usnews-ingest-TyYhC` but the live scrape itself was
not run — outbound network is blocked in Claude web sessions (even
`WebFetch https://example.com` 403s), so `scripts/scrape/usnews.ts`
cannot hit usnews.com from here.

**Follow-up:** Joe runs locally once he's ready to populate D1:

```sh
USNEWS_SCRAPE_SPECIALTIES=1 npx tsx scripts/scrape/usnews.ts
npm run ingest:usnews:dry
# review scripts/output/usnews_ingest.sql and unmatched-schools warnings
# add any missing aliases to USNEWS_TO_SLUG_ALIASES in scripts/ingest/usnews.ts
npx wrangler d1 execute lawsignal-db --remote \
  --file=apps/lawsignal-worker/migrations/0004_usnews_variables.sql
npm run ingest:usnews
```

The scraper extracts the Next.js `__NEXT_DATA__` blob; if US News
has redesigned since 2026-04, the walker in `findRankingsArray()`
may need tuning. The pipeline degrades gracefully — it logs what
it couldn't find rather than crashing the ingest.

---

