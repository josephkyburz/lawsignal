# LawSignal — Scoring Algorithm

This document specifies `computeScore()` — the function that turns a
user's priorities, constraints, and profile into a ranked list of
schools. It is the contract the implementation must satisfy.

Companion docs:
- `docs/PHILOSOPHY.md` — builder posture (why this exists, what to refuse)
- `docs/IDENTITY.md` — product identity (who it serves, what it refuses to be)
- `docs/DECISION_VARIABLES.md` — the 9 dimensions the user weights
- `docs/RESEARCH_VARIABLES_V2.md` — the ~144 RVs those dimensions feed from
- `docs/DECISION_ANALYSIS.md` — Berkeley/Vanderbilt/Georgetown worked example

The safety rule from `CLAUDE.md` still applies: **never modify
`computeScore()` logic — only move it.** This doc is what locks that
rule down. Once implemented, the algorithm can be relocated across
files, memoized, parallelized, or re-typed — but the math below is
the invariant.

---

## 0. The one-paragraph version

`computeScore()` takes (a) a user's dimension weights, (b) their hard
filters, (c) their personal profile (target geography, career goal,
cost ceiling), and (d) the observation set for all ABA-accredited
schools. It rejects schools that fail filters, normalizes every
observation to 0–100 by percentile rank against the ABA cohort,
rolls per-variable scores up into nine dimension scores using author
priors and observation confidence, then produces an overall score as
a weighted average of dimension scores. Missing data is surfaced, not
papered over. Scores are editable. The user can always see how many
observations backed any score and what happens if they re-weight.

---

## 1. Inputs contract

`computeScore()` takes exactly these inputs. Nothing else may leak
into scoring — no environment flags, no timestamps, no A/B variants.
If the inputs are identical, the output is identical.

### 1.1 `priorities` — dimension weights

```ts
type Priorities = {
  selectivity: number;        // 0..100
  employment: number;         // 0..100
  cost: number;               // 0..100
  geographic: number;         // 0..100
  academic: number;           // 0..100
  prestige: number;           // 0..100
  culture: number;            // 0..100
  quality_of_life: number;    // 0..100
  growth_fit: number;         // 0..100
};
```

- Weights are **per-dimension intensity**, not a budget. The user can
  set all nine to 100 or all nine to 0; the algorithm normalizes.
- A weight of 0 means "don't use this dimension at all" — the
  dimension is excluded from the overall score entirely (not just
  zero-contribution). This matters for sensitivity analysis and for
  honest reporting of "your overall score was computed from N
  dimensions."
- If every weight is 0, `computeScore()` returns no ranked list and
  surfaces a "name what matters first" prompt. This is the mom-rule
  enforced in code.

### 1.2 `filters` — hard constraints

```ts
type Filters = {
  max_annual_tuition?: number;       // USD, e.g. 28000 (FLEP cap)
  min_median_lsat?: number;
  max_median_lsat?: number;
  min_bar_passage?: number;          // 0..1
  required_regions?: Region[];       // empty = any
  required_tier?: "T6" | "T14" | "T20" | "T50" | "any";
  must_have_vet_community?: boolean;
  must_be_pass_fail?: boolean;
  // ...extensible
};
```

- Filters are applied **before scoring**. Schools that fail any
  filter are not ranked.
- But they are **not discarded** — they are stored in a
  `suppressed` list so the sensitivity panel can answer "if I dropped
  my tuition cap, what would appear?"
- A filter on a variable with no observation is **not a rejection**.
  Missing data never silently excludes a school — it flags the school
  as "filter status unknown" and surfaces it separately.

### 1.3 `profile` — personal context

```ts
type Profile = {
  target_regions: Region[];          // e.g. ["west_coast", "dc_metro"]
  career_goal:
    | "biglaw"
    | "clerkship"
    | "government"
    | "public_interest"
    | "in_house"
    | "jag"
    | "academia"
    | "undecided";
  risk_tolerance: number;            // 0..1, default 0.5
  owns_housing_in?: Region;          // affects cost normalization
  has_dependents?: boolean;
  military_benefit?: "flep" | "gi_bill" | "yellow_ribbon" | "none";
};
```

- `career_goal` shifts internal weights **inside** the Employment
  Outcomes dimension (BigLaw-seekers weight firm placement, PI-
  seekers weight PI fellowships, JAG-track users weight breadth as
  optionality). It does **not** change the user's top-level weights.
- `target_regions` turns the Geographic Strength dimension from
  "is this school portable?" into "does this school place where I
  want to live?"
- `risk_tolerance` feeds the variance penalty in the advanced
  utility mode (§6). Default mode is risk-neutral.

### 1.4 `schools` — the cohort

```ts
type School = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: Region;
  observations: Observation[];
};

type Observation = {
  variable_id: string;               // e.g. "aba509:median_lsat"
  value_numeric: number | null;
  value_text: string | null;
  metric_year: number;
  source_name: string;
  source_url: string | null;
  confidence: number;                // 0..1
};
```

This shape mirrors `apps/lawsignal-worker/migrations/0001_school_schema.sql`
exactly. The API returns it. `computeScore()` does not talk to D1
directly — it is a pure function of its inputs.

### 1.5 `variableCatalog` — variable metadata

```ts
type Variable = {
  id: string;                        // "aba509:median_lsat"
  display_name: string;
  category: "admissions" | "employment" | "cost" | "academic"
          | "rankings" | "culture" | "geographic" | "growth";
  dimension: Dimension;              // which DV it feeds
  tier: 1 | 2 | 3;                   // from RESEARCH_VARIABLES_V2
  direction: "higher_better" | "lower_better" | "target";
  prior_weight: number;              // 0..1, author-assigned within-dimension weight
  unit: "USD" | "pct" | "ratio" | "rank" | "count" | "index";
};
```

The `variables` D1 table is the source of truth. `prior_weight` is
the author's prior — it says "within the Employment dimension, bar
passage matters roughly twice as much as state clerkship rate."
These priors are editable in a config file, not in code.

---

## 2. Output contract

```ts
type ScoreResult = {
  ranked: RankedSchool[];
  suppressed: SuppressedSchool[];
  meta: {
    cohort_size: number;
    active_dimensions: Dimension[];    // weights > 0
    total_observations: number;
    missing_data_summary: Record<Dimension, number>;  // pct missing
  };
};

type RankedSchool = {
  school_id: number;
  slug: string;
  overall: number;                   // 0..100
  dimensions: Record<Dimension, DimensionScore>;
  rank: number;                      // 1-indexed
  rank_band: "top" | "strong" | "fit" | "consider" | "stretch";
};

type DimensionScore = {
  score: number;                     // 0..100
  observations_used: number;
  observations_expected: number;
  confidence: number;                // 0..1 aggregate
  is_editorial_only: boolean;        // true if coverage < threshold
};

type SuppressedSchool = {
  school_id: number;
  slug: string;
  failed_filters: string[];          // e.g. ["max_annual_tuition"]
  would_rank?: number;               // rank if filter dropped
};
```

Every score the user sees has provenance: how many observations fed
it, how confident those observations were, whether the dimension hit
coverage threshold. **No score is rendered without its denominator.**
