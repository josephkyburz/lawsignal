/**
 * scoring_config.ts — author priors for computeScore()
 *
 * This file is the configuration contract for the scoring algorithm
 * specified in `docs/SCORING_ALGORITHM.md`. It is pure data + types,
 * with one runtime assertion at module load that the career-goal
 * employment table is internally consistent (each column sums to 1.0).
 *
 * Read the algorithm spec first:
 *   - §1.5  Variable catalog metadata (the shape `VariablePrior` mirrors)
 *   - §4.1  Three missing-data cases (drives `STALENESS_YEARS`)
 *   - §4.2  Coverage thresholds per dimension (drives `COVERAGE_THRESHOLDS`)
 *   - §5.1  Variables → dimension score (the formula consuming `prior_weight`)
 *   - §5.2  Career-goal reweighting within Employment (the source of
 *           `CAREER_GOAL_EMPLOYMENT_WEIGHTS`)
 *   - §5.4  Rank bands (drives `RANK_BAND_PERCENTILES`)
 *
 * Editing rules:
 *   - Every prior_weight needs a one-line `justification`. No exceptions.
 *     This is the audit trail — undocumented priors are forbidden.
 *   - prior_weight values are RELATIVE within a dimension. They do NOT need
 *     to sum to 1.0; aggregateDimension() in `computeScore()` normalizes.
 *   - Tier 2/3 variables are NOT seeded here. They arrive with their
 *     respective sources (US News, LST, NALP, school websites). Adding
 *     them now would be lying about coverage we do not have.
 *   - Variable IDs follow the convention `<source_id>:<short_name>` and
 *     must match the IDs emitted by the corresponding ingest script
 *     (see `scripts/ingest/aba509.ts` and the `variables` D1 table).
 *
 * This file does NOT implement computeScore(). That work is L1-2.
 */

// ─── Dimension keys ──────────────────────────────────────────────────────
// The 9 user-facing dimensions, from SCORING_ALGORITHM.md §1.1.
export type Dimension =
  | "selectivity"
  | "employment"
  | "cost"
  | "geographic"
  | "academic"
  | "prestige"
  | "culture"
  | "quality_of_life"
  | "growth_fit";

// ─── Direction ───────────────────────────────────────────────────────────
// How the normalizer should treat the variable. From §3.2.
export type Direction = "higher_better" | "lower_better" | "target";

// ─── Career goals ────────────────────────────────────────────────────────
// The 8 career goals from SCORING_ALGORITHM.md §1.3.
export type CareerGoal =
  | "biglaw"
  | "clerkship"
  | "government"
  | "public_interest"
  | "in_house"
  | "jag"
  | "academia"
  | "undecided";

// ─── Variable prior shape ────────────────────────────────────────────────
// One row per scoring input. `prior_weight` is the author's within-
// dimension weight (relative, not budget). `justification` is required.
export type VariablePrior = {
  /** Variable ID, e.g. "aba509:median_lsat". Must match D1 `variables.id`. */
  id: string;
  /** Which of the 9 dimensions this variable rolls up into. */
  dimension: Dimension;
  /** Author's relative weight within the dimension, 0..1. */
  prior_weight: number;
  /** Normalization direction (see §3.2). */
  direction: Direction;
  /** RV tier from RESEARCH_VARIABLES_V2.md. */
  tier: 1 | 2 | 3;
  /** ONE-LINE explanation of why this weight. Required. */
  justification: string;
};

