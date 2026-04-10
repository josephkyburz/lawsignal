# Research — Decision Architecture

This folder holds reference material about the law school decision
itself: what matters, why, how to measure it, what the tradeoffs
are. This is the intellectual foundation that shapes the schema,
the scoring dimensions, and the variable catalog — before any
school-specific data lands.

Drop anything here that informs HOW to think about choosing a law
school. Claude will extract research variables (RVs), map them to
decision variables (DVs), and use them to refine the schema and
scoring algorithm.

## What goes here

- **Your own thinking** — braindumps, decision frameworks, notes
  on what you'd tell a friend choosing between schools
- **Expert writing** — articles, blog posts, forum threads that
  articulate what actually matters (Spivey, ATL, r/lawschooladmissions,
  TLS, etc.)
- **Admissions consultant frameworks** — how do the good consultants
  structure the school selection decision?
- **Employment outcome analyses** — what do the numbers actually
  mean? How should BigLaw+FC rate be weighted vs. total JD-required?
- **Cost/debt analyses** — scholarship negotiation dynamics, COL
  adjustments, debt-to-income models
- **Geographic analyses** — which schools are portable vs. regional?
  How does bar passage jurisdiction matter?
- **Student experience data** — what do current students say matters
  that the numbers don't capture?
- **Counter-arguments** — what do people get wrong about rankings?
  What dimensions are overweighted or underweighted?

## What does NOT go here

- School-specific data files (those go in `data/raw/{source}/`)
- Processed or cleaned data
- Anything with PII

## How Claude uses this

1. **Extract RVs (Research Variables)** — every observable fact or
   dimension mentioned in the research. "What can we measure?"
2. **Map RVs → DVs (Decision Variables)** — the 8 scoring dimensions.
   "What does a prospective student actually care about?"
3. **Refine the schema** — add columns to `school_metrics`, add
   entries to `variables`, update the Zod validators
4. **Write scoring philosophy** — `docs/SCORING_PHILOSOPHY.md`
5. **Write scoring algorithm** — `docs/SCORING_ALGORITHM.md`
6. **Implement `computeScore()`** — the engine

## File naming

Use descriptive names:
- `braindump-what-matters.md`
- `spivey-school-selection-framework.pdf`
- `atl-employment-outcomes-analysis.html`
- `cost-debt-model-notes.md`
- `geographic-portability-research.md`
