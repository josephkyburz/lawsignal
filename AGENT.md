# LawSignal — Agent Operating Manual & Roadmap

Last updated: 2026-04-10
Branch: `main`

CLAUDE.md is the source of truth for architecture, safety rules, conventions,
and the ingestion pipeline. This file is the roadmap + LawSignal-specific
operating rules. Read CLAUDE.md first.

---

## 1. Instruction Priority

When rules conflict, higher wins:

1. Explicit user instruction in the current turn
2. CLAUDE.md (architecture, safety, conventions)
3. AGENT.md (this file — roadmap + operating rules)
4. `.claude/skills/*.md` (scoped workflows)
5. Default tool behavior

## 2. Workflow Loop

For every task:

- [ ] **Inspect** — read the relevant file(s); don't recommend from memory
- [ ] **Diagnose** — name the root cause in one sentence
- [ ] **Plan** — if >1 file or >50 LOC, use Plan Mode or TodoWrite
- [ ] **Act** — smallest change that works; no speculative refactors
- [ ] **Verify** — `npx vite build` if code touched; preview if UI touched
- [ ] **Commit** — stage explicit filenames; HEREDOC message; independently deployable
- [ ] **Update** — check off the roadmap box below; update CLAUDE.md if conventions changed

## 3. Tool Rules

| Task | Use | Don't |
|---|---|---|
| Find a file by name | Glob | `find` / `ls` via Bash |
| Find code by content | Grep | `grep` / `rg` via Bash |
| Read a known file | Read | `cat` / `head` / `tail` |
| Edit existing file | Edit | Write (rewrites lose history) |
| Create new file | Write | only after confirming it's needed |
| Open-ended codebase question | Agent subagent (Explore) | chained Grep calls |
| Repetitive ≥3 files or >50 LOC | Codex | inline by hand |

## 4. Token Discipline

- Prefer Grep with targeted patterns over full-file Reads for files >500 lines.
- Never load large JSON data files into context directly.
- For `scripts/lib/` files: grep for the specific function, don't scan.

## 5. Failure Handling

- **Build fails** → read the actual error; don't retry blindly.
- **D1 rejects `BEGIN`/`COMMIT`** → remove them; rely on `NOT EXISTS` guards.
- **zod v4 `z.record()` error** → use `z.record(z.string(), z.unknown())`.
- **White screen** → (a) named React imports only, (b) state used before declared, (c) undefined props.
- **Stuck** → state what you know, what you tried, what you need from Joe.
- **Uncertain** → say "I don't know" and name what would resolve it.

## 6. Anti-Hallucination

Before recommending or editing:

- [ ] Verify the file path exists (Glob or Read).
- [ ] Verify the function / export exists (Grep).
- [ ] Verify the line range is current.
- [ ] Don't cite commit hashes you haven't seen in `git log` this session.
- [ ] Don't assert D1 row counts without running a query.

## 7. Project-Specific Rules

- **Editorial typography is non-negotiable**: Cormorant Garamond / Crimson Pro / JetBrains Mono / paper-ink palette. See `docs/DESIGN.md`.
- **No unlayered CSS resets** (Tailwind v4 footgun).
- **Same three-layer ingestion pattern as FirmSignal**: raw → D1 → wiki markdown.
- **Observation-based scoring**: all scoring inputs flow through the `observations` table, keyed by `variable_id`. No hardcoded scoring inputs.
- **Source attribution on every data point**: `source_name` + `source_url` + `confidence` + `metric_year`.

---

## Roadmap

### Phase 0 — Foundation (current)

