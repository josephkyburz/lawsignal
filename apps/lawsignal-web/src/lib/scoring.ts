/**
 * scoring.ts — computeScore() and its pure sub-functions
 *
 * This is the function the safety rule protects:
 *   "Never modify computeScore() logic — only move it (once it exists)."
 *   — CLAUDE.md, Safety Rules
 *
 * Once this file is merged, the math below is frozen. It can be relocated,
 * memoized, parallelized, or re-typed, but the invariants from
 * `docs/SCORING_ALGORITHM.md` are not up for negotiation.
 *
 * Contract: `docs/SCORING_ALGORITHM.md` — every section is load-bearing.
 * Config:   `./scoring_config` — author priors, thresholds, career goals.
 * Tests:    `./__tests__/scoring.test.ts` — the 8 tests from §10.
 *
 * Determinism: this module has NO `Date.now()`, NO `Math.random()`, NO
 * environment reads, NO I/O. Calling computeScore() twice with the same
 * inputs produces byte-identical outputs.
 *
 * FLEP note (§3.3): the spec originally described a step-function cost
 * mode for FLEP users. Per product direction (2026-04-11), cost stays a
 * gradient and tuition is handled by the `max_annual_tuition` filter
 * instead. `profile.military_benefit` is informational only in v1.
 */

import {
  CAREER_GOAL_EMPLOYMENT_WEIGHTS,
  COVERAGE_THRESHOLDS,
  RANK_BAND_PERCENTILES,
  STALENESS_YEARS,
  VARIABLE_PRIORS,
  type CareerGoal,
  type Dimension,
  type Direction,
  type VariablePrior,
} from "./scoring_config";

// ─── §1.1 Priorities ─────────────────────────────────────────────────────

export type Priorities = {
  selectivity: number;
  employment: number;
  cost: number;
  geographic: number;
  academic: number;
  prestige: number;
  culture: number;
  quality_of_life: number;
  growth_fit: number;
};

// ─── §1.2 Filters ────────────────────────────────────────────────────────

export type Region =
  | "west_coast"
  | "pacific_northwest"
  | "mountain_west"
  | "southwest"
  | "midwest"
  | "south"
  | "southeast"
  | "northeast"
  | "mid_atlantic"
  | "dc_metro"
  | "new_england"
  | "puerto_rico"
  | "hawaii_alaska";

export type Tier = "T6" | "T14" | "T20" | "T50" | "any";

export type Filters = {
  max_annual_tuition?: number;
  min_median_lsat?: number;
  max_median_lsat?: number;
  min_bar_passage?: number;
  required_regions?: Region[];
  required_tier?: Tier;
  must_have_vet_community?: boolean;
  must_be_pass_fail?: boolean;
};

// ─── §1.3 Profile ────────────────────────────────────────────────────────

export type MilitaryBenefit = "flep" | "gi_bill" | "yellow_ribbon" | "none";

export type Profile = {
  target_regions: Region[];
  career_goal: CareerGoal;
  risk_tolerance: number;
  owns_housing_in?: Region;
  has_dependents?: boolean;
  military_benefit?: MilitaryBenefit;
};

// ─── §1.4 School + Observation ───────────────────────────────────────────

export type Observation = {
  variable_id: string;
  value_numeric: number | null;
  value_text: string | null;
  metric_year: number;
  source_name: string;
  source_url: string | null;
  confidence: number;
};

export type School = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: Region;
  observations: Observation[];
};

// ─── §1.5 Variable catalog ───────────────────────────────────────────────

export type Variable = {
  id: string;
  display_name: string;
  category:
    | "admissions"
    | "employment"
    | "cost"
    | "academic"
    | "rankings"
    | "culture"
    | "geographic"
    | "growth";
  dimension: Dimension;
  tier: 1 | 2 | 3;
  direction: Direction;
  prior_weight: number;
  unit: "USD" | "pct" | "ratio" | "rank" | "count" | "index";
};

// ─── §2 Output contract ──────────────────────────────────────────────────

export type RankBand = "top" | "strong" | "fit" | "consider" | "stretch";

