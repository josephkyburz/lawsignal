import { z } from "zod";

/**
 * US News & World Report — Best Law Schools record.
 *
 * One record per school per edition. Shape is deliberately loose: only
 * `school_name` is required. Public rankings pages reliably carry
 * `overall_rank` and enough data to assign `tier`; `peer_assessment_score`
 * and `lawyer_judge_assessment_score` live behind the Premium paywall and
 * are recorded as `null` when we cannot observe them.
 *
 * Specialty rankings use an open-ended record keyed by a short specialty
 * slug (e.g. "tax", "ip", "clinical"). The ingest script maps these slugs
 * to `usnews:specialty_rank_<slug>` variables seeded in migration 0004.
 */
export const UsnewsTier = z.enum(["T6", "T14", "T20", "T50", "other"]);
export type UsnewsTier = z.infer<typeof UsnewsTier>;

export const UsnewsRecordSchema = z.object({
  school_name: z.string().min(1),

  // Overall rank. 1-based. Null for schools US News lists as "Rank Not
  // Published" (RNP) or otherwise unranked in this edition.
  overall_rank: z.number().int().positive().nullable(),

  // Peer and lawyer/judge assessment scores on a 1.0-5.0 scale. Paywalled
  // for most schools; allow null.
  peer_assessment_score: z.number().min(1).max(5).nullable(),
  lawyer_judge_assessment_score: z.number().min(1).max(5).nullable(),

  // Specialty rankings: { "tax": 3, "ip": 12, "clinical": 7, ... }
  // Per CLAUDE.md zod v4 note, use the explicit two-argument record
  // signature rather than `z.record(...)` with a single argument.
  specialty_rankings: z.record(z.string(), z.number().int().positive()),

  // Tier membership — the strictest tier the school falls into.
  // "T6" ⊂ "T14" ⊂ "T20" ⊂ "T50" ⊂ "other".
  tier: UsnewsTier,
});

export type UsnewsRecord = z.infer<typeof UsnewsRecordSchema>;

/**
 * Derive tier from an overall rank. Schools above the T50 line (or with
 * null rank) fall into the "other" bucket.
 */
export function tierFromRank(rank: number | null | undefined): UsnewsTier {
  if (rank == null) return "other";
  if (rank <= 6) return "T6";
  if (rank <= 14) return "T14";
  if (rank <= 20) return "T20";
  if (rank <= 50) return "T50";
  return "other";
}

/**
 * A deterministic numeric encoding of tier for observations of
 * `usnews:tier_membership`. Higher = more prestigious. Consumed by the
 * (future) scoring layer.
 *   T6    → 4
 *   T14   → 3
 *   T20   → 2
 *   T50   → 1
 *   other → 0
 */
export function tierScore(tier: UsnewsTier): number {
  switch (tier) {
    case "T6":
      return 4;
    case "T14":
      return 3;
    case "T20":
      return 2;
    case "T50":
      return 1;
    default:
      return 0;
  }
}
