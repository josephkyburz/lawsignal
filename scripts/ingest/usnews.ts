#!/usr/bin/env tsx
/**
 * US News & World Report — Best Law Schools ingest.
 *
 * Reads scraped records from `data/raw/usnews/usnews_scraped.json` (see
 * `scripts/scrape/usnews.ts`), matches each school against the ABA 509
 * identity spine already in D1, and emits idempotent SQL into
 * `scripts/output/usnews_ingest.sql` plus wiki sections under
 * `data/schools/<slug>.md`.
 *
 * Run:
 *   npm run ingest:usnews:dry   — parse + validate + write SQL, don't apply
 *   npm run ingest:usnews       — also apply SQL to the remote D1 database
 *
 * Constraints per CLAUDE.md:
 *   • Idempotent — every INSERT is guarded with WHERE NOT EXISTS
 *   • Immutable raw audit log — full payload stored in schools_raw_sources
 *   • Source attribution on every row — source_name, source_url, confidence, metric_year
 *   • Never mutate schools rows. If a US News school does not match the
 *     ABA spine it is logged as a warning and skipped.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync as writeFs } from "node:fs";
import { resolve } from "node:path";
import {
  UsnewsRecordSchema,
  tierFromRank,
  tierScore,
  type UsnewsRecord,
} from "../lib/validators/usnews.js";
import { SOURCES } from "../lib/sources.js";
import { esc, num, writeSql } from "../lib/sql-helpers.js";
import { writeSchoolWiki, type WikiSection } from "../lib/wiki-writer.js";

const SOURCE = SOURCES.us_news_2025;
const DRY_RUN = process.argv.includes("--dry-run");
const RAW_JSON = resolve(import.meta.dirname, "../../data/raw/usnews/usnews_scraped.json");
const WIKI_DIR = resolve(import.meta.dirname, "../../data/schools");

console.log(`\n─── US News Ingest (data_year ${SOURCE.data_year}) ───`);
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
console.log(`Source: ${SOURCE.url}`);
console.log(`Input:  ${RAW_JSON}`);

// ─── Load Raw Records ───────────────────────────────────────────────────────

if (!existsSync(RAW_JSON)) {
  console.error("");
  console.error(`ERROR: ${RAW_JSON} does not exist.`);
  console.error("Run the scraper first:");
  console.error("  npx tsx scripts/scrape/usnews.ts");
  console.error("Then re-run this ingest.");
  process.exit(1);
}

const rawJson = JSON.parse(readFileSync(RAW_JSON, "utf-8"));
if (!Array.isArray(rawJson)) {
  console.error("ERROR: input JSON must be an array of UsnewsRecord objects");
  process.exit(1);
}

const validated: UsnewsRecord[] = [];
const validationErrors: { index: number; school: string; error: string }[] = [];

for (const [index, entry] of rawJson.entries()) {
  const result = UsnewsRecordSchema.safeParse(entry);
  if (!result.success) {
    const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    validationErrors.push({
      index,
      school: typeof entry?.school_name === "string" ? entry.school_name : `#${index}`,
      error: messages,
    });
    continue;
  }
  // Normalize: derive tier from rank if the input did not pre-compute it
  // consistently with tierFromRank (defensive — trust but verify).
  const record = result.data;
  const derivedTier = tierFromRank(record.overall_rank);
  if (derivedTier !== record.tier) {
    record.tier = derivedTier;
  }
  validated.push(record);
}

console.log(`\nLoaded ${rawJson.length} raw records`);
console.log(`Validated: ${validated.length}`);
console.log(`Validation errors: ${validationErrors.length}`);
if (validationErrors.length > 0) {
  console.log("\nFirst 10 validation errors:");
  for (const e of validationErrors.slice(0, 10)) {
    console.log(`  [${e.index}] ${e.school}: ${e.error}`);
  }
}

// ─── Build ABA Identity Spine from Existing Wikis ───────────────────────────

interface SpineEntry {
  slug: string;
  canonical_name: string;
}

/** Parse `canonical_name:` out of a wiki file's YAML front-matter block. */
function readCanonicalName(path: string): string | null {
  const content = readFileSync(path, "utf-8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const nameMatch = match[1].match(/^canonical_name:\s*(.+)$/m);
  return nameMatch ? nameMatch[1].trim() : null;
}

function loadSpine(): SpineEntry[] {
  if (!existsSync(WIKI_DIR)) return [];
  const files = readdirSync(WIKI_DIR).filter(f => f.endsWith(".md"));
  const spine: SpineEntry[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const canonical = readCanonicalName(resolve(WIKI_DIR, file)) ?? slug;
    spine.push({ slug, canonical_name: canonical });
  }
  return spine;
}

const spine = loadSpine();
console.log(`\nLoaded ABA spine: ${spine.length} schools from ${WIKI_DIR}`);

// ─── Matcher ────────────────────────────────────────────────────────────────

/** Normalize a school name for fuzzy matching. */
function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bu\.\s*of\b/g, "university of")
    .replace(/\buniv\.?\b/g, "university")
    .replace(/\bsch\.?\b/g, "school")
    .replace(/\bthe\b/g, "")
    .replace(/\blaw school\b/g, "")
    .replace(/\bschool of law\b/g, "")
    .replace(/\bcollege of law\b/g, "")
    .replace(/,\s*the$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Harvard University" → "harvard university"; "Chicago, The University of" → "university of chicago". */
function canonicalizeAbaStyle(name: string): string {
  const parts = name.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) return name;
  // ABA 509 often stores names like "Chicago, The University of". Reverse.
  return `${parts.slice(1).join(" ")} ${parts[0]}`.replace(/\s+/g, " ").trim();
}

