/**
 * LawSignal — Law School Data
 *
 * This file will hold the full school dataset, split into its own
 * Vite chunk via manualChunks in vite.config.js.
 *
 * Shape (per school):
 * {
 *   id: string,           // slug, e.g. "harvard", "stanford", "berkeley"
 *   name: string,         // "Harvard Law School"
 *   shortName: string,    // "Harvard"
 *   university: string,   // "Harvard University"
 *   city: string,
 *   state: string,
 *   region: string,       // "Northeast", "West", "South", "Midwest"
 *   type: string,         // "private" | "public"
 *   usnews_rank: number | null,
 *   median_lsat: number | null,
 *   median_gpa: number | null,
 *   acceptance_rate: number | null,    // 0-1
 *   class_size: number | null,
 *   tuition_resident: number | null,
 *   tuition_nonresident: number | null,
 *   median_grant: number | null,
 *   pct_receiving_grants: number | null,
 *   employment_biglaw_fc: number | null,  // BigLaw + Federal Clerkship rate
 *   employment_jd_required: number | null,
 *   employment_bar_required: number | null,
 *   unemployment_rate: number | null,
 *   bar_passage_rate: number | null,
 *   student_faculty_ratio: number | null,
 *   clinics_count: number | null,
 *   journals_count: number | null,
 *   // Scoring dimensions (1-100, computed or hand-set)
 *   selectivity: number | null,
 *   employment: number | null,
 *   cost_value: number | null,
 *   geographic: number | null,
 *   academic: number | null,
 *   prestige: number | null,
 *   quality_of_life: number | null,
 *   flexibility: number | null,
 * }
 */

export const SCHOOLS = [];

// Total: 0 schools (will grow as ingestion lands data)
export const SCHOOL_COUNT = SCHOOLS.length;