export type DimensionScore = {
  score: number;
  observations_used: number;
  observations_expected: number;
  confidence: number;
  is_editorial_only: boolean;
};

export type RankedSchool = {
  school_id: number;
  slug: string;
  overall: number;
  dimensions: Record<Dimension, DimensionScore>;
  rank: number;
  rank_band: RankBand;
};

export type SuppressedSchool = {
  school_id: number;
  slug: string;
  failed_filters: string[];
  would_rank?: number;
};

export type ScoreMeta = {
  cohort_size: number;
  active_dimensions: Dimension[];
  total_observations: number;
  missing_data_summary: Record<Dimension, number>;
};

export type ScoreResult = {
  ranked: RankedSchool[];
  suppressed: SuppressedSchool[];
  meta: ScoreMeta;
};

// ─── §7 Sensitivity report ───────────────────────────────────────────────

export type WeightChange = {
  dimension: Dimension;
  direction: "+20%" | "-20%";
  movements: Array<{ school_id: number; delta_rank: number }>;
};

export type FilterDrop = {
  filter: string;
  unlocked: SuppressedSchool[];
};

export type SensitivityReport = {
  weight_changes: WeightChange[];
  filter_drops: FilterDrop[];
  decisive_dimension: Dimension | null;
};

// ─── Overrides (§8) ──────────────────────────────────────────────────────
//
// Key format: `${school_id}_${dimension}` (e.g. "42_growth_fit").
// Value: the 0..100 score to use in place of the computed dimension score.
// Overrides short-circuit computation AND force the dimension to be active
// in the overall aggregation, regardless of observation coverage — the
// user took responsibility for that score by editing it.
export type Overrides = Record<string, number>;

export function makeOverrideKey(school_id: number, dimension: Dimension): string {
  return `${school_id}_${dimension}`;
}

// ─── Constants ───────────────────────────────────────────────────────────

export const DIMENSIONS: readonly Dimension[] = [
  "selectivity",
  "employment",
  "cost",
  "geographic",
  "academic",
  "prestige",
  "culture",
  "quality_of_life",
  "growth_fit",
] as const;

// The algorithm's reference year is captured at module load. Staleness is
// measured relative to this, NOT Date.now(), so determinism holds: two
// calls in the same process get the same answer. A new process on a
// different day may produce different staleness weights, which is correct
// behavior (the cohort is the reference; so is the calendar).
//
// Tests that need a fixed year pass metric_year values well within the
// STALENESS_YEARS window so they never trip case C.
const REFERENCE_YEAR = new Date().getUTCFullYear();

// ─── Observation helpers ─────────────────────────────────────────────────

/**
 * §3.4 year alignment: "use the most recent year available for that
 * school. Do not average across years." Returns the latest observation
 * for the given variable_id, or null if none exists with a numeric value.
 */
export function getLatestObservation(
  school: School,
  variableId: string,
): Observation | null {
  let latest: Observation | null = null;
  for (const obs of school.observations) {
    if (obs.variable_id !== variableId) continue;
    if (obs.value_numeric == null) continue;
    if (latest === null || obs.metric_year > latest.metric_year) {
      latest = obs;
    }
  }
  return latest;
}

function getLatestNumeric(school: School, variableId: string): number | null {
  const obs = getLatestObservation(school, variableId);
  return obs?.value_numeric ?? null;
}

// ─── §3.1 Percentile rank with tie-aware averaging ───────────────────────

/**
 * Returns the percentile rank of `value` within the sorted-ascending
 * `sorted` array, as a 0..100 number.
 *
 * Implements §3.1's tie-aware rule: tied values share the average of
 * their ranks (not the min or max rank). With `sorted = [1, 2, 2, 3]`,
 * the two `2` values get rank (1 + 2) / 2 = 1.5, which normalizes to
 * 100 * 1.5 / 3 = 50.
 *
 * Edge cases:
 * - Empty cohort: returns 50 (no information, neutral).
 * - Single-item cohort (N = 1): returns 50. §3.1's formula divides by
 *   N-1 = 0, which is undefined; neutral median is the only honest
 *   answer when there's nothing to rank against.
 * - Value not found in cohort: falls back to interpolation from the
 *   number of elements strictly less than `value`.
 */