// ─── Variable priors ─────────────────────────────────────────────────────
// Tier 1 variables from the ABA 509 source. ~40 entries.
//
// Coverage by dimension (post-ABA-509):
//   selectivity   — 9  ✓
//   employment    — 14 ✓
//   cost          — 8  ✓
//   academic      — 6  ✓
//   geographic    — 2  (sparse — broadens with US News + school websites)
//   prestige      — 0  (awaits US News rankings; SPARSE flag below)
//   culture       — 0  (awaits school websites + LST; SPARSE flag below)
//   quality_of_life — 0  (awaits city/COL data; SPARSE flag below)
//   growth_fit    — 0  (Tier 3 only; editorial-only by design)
//
// The four "0" dimensions are intentional: ABA 509 does not publish those
// signals. They will be filled in by later sources (US News → prestige;
// LST + school websites → culture; external indices → quality_of_life;
// growth_fit stays editorial-only per RESEARCH_VARIABLES_V2.md Tier 3).
export const VARIABLE_PRIORS: VariablePrior[] = [
  // ─── Selectivity ──────────────────────────────────────────────────────
  {
    id: "aba509:median_lsat",
    dimension: "selectivity",
    prior_weight: 0.25,
    direction: "higher_better",
    tier: 1,
    justification: "Median LSAT is the single strongest selectivity signal — every ranking treats it as the headline number.",
  },
  {
    id: "aba509:median_gpa",
    dimension: "selectivity",
    prior_weight: 0.20,
    direction: "higher_better",
    tier: 1,
    justification: "Median UGPA is the second admissions axis — paired with LSAT it defines the 'splitter' frontier.",
  },
  {
    id: "aba509:lsat_25th",
    dimension: "selectivity",
    prior_weight: 0.08,
    direction: "higher_better",
    tier: 1,
    justification: "25th LSAT shows the floor of the admitted band — a high floor signals depth, not just a thin top.",
  },
  {
    id: "aba509:lsat_75th",
    dimension: "selectivity",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "75th LSAT is informative but largely tracks the median; small marginal weight to avoid double-counting.",
  },
  {
    id: "aba509:gpa_25th",
    dimension: "selectivity",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "25th GPA mirrors the LSAT 25th role: floor signal, secondary to the median.",
  },
  {
    id: "aba509:gpa_75th",
    dimension: "selectivity",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "75th GPA tracks median GPA closely; included for symmetry with the LSAT band.",
  },
  {
    id: "aba509:acceptance_rate",
    dimension: "selectivity",
    prior_weight: 0.20,
    direction: "lower_better",
    tier: 1,
    justification: "Acceptance rate is the most direct selectivity proxy — lower means more applicants per seat survive.",
  },
  {
    id: "aba509:yield_rate",
    dimension: "selectivity",
    prior_weight: 0.10,
    direction: "higher_better",
    tier: 1,
    justification: "Yield is the revealed-preference selectivity signal — admitted students choosing this school over peers.",
  },
  {
    id: "aba509:total_applicants",
    dimension: "selectivity",
    prior_weight: 0.02,
    direction: "higher_better",
    tier: 1,
    justification: "Raw applicant volume is a weak demand signal; mostly captured by acceptance rate, kept light.",
  },

  // ─── Employment Outcomes ──────────────────────────────────────────────
  // The seven default-column rows mirror SCORING_ALGORITHM.md §5.2 verbatim
  // so the catalog priors and the career-goal reweighting agree on the
  // `undecided` baseline. The four extra rows (biglaw, state_clerkship,
  // full_time_long_term, school_funded_share) are granular ABA 509
  // sub-variables that supplement the §5.2 set.
  {
    id: "aba509:employment_biglaw_fc",
    dimension: "employment",
    prior_weight: 0.25,
    direction: "higher_better",
    tier: 1,
    justification: "Composite BigLaw (501+) plus federal clerkship rate — the LST headline metric and §5.2 default.",
  },
  {
    id: "aba509:employment_fc",
    dimension: "employment",
    prior_weight: 0.15,
    direction: "higher_better",
    tier: 1,
    justification: "Federal clerkship rate matches §5.2 default — the marquee post-grad credential after BigLaw.",
  },
  {
    id: "aba509:employment_jd_required",
    dimension: "employment",
    prior_weight: 0.20,
    direction: "higher_better",
    tier: 1,
    justification: "JD-required rate is the honest employment denominator — the §5.2 default at 0.20.",
  },
  {
    id: "aba509:bar_passage_rate",
    dimension: "employment",
    prior_weight: 0.15,
    direction: "higher_better",
    tier: 1,
    justification: "First-time bar passage is the gating credential for any legal job; §5.2 default at 0.15.",
  },
  {
    id: "aba509:employment_pi",
    dimension: "employment",
    prior_weight: 0.10,
    direction: "higher_better",
    tier: 1,
    justification: "Public interest placement rate is a meaningful share of any class; §5.2 default at 0.10.",
  },
  {
    id: "aba509:employment_government",
    dimension: "employment",
    prior_weight: 0.10,
    direction: "higher_better",
    tier: 1,
    justification: "Government placement is a stable post-grad path; §5.2 default at 0.10.",
  },
  {
    id: "aba509:unemployment_rate",
    dimension: "employment",
    prior_weight: 0.05,
    direction: "lower_better",
    tier: 1,
    justification: "Unemployment seeking is the negative-space check on the rest of the table; §5.2 default at 0.05.",
  },
  {
    id: "aba509:employment_biglaw",
    dimension: "employment",
    prior_weight: 0.10,
    direction: "higher_better",
    tier: 1,
    justification: "BigLaw (501+) alone isolates the firm-size signal users care about when biglaw_fc is unavailable.",
  },
  {
    id: "aba509:state_clerkship",
    dimension: "employment",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "State clerkship is a meaningful credential separate from federal; weighted at one-third of FC.",
  },
  {
    id: "aba509:full_time_long_term",
    dimension: "employment",
    prior_weight: 0.10,
    direction: "higher_better",
    tier: 1,
    justification: "FT long-term rate (RV-E15) strips out seasonal and short-term placements — the 'real' employment number.",
  },
  {
    id: "aba509:school_funded_share",
    dimension: "employment",
    prior_weight: 0.05,
    direction: "lower_better",
    tier: 1,
    justification: "School-funded position share (RV-E16) inflates raw rates; lower is more honest employment.",
  },
  {
    id: "aba509:employment_business_industry",
    dimension: "employment",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "Business/industry placements capture in-house and JD-advantage paths the BigLaw metric misses.",
  },
  {
    id: "aba509:employment_academia",
    dimension: "employment",
    prior_weight: 0.02,
    direction: "higher_better",
    tier: 1,
    justification: "Academia placements are rare but signal feeder-school dynamics for users on the academic track.",
  },
  {
    id: "aba509:employment_other_clerkship",
    dimension: "employment",
    prior_weight: 0.03,
    direction: "higher_better",
    tier: 1,
    justification: "Local/specialty clerkships outside federal+state — modest signal of judicial pipeline breadth.",
  },

  // ─── Cost & Value ─────────────────────────────────────────────────────
  {
    id: "aba509:tuition_nonresident",
    dimension: "cost",
    prior_weight: 0.20,
    direction: "lower_better",
    tier: 1,
    justification: "Non-resident tuition is the worst-case sticker — applies to the majority of cross-state applicants.",
  },
  {
    id: "aba509:tuition_resident",
    dimension: "cost",
    prior_weight: 0.10,
    direction: "lower_better",
    tier: 1,
    justification: "Resident tuition matters only for in-state applicants; weighted at half of non-resident.",
  },
  {
    id: "aba509:median_grant",
    dimension: "cost",
    prior_weight: 0.15,
    direction: "higher_better",
    tier: 1,
    justification: "Median grant is the realistic discount most students see — sticker minus this is the actual paid cost.",
  },
  {
    id: "aba509:pct_receiving_grants",
    dimension: "cost",
    prior_weight: 0.15,
    direction: "higher_better",
    tier: 1,
    justification: "Share of students with any grant = probability the median grant applies to a given applicant.",
  },
  {
    id: "aba509:pct_full_tuition",
    dimension: "cost",
    prior_weight: 0.10,
    direction: "higher_better",
    tier: 1,
    justification: "Full-tuition share is a thin tail but matters disproportionately for top candidates negotiating offers.",
  },
  {
    id: "aba509:median_debt",
    dimension: "cost",
    prior_weight: 0.20,
    direction: "lower_better",
    tier: 1,
    justification: "Median debt at graduation is the realized cost after scholarships and COL — the rawest affordability signal.",
  },
  {
    id: "aba509:conditional_scholarship_share",
    dimension: "cost",
    prior_weight: 0.10,
    direction: "lower_better",
    tier: 1,
    justification: "Conditional scholarships (RV-C12) carry rescission risk on a curve — high share lowers expected value.",
  },
  {
    id: "aba509:tuition_part_time",
    dimension: "cost",
    prior_weight: 0.05,
    direction: "lower_better",
    tier: 1,
    justification: "Part-time tuition is published by ABA 509 and matters for the working-student segment; light default weight.",
  },

  // ─── Geographic Strength ──────────────────────────────────────────────
  // SPARSE: only 2 ABA 509 vars feed this dimension. The dimension fills
  // out with US News specialty rankings, LST geographic placement breakdowns,
  // and school-website alumni data. Coverage will read "partial" until then.
  {
    id: "aba509:graduates_in_state",
    dimension: "geographic",
    prior_weight: 0.50,
    direction: "higher_better",
    tier: 1,
    justification: "Share of grads working in the school's home state — the regional-anchor signal for users targeting that state.",
  },
  {
    id: "aba509:state_count",
    dimension: "geographic",
    prior_weight: 0.50,
    direction: "higher_better",
    tier: 1,
    justification: "Number of distinct states with grads — proxy for portability when no target region is set.",
  },

  // ─── Academic Quality ─────────────────────────────────────────────────
  {
    id: "aba509:student_faculty_ratio",
    dimension: "academic",
    prior_weight: 0.30,
    direction: "lower_better",
    tier: 1,
    justification: "Student/faculty ratio is the most-cited access metric — lower means more 1:1 time, the thing students actually feel.",
  },
  {
    id: "aba509:full_time_faculty",
    dimension: "academic",
    prior_weight: 0.15,
    direction: "higher_better",
    tier: 1,
    justification: "Full-time faculty count is a breadth signal — more faculty means more course coverage and specialty depth.",
  },
  {
    id: "aba509:class_size",
    dimension: "academic",
    prior_weight: 0.15,
    direction: "target",
    tier: 1,
    justification: "1L class size is target-mode: very large = lecture anonymity, very small = thin alumni network. User picks the sweet spot.",
  },
  {
    id: "aba509:library_volumes",
    dimension: "academic",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "Library volume count is a weak resource signal in the post-Westlaw era; kept low but published by ABA 509.",
  },
  {
    id: "aba509:attrition_rate",
    dimension: "academic",
    prior_weight: 0.20,
    direction: "lower_better",
    tier: 1,
    justification: "1L attrition (RV-A24) signals harsh curve, weak support, or admissions overreach — lower is healthier.",
  },
  {
    id: "aba509:transfer_in",
    dimension: "academic",
    prior_weight: 0.05,
    direction: "higher_better",
    tier: 1,
    justification: "Transfer-in count (RV-A25) signals an academic environment desirable enough that students switch in.",
  },
];

