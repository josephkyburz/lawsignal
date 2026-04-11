/**
 * Source catalog — metadata for each data source LawSignal ingests.
 * Add an entry here before writing the ingest script.
 */

export interface SourceDef {
  id: string;
  name: string;
  description: string;
  url: string;
  frequency: string;        // "annual", "biennial", etc.
  data_year: number;         // the year the data pertains to
  fields: string[];          // key fields this source provides
  priority?: number;         // 1 = authoritative (ABA 509), 2 = supplementary, etc.
  notes?: string;
}

export const SOURCES: Record<string, SourceDef> = {
  aba509_2025: {
    id: "aba509_2025",
    name: "ABA 509 Required Disclosures",
    description: "Standardized disclosures required of all ABA-accredited law schools. The single most authoritative source for admissions stats, enrollment, costs, financial aid, employment outcomes, and bar passage.",
    url: "https://www.abarequireddisclosures.org/",
    frequency: "annual",
    data_year: 2025,
    fields: [
      "median_lsat", "lsat_25th", "lsat_75th",
      "median_gpa", "gpa_25th", "gpa_75th",
      "acceptance_rate", "total_applicants", "total_enrolled", "class_size",
      "tuition_resident", "tuition_nonresident",
      "median_grant", "pct_receiving_grants", "pct_full_tuition",
      "employment_biglaw", "employment_fc", "employment_jd_required",
      "unemployment_rate", "bar_passage_rate",
      "student_faculty_ratio", "full_time_faculty",
    ],
  },

  us_news_2025: {
    id: "us_news",
    name: "US News & World Report — Best Law Schools",
    description: "The most widely cited law school ranking. Methodology weights peer assessment, lawyer/judge assessment, selectivity, placement, bar passage, and debt. Public rankings pages carry overall rank, tier placement, and specialty ranks; detailed assessment scores live behind the Premium subscription and are recorded as null when unobservable.",
    url: "https://www.usnews.com/best-graduate-schools/top-law-schools/law-rankings",
    frequency: "annual",
    data_year: 2025,
    priority: 2,
    fields: [
      "overall_rank",
      "peer_assessment_score",
      "lawyer_judge_assessment_score",
      "specialty_rankings",
      "tier",
    ],
  },

  lst_2025: {
    id: "lst_2025",
    name: "Law School Transparency",
    description: "Independent nonprofit providing employment data analysis, cost calculations, and consumer-oriented law school metrics.",
    url: "https://www.lawschooltransparency.com/",
    frequency: "annual",
    data_year: 2025,
    fields: [
      "employment_biglaw_fc", "employment_public_interest",
      "employment_government", "median_debt_at_grad",
      "total_cost_of_attendance",
    ],
  },

  lsac_volume_2025: {
    id: "lsac_volume_2025",
    name: "LSAC Volume Summary",
    description: "Applicant and application volume data from LSAC. Useful for understanding competition and cycle dynamics.",
    url: "https://www.lsac.org/data-research/data",
    frequency: "annual",
    data_year: 2025,
    fields: [
      "total_applicants", "total_applications", "applicants_per_seat",
    ],
  },
};