/** Explicit aliases for schools whose US News display name does not
 *  normalize cleanly to the ABA canonical form. Grows as unmatched
 *  schools appear in dry runs. Keys are normalized US News names. */
const USNEWS_TO_SLUG_ALIASES: Record<string, string> = {
  "stanford university": "stanford-university",
  "yale university": "yale-university",
  "harvard university": "harvard-university",
  "university of chicago": "the-u-chicago",
  "university of pennsylvania": "u-pennsylvania",
  "university of pennsylvania carey": "u-pennsylvania",
  "university of virginia": "u-virginia",
  "university of michigan ann arbor": "u-michigan",
  "university of michigan": "u-michigan",
  "columbia university": "columbia-university",
  "new york university": "new-york-university",
  "nyu": "new-york-university",
  "duke university": "duke-university",
  "university of california berkeley": "u-california-berkeley",
  "berkeley": "u-california-berkeley",
  "uc berkeley": "u-california-berkeley",
  "northwestern university pritzker": "northwestern-university",
  "northwestern university": "northwestern-university",
  "cornell university": "cornell-university",
  "georgetown university": "georgetown-university",
  "vanderbilt university": "vanderbilt-university",
  "university of california los angeles": "u-california-los-angeles",
  "ucla": "u-california-los-angeles",
  "university of texas austin": "u-texas",
  "university of texas at austin": "u-texas",
  "washington university in st louis": "washington-university-st-louis",
  "washington university st louis": "washington-university-st-louis",
  "university of southern california gould": "u-southern-california",
  "university of southern california": "u-southern-california",
};

interface MatchOutcome {
  slug: string | null;
  method: "alias" | "exact" | "contains" | "unmatched";
}

function matchToSpine(usnewsName: string, spineLookup: Map<string, string>): MatchOutcome {
  const normalized = normName(usnewsName);

  // 1. Explicit alias override
  if (USNEWS_TO_SLUG_ALIASES[normalized]) {
    return { slug: USNEWS_TO_SLUG_ALIASES[normalized], method: "alias" };
  }

  // 2. Exact normalized-name match against spine
  const hit = spineLookup.get(normalized);
  if (hit) return { slug: hit, method: "exact" };

  // 3. "Contains" fallback — one of the ABA names contains or is
  //    contained within the US News name. Only used when unambiguous.
  const candidates: string[] = [];
  for (const [spineNorm, slug] of spineLookup) {
    if (spineNorm.includes(normalized) || normalized.includes(spineNorm)) {
      candidates.push(slug);
    }
  }
  if (candidates.length === 1) {
    return { slug: candidates[0], method: "contains" };
  }

  return { slug: null, method: "unmatched" };
}

