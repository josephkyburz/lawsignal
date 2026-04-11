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
  _priorities: Priorities,
  _filters: Filters,
  _profile: Profile,
  _schools: School[],
  _variableCatalog: Variable[],
  _overrides: Overrides = {},
): ScoreResult {
  throw new Error("computeScore: not yet implemented (L1-2 commit 1 stub)");
}

export function computeSensitivity(
  _priorities: Priorities,
  _filters: Filters,
  _profile: Profile,
  _schools: School[],
  _variableCatalog: Variable[],
  _overrides: Overrides = {},
): SensitivityReport {
  throw new Error("computeSensitivity: not yet implemented (L1-2 commit 1 stub)");
}

// ─── §9 sub-functions (stubs) ────────────────────────────────────────────

export type FilterPartition = {
  passing: School[];
  suppressed: Array<{ school: School; failed_filters: string[] }>;
};

export function applyFilters(
  _schools: School[],
  _filters: Filters,
): FilterPartition {
  throw new Error("applyFilters: not yet implemented (L1-2 commit 1 stub)");
}

/** Sorted ascending arrays of numeric values per variable_id, for percentile lookups. */
export type CohortDistributions = Map<string, number[]>;

export function buildCohortDistributions(
  _schools: School[],
  _variableCatalog: Variable[],
): CohortDistributions {
  throw new Error("buildCohortDistributions: not yet implemented (L1-2 commit 1 stub)");
}

export function scoreDimensions(
  _school: School,
  _variableCatalog: Variable[],
  _distributions: CohortDistributions,
  _profile: Profile,
  _overrides: Overrides,
): Record<Dimension, DimensionScore> {
  throw new Error("scoreDimensions: not yet implemented (L1-2 commit 1 stub)");
}

export function aggregateOverall(
  _dimensions: Record<Dimension, DimensionScore>,
  _priorities: Priorities,
): { overall: number; active: Dimension[] } {
  throw new Error("aggregateOverall: not yet implemented (L1-2 commit 1 stub)");
}

export function assignRankBands(
  _ranked: Array<{ overall: number }>,
): RankBand[] {
  throw new Error("assignRankBands: not yet implemented (L1-2 commit 1 stub)");
}

export function computeWouldRank(
  _suppressed: Array<{ school: School; failed_filters: string[] }>,
  _priorities: Priorities,
  _profile: Profile,
  _variableCatalog: Variable[],
  _overrides: Overrides,
): SuppressedSchool[] {
  throw new Error("computeWouldRank: not yet implemented (L1-2 commit 1 stub)");
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
