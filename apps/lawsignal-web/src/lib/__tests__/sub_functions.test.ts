/**
 * sub_functions.test.ts — unit tests for the §9 sub-functions
 *
 * These prove each pure sub-function in isolation. The §10 integration
 * tests live in scoring.test.ts and exercise the top-level computeScore().
 */

import { describe, expect, it } from "vitest";
import {
  applyFilters,
  buildCohortDistributions,
  getLatestObservation,
  type Filters,
  type Observation,
  type School,
  type Variable,
} from "../scoring";

function makeSchool(
  id: number,
  slug: string,
  observations: Observation[],
): School {
  return {
    id,
    slug,
    name: slug,
    state: "XX",
    region: "west_coast",
    observations,
  };
}

function obs(
  variable_id: string,
  value: number,
  metric_year: number,
  confidence = 1.0,
): Observation {
  return {
    variable_id,
    value_numeric: value,
    value_text: null,
    metric_year,
    source_name: "aba509",
    source_url: null,
    confidence,
  };
}

// ─── getLatestObservation ────────────────────────────────────────────────

describe("getLatestObservation", () => {
  it("returns null when the school has no observation for the variable", () => {
    const school = makeSchool(1, "s", []);
    expect(getLatestObservation(school, "aba509:median_lsat")).toBeNull();
  });

  it("returns the single observation when only one exists", () => {
    const school = makeSchool(1, "s", [obs("aba509:median_lsat", 170, 2024)]);
    const result = getLatestObservation(school, "aba509:median_lsat");
    expect(result?.value_numeric).toBe(170);
    expect(result?.metric_year).toBe(2024);
  });

  it("returns the most recent year when multiple exist (§3.4)", () => {
    const school = makeSchool(1, "s", [
      obs("aba509:median_lsat", 168, 2022),
      obs("aba509:median_lsat", 170, 2024),
      obs("aba509:median_lsat", 169, 2023),
    ]);
    const result = getLatestObservation(school, "aba509:median_lsat");
    expect(result?.metric_year).toBe(2024);
    expect(result?.value_numeric).toBe(170);
  });

  it("ignores observations for other variables", () => {
    const school = makeSchool(1, "s", [
      obs("aba509:median_gpa", 3.8, 2024),
      obs("aba509:median_lsat", 170, 2024),
    ]);
    expect(getLatestObservation(school, "aba509:median_lsat")?.value_numeric).toBe(170);
  });
});

// ─── applyFilters ────────────────────────────────────────────────────────