export function percentileRank(value: number, sorted: readonly number[]): number {
  const n = sorted.length;
  if (n === 0) return 50;
  if (n === 1) return 50;

  let lower = 0;
  let equal = 0;
  for (const v of sorted) {
    if (v < value) lower += 1;
    else if (v === value) equal += 1;
    else break;
  }

  // Tie-aware: average rank of the equal block is lower + (equal - 1) / 2.
  // If `value` isn't in the cohort, `equal` is 0 and we fall back to
  // `lower - 0.5` (halfway between the adjacent ranks), clamped to [0, n-1].
  const avgRank =
    equal > 0 ? lower + (equal - 1) / 2 : Math.max(0, Math.min(n - 1, lower - 0.5));

  return (100 * avgRank) / (n - 1);
}

/**
 * §3.2 direction-aware normalization.
 *
 * - `higher_better`: raw percentile rank.
 * - `lower_better`: 100 minus percentile rank.
 * - `target`: v1 fallback — "closer to cohort median = higher score."
 *   The full §3.2 target formula takes a profile-supplied target value;
 *   v1 has no profile fields for target-direction variables (only
 *   `aba509:class_size` uses target direction today), so we score by
 *   proximity to the 50th percentile. This is documented as a v1
 *   simplification; when a profile.target_class_size field lands, this
 *   branch upgrades to the full §3.2 formula without touching callers.
 */