- [x] Project scaffold (Vite + React + Tailwind v4 + same design system)
- [x] D1 database created (`lawsignal-db`, ID `0597ab0f-eda5-45c8-adb6-dc8a44f93cea`)
- [x] Schema: `schools`, `school_metrics`, `school_identities`, `observations`, `variables`, `schools_raw_sources`, app tables
- [x] Ingestion pipeline skeleton (`scripts/lib/`, `scripts/ingest/aba509.ts`)
- [x] Cloudflare Pages Function (feedback, supporters, reviews, health)
- [x] GitHub Actions deploy workflow
- [x] Landing page with editorial design system
- [ ] Apply schema to D1 (`migrations/0001_school_schema.sql` + `workers/schema.sql`)
- [ ] Create Cloudflare Pages project, verify deploy
- [ ] Write `docs/DESIGN.md`, `docs/IDENTITY.md`, `docs/PHILOSOPHY.md`
- [ ] Set up `.claude/` skills + settings

### Phase 1 — Data Ingestion (the real work)

**Goal: populate the database with every ABA-accredited law school and their key metrics.**

Order matters. Each source builds on the identity spine the previous one created.

1. **ABA 509 Disclosures** — FIRST. This is the canonical source. Creates the school registry (all ~200 ABA schools), establishes the identity spine (`school_identities`), and populates the bulk of `school_metrics` and `observations`. Every other source matches against this.
   - Scrape/download the ABA compilation data
   - Parse into `Aba509Record` (Zod-validated)
   - Emit: schools, school_identities, school_metrics, observations, wiki markdown
   - Target: ~200 schools, ~40+ variables per school

2. **US News Rankings** — matches against ABA spine. Adds `usnews_rank`, `usnews_peer_score`, `usnews_lawyer_score`, specialty rankings.

3. **Law School Transparency** — matches against spine. Adds employment analysis, cost calculations, consumer metrics, debt-to-income.

4. **NALP Employment Data** — deeper employment breakdowns, salary percentiles.

5. **LSAC Volume Summaries** — applicant volume, applications per seat.

6. **State Bar Passage** — jurisdiction-specific pass rates.

7. **School Websites** — clinics, journals, faculty, dual-degree programs, specialties. This is the long tail — can be parallelized across schools.

### Phase 2 — Research Variables & Scoring Algorithm

**Goal: define what matters, how to measure it, how to score it.**

This is the intellectual work — parallel to FirmSignal's RV/DV/rubric pipeline.

1. **Research Variables (RVs)** — catalog every observable fact about a law school. What can we measure? What data exists? Map the full variable space from all sources.

2. **Decision Variables (DVs)** — the 8 scoring dimensions. What does a prospective student actually care about? Map RVs → DVs.

3. **Scoring Philosophy** — `docs/SCORING_PHILOSOPHY.md`. Why each dimension exists, what it's measuring, where moral weight sits. Anchored to the four anchors (credibility/clarity/calm/discovery).

4. **Scoring Algorithm** — `docs/SCORING_ALGORITHM.md`. Input shapes, normalization, missing-data branches, aggregation, overall score formula.

5. **`computeScore()` implementation** — the engine that turns user priorities + school observations into a ranked list.

### Phase 3 — Frontend

**Goal: build the full decision tool UI.**

Same architecture as FirmSignal: priorities before options, sidebar + main, editorial design.

1. **Priorities screen** — weight sliders for the 8 dimensions
2. **Filters** — region, school type, selectivity range, cost range, employment threshold
3. **School cards** — tier-coded, editorial, clickable to detail sheet
4. **Detail sheets** — slide-over with full school profile, scores, editorial brief
5. **Compare view** — side-by-side matrix for 2-4 schools
6. **Decide mode** — for admitted students choosing between specific schools
7. **Sensitivity panel** — "if you weighted cost 20% higher, these schools move up"

### Phase 4 — Polish & Growth

- Share URLs
- Print/export
- School-specific editorial briefs
- Dark mode
- SEO (school detail pages with unique URLs)
- OG images

### Deferred

- Scholarship negotiation tools
- Application timeline tracker
- LSAT/GPA predictor ("what are my chances at X")
- Peer comparison ("students like you chose...")
