#!/usr/bin/env tsx
/**
 * US News & World Report — Best Law Schools scraper.
 *
 * Source: https://www.usnews.com/best-graduate-schools/top-law-schools/law-rankings
 *
 * Writes a JSON array of {@link UsnewsRecord} to
 *   data/raw/usnews/usnews_scraped.json
 *
 * The ingest script (`scripts/ingest/usnews.ts`) reads that file. Run this
 * scraper when the rankings edition changes, then run the ingest dry-run.
 *
 * Approach: fetch the public rankings page, extract the Next.js
 *   `<script id="__NEXT_DATA__" type="application/json">` blob, then walk
 *   it looking for the school rankings list. US News uses Next.js and
 *   this approach survives most cosmetic redesigns; if US News changes
 *   the embedded shape, the walker below will need to be tuned. The
 *   scraper degrades gracefully — it writes whatever it parses and logs
 *   what it could not find rather than crashing the ingest.
 *
 * Specialty rankings live on separate pages (one per specialty). Pass
 *   USNEWS_SCRAPE_SPECIALTIES=1 to also fetch those. Without it, only
 *   overall rank + tier are populated and `specialty_rankings` stays an
 *   empty object on each record.
 *
 * Important: the peer assessment and lawyer/judge assessment scores are
 *   Premium-gated on usnews.com. The scraper records them as `null` when
 *   the public page does not expose them. Do NOT try to fabricate them.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { UsnewsRecordSchema, tierFromRank, type UsnewsRecord } from "../lib/validators/usnews.js";

const OUTPUT_DIR = resolve(import.meta.dirname, "../../data/raw/usnews");
const OUTPUT_JSON = resolve(OUTPUT_DIR, "usnews_scraped.json");

const BASE_URL = "https://www.usnews.com";
const RANKINGS_URL = `${BASE_URL}/best-graduate-schools/top-law-schools/law-rankings`;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 LawSignal/1.0 (+https://law.firmsignal.co)";

const SCRAPE_SPECIALTIES = process.env.USNEWS_SCRAPE_SPECIALTIES === "1";

// Specialty slug → US News URL path fragment. Keep in sync with
// apps/lawsignal-worker/migrations/0004_usnews_variables.sql.
const SPECIALTY_PATHS: Record<string, string> = {
  biz: "business-law-rankings",
  clinical: "clinical-training-rankings",
  constitutional: "constitutional-law-rankings",
  contracts: "contracts-commercial-law-rankings",
  criminal: "criminal-law-rankings",
  dispute: "dispute-resolution-rankings",
  environmental: "environmental-law-rankings",
  family: "family-law-rankings",
  health: "health-care-law-rankings",
  international: "international-law-rankings",
  ip: "intellectual-property-law-rankings",
  legal_writing: "legal-writing-rankings",
  part_time: "part-time-law-rankings",
  tax: "tax-law-rankings",
  trial: "trial-advocacy-rankings",
};

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return await response.text();
}

/** Extract the embedded Next.js JSON payload. */
function extractNextData(html: string): unknown {
  const match = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) {
    throw new Error("Could not find __NEXT_DATA__ script in HTML — US News may have changed their markup");
  }
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`Failed to JSON.parse __NEXT_DATA__: ${(err as Error).message}`);
  }
}

/**
 * Walk an arbitrary JSON structure looking for arrays of objects that
 * look like ranked law school entries. Heuristic: an entry is "ranked" if
 * it has a school name field and at least one of {rank, sortRank,
 * displayRank, ranking}. Returns the longest matching array.
 */
function findRankingsArray(root: unknown): Array<Record<string, unknown>> {
  let best: Array<Record<string, unknown>> = [];
  const seen = new WeakSet<object>();

  const visit = (node: unknown): void => {
    if (node == null || typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      if (node.length > best.length && node.every(isRankingEntry)) {
        best = node as Array<Record<string, unknown>>;
      }
      for (const child of node) visit(child);
      return;
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      visit(value);
    }
  };

  visit(root);
  return best;
}

function isRankingEntry(node: unknown): node is Record<string, unknown> {
  if (node == null || typeof node !== "object" || Array.isArray(node)) return false;
  const o = node as Record<string, unknown>;
  const hasName =
    typeof o.name === "string" ||
    typeof o.schoolName === "string" ||
    typeof o.displayName === "string" ||
    typeof o.institutionName === "string";
  const hasRank =
    "rank" in o ||
    "sortRank" in o ||
    "displayRank" in o ||
    "ranking" in o ||
    "rankDisplay" in o;
  return hasName && hasRank;
}

