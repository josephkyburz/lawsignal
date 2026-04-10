# LawSignal

Law school research and decision tool at law.firmsignal.co. React SPA with Vite build, deployed to Cloudflare Pages. Sibling project to FirmSignal (firmsignal.co).

## Architecture

### Stack
- React 18 + Vite + Tailwind CSS v4 (same stack as FirmSignal)
- Cloudflare Pages + D1 + Pages Functions
- TypeScript ingestion pipeline (tsx, Zod validators)
- Same editorial design system: Cormorant Garamond / Crimson Pro / JetBrains Mono / paper-ink palette

### Frontend
- `src/App.jsx` — main app component
- `src/data/schools.js` — law school dataset (split into separate Vite chunk)
- `src/styles.css` — Tailwind CSS + component styles
- `src/main.jsx` — entry point, ErrorBoundary
- `src/components/` — extracted components (ui, layout, filters, priorities, schools)
- `src/hooks/` — custom React hooks
- `src/lib/` — pure logic (scoring, sharing, constants)
- `src/pages/` — static pages (Privacy, Terms, Support)

### Backend
- `functions/api/[[route]].js` — Cloudflare Pages Function (D1 analytics, feedback, reviews, supporters)
- D1 database binding: `DB` — must be configured in Cloudflare Pages dashboard

### Data Pipeline
- `scripts/ingest/` — per-source ingest scripts (TypeScript, run via tsx)
- `scripts/lib/` — shared ingestion libs (sql-helpers, slug, school-matcher, sources, wiki-writer, validators)
- `data/schools/` — per-school wiki markdown files (generated, not hand-edited)
- `migrations/` — D1 schema migrations

## Ingestion Pipeline

Three-layer architecture (same pattern as FirmSignal):

- **Raw (immutable)**: `schools_raw_sources` — full JSON payload per school per source. Never modified after insert.
- **Canonical (D1)**: `schools`, `school_metrics`, `school_identities`, `observations`, `variables` — structured, queryable. Idempotent via `INSERT ... WHERE NOT EXISTS` guards.
- **Wiki (markdown)**: `data/schools/*.md` — one file per school, HTML-comment-delimited per-source sections. Generated, never hand-edited.

### Data Sources (priority order for ingestion)

1. **ABA 509 Required Disclosures** — THE authoritative source. Every ABA-accredited school publishes standardized data: admissions (LSAT, GPA, acceptance rates), enrollment, costs, financial aid, employment outcomes (by firm size, clerkships, government, PI), bar passage. ~200 schools.
2. **US News Rankings** — peer assessment, lawyer/judge assessment, overall rank, specialty rankings.
3. **Law School Transparency (LST)** — independent employment analysis, cost calculations, consumer metrics.
4. **NALP Employment Data** — detailed employment breakdowns, salary data.
5. **LSAC Volume Summaries** — applicant volume, applications per seat, cycle dynamics.
6. **State Bar Passage Rates** — jurisdiction-specific first-time bar passage.
7. **School Websites** — clinics, journals, faculty, dual-degree programs, specialties.

### Adding a new source

1. Add a catalog entry to `scripts/lib/sources.ts`
2. Write a Zod validator in `scripts/lib/validators/`
3. Write an ingest script under `scripts/ingest/` reusing shared libs
4. Add `ingest:{id}` and `ingest:{id}:dry` npm scripts

### Run order

`npm run typecheck` → `npm run ingest:{source}:dry` → spot-check → `npm run ingest:{source}` → inspect SQL + wikis → `npx wrangler d1 execute lawsignal-db --remote --file=scripts/output/{source}_ingest.sql`

## Decision Matrix Dimensions

