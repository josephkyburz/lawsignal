# Research-to-Schema Skill

Trigger: user drops decision research material into `data/research/` and asks for review or extraction.

## Purpose

Extract the intellectual framework from research material and turn it into actionable schema — variables, dimensions, scoring logic. This is the bridge between "what matters in choosing a law school" and "what columns does the database need."

## Steps

### 1. Read and extract Research Variables (RVs)

For each document in `data/research/`:
- Extract every observable fact, dimension, or metric mentioned
- Note the source and confidence (is this a widely-agreed-upon factor, or one person's opinion?)
- Categorize: admissions / employment / cost / geographic / academic / prestige / quality-of-life / flexibility / other
- Flag contradictions between sources

Output: append to `docs/RESEARCH_VARIABLES.md` (create if missing)

### 2. Map RVs → Decision Variables (DVs)

Group RVs into the scoring dimensions. The current 8:
1. Selectivity
2. Employment Outcomes
3. Cost & Value
4. Geographic Strength
5. Academic Environment
6. Prestige & Reputation
7. Quality of Life
8. Career Flexibility

For each DV:
- Which RVs feed into it?
- Which are directly observable from data sources? Which require inference?
- Are there RVs that don't fit any current DV? (may need a new dimension)
- What's the right relative weight within the DV?

Output: append to `docs/DECISION_VARIABLES.md` (create if missing)

### 3. Schema implications

For each new RV that maps to an observable:
- Does `school_metrics` already have a column for it?
- Does the `variables` catalog have an entry?
- Which data sources provide this variable? (cross-reference `scripts/lib/sources.ts`)
- If new column needed → draft migration SQL
- If new variable needed → draft `variables` INSERT

Output: list of recommended schema changes (migration + variable catalog updates)

### 4. Scoring implications

- Does this research change the relative weight of any DV?
- Does it suggest a new normalization approach for any metric?
- Does it reveal a missing-data problem (a dimension that matters but has no good data source)?
- Does it suggest interaction effects between dimensions? (e.g., cost matters more when employment outcomes are weaker)

Output: notes for `docs/SCORING_PHILOSOPHY.md`

## Rules

- **Never modify the schema directly** from research alone — present recommendations, get user sign-off.
- **Preserve dissent** — if two research sources disagree, document both positions and let the user decide.
- **Distinguish fact from opinion** — "median LSAT is 172" is a fact. "Prestige matters more than employment" is an opinion. Both are useful; label them differently.
- **Read RTFs and PDFs via subagent** — never load large documents directly into the main context.
- **Research material is not school data** — it informs the framework, not the database rows.