// Build spine lookup: normalized canonical_name + ABA-style reversal → slug
const spineLookup = new Map<string, string>();
for (const entry of spine) {
  spineLookup.set(normName(entry.canonical_name), entry.slug);
  spineLookup.set(normName(canonicalizeAbaStyle(entry.canonical_name)), entry.slug);
  // Also index by bare slug-derived name, for safety.
  spineLookup.set(normName(entry.slug.replace(/-/g, " ")), entry.slug);
}

// ─── Specialty Slug → Variable ID Map ───────────────────────────────────────
// Must stay in sync with apps/lawsignal-worker/migrations/0004_usnews_variables.sql.
const SPECIALTY_TO_VAR: Record<string, string> = {
  biz: "usnews:specialty_rank_biz",
  clinical: "usnews:specialty_rank_clinical",
  constitutional: "usnews:specialty_rank_constitutional",
  contracts: "usnews:specialty_rank_contracts",
  criminal: "usnews:specialty_rank_criminal",
  dispute: "usnews:specialty_rank_dispute",
  environmental: "usnews:specialty_rank_environmental",
  family: "usnews:specialty_rank_family",
  health: "usnews:specialty_rank_health",
  international: "usnews:specialty_rank_international",
  ip: "usnews:specialty_rank_ip",
  legal_writing: "usnews:specialty_rank_legal_writing",
  part_time: "usnews:specialty_rank_part_time",
  tax: "usnews:specialty_rank_tax",
  trial: "usnews:specialty_rank_trial",
};

// ─── Match Records Against Spine ────────────────────────────────────────────

interface MatchedRecord {
  record: UsnewsRecord;
  slug: string;
  method: MatchOutcome["method"];
}

const matched: MatchedRecord[] = [];
const unmatched: { school_name: string; overall_rank: number | null }[] = [];
const unknownSpecialties = new Set<string>();

for (const record of validated) {
  const outcome = matchToSpine(record.school_name, spineLookup);
  if (outcome.slug) {
    matched.push({ record, slug: outcome.slug, method: outcome.method });
  } else {
    unmatched.push({ school_name: record.school_name, overall_rank: record.overall_rank });
  }

  for (const specialty of Object.keys(record.specialty_rankings)) {
    if (!(specialty in SPECIALTY_TO_VAR)) {
      unknownSpecialties.add(specialty);
    }
  }
}

console.log(`\nMatched to ABA spine: ${matched.length}`);
console.log(`Unmatched: ${unmatched.length}`);
if (unmatched.length > 0) {
  console.log("\nUnmatched schools (add to USNEWS_TO_SLUG_ALIASES or confirm the school is not on the ABA spine):");
  for (const u of unmatched.slice(0, 25)) {
    console.log(`  ${u.school_name}${u.overall_rank != null ? ` (rank ${u.overall_rank})` : ""}`);
  }
  if (unmatched.length > 25) {
    console.log(`  ... and ${unmatched.length - 25} more`);
  }
}
if (unknownSpecialties.size > 0) {
  console.log(`\nUnknown specialty slugs (add to SPECIALTY_TO_VAR + migration 0004):`);
  for (const s of unknownSpecialties) console.log(`  ${s}`);
}

// ─── Generate SQL ───────────────────────────────────────────────────────────

const sql: string[] = [];
sql.push(`-- US News Ingest — generated ${new Date().toISOString()}`);
sql.push(`-- Source: ${SOURCE.url}`);
sql.push(`-- Data year: ${SOURCE.data_year}`);
sql.push(`-- Matched schools: ${matched.length}`);
sql.push(`-- Unmatched schools: ${unmatched.length}`);
sql.push("");

let obsWritten = 0;