The scoring system will weight schools across these dimensions (parallel to FirmSignal's 11 firm dimensions):

1. **Selectivity** — median LSAT, median GPA, acceptance rate
2. **Employment Outcomes** — BigLaw+FC rate, JD-required rate, unemployment, bar passage
3. **Cost & Value** — tuition, scholarships, COL, median debt, debt-to-income
4. **Geographic Strength** — where graduates practice, regional dominance, portability
5. **Academic Environment** — clinics, journals, faculty ratio, class size, pedagogy
6. **Prestige & Reputation** — peer assessment, lawyer/judge assessment, specialty rankings
7. **Quality of Life** — location, class size, student satisfaction, housing
8. **Career Flexibility** — breadth of outcomes, clerkship rate, PI placement, academia

## Build & Deploy

- Build: `npx vite build` — produces `dist/`
- Deploy: `npx wrangler pages deploy dist --project-name=lawsignal`
- CI: GitHub Actions on push to main (`.github/workflows/deploy.yml`)
- Domain: law.firmsignal.co (Cloudflare Pages custom domain)

## Conventions

- Named React imports only (`import { useState } from "react"`) — never `import React`
- Named exports for all extracted components
- Same editorial typography rules as FirmSignal (see `docs/DESIGN.md`)
- Same UI component vocabulary (Button, Badge, Card, Toggle, Slider, Bar, Ornament)
- Same color semantic rules (gold = primary, cobalt = secondary, scarlet = warning, forest = saved)
- Same ornament pattern for section dividers
- Same choice architecture: priorities before options, editable scores, no single "best" answer

## Skills (`.claude/skills/`)

- `school-audit.md` — structured workflow for auditing/editing existing school data
- `source-ingestion-runbook.md` — run or build a new ingestion pipeline for a school data source
- `schema-migration.md` — create or apply a D1 schema migration
- `skill-synthesis.md` — periodic review of skills-learned log, proposes new skills
- `wiki-health-check.md` — graph integrity checker for school wikis
- `systematic-debugging.md` — deterministic bug isolation
- `ci-failure-analyzer.md` — root-cause build/deploy failures
- `cloudflare-pages-deployment-checker.md` — verify CF Pages wiring
- `safe-dependency-upgrade.md` — controlled dependency upgrades
- `test-gap-finder.md` — identify highest-risk missing tests
- `pr-review-synthesizer.md` — extract key risks from PRs
- `trust-and-clarity-ui-review.md` — review UI copy for clarity and trust
- `token-efficient-context-builder.md` — construct minimal context for tasks

## Memory (`.claude/memory/`)

Persistent cross-session state. Files here survive `/clear` and context compaction.

- `skills-learned.md` — append-only log of commit patterns, auto-populated by `skill-learner.sh` hook
- `open-questions.md` — parking lot for unresolved items noticed during development
- `decisions.md` — session-level decisions that don't rise to formal docs entries

### Conventions
- **Write early, read at session start.** Log patterns as you go; review the memory files when starting a new task area.
- **Tag patterns consistently.** Tags: `ingest`, `ui`, `api`, `scoring`, `data-fix`, `docs`, `schema`, `infra`.
- **Promote or close.** Open questions older than 3 sessions should be promoted to a roadmap item in AGENT.md or closed with a one-line resolution.

## Engineering Principles

1. **Keep it simple.** Prefer the boring solution. Three similar lines > one premature abstraction.
2. **Make it work first, make it right later.** Ship the ugly version. Refactor once you understand the actual shape.
3. **Read before you write.** Understand existing code, conventions, and invariants before proposing changes.
4. **Small, verifiable steps.** Each commit should be independently deployable and revertable.
5. **Don't guess — measure.** When unsure whether code works, run it.
6. **Context is the bottleneck.** Optimize for keeping the main context clean: dispatch noisy work to subagents.
7. **Explain the why, not the what.** Commit messages and docs should explain intent and constraints.
8. **Trust the tools, verify the output.** Use AI for speed but verify correctness manually.

## Safety Rules

1. **Never modify `computeScore()` logic** — only move it (once it exists)
2. **Never change share URL format** once established — existing links must work
3. **Never rename localStorage keys** — returning users depend on them
4. **Never change school data shape** in `schools.js` without migration
5. **Build verify after every step** (`npx vite build`)

## Known Patterns

- White screens: (1) `React.useEffect` instead of `useEffect`, (2) state used before declared, (3) undefined props to standalone components
- D1 database binding name is `DB`
- `@import` for fonts in both `index.html` and `styles.css` — browser deduplicates
- No unlayered CSS resets (Tailwind v4 footgun)
- D1 rejects `BEGIN`/`COMMIT` — rely on `NOT EXISTS` guards
- zod v4: use `z.record(z.string(), z.unknown())` not `z.record()`


---

# Token-efficient task routing

Before any non-trivial task, pick one of five paths. Stay silent for
trivial work (single Read, single grep, obvious sanity check).
Announce the choice in one line **only when there's a real decision**
— i.e. when two or more paths would actually work and the choice
matters. For obvious tasks, just execute.

## The five paths

1. **Handoff to a new Claude window (fresh context).**
   Write a self-contained brief for the user to paste into a new
   session. Use when:
   - Current context is loaded with unrelated work
   - Task is long-running and will flood context with tool output
     that won't matter later
   - Current conversation has accumulated state that would bleed
     into or confuse the new task
   - Task is clean enough to describe in a single brief

2. **Dispatch Claude subagent(s) via the Agent tool.**
   Use when:
   - Subtask is independent and intermediate results don't need to
     live in the main context (searches, many-file reads, audits,
     external fetches)
   - Multiple independent subtasks can run in parallel — dispatch
     them in a single message with multiple Agent calls
   - Specialized agent fits (Explore for codebase search, Plan for
     architecture, domain-specific agents)
   - Writer/Reviewer: a second pair of eyes should verify work
     just done
   - The subtask will generate noisy output that would bloat the
     main window

3. **Dispatch Codex via the `codex` CLI (Bash tool).**
   Invoke Codex non-interactively from a Bash call. Run it in the
   background (`run_in_background: true`) so the main Claude
   session keeps moving while Codex chews. Use when:
   - The subtask is large and independent; you want a second model
     working in parallel with this session
   - You want a genuine cross-check from a different model family
   - Task plays to Codex's strengths: multi-file refactors,
     prompt-driven research passes, long-horizon generation

4. **Compact the current conversation (`/compact` or
   `/compact Focus on X`).**
   Suggest the user run `/compact` before continuing. Use when:
   - The task needs to continue in the same window
   - The window is heavy (>50% full)
   - Targeted: `/compact Focus on X` preserves exactly the slice
     that matters

5. **Do it in-line.**
   Use when:
   - Task is small (<5 tool calls expected)
   - Results feed directly into the next turn
   - Dispatching would add more overhead than the work saves

## Supporting practices

- **Parallelize independent tool calls.** Two reads with no dependency → one message, two tool blocks.
- **Targeted reads.** Use Read's `offset` and `limit`.
- **Don't re-read files already in context.**
- **Scope dispatched prompts tightly.**
- **Write once, don't chase perfection in tool-call land.**
- **Don't narrate tool calls.**
- **Writer/Reviewer pattern** for anything that matters.
- **TDD when correctness matters.**
- **Plan Mode before risky architecture.**
