# Wiki Health Check — 2026-04-10

**Cohort size:** 196 school wikis (`data/schools/*.md`)
**Sources covered:** `aba509_2025` only (Phase 1.1)
**Overall health score:** **96 / 100**
**Network probe:** wikis contain **0 URLs** — link rot check is vacuously
passing. (Writer in `scripts/lib/wiki-writer.ts` does not emit any
links; fetch probe was skipped.)

## Scoring method

Weighted 5-factor score (each factor normalized to its weight):

| Factor                             | Weight | Result       |
| :--------------------------------- | -----: | :----------- |
| Structural integrity (parses)      |     30 | 196/196 (30) |
| ABA 509 section present + non-empty|     25 | 196/196 (25) |
| Critical variables present         |     25 | 164/196 (21) |
| Formatting consistency ($/%)       |     10 | 196/196 (10) |
| H1 present                         |     10 | 196/196 (10) |

Critical variables (any missing → school counted as incomplete):
`Median LSAT`, `Median GPA`, `Acceptance Rate`, `Tuition (Resident)`,
`Total Graduates`, `Bar Passage`.

---

## 1. Broken wikis (parse failures)

**None.** All 196 wikis:

- Have valid YAML frontmatter (`slug`, `review_status`, `last_ingest`,
  `sources_ingested`, `canonical_name`).
- Have balanced `<!-- BEGIN:aba509_2025 --> … <!-- END:aba509_2025 -->`
  delimiters (1 BEGIN + 1 END per file, no nesting, no orphans).
- Have balanced HTML comment open/close counts (`<!--` == `-->`).
- Have a valid Markdown H1.

---

## 2. Incomplete wikis

### 2a. Missing critical variables — 32 schools

All 32 are incomplete because they lack `Tuition (Resident)`. Two of
those 32 (`jacksonville-university`, `wilmington-university`) are also
missing the entire `### Employment (10 months post-grad)` block.

Full list (alphabetical):

```
baylor-university
cooley
creighton-university
florida-a-m-university
florida-international-university
florida-state-university
illinois-institute-of-technology-chicago-kent
indiana-university-indianapolis
jacksonville-university              [also missing Employment block]
lincoln-memorial-university
oklahoma-city-university
pontifical-catholic-u-puerto-rico
regent-university
santa-clara-university
seattle-university
southern-illinois-university
the-u-kansas
u-arkansas
u-dayton
u-detroit-mercy
u-illinois-chicago
u-missouri-kansas-city
u-missouri
u-nebraska
u-north-dakota
u-north-texas-at-dallas
u-puerto-rico
u-wyoming
washburn-university
widener-university-commonwealth
widener-university-delaware
wilmington-university                [also missing Employment block]
```

### 2b. Empty `### Faculty` subsection — 1 school

- `duke-university` — the `### Faculty` header is present but has zero
  bullets (both `full_time_faculty` and `student_faculty_ratio` are
  absent from the underlying record). Writer emits the header
  unconditionally, so the section is empty but structurally valid.

### 2c. Empty ABA 509 sections

**None.** Every `<!-- BEGIN:aba509_2025 -->` block has at least the
`## ABA 509 Data (2025)` heading plus an Admissions subsection.

---

## 3. Data gaps by variable

Count of schools missing each variable (out of 196). "Missing" means
the writer produced no `- <var>:` line for that field, usually because
the underlying ABA record had a null/undefined value.

| Variable                  |  Missing |    % |
| :------------------------ | -------: | ---: |
| Student-Faculty Ratio     |      196 | 100% |
| Tuition (Non-Resident)    |       37 |  19% |
| Tuition (Resident)        |       32 |  16% |
| Total Graduates           |        2 |   1% |
| BigLaw (501+)             |        2 |   1% |
| Federal Clerkships        |        2 |   1% |
| BigLaw + FC               |        2 |   1% |
| Government                |        2 |   1% |
| Public Interest           |        2 |   1% |
| Unemployed Seeking        |        2 |   1% |
| Bar Passage               |        2 |   1% |
| Full-Time Faculty         |        1 |  <1% |
| Median LSAT               |        0 |   0% |
| Median GPA                |        0 |   0% |
| Applicants                |        0 |   0% |
| Acceptance Rate           |        0 |   0% |
| Enrolled (1L)             |        0 |   0% |
| Living Expenses           |        0 |   0% |
| Median Grant              |        0 |   0% |
| Receiving Grants          |        0 |   0% |
| Full Tuition Scholarships |        0 |   0% |

### Notable patterns

- **Student-Faculty Ratio: 100% missing.** The ingest writer
  (`scripts/ingest/aba509.ts:474`) emits this line conditionally on
  `r.student_faculty_ratio`, but no record in the cohort has it. This
  is a systemic gap — either the source CSV does not expose the field
  or the Zod parser in `scripts/lib/validators/aba509.ts:60` is never
  populated from the raw payload. Filed under
  `.claude/memory/open-questions.md` as `blocks-phase-1.2`.