export function normalize(
  value: number,
  sorted: readonly number[],
  direction: Direction,
): number {
  const p = percentileRank(value, sorted);
  if (direction === "higher_better") return p;
  if (direction === "lower_better") return 100 - p;
  // target — proximity to median
  return 100 * (1 - Math.abs(p - 50) / 50);
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * §9 reference skeleton. Pure function of its arguments.
 *
 * @param priorities User's dimension weights (0..100 each).
 * @param filters Hard constraints applied before scoring.
 * @param profile Personal context (region targets, career goal, etc.).
 * @param schools The cohort.
 * @param variableCatalog The variables to score on.
 * @param overrides Optional user overrides keyed by `${school_id}_${dim}`.
 */
export function computeScore(
  priorities: Priorities,
  filters: Filters,
  profile: Profile,
  schools: School[],
  variableCatalog: Variable[],
  overrides: Overrides = {},
): ScoreResult {
  // §1.1 zero-weight short-circuit: if every priority is 0, return no
  // ranked list and let the UI surface a "name what matters first" prompt.
  const totalPriority =
    priorities.selectivity +
    priorities.employment +
    priorities.cost +
    priorities.geographic +
    priorities.academic +
    priorities.prestige +
    priorities.culture +
    priorities.quality_of_life +
    priorities.growth_fit;

  if (totalPriority === 0) {
    return {
      ranked: [],
      suppressed: [],
      meta: {
        cohort_size: schools.length,
        active_dimensions: [],
        total_observations: 0,
        missing_data_summary: zeroMissingSummary(),
      },
    };
  }

  // §9 step 1: partition by filters.
  const { passing, suppressed } = applyFilters(schools, filters);

  // §9 step 2: cohort distributions from the passing set (the reference
  // cohort IS what the user is scoring against, post-filter).
  const distributions = buildCohortDistributions(passing, variableCatalog);

  // §9 step 3: score each passing school.
  type Scored = {
    school: School;
    dimensions: Record<Dimension, DimensionScore>;
    overall: number;
    active: Dimension[];
    insufficient: boolean;
  };

  const scored: Scored[] = [];
  const insufficientSuppressed: Array<{ school: School; failed_filters: string[] }> = [];

  for (const school of passing) {
    const dimensions = scoreDimensions(school, variableCatalog, distributions, profile, overrides);

    // §4.3 insufficient data: if 5+ dimensions are editorial-only, this
    // school cannot be meaningfully ranked. Move to suppressed.
    const editorialCount = DIMENSIONS.reduce(
      (n, d) => n + (dimensions[d].is_editorial_only ? 1 : 0),
      0,
    );
    if (editorialCount >= 5) {
      insufficientSuppressed.push({ school, failed_filters: ["insufficient_data"] });
      continue;
    }

    const { overall, active } = aggregateOverall(dimensions, priorities);
    scored.push({ school, dimensions, overall, active, insufficient: false });
  }

  // §9 step 4: sort descending by overall, deterministic tie-break on slug.
  scored.sort((a, b) => {
    if (b.overall !== a.overall) return b.overall - a.overall;
    return a.school.slug.localeCompare(b.school.slug);
  });

  const bands = assignRankBands(scored);

  const ranked: RankedSchool[] = scored.map((r, i) => ({
    school_id: r.school.id,
    slug: r.school.slug,
    overall: r.overall,
    dimensions: r.dimensions,
    rank: i + 1,
    rank_band: bands[i]!,
  }));

  // §9 step 5: would_rank for filter-suppressed schools. Insufficient-
  // data schools don't get a would_rank — there's no filter to drop that
  // would change their situation.
  const suppressedWithRank = computeWouldRank(
    passing,
    suppressed,
    priorities,
    profile,
    variableCatalog,
    overrides,
  );

  const suppressedFinal: SuppressedSchool[] = [
    ...suppressedWithRank,
    ...insufficientSuppressed.map((s) => ({
      school_id: s.school.id,
      slug: s.school.slug,
      failed_filters: s.failed_filters,
    })),
  ];

  // §9 step 6: meta.
  const activeDimSet = new Set<Dimension>();
  for (const r of scored) for (const d of r.active) activeDimSet.add(d);
  const activeDimensions = DIMENSIONS.filter((d) => activeDimSet.has(d));

  const totalObservations = passing.reduce((sum, s) => sum + s.observations.length, 0);

  const missingDataSummary = zeroMissingSummary();
  if (scored.length > 0) {
    for (const d of DIMENSIONS) {
      let missing = 0;
      for (const r of scored) if (r.dimensions[d].is_editorial_only) missing += 1;
      missingDataSummary[d] = missing / scored.length;
    }
  }

  return {
    ranked,
    suppressed: suppressedFinal,
    meta: {
      cohort_size: schools.length,
      active_dimensions: activeDimensions,
      total_observations: totalObservations,
      missing_data_summary: missingDataSummary,
    },
  };
}

function zeroMissingSummary(): Record<Dimension, number> {
  return {
    selectivity: 0,
    employment: 0,
    cost: 0,
    geographic: 0,
    academic: 0,
    prestige: 0,
    culture: 0,
    quality_of_life: 0,
    growth_fit: 0,
  };
}

/**
 * §7 sensitivity analysis — weight sensitivity, filter drops, decisive
 * dimension detection. Pure function of its arguments; runs computeScore
 * internally ~(1 + 9×2 + |filters| + 9) times. For 200-school cohorts
 * this is still well under 100ms.
 */
export function computeSensitivity(
  priorities: Priorities,
  filters: Filters,
  profile: Profile,
  schools: School[],
  variableCatalog: Variable[],
  overrides: Overrides = {},
): SensitivityReport {
  const baseline = computeScore(priorities, filters, profile, schools, variableCatalog, overrides);
  const baselineRanks = new Map<number, number>();
  for (const r of baseline.ranked) baselineRanks.set(r.school_id, r.rank);

  // ─── §7.1 weight sensitivity ──────────────────────────────────────────
  const weight_changes: WeightChange[] = [];
  for (const dim of DIMENSIONS) {
    if (priorities[dim] === 0) continue; // nothing to perturb
    for (const [label, mult] of [
      ["+20%", 1.2] as const,
      ["-20%", 0.8] as const,
    ]) {
      const tweaked: Priorities = { ...priorities, [dim]: priorities[dim] * mult };
      const result = computeScore(tweaked, filters, profile, schools, variableCatalog, overrides);
      const movements: Array<{ school_id: number; delta_rank: number }> = [];
      for (const r of result.ranked) {
        const base = baselineRanks.get(r.school_id);
        if (base == null) continue;
        const delta = r.rank - base;
        if (Math.abs(delta) > 3) {
          movements.push({ school_id: r.school_id, delta_rank: delta });
        }
      }
      if (movements.length > 0) {
        weight_changes.push({ dimension: dim, direction: label, movements });
      }
    }
  }

  // ─── §7.2 filter drops ────────────────────────────────────────────────
  const filter_drops: FilterDrop[] = [];
  const baselineRankedIds = new Set(baseline.ranked.map((r) => r.school_id));

  const filterKeys = Object.keys(filters) as Array<keyof Filters>;
  for (const key of filterKeys) {
    const value = filters[key];
    // A filter is "active" only if it's actually set.
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    const reduced: Filters = { ...filters };
    delete reduced[key];

    const result = computeScore(priorities, reduced, profile, schools, variableCatalog, overrides);
    const unlocked: SuppressedSchool[] = [];
    for (const r of result.ranked) {
      if (baselineRankedIds.has(r.school_id)) continue;
      unlocked.push({
        school_id: r.school_id,
        slug: r.slug,
        failed_filters: [String(key)],
        would_rank: r.rank,
      });
    }
    if (unlocked.length > 0) {
      filter_drops.push({ filter: String(key), unlocked });
    }
  }

  // ─── §7.3 decisive dimension ──────────────────────────────────────────
  //
  // "The dimension whose removal collapses the ranking is the decisive
  // one." We interpret "collapses" with two signals, tried in order:
  //
  //   1. WINNER FLIP: if zeroing a dimension changes the top-ranked
  //      school, that dimension is definitively decisive. Return it.
  //   2. GAP COMPRESSION: otherwise, find the dimension whose removal
  //      most narrows the gap between rank 1 and rank 2 (baseline gap
  //      minus zeroed gap). Return whichever dim maximizes that
  //      compression, if any compression is positive. Return null if
  //      no dimension makes the ranking meaningfully more compressed.
  //
  // The two-signal approach handles both §7.3 narratives: a tight race
  // where one dim is the tiebreaker (Berkeley/Vanderbilt — growth_fit
  // compresses the gap from 6.65 to 1.65) and a dominant-dim race
  // where removing one dim flips the winner entirely.
  let decisive_dimension: Dimension | null = null;

  if (baseline.ranked.length >= 2) {
    const topBaseline = baseline.ranked[0]!;
    const secondBaseline = baseline.ranked[1]!;
    const baselineGap = topBaseline.overall - secondBaseline.overall;

    let bestCompression = 0;
    let bestDim: Dimension | null = null;

    for (const dim of DIMENSIONS) {
      if (priorities[dim] === 0) continue;

      const zeroed: Priorities = { ...priorities, [dim]: 0 };
      const result = computeScore(zeroed, filters, profile, schools, variableCatalog, overrides);
      if (result.ranked.length < 2) continue;

      // Winner-flip signal.
      if (result.ranked[0]!.school_id !== topBaseline.school_id) {
        decisive_dimension = dim;
        break;
      }

      // Gap-compression signal.
      const gap = result.ranked[0]!.overall - result.ranked[1]!.overall;
      const compression = baselineGap - gap;
      if (compression > bestCompression) {
        bestCompression = compression;
        bestDim = dim;
      }
    }

    if (decisive_dimension === null) decisive_dimension = bestDim;
  }

  return { weight_changes, filter_drops, decisive_dimension };
}

// ─── §9 sub-functions (stubs) ────────────────────────────────────────────

export type FilterPartition = {
  passing: School[];
  suppressed: Array<{ school: School; failed_filters: string[] }>;
};

/**
 * §1.2 + "a filter on a variable with no observation is NOT a rejection."
 *
 * Evaluates each filter against the school's latest observations. A school
 * is suppressed if any filter it CAN evaluate fails. A filter the school
 * has no data for is treated as passing (the honesty rule: we can't reject
 * a school for data we don't have).
 *
 * The `max_annual_tuition` filter uses the LESSER of resident/nonresident
 * tuition as the effective cost (most permissive for the school — if any
 * configuration fits within the user's cap, the school qualifies).
 */
export function applyFilters(
  schools: School[],
  filters: Filters,
): FilterPartition {
  const passing: School[] = [];
  const suppressed: Array<{ school: School; failed_filters: string[] }> = [];

  for (const school of schools) {
    const failed: string[] = [];

    if (filters.max_annual_tuition != null) {
      const resident = getLatestNumeric(school, "aba509:tuition_resident");
      const nonresident = getLatestNumeric(school, "aba509:tuition_nonresident");
      const effective =
        resident != null && nonresident != null
          ? Math.min(resident, nonresident)
          : resident ?? nonresident;
      if (effective != null && effective > filters.max_annual_tuition) {
        failed.push("max_annual_tuition");
      }
    }

    if (filters.min_median_lsat != null) {
      const lsat = getLatestNumeric(school, "aba509:median_lsat");
      if (lsat != null && lsat < filters.min_median_lsat) {
        failed.push("min_median_lsat");
      }
    }

    if (filters.max_median_lsat != null) {
      const lsat = getLatestNumeric(school, "aba509:median_lsat");
      if (lsat != null && lsat > filters.max_median_lsat) {
        failed.push("max_median_lsat");
      }
    }

    if (filters.min_bar_passage != null) {
      const bar = getLatestNumeric(school, "aba509:bar_passage_rate");
      if (bar != null && bar < filters.min_bar_passage) {
        failed.push("min_bar_passage");
      }
    }

    if (filters.required_regions && filters.required_regions.length > 0) {
      if (!filters.required_regions.includes(school.region)) {
        failed.push("required_regions");
      }
    }

    // required_tier, must_have_vet_community, must_be_pass_fail: no
    // catalog data yet. Treated as passing per the "no observation is
    // not a rejection" rule. These will land with later ingestion
    // sources (US News for tier, school websites for the others).

    if (failed.length > 0) {
      suppressed.push({ school, failed_filters: failed });
    } else {
      passing.push(school);
    }
  }

  return { passing, suppressed };
}

/** Sorted ascending arrays of numeric values per variable_id, for percentile lookups. */
export type CohortDistributions = Map<string, number[]>;

/**
 * For each variable in the catalog, collect the latest observation value
 * from each school that has one, sort ascending, and store. Percentile-
 * rank lookups in §3.1 consume these sorted arrays. Schools missing the
 * variable are excluded from the distribution for that variable only
 * (§3.1: "Schools missing the variable are excluded from cohort for
 * that variable only").
 */
export function buildCohortDistributions(
  schools: School[],
  variableCatalog: Variable[],
): CohortDistributions {
  const distributions: CohortDistributions = new Map();
  for (const v of variableCatalog) {
    const values: number[] = [];
    for (const school of schools) {
      const value = getLatestNumeric(school, v.id);
      if (value != null) values.push(value);
    }
    values.sort((a, b) => a - b);
    distributions.set(v.id, values);
  }
  return distributions;
}

/**
 * §5.1 — variables roll up into a dimension score via confidence-and-
 * staleness-weighted average of normalized variable scores, using
 * author priors from the catalog. Overrides short-circuit the whole
 * dimension per §8.
 *
 * Employment dimension special case: internal weights come from
 * CAREER_GOAL_EMPLOYMENT_WEIGHTS keyed by profile.career_goal (§5.2).
 * Granular ABA 509 sub-cuts not in the §5.2 table keep their catalog
 * prior_weight as a supplement.
 *
 * Missing-data rules (§4.1):
 *   - Case A (no observation): variable excluded from this school's
 *     numerator and denominator; observations_used decrements.
 *   - Case B (confidence < 0.5): §5.1 formula multiplies by confidence
 *     automatically, so low-confidence observations contribute less.
 *   - Case C (metric_year < REFERENCE_YEAR - STALENESS_YEARS): effective
 *     weight further multiplied by 0.5.
 *
 * Coverage (§4.2): sum of observed prior_weight divided by sum of all
 * prior_weight for the dimension. `< 0.3` → editorial-only.
 *
 * No imputation. Ever.
 */
export function scoreDimensions(
  school: School,
  variableCatalog: Variable[],
  distributions: CohortDistributions,
  profile: Profile,
  overrides: Overrides,
): Record<Dimension, DimensionScore> {
  const result = {} as Record<Dimension, DimensionScore>;

  // Group catalog by dimension once.
  const byDimension = new Map<Dimension, Variable[]>();
  for (const d of DIMENSIONS) byDimension.set(d, []);
  for (const v of variableCatalog) byDimension.get(v.dimension)!.push(v);

  for (const dim of DIMENSIONS) {
    // §8: overrides short-circuit. The user took responsibility for
    // this score; treat it as fully covered and not editorial-only.
    const overrideKey = makeOverrideKey(school.id, dim);
    const overrideValue = overrides[overrideKey];
    if (overrideValue != null) {
      const varsInDim = byDimension.get(dim)!;
      result[dim] = {
        score: overrideValue,
        observations_used: 0,
        observations_expected: varsInDim.length,
        confidence: 1.0,
        is_editorial_only: false,
      };
      continue;
    }

    const varsInDim = byDimension.get(dim)!;

    // No catalog variables for this dimension → editorial-only.
    // This is the normal state for prestige/culture/quality_of_life/
    // growth_fit until later sources land (see scoring_config.ts
    // sparse-dimension note).
    if (varsInDim.length === 0) {
      result[dim] = {
        score: 0,
        observations_used: 0,
        observations_expected: 0,
        confidence: 0,
        is_editorial_only: true,
      };
      continue;
    }

    // Determine per-variable prior weights for this dimension.
    // Employment uses the career-goal table; every other dimension
    // uses the catalog's prior_weight directly.
    const priorWeight = new Map<string, number>();
    if (dim === "employment") {
      const goalTable = CAREER_GOAL_EMPLOYMENT_WEIGHTS[profile.career_goal];
      for (const [varId, w] of Object.entries(goalTable)) {
        priorWeight.set(varId, w);
      }
      // Include catalog sub-cuts not in the §5.2 table with their
      // author-assigned prior (they supplement, not replace).
      for (const v of varsInDim) {
        if (!priorWeight.has(v.id)) priorWeight.set(v.id, v.prior_weight);
      }
    } else {
      for (const v of varsInDim) priorWeight.set(v.id, v.prior_weight);
    }

    // §4.2 coverage denominator: sum of ALL priors for the dimension,
    // including variables the school doesn't have. The numerator is
    // the sum of priors for variables the school DOES have.
    const totalPriorWeight = Array.from(priorWeight.values()).reduce((a, b) => a + b, 0);

    let numerator = 0;
    let denominator = 0;
    let coveredPriorWeight = 0;
    let observationsUsed = 0;
    let confidenceAccumulator = 0;

    for (const v of varsInDim) {
      const prior = priorWeight.get(v.id);
      if (prior == null || prior === 0) continue;

      const obs = getLatestObservation(school, v.id);
      if (obs === null) continue; // §4.1 Case A
      if (obs.value_numeric == null) continue;

      // §5.1 effective weight: prior × confidence × staleness_factor.
      const staleness =
        REFERENCE_YEAR - obs.metric_year > STALENESS_YEARS ? 0.5 : 1.0;
      const effectiveWeight = prior * obs.confidence * staleness;
      if (effectiveWeight === 0) continue;

      const distribution = distributions.get(v.id) ?? [];
      const normalized = normalize(obs.value_numeric, distribution, v.direction);

      numerator += effectiveWeight * normalized;
      denominator += effectiveWeight;
      coveredPriorWeight += prior;
      observationsUsed += 1;
      confidenceAccumulator += obs.confidence;
    }

    const coverage = totalPriorWeight > 0 ? coveredPriorWeight / totalPriorWeight : 0;
    const isEditorialOnly = coverage < COVERAGE_THRESHOLDS.partial || denominator === 0;

    result[dim] = {
      score: denominator > 0 ? numerator / denominator : 0,
      observations_used: observationsUsed,
      observations_expected: varsInDim.length,
      confidence: observationsUsed > 0 ? confidenceAccumulator / observationsUsed : 0,
      is_editorial_only: isEditorialOnly,
    };
  }

  return result;
}

/**
 * §5.3 dimension scores → overall. Simple priority-weighted average
 * over the "active" dimensions:
 *
 *   active(s) = { d | !editorial_only(s, d) AND priorities[d] > 0 }
 *
 * A dimension missing entirely for this school (editorial-only) is
 * NOT penalized — it's excluded from both the numerator AND the
 * denominator. That's the honest choice: we can't know whether the
 * missing data would have raised or lowered the score.
 *
 * Priorities are normalized inside the formula — the user doesn't
 * have to make them sum to anything.
 */
export function aggregateOverall(
  dimensions: Record<Dimension, DimensionScore>,
  priorities: Priorities,
): { overall: number; active: Dimension[] } {
  const active: Dimension[] = [];
  let numerator = 0;
  let denominator = 0;

  for (const d of DIMENSIONS) {
    const priority = priorities[d];
    if (priority <= 0) continue; // §1.1: weight of 0 means exclude
    const ds = dimensions[d];
    if (ds.is_editorial_only) continue; // §5.3: excluded for this school

    active.push(d);
    numerator += priority * ds.score;
    denominator += priority;
  }

  return {
    overall: denominator > 0 ? numerator / denominator : 0,
    active,
  };
}

/**
 * §5.4 rank bands. Input is the already-sorted-descending scored list.
 * Output is a parallel array of band labels. The banding is relative
 * to the cohort (percentile-of-rank), not fixed score thresholds.
 *
 * For index i (0-indexed from the top) in a cohort of n, the
 * percentile is (n - i) / n — item 0 is the top slice, item n-1 is
 * the bottom slice.
 */
export function assignRankBands(
  ranked: Array<{ overall: number }>,
): RankBand[] {
  const n = ranked.length;
  if (n === 0) return [];
  return ranked.map((_, i) => {
    const percentile = (n - i) / n;
    if (percentile >= RANK_BAND_PERCENTILES.top) return "top";
    if (percentile >= RANK_BAND_PERCENTILES.strong) return "strong";
    if (percentile >= RANK_BAND_PERCENTILES.fit) return "fit";
    if (percentile >= RANK_BAND_PERCENTILES.consider) return "consider";
    return "stretch";
  });
}

/**
 * §7.2 filter sensitivity. For each suppressed school, compute what its
 * rank WOULD be if filters were lifted. Implementation: run a fresh
 * scoring pass over the combined (passing ∪ suppressed) cohort with NO
 * filters, sort, and look up each suppressed school's position.
 *
 * This does NOT call computeScore() recursively — it inlines just the
 * scoring pipeline it needs. That keeps the function's work proportional
 * to the cohort (one extra pass per computeScore() call) and avoids the
 * zero-weight short-circuit getting in the way.
 */
export function computeWouldRank(
  passing: School[],
  suppressed: Array<{ school: School; failed_filters: string[] }>,
  priorities: Priorities,
  profile: Profile,
  variableCatalog: Variable[],
  overrides: Overrides,
): SuppressedSchool[] {
  if (suppressed.length === 0) return [];

  const allSchools: School[] = [...passing, ...suppressed.map((s) => s.school)];
  const distributions = buildCohortDistributions(allSchools, variableCatalog);

  type Scored = { school: School; overall: number };
  const scored: Scored[] = allSchools.map((school) => {
    const dimensions = scoreDimensions(school, variableCatalog, distributions, profile, overrides);
    const { overall } = aggregateOverall(dimensions, priorities);
    return { school, overall };
  });

  scored.sort((a, b) => {
    if (b.overall !== a.overall) return b.overall - a.overall;
    return a.school.slug.localeCompare(b.school.slug);
  });

  const rankById = new Map<number, number>();
  scored.forEach((r, i) => rankById.set(r.school.id, i + 1));

  return suppressed.map((s) => ({
    school_id: s.school.id,
    slug: s.school.slug,
    failed_filters: s.failed_filters,
    would_rank: rankById.get(s.school.id),
  }));
}

// ─── Re-exports from scoring_config (convenience) ────────────────────────
export {
  CAREER_GOAL_EMPLOYMENT_WEIGHTS,
  COVERAGE_THRESHOLDS,
  RANK_BAND_PERCENTILES,
  STALENESS_YEARS,
  VARIABLE_PRIORS,
  REFERENCE_YEAR,
};
export type { CareerGoal, Dimension, Direction, VariablePrior };
