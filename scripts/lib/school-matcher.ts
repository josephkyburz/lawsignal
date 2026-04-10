/**
 * School matcher — fuzzy + alias-based matching for cross-source identity resolution.
 *
 * Given a school name from a source, find the canonical school in our registry.
 * Pattern: normalize → exact match → alias match → fuzzy match → unmatched.
 */

/** Aliases: map common abbreviations and variants to canonical slugs. */
export const SCHOOL_ALIASES: Record<string, string> = {
  // Will grow as ingestion encounters variants
  "harvard": "harvard",
  "harvard law": "harvard",
  "harvard law school": "harvard",
  "hls": "harvard",
  "stanford": "stanford",
  "stanford law": "stanford",
  "stanford law school": "stanford",
  "sls": "stanford",
  "yale": "yale",
  "yale law": "yale",
  "yale law school": "yale",
  "yls": "yale",
  "columbia": "columbia",
  "columbia law": "columbia",
  "cls": "columbia",
  "nyu": "nyu",
  "nyu law": "nyu",
  "nyu school of law": "nyu",
  "chicago": "uchicago",
  "uchicago": "uchicago",
  "university of chicago": "uchicago",
  "berkeley": "berkeley",
  "berkeley law": "berkeley",
  "uc berkeley": "berkeley",
  "boalt": "berkeley",
  "boalt hall": "berkeley",
  "penn": "penn",
  "penn law": "penn",
  "upenn": "penn",
  "michigan": "michigan",
  "michigan law": "michigan",
  "umich": "michigan",
  "virginia": "uva",
  "uva": "uva",
  "uva law": "uva",
  "duke": "duke",
  "duke law": "duke",
  "northwestern": "northwestern",
  "northwestern law": "northwestern",
  "cornell": "cornell",
  "cornell law": "cornell",
  "georgetown": "georgetown",
  "gulc": "georgetown",
  "georgetown law": "georgetown",
  "texas": "texas",
  "ut austin": "texas",
  "ut law": "texas",
  "ucla": "ucla",
  "ucla law": "ucla",
  "vanderbilt": "vanderbilt",
  "vandy": "vanderbilt",
  "washu": "washu",
  "wash u": "washu",
  "washington university": "washu",
  "usc": "usc",
  "usc gould": "usc",
};

/**
 * Normalize a school name for matching.
 */
export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchResult {
  slug: string;
  confidence: number;  // 1.0 = exact, 0.8 = alias, 0.0 = unmatched
  method: "exact" | "alias" | "unmatched";
}

/**
 * Match a source school name to a canonical slug.
 */
export function matchSchool(sourceName: string): MatchResult {
  const norm = normalize(sourceName);

  // Exact alias lookup
  if (SCHOOL_ALIASES[norm]) {
    return { slug: SCHOOL_ALIASES[norm], confidence: 1.0, method: "alias" };
  }

  // Try without common suffixes
  const stripped = norm
    .replace(/\blaw school\b/, "")
    .replace(/\bschool of law\b/, "")
    .replace(/\bcollege of law\b/, "")
    .trim();

  if (SCHOOL_ALIASES[stripped]) {
    return { slug: SCHOOL_ALIASES[stripped], confidence: 0.9, method: "alias" };
  }

  return { slug: "", confidence: 0.0, method: "unmatched" };
}