function toRank(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  if (typeof value === "string") {
    // Handle formats like "#14", "14", "14-15", "RNP", "Unranked"
    const trimmed = value.trim();
    if (!trimmed || /^(RNP|Unranked|N\/A)$/i.test(trimmed)) return null;
    const match = trimmed.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }
  return null;
}

function toScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function pickName(o: Record<string, unknown>): string | null {
  for (const key of ["name", "schoolName", "displayName", "institutionName"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function pickRank(o: Record<string, unknown>): number | null {
  for (const key of ["rank", "sortRank", "displayRank", "ranking", "rankDisplay"]) {
    if (key in o) {
      const v = toRank(o[key]);
      if (v != null) return v;
    }
  }
  return null;
}

function pickPeerScore(o: Record<string, unknown>): number | null {
  for (const key of ["peerAssessment", "peerAssessmentScore", "peer_assessment", "peer"]) {
    if (key in o) return toScore(o[key]);
  }
  return null;
}

function pickLawyerJudgeScore(o: Record<string, unknown>): number | null {
  for (const key of [
    "lawyerJudgeAssessment",
    "lawyerJudgeAssessmentScore",
    "assessmentScoreByLawyersAndJudges",
    "lawyerJudge",
  ]) {
    if (key in o) return toScore(o[key]);
  }
  return null;
}

function parseRankings(html: string): UsnewsRecord[] {
  const nextData = extractNextData(html);
  const rows = findRankingsArray(nextData);
  if (rows.length === 0) {
    throw new Error(
      "No rankings array located inside __NEXT_DATA__. Inspect the saved HTML and tune findRankingsArray().",
    );
  }

  const records: UsnewsRecord[] = [];
  for (const row of rows) {
    const name = pickName(row);
    if (!name) continue;
    const overall_rank = pickRank(row);
    const record: UsnewsRecord = {
      school_name: name,
      overall_rank,
      peer_assessment_score: pickPeerScore(row),
      lawyer_judge_assessment_score: pickLawyerJudgeScore(row),
      specialty_rankings: {},
      tier: tierFromRank(overall_rank),
    };
    const parsed = UsnewsRecordSchema.safeParse(record);
    if (parsed.success) records.push(parsed.data);
  }
  return records;
}

async function parseSpecialty(
  slug: string,
  urlPath: string,
  byName: Map<string, UsnewsRecord>,
): Promise<number> {
  const url = `${BASE_URL}/best-graduate-schools/top-law-schools/${urlPath}`;
  console.log(`  ${slug.padEnd(16)} → ${url}`);
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    console.error(`    ERROR fetching ${slug}: ${(err as Error).message}`);
    return 0;
  }

  let nextData: unknown;
  try {
    nextData = extractNextData(html);
  } catch (err) {
    console.error(`    ERROR extracting ${slug}: ${(err as Error).message}`);
    return 0;
  }

  const rows = findRankingsArray(nextData);
  let hits = 0;
  for (const row of rows) {
    const name = pickName(row);
    const rank = pickRank(row);
    if (!name || rank == null) continue;
    const record = byName.get(normalizeForLookup(name));
    if (!record) continue;
    record.specialty_rankings[slug] = rank;
    hits++;
  }
  return hits;
}

function normalizeForLookup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main(): Promise<void> {
  console.log("\n─── US News Scraper ───");
  console.log(`Source: ${RANKINGS_URL}`);
  console.log(`Specialties: ${SCRAPE_SPECIALTIES ? "yes" : "no (set USNEWS_SCRAPE_SPECIALTIES=1)"}`);

  const html = await fetchHtml(RANKINGS_URL);
  console.log(`Fetched ${html.length.toLocaleString()} bytes`);

  const records = parseRankings(html);
  console.log(`Parsed ${records.length} ranked schools`);

  if (SCRAPE_SPECIALTIES && records.length > 0) {
    const byName = new Map<string, UsnewsRecord>();
    for (const r of records) byName.set(normalizeForLookup(r.school_name), r);
    console.log("\nFetching specialty rankings...");
    for (const [slug, urlPath] of Object.entries(SPECIALTY_PATHS)) {
      const hits = await parseSpecialty(slug, urlPath, byName);
      console.log(`    matched ${hits} schools`);
      await sleep(1500 + Math.floor(Math.random() * 1000));
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_JSON, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${OUTPUT_JSON}`);

  const ranked = records.filter(r => r.overall_rank != null).length;
  const withSpecialty = records.filter(r => Object.keys(r.specialty_rankings).length > 0).length;
  console.log(`  With rank:              ${ranked}`);
  console.log(`  With specialty ranks:   ${withSpecialty}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
