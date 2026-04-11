# Open Questions

Parking lot for unresolved items noticed during development but not
in scope for the current task. Review at session start. Promote to
a roadmap item in AGENT.md or close with a one-line resolution.

---

## 2026-04-10 — Student-Faculty Ratio missing from 100% of ABA 509 wikis `[blocks-phase-1.2]` `[ingest]` `[data-fix]`

Wiki health check (`docs/data_audits/wiki_health_2026_04_10.md`) found
that all 196 school wikis lack the `- Student-Faculty Ratio:` line.
The writer in `scripts/ingest/aba509.ts:474` emits this conditionally
on `r.student_faculty_ratio`, and the Zod schema in
`scripts/lib/validators/aba509.ts:60` defines
`student_faculty_ratio: z.number().positive().optional()`, but no
record in the parsed cohort has the value populated.

Two possibilities:

1. The raw ABA 509 payload exposes the field under a name the parser
   isn't mapping (e.g. `sf_ratio`, `faculty_student_ratio`,
   `std_fac_ratio`) — an ingest bug; fix the column mapping.
2. The ABA Standard 509 disclosures do not include this metric, in
   which case we should remove it from `Aba509RecordSchema` and the
   writer, and source it from US News / LST in Phase 1.2+.

**Why blocks phase 1.2:** Student-Faculty Ratio is one of the
"Academic Quality" dimension inputs per `CLAUDE.md` §Decision Matrix
Dimensions. It cannot be scored if no school has the data.

**Next action:** open a raw ABA 509 payload from `data/raw/`, grep
for any ratio-like key, and either fix the parser or remove the
field from the schema.