for (const { record, slug, method } of matched) {
  const r = record;

  // 1. Raw source payload — immutable audit log
  sql.push(`-- ${r.school_name} → ${slug} (${method})`);
  sql.push(`INSERT INTO schools_raw_sources (source_name, source_url, school_ipeds_id, payload_json)`);
  sql.push(
    `SELECT ${esc(SOURCE.id)}, ${esc(SOURCE.url)}, ` +
      `(SELECT slug FROM schools WHERE slug = ${esc(slug)}), ${esc(JSON.stringify(r))}`,
  );
  sql.push(
    `WHERE NOT EXISTS (SELECT 1 FROM schools_raw_sources ` +
      `WHERE source_name = ${esc(SOURCE.id)} ` +
      `AND school_ipeds_id = ${esc(slug)});`,
  );
  sql.push("");

  // 2. school_metrics — rankings columns
  sql.push(`INSERT INTO school_metrics (`);
  sql.push(`  school_id, metric_year,`);
  sql.push(`  usnews_rank, usnews_peer_score, usnews_lawyer_score,`);
  sql.push(`  source_name, source_url, confidence`);
  sql.push(`)`);
  sql.push(`SELECT`);
  sql.push(`  (SELECT id FROM schools WHERE slug = ${esc(slug)}), ${SOURCE.data_year},`);
  sql.push(`  ${num(r.overall_rank)}, ${num(r.peer_assessment_score)}, ${num(r.lawyer_judge_assessment_score)},`);
  sql.push(`  ${esc(SOURCE.id)}, ${esc(SOURCE.url)}, 1.0`);
  sql.push(`WHERE NOT EXISTS (`);
  sql.push(
    `  SELECT 1 FROM school_metrics WHERE school_id = (SELECT id FROM schools WHERE slug = ${esc(slug)}) ` +
      `AND source_name = ${esc(SOURCE.id)} AND metric_year = ${SOURCE.data_year}`,
  );
  sql.push(`);`);
  sql.push("");

  // 3. observations — one per variable with a non-null value
  type ObsRow = { variable_id: string; value_numeric?: number | null; value_text?: string | null };
  const observations: ObsRow[] = [];

  if (r.overall_rank != null) {
    observations.push({ variable_id: "usnews:overall_rank", value_numeric: r.overall_rank });
  }
  if (r.peer_assessment_score != null) {
    observations.push({ variable_id: "usnews:peer_assessment", value_numeric: r.peer_assessment_score });
  }
  if (r.lawyer_judge_assessment_score != null) {
    observations.push({
      variable_id: "usnews:lawyer_judge_assessment",
      value_numeric: r.lawyer_judge_assessment_score,
    });
  }
  // Tier membership is always written — 0 for "other", 4 for "T6".
  observations.push({
    variable_id: "usnews:tier_membership",
    value_numeric: tierScore(r.tier),
    value_text: r.tier,
  });

  for (const [specialty, rank] of Object.entries(r.specialty_rankings)) {
    const variableId = SPECIALTY_TO_VAR[specialty];
    if (!variableId) continue; // Unknown specialty — surfaced in warnings above.
    observations.push({ variable_id: variableId, value_numeric: rank });
  }

  for (const obs of observations) {
    const numericCol = obs.value_numeric != null ? num(obs.value_numeric) : "NULL";
    const textCol = obs.value_text != null ? esc(obs.value_text) : "NULL";
    sql.push(
      `INSERT INTO observations (school_id, variable_id, value_numeric, value_text, metric_year, source_name, source_url, confidence)`,
    );
    sql.push(
      `SELECT (SELECT id FROM schools WHERE slug = ${esc(slug)}), ${esc(obs.variable_id)}, ` +
        `${numericCol}, ${textCol}, ${SOURCE.data_year}, ${esc(SOURCE.id)}, ${esc(SOURCE.url)}, 1.0`,
    );
    sql.push(`WHERE NOT EXISTS (`);
    sql.push(
      `  SELECT 1 FROM observations WHERE school_id = (SELECT id FROM schools WHERE slug = ${esc(slug)}) ` +
        `AND variable_id = ${esc(obs.variable_id)} AND source_name = ${esc(SOURCE.id)} ` +
        `AND metric_year = ${SOURCE.data_year}`,
    );
    sql.push(`);`);
    obsWritten++;
  }
  sql.push("");
}

writeSql("usnews_ingest.sql", sql);

// ─── Wiki Sections ──────────────────────────────────────────────────────────

console.log("\nWriting wiki sections...");
let wikiCount = 0;