// ─── Career-goal employment reweighting ──────────────────────────────────
// Source: SCORING_ALGORITHM.md §5.2.
//
// The five columns from the doc — Default, BigLaw, Clerkship, PI, JAG —
// are reproduced VERBATIM for the matching career goals (undecided,
// biglaw, clerkship, public_interest, jag).
//
// Three goals (government, in_house, academia) are NOT in the §5.2 table
// and are derived here:
//   - government:  heavy on government, PI, and JD-required; low BigLaw.
//   - in_house:    heavy on BigLaw+FC and JD-required (in-house draws
//                  laterally from BigLaw); low PI.
//   - academia:    heavy on federal clerkship (the academic feeder path);
//                  low BigLaw.
//
// Every column must sum to 1.0. The runtime assert below enforces this.
export const CAREER_GOAL_EMPLOYMENT_WEIGHTS: Record<CareerGoal, Record<string, number>> = {
  undecided: {
    "aba509:employment_biglaw_fc": 0.25,
    "aba509:employment_fc": 0.15,
    "aba509:employment_jd_required": 0.20,
    "aba509:bar_passage_rate": 0.15,
    "aba509:employment_pi": 0.10,
    "aba509:employment_government": 0.10,
    "aba509:unemployment_rate": 0.05,
  },
  biglaw: {
    "aba509:employment_biglaw_fc": 0.45,
    "aba509:employment_fc": 0.10,
    "aba509:employment_jd_required": 0.15,
    "aba509:bar_passage_rate": 0.10,
    "aba509:employment_pi": 0.02,
    "aba509:employment_government": 0.03,
    "aba509:unemployment_rate": 0.15,
  },
  clerkship: {
    "aba509:employment_biglaw_fc": 0.15,
    "aba509:employment_fc": 0.45,
    "aba509:employment_jd_required": 0.15,
    "aba509:bar_passage_rate": 0.05,
    "aba509:employment_pi": 0.05,
    "aba509:employment_government": 0.05,
    "aba509:unemployment_rate": 0.10,
  },
  public_interest: {
    "aba509:employment_biglaw_fc": 0.05,
    "aba509:employment_fc": 0.05,
    "aba509:employment_jd_required": 0.20,
    "aba509:bar_passage_rate": 0.15,
    "aba509:employment_pi": 0.40,
    "aba509:employment_government": 0.10,
    "aba509:unemployment_rate": 0.05,
  },
  jag: {
    "aba509:employment_biglaw_fc": 0.10,
    "aba509:employment_fc": 0.10,
    "aba509:employment_jd_required": 0.25,
    "aba509:bar_passage_rate": 0.20,
    "aba509:employment_pi": 0.15,
    "aba509:employment_government": 0.10,
    "aba509:unemployment_rate": 0.10,
  },
  // Derived (not in §5.2). Documented as a one-line rationale per row.
  government: {
    "aba509:employment_biglaw_fc": 0.10, // government tracks barely value firm placement
    "aba509:employment_fc": 0.10,        // federal clerkship is a common gov on-ramp
    "aba509:employment_jd_required": 0.20, // JD-required is the honest gov denominator
    "aba509:bar_passage_rate": 0.15,     // bar passage gates licensure for gov practice
    "aba509:employment_pi": 0.15,        // PI placements overlap with gov pipelines
    "aba509:employment_government": 0.20, // direct gov placement is the headline signal
    "aba509:unemployment_rate": 0.10,    // safety net check
  },
  in_house: {
    "aba509:employment_biglaw_fc": 0.40, // in-house draws laterally from BigLaw
    "aba509:employment_fc": 0.05,        // clerkship matters less for in-house track
    "aba509:employment_jd_required": 0.20, // JD-required captures business+industry
    "aba509:bar_passage_rate": 0.10,     // licensure required but lower marginal weight
    "aba509:employment_pi": 0.05,        // PI is off-path for in-house
    "aba509:employment_government": 0.05, // gov is off-path for in-house
    "aba509:unemployment_rate": 0.15,    // strong negative-space check
  },
  academia: {
    "aba509:employment_biglaw_fc": 0.10, // BigLaw is a step away from academic hiring
    "aba509:employment_fc": 0.50,        // federal clerkship is THE academic feeder credential
    "aba509:employment_jd_required": 0.15, // baseline JD relevance
    "aba509:bar_passage_rate": 0.05,     // bar passage matters little for academia
    "aba509:employment_pi": 0.10,        // PI fellowships overlap with research tracks
    "aba509:employment_government": 0.05, // marginal academia signal
    "aba509:unemployment_rate": 0.05,    // safety net check
  },
};