- **Tuition resident/non-resident overlap:** 32 schools are missing
  *both* tuition fields; 5 additional schools are missing Non-Resident
  only (`stanford-university`, `tulane-university`,
  `u-arkansas-at-little-rock`, `u-richmond`, `vermont`). The 32
  zero-tuition schools are a mix of public and private institutions,
  which suggests a parser/column-mapping gap in the 509 ingest rather
  than a "private school only reports one tuition" explanation.
- **Employment block missing for 2 schools:** `jacksonville-university`
  and `wilmington-university` — both small, newer programs; the
  `### Employment (10 months post-grad)` heading itself is absent
  because the writer only emits it when `emp2.total_grads` is truthy.

---

## 4. Formatting consistency

**Dollar values** — all 196 wikis use the `$<digits>[,<digits>]+`
format (e.g. `$64,234`). **0 exceptions.**

**Percentages** — all Acceptance Rate, Receiving Grants, Full Tuition
Scholarships, Unemployed Seeking, and Bar Passage lines use
`<N>.<N>%` (one decimal place). **0 exceptions.** Bar Passage
jurisdiction is parenthesized and uppercase in every case
(`98.5% (CALIFORNIA)`).

**LSAT / GPA** — integer LSAT, 2-decimal GPA, with 25th/75th paired in
the same bullet. Consistent across the cohort.

**H1 text** — all 196 files use the **slug** as the H1 (e.g.
`# yale-university`), not the `canonical_name` frontmatter value.
This is what `scripts/lib/wiki-writer.ts:51` writes, so it is
internally consistent — but as a human-facing title it is ugly. Not
scored as a format failure; called out in recommendations.

---

## 5. Link rot

**Vacuously passing.** Zero URLs in any wiki. The ABA 509 ingest
writer does not emit any `http(s)://` links, so there is nothing to
probe. No fetch calls were made. If future ingesters (US News, LST,
NALP) add source URLs, re-run this audit with a real fetch probe.

---

## 6. Recommendations

Ordered by priority.

1. **P0 — Investigate Student-Faculty Ratio gap (blocks phase 1.2).**
   100% absence is almost certainly an ingest bug, not a data-quality
   truth. Audit the 509 raw payload for `student_faculty_ratio` /
   `sf_ratio` / equivalent keys and check whether the Zod parser is
   dropping the field. Filed as open question.

2. **P0 — Back-fill tuition for the 32 zero-tuition schools.**
   Spot-check 3–5 of them in the raw inbox (`data/raw/`) against the
   ABA 509 disclosures website. If the raw records have tuition
   values, fix the column mapping in `scripts/ingest/aba509.ts`. If
   they do not, this is a source-level gap that should be annotated
   per-school, not silently omitted.

3. **P1 — Duke's empty `### Faculty` section.** Easy fix in the
   writer: suppress the header when both `full_time_faculty` and
   `student_faculty_ratio` are absent. Cosmetic but it prevents a
   dangling subsection header.

4. **P1 — `jacksonville-university` and `wilmington-university` missing
   Employment block.** Confirm these programs actually had zero
   graduates in the reporting year (likely) and add an explanatory
   bullet like `- No graduating class reported for 2025` rather than
   silently omitting the section.

5. **P2 — H1 should use `canonical_name`, not slug.** Change
   `scripts/lib/wiki-writer.ts:51` to `# ${canonicalName}` (threading
   it through from the caller). Currently every file has a lowercase
   hyphenated title. This is cosmetic but matters as soon as the
   wikis are rendered in any human-facing UI. **Do not** change
   without planning: this rewrites 196 files and will show up as a
   huge diff. Bundle with the next ingest pass.

6. **P2 — Add a non-resident tuition inspection pass** for the 5
   resident-only schools (Stanford, Tulane, Arkansas–LR, Richmond,
   Vermont). At a private school resident==non-resident, so the
   writer could emit both lines; at a public school the gap is real.
   Low priority — the resident tuition is still present.

7. **P3 — Add URL inspection once non-ABA sources land.** This audit
   script has a no-op link-rot section today. When US News, LST, or
   NALP ingesters begin emitting source URLs, extend the audit to
   actually fetch-probe them.

---

## Appendix — Audit methodology

- Source of truth for "expected variables": the writer in
  `scripts/ingest/aba509.ts` lines 437–474, which enumerates every
  field the pipeline emits into the `aba509_2025` wiki section.
- Structural checks: YAML frontmatter regex, `<!-- BEGIN:X -->` /
  `<!-- END:X -->` pairing, raw `<!--`/`-->` count balance, H1 regex.
- Variable presence: per-line regex `^- <VarName>:` inside the
  `aba509_2025` section body.
- Dollar format check: `^\$[\d,]+$`. Percent format check:
  `^\d+\.\d%$` (or `^\d+\.\d%\s*\(…\)$` for Bar Passage).
- Read-only. No wiki was modified during the audit. No ingestion
  script was modified. No schema change.