for (const { record: r, slug } of matched) {
  const lines: string[] = [];
  lines.push(`## US News (${SOURCE.data_year})`);
  lines.push("");
  lines.push(`_Source: ${SOURCE.url}_`);
  lines.push("");
  lines.push("### Rankings");
  lines.push(`- Overall Rank: ${r.overall_rank ?? "Unranked / RNP"}`);
  lines.push(`- Tier: ${r.tier}`);
  if (r.peer_assessment_score != null) {
    lines.push(`- Peer Assessment: ${r.peer_assessment_score.toFixed(1)} / 5.0`);
  }
  if (r.lawyer_judge_assessment_score != null) {
    lines.push(`- Lawyer/Judge Assessment: ${r.lawyer_judge_assessment_score.toFixed(1)} / 5.0`);
  }

  const specialtyEntries = Object.entries(r.specialty_rankings).sort((a, b) => a[1] - b[1]);
  if (specialtyEntries.length > 0) {
    lines.push("");
    lines.push("### Specialty Rankings");
    for (const [specialty, rank] of specialtyEntries) {
      lines.push(`- ${specialty}: #${rank}`);
    }
  }

  const section: WikiSection = {
    source_id: SOURCE.id,
    content: lines.join("\n"),
  };

  writeSchoolWiki(slug, section);
  wikiCount++;
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n─── Summary ───`);
console.log(`Schools validated:  ${validated.length}`);
console.log(`Schools matched:    ${matched.length}`);
console.log(`Schools unmatched:  ${unmatched.length}`);
console.log(`Observations:       ${obsWritten}`);
console.log(`Wiki files updated: ${wikiCount}`);
console.log(`SQL file:           scripts/output/usnews_ingest.sql`);

if (validationErrors.length > 0 && !DRY_RUN) {
  console.error(`\n${validationErrors.length} validation errors — refusing to apply to D1.`);
  process.exit(1);
}

// ─── Apply to D1 ────────────────────────────────────────────────────────────

if (!DRY_RUN) {
  if (matched.length === 0) {
    console.log("\nNo matched rows — nothing to apply.");
    process.exit(0);
  }

  console.log("\nApplying to D1 (lawsignal-db)...");
  const sqlFile = resolve(import.meta.dirname, "../output/usnews_ingest.sql");
  const fullSql = readFileSync(sqlFile, "utf-8");

  // Split at school comment boundaries, same pattern as aba509.ts.
  const MAX_CHUNK = 400_000;
  const lines = fullSql.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (line.startsWith("-- ") && !line.startsWith("-- US News") && current.length > MAX_CHUNK) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) chunks.push(current);

  console.log(`Split into ${chunks.length} chunk(s)`);

  const batchDir = resolve(import.meta.dirname, "../output/usnews_batches");
  mkdirSync(batchDir, { recursive: true });

  let failed = 0;
  for (let i = 0; i < chunks.length; i++) {
    const batchFile = resolve(batchDir, `batch_${String(i).padStart(3, "0")}.sql`);
    writeFs(batchFile, chunks[i], "utf-8");
    process.stdout.write(`  Batch ${i + 1}/${chunks.length}...`);
    try {
      execFileSync(
        "npx",
        [
          "wrangler", "d1", "execute", "lawsignal-db",
          "--remote",
          "--file", batchFile,
        ],
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024 },
      );
      console.log(" ✓");
    } catch (err: unknown) {
      const errObj = err as { stderr?: string };
      const stderr = errObj.stderr || "";
      const hasRealError = stderr.includes("ERROR") || stderr.includes("SQLITE_ERROR");
      if (hasRealError) {
        console.log(" ✗");
        const errorLines = stderr.split("\n").filter(l => l.includes("ERROR") || l.includes("SQLITE"));
        console.error(`    ${errorLines.join("\n    ")}`);
        failed++;
      } else {
        console.log(" ✓ (with warnings)");
      }
    }
  }

  if (failed > 0) {
    console.error(`\n${failed}/${chunks.length} batches failed.`);
    process.exit(1);
  }
  console.log(`\nD1 apply complete — ${chunks.length} batch(es) applied.`);
} else {
  console.log("\nDry run — skipped D1 apply. Run without --dry-run to apply.");
}
