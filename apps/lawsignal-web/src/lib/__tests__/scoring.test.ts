/**
 * scoring.test.ts — §10 test plan for computeScore()
 *
 * The eight tests from docs/SCORING_ALGORITHM.md §10. Every test must
 * pass before the function is considered correct:
 *
 *   1. Berkeley regression           (§5.5 worked example)
 *   2. Zero-weight                   (all priorities 0 → empty ranked)
 *   3. Single-school                 (N=1 cohort, weighted mean)
 *   4. Missing-dimension             (Employment absent → not penalized)
 *   5. Filter-suppression            (failing max_tuition → suppressed + would_rank)
 *   6. Override                      (dimension override shifts overall)
 *   7. Determinism                   (byte-identical output across calls)
 *   8. Sensitivity convergence       (Berkeley → growth_fit decisive)
 *
 * The fixtures below use OVERRIDES to inject dimension scores directly.
 * This bypasses percentile-rank normalization (which can't produce
 * arbitrary scores with N=3) and lets the tests assert on §5.5 values
 * verbatim. Overrides short-circuit computation AND force the dimension
 * to be active, per the override design in `scoring.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  computeScore,
  computeSensitivity,
  makeOverrideKey,
  type Dimension,
  type Filters,
  type Observation,
  type Overrides,
  type Priorities,
  type Profile,
  type School,
  type Variable,
} from "../scoring";

// ─── Shared fixtures ─────────────────────────────────────────────────────

// Author's priorities from DECISION_ANALYSIS.md §Decision Matrix.
const AUTHOR_PRIORITIES: Priorities = {
  selectivity: 5,
  employment: 10,
  cost: 10,
  geographic: 10,
  academic: 10,
  prestige: 15,
  culture: 15,
  quality_of_life: 10,
  growth_fit: 15,
};

// §5.5 Berkeley dimension scores (and the companion rows from
// DECISION_ANALYSIS.md §Decision Matrix for Vanderbilt and Georgetown).
const BERKELEY_DIM_SCORES: Record<Dimension, number> = {
  selectivity: 88,
  employment: 90,
  cost: 65,
  geographic: 85,
  academic: 82,
  prestige: 92,
  culture: 90,
  quality_of_life: 72,
  growth_fit: 95,
};

const VANDERBILT_DIM_SCORES: Record<Dimension, number> = {
  selectivity: 78,
  employment: 82,
  cost: 90,
  geographic: 70,
  academic: 88,
  prestige: 75,
  culture: 85,
  quality_of_life: 88,
  growth_fit: 60,
};

const GEORGETOWN_DIM_SCORES: Record<Dimension, number> = {
  selectivity: 85,
  employment: 87,
  cost: 75,
  geographic: 80,
  academic: 72,
  prestige: 82,
  culture: 70,
  quality_of_life: 78,
  growth_fit: 72,
};

function emptySchool(id: number, slug: string, name: string): School {
  return {
    id,
    slug,
    name,
    state: "XX",
    region: "west_coast",
    observations: [],
  };
}

const BERKELEY = emptySchool(1, "berkeley-law", "Berkeley Law");
const VANDERBILT = emptySchool(2, "vanderbilt-law", "Vanderbilt Law");
const GEORGETOWN = emptySchool(3, "georgetown-law", "Georgetown Law");

function overridesFor(
  school: School,
  scores: Record<Dimension, number>,
): Overrides {
  const out: Overrides = {};
  for (const [dim, value] of Object.entries(scores)) {
    out[makeOverrideKey(school.id, dim as Dimension)] = value;
  }
  return out;
}

function merge(...overrides: Overrides[]): Overrides {
  return Object.assign({}, ...overrides);
}

const BERKELEY_OVERRIDES = overridesFor(BERKELEY, BERKELEY_DIM_SCORES);
const VANDERBILT_OVERRIDES = overridesFor(VANDERBILT, VANDERBILT_DIM_SCORES);
const GEORGETOWN_OVERRIDES = overridesFor(GEORGETOWN, GEORGETOWN_DIM_SCORES);

const DEFAULT_PROFILE: Profile = {
  target_regions: [],
  career_goal: "undecided",
  risk_tolerance: 0.5,
};

const NO_FILTERS: Filters = {};
const EMPTY_CATALOG: Variable[] = [];

// ─── 1. Berkeley regression ──────────────────────────────────────────────

describe("computeScore — Berkeley regression (§5.5)", () => {
  it("ranks Berkeley first with overall within ±0.5 of 85.7", () => {
    const result = computeScore(
      AUTHOR_PRIORITIES,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY, VANDERBILT, GEORGETOWN],
      EMPTY_CATALOG,
      merge(BERKELEY_OVERRIDES, VANDERBILT_OVERRIDES, GEORGETOWN_OVERRIDES),
    );

    expect(result.ranked).toHaveLength(3);
    expect(result.ranked[0]!.slug).toBe("berkeley-law");
    expect(result.ranked[0]!.rank).toBe(1);
    expect(result.ranked[0]!.overall).toBeGreaterThanOrEqual(85.2);
    expect(result.ranked[0]!.overall).toBeLessThanOrEqual(86.2);

    // Vanderbilt second, Georgetown third per DECISION_ANALYSIS.md.
    expect(result.ranked[1]!.slug).toBe("vanderbilt-law");
    expect(result.ranked[2]!.slug).toBe("georgetown-law");
  });
});

// ─── 2. Zero-weight ──────────────────────────────────────────────────────

describe("computeScore — zero-weight", () => {
  it("returns an empty ranked list when all priorities are 0", () => {
    const zero: Priorities = {
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
    const result = computeScore(
      zero,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY, VANDERBILT, GEORGETOWN],
      EMPTY_CATALOG,
      merge(BERKELEY_OVERRIDES, VANDERBILT_OVERRIDES, GEORGETOWN_OVERRIDES),
    );
    expect(result.ranked).toHaveLength(0);
    expect(result.meta.active_dimensions).toHaveLength(0);
  });
});

// ─── 3. Single-school ────────────────────────────────────────────────────

describe("computeScore — single-school cohort", () => {
  it("returns the school without crashing and with a computed overall", () => {
    const result = computeScore(
      AUTHOR_PRIORITIES,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY],
      EMPTY_CATALOG,
      BERKELEY_OVERRIDES,
    );
    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0]!.slug).toBe("berkeley-law");
    // Expected overall = weighted mean of §5.5 scores = 85.35
    expect(result.ranked[0]!.overall).toBeGreaterThanOrEqual(85.2);
    expect(result.ranked[0]!.overall).toBeLessThanOrEqual(85.5);
  });
});

// ─── 4. Missing-dimension ────────────────────────────────────────────────

describe("computeScore — missing dimension", () => {
  it("is not penalized for missing Employment; overall is computed on 8 dims", () => {
    // Overrides for 8 dimensions (Employment omitted).
    const berkeleyMinus: Overrides = {};
    for (const [dim, value] of Object.entries(BERKELEY_DIM_SCORES)) {
      if (dim === "employment") continue;
      berkeleyMinus[makeOverrideKey(BERKELEY.id, dim as Dimension)] = value;
    }

    const result = computeScore(
      AUTHOR_PRIORITIES,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY],
      EMPTY_CATALOG,
      berkeleyMinus,
    );
    expect(result.ranked).toHaveLength(1);
    const overall = result.ranked[0]!.overall;

    // Weighted mean over 8 dims (employment weight 10 removed from
    // denominator). Expected:
    //   (5×88 + 10×65 + 10×85 + 10×82 + 15×92 + 15×90 + 10×72 + 15×95) / 90
    //   = 7635 / 90 = 84.83
    expect(overall).toBeGreaterThanOrEqual(84.5);
    expect(overall).toBeLessThanOrEqual(85.2);

    // Employment dimension should be marked editorial-only (no data, no override).
    expect(result.ranked[0]!.dimensions.employment.is_editorial_only).toBe(true);
    expect(result.ranked[0]!.dimensions.selectivity.is_editorial_only).toBe(false);
  });
});

// ─── 5. Filter-suppression ───────────────────────────────────────────────

function tuitionObservation(value: number, year: number): Observation {
  return {
    variable_id: "aba509:tuition_nonresident",
    value_numeric: value,
    value_text: null,
    metric_year: year,
    source_name: "aba509",
    source_url: null,
    confidence: 1.0,
  };
}

describe("computeScore — filter suppression (max_annual_tuition)", () => {
  it("suppresses schools failing the filter and computes would_rank", () => {
    const currentYear = new Date().getUTCFullYear();
    // Berkeley $70K, Vanderbilt $25K, Georgetown $65K — cap at $28K.
    const berkeleyCostly: School = {
      ...BERKELEY,
      observations: [tuitionObservation(70000, currentYear)],
    };
    const vanderbiltCheap: School = {
      ...VANDERBILT,
      observations: [tuitionObservation(25000, currentYear)],
    };
    const georgetownCostly: School = {
      ...GEORGETOWN,
      observations: [tuitionObservation(65000, currentYear)],
    };

    const filtered = computeScore(
      AUTHOR_PRIORITIES,
      { max_annual_tuition: 28000 },
      DEFAULT_PROFILE,
      [berkeleyCostly, vanderbiltCheap, georgetownCostly],
      EMPTY_CATALOG,
      merge(BERKELEY_OVERRIDES, VANDERBILT_OVERRIDES, GEORGETOWN_OVERRIDES),
    );

    // Only Vanderbilt passes the filter.
    expect(filtered.ranked).toHaveLength(1);
    expect(filtered.ranked[0]!.slug).toBe("vanderbilt-law");

    // Berkeley and Georgetown are suppressed with max_annual_tuition
    // in failed_filters.
    const suppressedSlugs = filtered.suppressed.map((s) => s.slug).sort();
    expect(suppressedSlugs).toEqual(["berkeley-law", "georgetown-law"]);
    for (const s of filtered.suppressed) {
      expect(s.failed_filters).toContain("max_annual_tuition");
    }

    // would_rank: Berkeley should be #1 if the filter is dropped,
    // Georgetown #3. (From the full Berkeley regression ordering.)
    const berkeleySuppressed = filtered.suppressed.find((s) => s.slug === "berkeley-law");
    const georgetownSuppressed = filtered.suppressed.find((s) => s.slug === "georgetown-law");
    expect(berkeleySuppressed?.would_rank).toBe(1);
    expect(georgetownSuppressed?.would_rank).toBe(3);
  });
});

// ─── 6. Override ─────────────────────────────────────────────────────────

describe("computeScore — override", () => {
  it("override for Berkeley culture = 40 produces a different overall", () => {
    const baseline = computeScore(
      AUTHOR_PRIORITIES,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY],
      EMPTY_CATALOG,
      BERKELEY_OVERRIDES,
    );
    const baselineOverall = baseline.ranked[0]!.overall;

    // Override culture from 90 to 40.
    const tweaked = {
      ...BERKELEY_OVERRIDES,
      [makeOverrideKey(BERKELEY.id, "culture")]: 40,
    };
    const result = computeScore(
      AUTHOR_PRIORITIES,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY],
      EMPTY_CATALOG,
      tweaked,
    );
    const overall = result.ranked[0]!.overall;

    // Culture weight 15, score delta -50 → overall delta = -50 × 15 / 100 = -7.5
    expect(overall).toBeLessThan(baselineOverall);
    expect(baselineOverall - overall).toBeGreaterThanOrEqual(7.0);
    expect(baselineOverall - overall).toBeLessThanOrEqual(8.0);
  });
});

// ─── 7. Determinism ──────────────────────────────────────────────────────

describe("computeScore — determinism", () => {
  it("produces byte-identical output across calls with identical inputs", () => {
    const cohort: School[] = [BERKELEY, VANDERBILT, GEORGETOWN];
    const overrides = merge(BERKELEY_OVERRIDES, VANDERBILT_OVERRIDES, GEORGETOWN_OVERRIDES);

    const a = computeScore(AUTHOR_PRIORITIES, NO_FILTERS, DEFAULT_PROFILE, cohort, EMPTY_CATALOG, overrides);
    const b = computeScore(AUTHOR_PRIORITIES, NO_FILTERS, DEFAULT_PROFILE, cohort, EMPTY_CATALOG, overrides);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// ─── 8. Sensitivity convergence ──────────────────────────────────────────

describe("computeSensitivity — Berkeley case", () => {
  it("flags growth_fit as the decisive dimension", () => {
    const report = computeSensitivity(
      AUTHOR_PRIORITIES,
      NO_FILTERS,
      DEFAULT_PROFILE,
      [BERKELEY, VANDERBILT, GEORGETOWN],
      EMPTY_CATALOG,
      merge(BERKELEY_OVERRIDES, VANDERBILT_OVERRIDES, GEORGETOWN_OVERRIDES),
    );
    expect(report.decisive_dimension).toBe("growth_fit");
  });
});
