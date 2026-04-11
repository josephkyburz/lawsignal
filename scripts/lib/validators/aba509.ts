import { z } from "zod";

/**
 * Zod schema for a single ABA 509 disclosure record.
 * Fields map to the ABA Standard 509 required disclosure format.
 */
export const Aba509RecordSchema = z.object({
  school_name: z.string().min(1),
  ipeds_id: z.string().optional(),
  aba_id: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  school_type: z.enum(["private", "public"]).optional(),

  // Admissions
  total_applicants: z.number().int().nonnegative().optional(),
  total_offers: z.number().int().nonnegative().optional(),
  total_enrolled: z.number().int().nonnegative().optional(),
  median_lsat: z.number().int().min(120).max(180).optional(),
  lsat_25th: z.number().int().min(120).max(180).optional(),
  lsat_75th: z.number().int().min(120).max(180).optional(),
  median_gpa: z.number().min(0).max(4.5).optional(),
  gpa_25th: z.number().min(0).max(4.5).optional(),
  gpa_75th: z.number().min(0).max(4.5).optional(),

  // Cost
  tuition_resident: z.number().nonnegative().optional(),
  tuition_nonresident: z.number().nonnegative().optional(),
  living_expenses: z.number().nonnegative().optional(),
  median_grant: z.number().nonnegative().optional(),
  pct_receiving_grants: z.number().min(0).max(1).optional(),
  pct_full_tuition: z.number().min(0).max(1).optional(),

  // Employment (10-month)
  total_grads: z.number().int().nonnegative().optional(),
  employed_bar_required: z.number().int().nonnegative().optional(),
  employed_jd_advantage: z.number().int().nonnegative().optional(),
  employed_professional: z.number().int().nonnegative().optional(),
  employed_nonprofessional: z.number().int().nonnegative().optional(),
  employed_undetermined: z.number().int().nonnegative().optional(),
  unemployed_seeking: z.number().int().nonnegative().optional(),
  employed_law_firms_solo: z.number().int().nonnegative().optional(),
  employed_law_firms_2_10: z.number().int().nonnegative().optional(),
  employed_law_firms_11_25: z.number().int().nonnegative().optional(),
  employed_law_firms_26_50: z.number().int().nonnegative().optional(),
  employed_law_firms_51_100: z.number().int().nonnegative().optional(),
  employed_law_firms_101_250: z.number().int().nonnegative().optional(),
  employed_law_firms_251_500: z.number().int().nonnegative().optional(),
  employed_law_firms_501_plus: z.number().int().nonnegative().optional(),
  employed_federal_clerkship: z.number().int().nonnegative().optional(),
  employed_state_clerkship: z.number().int().nonnegative().optional(),
  employed_government: z.number().int().nonnegative().optional(),
  employed_public_interest: z.number().int().nonnegative().optional(),

  // Bar passage
  bar_passage_rate: z.number().min(0).max(1).optional(),
  bar_passage_jurisdiction: z.string().optional(),

  // Academic
  student_faculty_ratio: z.number().positive().optional(),
  full_time_faculty: z.number().int().nonnegative().optional(),
  library_volumes: z.number().int().nonnegative().optional(),

  // Cycle dynamics (admissions)
  yield_rate: z.number().min(0).max(1).optional(),

  // Retention
  attrition_rate_1l: z.number().min(0).max(1).optional(),
  transfer_in_count: z.number().int().nonnegative().optional(),
  transfer_out_1l_count: z.number().int().nonnegative().optional(),
});

export type Aba509Record = z.infer<typeof Aba509RecordSchema>;