describe("applyFilters", () => {
  const berkeley = makeSchool(1, "berkeley", [
    obs("aba509:tuition_nonresident", 70000, 2024),
    obs("aba509:median_lsat", 170, 2024),
    obs("aba509:bar_passage_rate", 0.94, 2024),
  ]);
  const vanderbilt = makeSchool(2, "vanderbilt", [
    obs("aba509:tuition_nonresident", 25000, 2024),
    obs("aba509:median_lsat", 168, 2024),
    obs("aba509:bar_passage_rate", 0.96, 2024),
  ]);
  const georgetown = makeSchool(3, "georgetown", [
    obs("aba509:tuition_nonresident", 65000, 2024),
    obs("aba509:median_lsat", 170, 2024),
    obs("aba509:bar_passage_rate", 0.92, 2024),
  ]);

  it("passes every school when there are no filters", () => {
    const result = applyFilters([berkeley, vanderbilt, georgetown], {});
    expect(result.passing).toHaveLength(3);
    expect(result.suppressed).toHaveLength(0);
  });

  it("max_annual_tuition suppresses schools over the cap", () => {
    const filters: Filters = { max_annual_tuition: 28000 };
    const result = applyFilters([berkeley, vanderbilt, georgetown], filters);
    expect(result.passing.map((s) => s.slug)).toEqual(["vanderbilt"]);
    expect(result.suppressed.map((s) => s.school.slug).sort()).toEqual([
      "berkeley",
      "georgetown",
    ]);
    expect(result.suppressed[0]!.failed_filters).toContain("max_annual_tuition");
  });

  it("max_annual_tuition uses the LESSER of resident/nonresident", () => {
    // Resident tuition $20K, nonresident $70K. Cap at $28K.
    // Effective = min(20K, 70K) = 20K → passes.
    const dualRate = makeSchool(99, "state-u", [
      obs("aba509:tuition_resident", 20000, 2024),
      obs("aba509:tuition_nonresident", 70000, 2024),
    ]);
    const result = applyFilters([dualRate], { max_annual_tuition: 28000 });
    expect(result.passing).toHaveLength(1);
    expect(result.suppressed).toHaveLength(0);
  });

  it("min_median_lsat suppresses below threshold", () => {
    const result = applyFilters([berkeley, vanderbilt, georgetown], {
      min_median_lsat: 169,
    });
    expect(result.passing.map((s) => s.slug).sort()).toEqual([
      "berkeley",
      "georgetown",
    ]);
    expect(result.suppressed[0]!.school.slug).toBe("vanderbilt");
    expect(result.suppressed[0]!.failed_filters).toContain("min_median_lsat");
  });

  it("a filter on a missing variable is NOT a rejection (§1.2)", () => {
    const thinSchool = makeSchool(4, "thin", []);
    const result = applyFilters([thinSchool], {
      max_annual_tuition: 28000,
      min_median_lsat: 175,
      min_bar_passage: 0.99,
    });
    expect(result.passing).toHaveLength(1);
    expect(result.suppressed).toHaveLength(0);
  });

  it("required_regions suppresses schools outside the target", () => {
    const result = applyFilters([berkeley, vanderbilt, georgetown], {
      required_regions: ["midwest"],
    });
    expect(result.passing).toHaveLength(0);
    expect(result.suppressed).toHaveLength(3);
    for (const s of result.suppressed) {
      expect(s.failed_filters).toContain("required_regions");
    }
  });

  it("accumulates multiple failed filters on one school", () => {
    const result = applyFilters([berkeley], {
      max_annual_tuition: 28000,
      min_bar_passage: 0.99,
    });
    expect(result.passing).toHaveLength(0);
    expect(result.suppressed[0]!.failed_filters.sort()).toEqual([
      "max_annual_tuition",
      "min_bar_passage",
    ]);
  });
});

// ─── buildCohortDistributions ────────────────────────────────────────────

describe("buildCohortDistributions", () => {
  const catalog: Variable[] = [
    {
      id: "aba509:median_lsat",
      display_name: "Median LSAT",
      category: "admissions",
      dimension: "selectivity",
      tier: 1,
      direction: "higher_better",
      prior_weight: 0.25,
      unit: "index",
    },
    {
      id: "aba509:tuition_nonresident",
      display_name: "Tuition",
      category: "cost",
      dimension: "cost",
      tier: 1,
      direction: "lower_better",
      prior_weight: 0.20,
      unit: "USD",
    },
  ];

  it("collects latest values per variable and sorts ascending", () => {
    const schools: School[] = [
      makeSchool(1, "a", [
        obs("aba509:median_lsat", 170, 2024),
        obs("aba509:tuition_nonresident", 70000, 2024),
      ]),
      makeSchool(2, "b", [
        obs("aba509:median_lsat", 165, 2024),
        obs("aba509:tuition_nonresident", 55000, 2024),
      ]),
      makeSchool(3, "c", [
        obs("aba509:median_lsat", 172, 2024),
        obs("aba509:tuition_nonresident", 65000, 2024),
      ]),
    ];
    const dist = buildCohortDistributions(schools, catalog);
    expect(dist.get("aba509:median_lsat")).toEqual([165, 170, 172]);
    expect(dist.get("aba509:tuition_nonresident")).toEqual([55000, 65000, 70000]);
  });

  it("skips schools missing the variable (§3.1)", () => {
    const schools: School[] = [
      makeSchool(1, "a", [obs("aba509:median_lsat", 170, 2024)]),
      makeSchool(2, "b", []), // missing everything
      makeSchool(3, "c", [obs("aba509:median_lsat", 172, 2024)]),
    ];
    const dist = buildCohortDistributions(schools, catalog);
    expect(dist.get("aba509:median_lsat")).toEqual([170, 172]);
    expect(dist.get("aba509:tuition_nonresident")).toEqual([]);
  });

  it("uses the latest year when a school has multiple observations", () => {
    const schools: School[] = [
      makeSchool(1, "a", [
        obs("aba509:median_lsat", 168, 2022),
        obs("aba509:median_lsat", 170, 2024),
      ]),
    ];
    const dist = buildCohortDistributions(schools, catalog);
    expect(dist.get("aba509:median_lsat")).toEqual([170]);
  });
});