// ─── Coverage thresholds ─────────────────────────────────────────────────
// SCORING_ALGORITHM.md §4.2: coverage ≥ 0.6 → full quantitative score;
// 0.3 ≤ coverage < 0.6 → quantitative but flagged "partial";
// coverage < 0.3 → editorial-only, dimension excluded from overall.
export const COVERAGE_THRESHOLDS = {
  full: 0.6,
  partial: 0.3,
} as const;

// ─── Staleness window ────────────────────────────────────────────────────
// SCORING_ALGORITHM.md §4.1 Case C: observations older than this many years
// are downweighted by 0.5 in `effective_weight`.
export const STALENESS_YEARS = 3;

// ─── Rank band cutoffs ───────────────────────────────────────────────────
// SCORING_ALGORITHM.md §5.4. Percentile of overall score within the cohort.
export const RANK_BAND_PERCENTILES = {
  top: 0.9,
  strong: 0.75,
  fit: 0.5,
  consider: 0.25,
} as const;

// ─── Module-load assertions ──────────────────────────────────────────────
// These run once when the module is imported and throw if the config is
// internally inconsistent. They are NOT runtime scoring logic — they are
// static guards that catch authoring mistakes at startup.
(function assertCareerGoalColumnsSumToOne(): void {
  const EPSILON = 1e-9;
  for (const goal of Object.keys(CAREER_GOAL_EMPLOYMENT_WEIGHTS) as CareerGoal[]) {
    const weights = CAREER_GOAL_EMPLOYMENT_WEIGHTS[goal];
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > EPSILON) {
      throw new Error(
        `scoring_config: CAREER_GOAL_EMPLOYMENT_WEIGHTS["${goal}"] sums to ${sum.toFixed(6)}, expected 1.0`,
      );
    }
  }
})();

