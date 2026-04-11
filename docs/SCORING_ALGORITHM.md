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

---

## 3. Variable normalization

Every observation is normalized to a 0–100 score **against the
cohort of ABA-accredited schools** (not against all law schools, not
against a fixed historical baseline). When new data lands, every
score can shift — that is correct behavior. The cohort is the
reference, and the cohort changes.

### 3.1 Default: percentile rank

```
normalize(value, cohort) = 100 * rank(value in cohort) / (N - 1)
```

- Ties share the average of their ranks (standard competition
  ranking would distort aggregation).
- `rank()` is dense, not sparse. Schools missing the variable are
  excluded from `cohort` for that variable only.
- Why percentile over z-score: users intuit "top 10%" faster than
  "+1.3 standard deviations." Percentile is also robust to outliers
  (Cooley's tuition doesn't explode Yale's normalized cost).
- Why percentile over min-max: min-max is destroyed by a single
  outlier. The ABA cohort has many.

### 3.2 Direction: `higher_better` vs `lower_better` vs `target`

The `direction` field on each variable tells the normalizer which
way is up.

- **`higher_better`** (default): median LSAT, bar passage, BigLaw
  placement. Formula as above.
- **`lower_better`**: tuition, COL, median debt, acceptance rate
  when used as selectivity proxy, unemployment. Invert the rank:
  ```
  normalize_inverse(value, cohort) = 100 - normalize(value, cohort)
  ```
- **`target`**: variables where "best" depends on the user. The
  two in scope today are median GPA band (you don't want a school
  where you're at the very bottom of the 25th) and class size (some
  users want intimate, some want big-school resources). Target-mode
  variables take an additional `target_value` from the profile and
  score by proximity:
  ```
  normalize_target(value, target, cohort) =
    100 * (1 - |percentile(value) - percentile(target)|)
  ```

### 3.3 Special cases

A few variables don't want percentile ranking. They are enumerated
explicitly and treated by hand:

**Tier membership (`prestige:tier`):** T6 → 100, T14 → 88, T20 →
78, T50 → 65, below → 50. Hard-coded because the user experiences
tiers as discrete, not continuous.

**Bar passage (`aba509:bar_passage_first_time`):** Floored at state
average. A school that beats its state average by 5pts gets a
higher normalized score than a school whose raw rate is higher but
sits below its state average. Bar passage is meaningful **relative
to the jurisdiction** (California first-time rates run 20pts lower
than Iowa).
```
bar_score(school) = normalize(
  school.bar_passage - state_avg(school.state),
  cohort_adjusted_deltas
)
```

**Cost with scholarships (`composite:net_cost`):** Not raw tuition.
Compute `net = sticker - median_grant × P(grant)` first, then
normalize as `lower_better`. The Cost & Value dimension always
prefers net cost to sticker.

**Cost against military benefit:** If `profile.military_benefit ==
"flep"`, cost is re-scored as a **constraint satisfaction** (does
the school cap at the FLEP limit?) rather than a gradient. Schools
that meet the cap all score 100 on the cost sub-variable; schools
that don't score 0. This is the Berkeley/Vanderbilt tiebreaker from
`DECISION_ANALYSIS.md` encoded as math: once FLEP is in play, cost
stops being a gradient for the user who benefits from it.

**Geographic target matching (`composite:target_placement`):** For
each of `profile.target_regions`, compute the school's placement
rate into that region. Take the max across targets. Normalize
percentile against cohort.
```
target_placement(school, targets) =
  max(placement_rate(school, r) for r in targets)
```
Users with no target regions get portability score instead:
percentile of `1 - HHI(placement_by_state)` (broader = better).

### 3.4 Year alignment

When multiple years of an observation exist, use the most recent
year available for that school. Do not average across years — users
making decisions today care about last year's bar passage, not a
5-year smoothed estimate. Year mismatch across the cohort (one
school has 2024 data, another has 2023) is tolerated; the cohort
percentile is computed on whatever the latest-per-school values
are. The `metric_year` field is surfaced in the UI so users can see
staleness.

---

## 4. Missing data

Missing data is the hardest part of this algorithm and the one
most likely to corrupt rankings silently. The rule is:
**missing data never disappears.** It either excludes a variable
from aggregation (with the user informed), or it marks a dimension
as editorial-only (with the user informed), or it suppresses the
school from ranking (with the user informed). Imputation is
forbidden.

### 4.1 Three cases

**Case A — no observation at all.** The school has zero rows in
`observations` for this `variable_id`.
→ Exclude the variable from this school's dimension aggregation.
→ Decrement `observations_used`; `observations_expected` is
   unchanged.
→ Do not impute a mean, median, or prior.

**Case B — low-confidence observation.** `confidence < 0.5`.
→ Include but downweight: the variable's effective weight becomes
  `prior_weight × confidence`.
→ Surface in the UI as a faded number with a hover note.

**Case C — stale observation.** `metric_year < current_year - 3`.
→ Include but downweight by 0.5.
→ Stale plus low-confidence compounds: `prior_weight × confidence × 0.5`.

### 4.2 Coverage threshold per dimension

For each school × dimension, define **coverage** as:
```
coverage(s, d) = sum(prior_weight[v] for v in d if observed(s, v))
               / sum(prior_weight[v] for v in d)
```

- `coverage ≥ 0.6`: dimension renders a quantitative score.
- `0.3 ≤ coverage < 0.6`: dimension renders a quantitative score
  but is flagged as "partial" in the UI. The score is still used
  in the overall.
- `coverage < 0.3`: dimension is **editorial-only**. No
  quantitative score is rendered; the school's wiki snippet for
  that dimension is shown instead. The dimension is excluded from
  the overall score **for this school only** — the denominator of
  the overall weighted average adjusts accordingly.

Thresholds are tunable constants in a config file (`scripts/lib/
scoring_config.ts`, to be created), not hardcoded in `computeScore()`.

### 4.3 The "this school can't be ranked" case

If a school has coverage below 0.3 on 5+ dimensions, it cannot be
meaningfully ranked against the cohort. It is moved to the
`suppressed` list with reason `"insufficient_data"` and is not
shown in the main results. The user can opt in to seeing it via a
"show data-sparse schools" toggle.

This will happen most often to Puerto Rico schools and a few
specialty programs early in ingestion, before sources 3–7 land.
It is expected behavior during Phase 1, not a bug.

### 4.4 The honesty constraint

Every aggregate score in the UI comes with its denominator. This
is non-negotiable:

- Dimension score: "87 · 12 of 14 variables observed"
- Overall score: "84 · 7 of 9 dimensions scored"
- School card: if any dimension is editorial-only, the card shows
  an "⚠ partial data" ribbon on hover.

The user should never be able to mistake a well-sourced school for
a thinly-sourced one.

---

## 5. Aggregation

Two levels of aggregation: variables → dimension score, and
dimension scores → overall score.

### 5.1 Variables → dimension score

For a school `s` and dimension `d`, the dimension score is the
confidence-weighted average of normalized variable scores, using
the author's per-variable priors:

```
effective_weight(v, s) = prior_weight(v)
                       × confidence(obs(s, v))
                       × staleness_factor(obs(s, v))

dimension_score(s, d) =
  Σ [ effective_weight(v, s) × normalize(obs(s, v)) ]
  ─────────────────────────────────────────────────
           Σ [ effective_weight(v, s) ]
```

Where the sums run over variables `v ∈ d` for which the school has
an observation.

- `prior_weight(v)` comes from the `variables` catalog. It is the
  author's prior — "within Employment, bar passage carries roughly
  twice the weight of state clerkship rate." These priors live in
  `scripts/lib/scoring_config.ts`, reviewable and editable in one
  place.
- `confidence(obs)` is the D1 row's `confidence` column.
- `staleness_factor(obs)` is 1.0 for fresh data, 0.5 for stale
  (Case C in §4.1).
- The denominator adjusts automatically when variables are
  missing, so dimension scores are comparable across schools with
  different coverage — but the UI still surfaces the coverage gap.

### 5.2 Career-goal reweighting within Employment

The Employment Outcomes dimension is the only dimension whose
internal weights shift based on profile. This is the
`career_goal` hook.

Default prior weights within Employment (roughly):

| Variable | Default | BigLaw | Clerkship | PI | JAG |
|---|---|---|---|---|---|
| BigLaw+FC rate | 0.25 | 0.45 | 0.15 | 0.05 | 0.10 |
| Federal clerkship | 0.15 | 0.10 | 0.45 | 0.05 | 0.10 |
| JD-required rate | 0.20 | 0.15 | 0.15 | 0.20 | 0.25 |
| Bar passage | 0.15 | 0.10 | 0.05 | 0.15 | 0.20 |
| PI placement | 0.10 | 0.02 | 0.05 | 0.40 | 0.15 |
| Government | 0.10 | 0.03 | 0.05 | 0.10 | 0.10 |
| Unemployment (inv) | 0.05 | 0.15 | 0.10 | 0.05 | 0.10 |

The `undecided` goal uses the Default column. JAG users
(`military_benefit == "flep"` is a hint but not a guarantee) are
offered the JAG column explicitly; the tool does not infer career
goal from benefits.

These tables live in `scripts/lib/scoring_config.ts`. Every row
needs a comment justifying the weight — this is the intellectual
audit trail for the algorithm. No undocumented priors.

### 5.3 Dimension scores → overall score

Simple weighted average, where dimensions with coverage below
0.3 are excluded for the school in question:

```
active(s) = { d | coverage(s, d) ≥ 0.3 AND priorities[d] > 0 }

overall(s) =
  Σ [ priorities[d] × dimension_score(s, d) ]   for d in active(s)
  ───────────────────────────────────────────
           Σ [ priorities[d] ]                    for d in active(s)
```

Notes on this formula:

- A school missing an entire dimension (editorial-only) is **not
  penalized** in the overall. The overall is computed on the
  dimensions the school has data for. This is the only honest
  choice: we cannot know whether the missing dimension would have
  raised or lowered the score, so we exclude it and surface the
  gap.
- A dimension the **user** has weighted to 0 is excluded
  regardless of coverage. This matches the "weight of 0 means
  exclude entirely" rule from §1.1.
- Priorities are normalized inside the formula, so the user
  doesn't have to make them sum to anything. Sliders 0–100 per
  dimension; the algorithm does the division.

### 5.4 Rank bands

After overall scores are computed, schools are sorted descending
and assigned to bands. Bands are relative to the cohort, not to
fixed score thresholds:

| Band | Definition |
|---|---|
| **top** | overall ≥ 90th percentile of ranked cohort |
| **strong** | 75th ≤ overall < 90th |
| **fit** | 50th ≤ overall < 75th |
| **consider** | 25th ≤ overall < 50th |
| **stretch** | below 25th |

Bands are UI sugar, not decision logic. The user sees the number
and the band; the algorithm uses only the number.

The band names matter. "Reach / target / safety" is the LSAC
framing and it encodes the prestige trap — it treats rank as the
only axis. LawSignal's bands are neutral: "fit" doesn't mean
"middle," it means "this school matches what you said you wanted."
A school in the `fit` band might be a user's #1 choice if their
priorities align.

### 5.5 Berkeley worked example

From `docs/DECISION_ANALYSIS.md`, running the author's weights
through this formula:

```
priorities = {
  selectivity: 5, employment: 10, cost: 10, geographic: 10,
  academic: 10, prestige: 15, culture: 15,
  quality_of_life: 10, growth_fit: 15
}
sum = 100

Berkeley dimension scores (approximate, pending real data):
  selectivity: 88, employment: 90, cost: 65, geographic: 85,
  academic: 82, prestige: 92, culture: 90,
  quality_of_life: 72, growth_fit: 95

overall(Berkeley)
  = (5×88 + 10×90 + 10×65 + 10×85 + 10×82 + 15×92 + 15×90
     + 10×72 + 15×95) / 100
  = 85.7
```

Matches the worked example in `DECISION_ANALYSIS.md` §"Decision
Matrix" (85.7). The algorithm above is consistent with the author's
actual decision — which is the test the algorithm has to pass
before anyone believes it.