(function assertEveryPriorJustified(): void {
  for (const v of VARIABLE_PRIORS) {
    if (!v.justification || v.justification.trim().length === 0) {
      throw new Error(`scoring_config: VARIABLE_PRIORS["${v.id}"] is missing a justification`);
    }
    if (v.prior_weight < 0 || v.prior_weight > 1) {
      throw new Error(
        `scoring_config: VARIABLE_PRIORS["${v.id}"].prior_weight = ${v.prior_weight} is out of [0,1]`,
      );
    }
  }
})();

(function warnSparseDimensions(): void {
  // Surface — but do not fail on — dimensions with fewer than 3 variables.
  // Sparse dimensions are expected during Phase 1 ingestion (only ABA 509
  // is live); they should fill out as US News, LST, NALP, and school-website
  // sources land. The warning lives here so future maintainers see it the
  // moment they import the config in a script.
  const counts: Record<string, number> = {};
  for (const v of VARIABLE_PRIORS) {
    counts[v.dimension] = (counts[v.dimension] ?? 0) + 1;
  }
  const dims: Dimension[] = [
    "selectivity",
    "employment",
    "cost",
    "geographic",
    "academic",
    "prestige",
    "culture",
    "quality_of_life",
    "growth_fit",
  ];
  const sparse = dims.filter((d) => (counts[d] ?? 0) < 3);
  if (sparse.length > 0 && typeof process !== "undefined" && process.stderr?.isTTY) {
    process.stderr.write(
      `[scoring_config] sparse dimensions (<3 vars from ABA 509 alone): ${sparse.join(", ")}\n`,
    );
  }
})();
