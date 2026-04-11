#!/usr/bin/env tsx
/**
 * ABA 509 Required Disclosures Ingest
 *
 * Source: https://www.abarequireddisclosures.org/
 * The single most authoritative source for law school data.
 * Creates the identity spine (~200 ABA-accredited law schools).
 *
 * Run:
 *   npm run ingest:aba509:dry   — parse + validate, write SQL, don't apply
 *   npm run ingest:aba509       — parse + validate + write SQL
 *
 * After dry run, apply:
 *   npx wrangler d1 execute lawsignal-db --remote --file=scripts/output/aba509_ingest.sql
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync as writeFs } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { Aba509RecordSchema, type Aba509Record } from "../lib/validators/aba509.js";
import { SOURCES } from "../lib/sources.js";
import { esc, num, writeSql } from "../lib/sql-helpers.js";
import { writeSchoolWiki, type WikiSection } from "../lib/wiki-writer.js";
import { slugify } from "../lib/slug.js";

const SOURCE = SOURCES.aba509_2025;
const DRY_RUN = process.argv.includes("--dry-run");
const DATA_DIR = resolve(import.meta.dirname, "../../data/raw/aba509");

console.log(`\n─── ABA 509 Ingest (${SOURCE.data_year}) ───`);
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a dollar string like "$22,359" → 22359 */
function parseDollar(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const s = String(val).replace(/[$,\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? undefined : Math.round(n);
}

/** Parse a percentage like "58.53%" or 0.5853 → 0.5853 */
function parsePct(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const s = String(val).replace(/%/g, "").trim();
  const n = parseFloat(s);
  if (isNaN(n)) return undefined;
  // If > 1, assume it's percentage form (58.53 → 0.5853)
  return n > 1 ? n / 100 : n;
}

/** Parse a numeric value, return undefined if missing/NaN */
function parseNum(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const s = String(val).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

/** Convert an integer percentage (38) to a 0-1 rate (0.38), clamped to [0, 1] */
function pctFromInt(val: unknown): number | undefined {
  const n = parseNum(val);
  if (n == null) return undefined;
  return Math.min(n / 100, 1.0);
}

/** Add two dollar-formatted values together */
function addDollars(a: unknown, b: unknown): number | undefined {
  const va = parseDollar(a);
  const vb = parseDollar(b);
  if (va == null && vb == null) return undefined;
  return (va ?? 0) + (vb ?? 0);
}

/** Parse an integer */
function parseInt2(val: unknown): number | undefined {
  const n = parseNum(val);
  return n != null ? Math.round(n) : undefined;
}

// ─── Load Excel Files ───────────────────────────────────────────────────────

function loadSheet(filename: string): Record<string, unknown>[] {
  const path = resolve(DATA_DIR, filename);
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

/** Build a lookup map keyed by SchoolName from a sheet */
function buildLookup(rows: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const name = String(row["SchoolName"] || "").trim();
    if (name) map.set(name, row);
  }
  return map;
}

console.log("\nLoading Excel files...");

const files = readdirSync(DATA_DIR).filter(f => f.endsWith(".xlsx"));
if (files.length === 0) {
  console.error("ERROR: No .xlsx files found in data/raw/aba509/");
  process.exit(1);
}

// Load each spreadsheet into a lookup map
const firstYearRows = loadSheet("aba509_compilation_2025_first_year_class.xlsx");
const tuitionRows = loadSheet("aba509_compilation_2025_tuitions_and_fees_living_expenses_cond_scholarships.xlsx");
const grantsRows = loadSheet("aba509_compilation_2025_grants_and_scholarships.xlsx");
const enrollmentRows = loadSheet("aba509_compilation_2025_jd_enrollment_and_ethnicity.xlsx");
const facultyRows = loadSheet("aba509_compilation_2025_faculty_resources.xlsx");
const basicsRows = loadSheet("aba509_compilation_2025_the_basics_academic_calendar.xlsx");
const curricularRows = loadSheet("aba509_compilation_2025_curricular_offerings.xlsx");
const attritionRows = loadSheet("aba509_compilation_2025_attrition.xlsx");
const transfersRows = loadSheet("aba509_compilation_2025_transfers.xlsx");

const tuitionLookup = buildLookup(tuitionRows);
const grantsLookup = buildLookup(grantsRows);
const enrollmentLookup = buildLookup(enrollmentRows);
const facultyLookup = buildLookup(facultyRows);
const basicsLookup = buildLookup(basicsRows);
const curricularLookup = buildLookup(curricularRows);
const attritionLookup = buildLookup(attritionRows);
const transfersLookup = buildLookup(transfersRows);

// Load scraped employment data (if available)
const EMPLOYMENT_JSON = resolve(DATA_DIR, "aba509_employment_scraped.json");
type EmploymentData = {
  school_code?: number;
  total_grads?: number;
  employed_bar_required?: number;
  employed_jd_advantage?: number;
  employed_law_firms_solo?: number;
  employed_law_firms_2_10?: number;
  employed_law_firms_11_25?: number;
  employed_law_firms_26_50?: number;
  employed_law_firms_51_100?: number;
  employed_law_firms_101_250?: number;
  employed_law_firms_251_500?: number;
  employed_law_firms_501_plus?: number;
  employed_federal_clerkship?: number;
  employed_state_clerkship?: number;
  employed_government?: number;
  employed_public_interest?: number;
  unemployed_seeking?: number;
  bar_passage_rate?: number;
  bar_passage_jurisdiction?: string;
  errors?: string[];
};
const employmentLookup: Record<string, EmploymentData> = existsSync(EMPLOYMENT_JSON)
  ? JSON.parse(readFileSync(EMPLOYMENT_JSON, "utf-8"))
  : {};
const employmentCount = Object.keys(employmentLookup).length;
console.log(`Loaded ${firstYearRows.length} schools from first_year_class`);
if (employmentCount > 0) {
  console.log(`Loaded ${employmentCount} schools from employment scrape`);
} else {
  console.log("No employment scrape data found — skipping employment fields");
}

// ─── Parse and Merge ────────────────────────────────────────────────────────

interface ParsedSchool {
  raw: Record<string, unknown>;
  record: Aba509Record;
  employment?: EmploymentData;
  slug: string;
}

const parsed: ParsedSchool[] = [];
const errors: { school: string; error: string }[] = [];

for (const row of firstYearRows) {
  const schoolName = String(row["SchoolName"] || "").trim();
  if (!schoolName) continue;

  const tuition = tuitionLookup.get(schoolName) || {};
  const grants = grantsLookup.get(schoolName) || {};
  const enrollment = enrollmentLookup.get(schoolName) || {};
  const faculty = facultyLookup.get(schoolName) || {};
  const basics = basicsLookup.get(schoolName) || {};
  const curricular = curricularLookup.get(schoolName) || {};
  const attrition = attritionLookup.get(schoolName) || {};
  const transfers = transfersLookup.get(schoolName) || {};

  // Determine school type from basics
  const schoolTypeRaw = String(basics["SchoolType"] || "").toLowerCase();
  const schoolType = schoolTypeRaw.includes("public") ? "public" as const
    : schoolTypeRaw.includes("private") ? "private" as const
    : undefined;

  // Build the raw merged payload (for schools_raw_sources)
  const rawPayload = { firstYear: row, tuition, grants, enrollment, faculty, basics, curricular, attrition, transfers };

  // Retention — sum ABA's precomputed 1L academic + other attrition
  // percentages (reported as integer percents, e.g. 5 meaning 5 %).
  const academicAttr1l = parseNum(attrition["AcademicAttrition_TotalJD1Percentage"]);
  const otherAttr1l = parseNum(attrition["OtherAttrition_TotalJD1Percentage"]);
  const totalAttr1lPct =
    academicAttr1l != null || otherAttr1l != null
      ? (academicAttr1l ?? 0) + (otherAttr1l ?? 0)
      : undefined;
  const attritionRate1l = totalAttr1lPct != null ? Math.min(totalAttr1lPct / 100, 1.0) : undefined;

  // Transfers — clean integer columns in the transfers sheet.
  const transferInCount = parseInt2(transfers["TransferIn"]);
  const transferOut1lCount = parseInt2(transfers["JD1 Transfers Out"]);

  // Yield rate (EnrollOfferRate) is ABA's precomputed offers→enrollment
  // conversion, reported as an integer percentage.
  const yieldRate = pctFromInt(row["EnrollOfferRate"]);

  // Parse the record
  const record: Record<string, unknown> = {
    school_name: schoolName,
    school_type: schoolType,

    // Admissions (from first_year_class)
    total_applicants: parseInt2(row["Applications"]),
    total_offers: parseInt2(row["Offers"]),
    total_enrolled: parseInt2(row["Enrollees"]),
    median_lsat: parseInt2(row["All50thPercentileLSAT"]),
    lsat_25th: parseInt2(row["All25thPercentileLSAT"]),
    lsat_75th: parseInt2(row["All75thPercentileLSAT"]),
    median_gpa: parseNum(row["All50thPercentileUGPA"]),
    gpa_25th: parseNum(row["All25thPercentileUGPA"]),
    gpa_75th: parseNum(row["All75thPercentileUGPA"]),
    yield_rate: yieldRate,

    // Cost (from tuition) — combine annual tuition + fees
    tuition_resident: addDollars(tuition["FT_Resident_Annual"], tuition["FTRS_AnnualFees"]),
    tuition_nonresident: addDollars(tuition["FT_NonResident_Annual"], tuition["FTNRS_AnnualFees"]),
    living_expenses: parseDollar(tuition["Living_Off_Campus"]),

    // Grants (from grants_and_scholarships)
    median_grant: parseDollar(grants["FT 50th percentile grant amount"]),
    pct_receiving_grants: pctFromInt(grants["Total Percentage # of Recieving Grants FT %"]),
    pct_full_tuition: pctFromInt(grants["Full tuition FT Percentage %"]),

    // Faculty
    full_time_faculty: parseInt2(faculty["FTTotal"]),
    student_faculty_ratio: undefined, // not directly in faculty_resources file

    // Retention (from attrition + transfers sheets)
    attrition_rate_1l: attritionRate1l,
    transfer_in_count: transferInCount,
    transfer_out_1l_count: transferOut1lCount,
  };

  // Merge employment data from scrape
  const emp = employmentLookup[schoolName];
  if (emp && !emp.errors?.length) {
    record.total_grads = emp.total_grads;
    record.employed_bar_required = emp.employed_bar_required;
    record.employed_jd_advantage = emp.employed_jd_advantage;
    record.employed_law_firms_solo = emp.employed_law_firms_solo;
    record.employed_law_firms_2_10 = emp.employed_law_firms_2_10;
    record.employed_law_firms_11_25 = emp.employed_law_firms_11_25;
    record.employed_law_firms_26_50 = emp.employed_law_firms_26_50;
    record.employed_law_firms_51_100 = emp.employed_law_firms_51_100;
    record.employed_law_firms_101_250 = emp.employed_law_firms_101_250;
    record.employed_law_firms_251_500 = emp.employed_law_firms_251_500;
    record.employed_law_firms_501_plus = emp.employed_law_firms_501_plus;
    record.employed_federal_clerkship = emp.employed_federal_clerkship;
    record.employed_state_clerkship = emp.employed_state_clerkship;
    record.employed_government = emp.employed_government;
    record.employed_public_interest = emp.employed_public_interest;
    record.unemployed_seeking = emp.unemployed_seeking;
    record.bar_passage_rate = emp.bar_passage_rate;
    record.bar_passage_jurisdiction = emp.bar_passage_jurisdiction;
  }

  // Validate
  const result = Aba509RecordSchema.safeParse(record);
  if (!result.success) {
    const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    errors.push({ school: schoolName, error: messages });
    continue;
  }

  // Generate slug from school name
  // ABA uses "Last, First" format like "Akron, The University of"
  // Convert to "The University of Akron" first
  let normalizedName = schoolName;
  if (schoolName.includes(",")) {
    const parts = schoolName.split(",").map(s => s.trim());
    normalizedName = parts.slice(1).join(" ") + " " + parts[0];
    normalizedName = normalizedName.replace(/\s+/g, " ").trim();
  }

  const slug = slugify(normalizedName);

  parsed.push({
    raw: rawPayload,
    record: result.data,
    employment: emp && !emp.errors?.length ? emp : undefined,
    slug,
  });
}

console.log(`\nParsed: ${parsed.length} schools`);
console.log(`Validation errors: ${errors.length}`);
if (errors.length > 0) {
  console.log("\nFirst 10 errors:");
  for (const e of errors.slice(0, 10)) {
    console.log(`  ${e.school}: ${e.error}`);
  }
}

// ─── Generate SQL ───────────────────────────────────────────────────────────

const sql: string[] = [];
sql.push("-- ABA 509 Ingest — generated " + new Date().toISOString());
sql.push("-- Schools: " + parsed.length);
sql.push("");

for (const { raw, record, employment, slug } of parsed) {
  const r = record;
  const canonicalName = r.school_name.includes(",")
    ? (() => {
        const parts = r.school_name.split(",").map(s => s.trim());
        return parts.slice(1).join(" ") + " " + parts[0];
      })()
    : r.school_name;

  // 1. Insert into schools (identity spine)
  sql.push(`-- ${canonicalName}`);
  sql.push(`INSERT INTO schools (canonical_name, slug, school_type, is_visible, review_status)`);
  sql.push(`SELECT ${esc(canonicalName)}, ${esc(slug)}, ${esc(r.school_type ?? null)}, 0, 'needs_review'`);
  sql.push(`WHERE NOT EXISTS (SELECT 1 FROM schools WHERE slug = ${esc(slug)});`);
  sql.push("");

  // 2. Insert raw source payload
  sql.push(`INSERT INTO schools_raw_sources (source_name, school_ipeds_id, payload_json)`);
  sql.push(`SELECT ${esc(SOURCE.id)}, ${esc(r.ipeds_id ?? null)}, ${esc(JSON.stringify(raw))}`);
  sql.push(`WHERE NOT EXISTS (SELECT 1 FROM schools_raw_sources WHERE source_name = ${esc(SOURCE.id)} AND school_ipeds_id = (SELECT slug FROM schools WHERE slug = ${esc(slug)}));`);
  sql.push("");

  // 3. Insert school_metrics
  const totalOffers = r.total_offers;
  const totalApplicants = r.total_applicants;
  const acceptanceRate = (totalOffers && totalApplicants && totalApplicants > 0)
    ? totalOffers / totalApplicants
    : undefined;

  // Compute derived employment rates
  const emp = employment;
  const totalGrads = emp?.total_grads;
  const biglaw501 = emp?.employed_law_firms_501_plus;
  const fedClerk = emp?.employed_federal_clerkship;
  const stateClerk = emp?.employed_state_clerkship;
  const barRequired = emp?.employed_bar_required;
  const unemployedSeeking = emp?.unemployed_seeking;

  const employmentBiglaw = (biglaw501 != null && totalGrads) ? biglaw501 / totalGrads : undefined;
  const employmentFc = (fedClerk != null && totalGrads) ? fedClerk / totalGrads : undefined;
  const employmentBiglawFc = (biglaw501 != null && fedClerk != null && totalGrads)
    ? (biglaw501 + fedClerk) / totalGrads : undefined;
  const employmentJdRequired = (barRequired != null && totalGrads) ? barRequired / totalGrads : undefined;
  const employmentGov = (emp?.employed_government != null && totalGrads) ? emp.employed_government / totalGrads : undefined;
  const employmentPi = (emp?.employed_public_interest != null && totalGrads) ? emp.employed_public_interest / totalGrads : undefined;
  const unemploymentRate = (unemployedSeeking != null && totalGrads) ? unemployedSeeking / totalGrads : undefined;

  sql.push(`INSERT INTO school_metrics (`);
  sql.push(`  school_id, metric_year,`);
  sql.push(`  median_lsat, lsat_25th, lsat_75th,`);
  sql.push(`  median_gpa, gpa_25th, gpa_75th,`);
  sql.push(`  acceptance_rate, total_applicants, total_enrolled, class_size,`);
  sql.push(`  tuition_resident, tuition_nonresident,`);
  sql.push(`  median_grant, pct_receiving_grants, pct_full_tuition,`);
  sql.push(`  full_time_faculty, student_faculty_ratio,`);
  sql.push(`  employment_biglaw, employment_fc, employment_biglaw_fc,`);
  sql.push(`  employment_jd_required, employment_government, employment_public_interest,`);
  sql.push(`  unemployment_rate, bar_passage_rate, bar_passage_jurisdiction,`);
  sql.push(`  source_name, confidence`);
  sql.push(`)`);
  sql.push(`SELECT`);
  sql.push(`  (SELECT id FROM schools WHERE slug = ${esc(slug)}), ${SOURCE.data_year},`);
  sql.push(`  ${num(r.median_lsat)}, ${num(r.lsat_25th)}, ${num(r.lsat_75th)},`);
  sql.push(`  ${num(r.median_gpa)}, ${num(r.gpa_25th)}, ${num(r.gpa_75th)},`);
  sql.push(`  ${num(acceptanceRate)}, ${num(r.total_applicants)}, ${num(r.total_enrolled)}, ${num(r.total_enrolled)},`);
  sql.push(`  ${num(r.tuition_resident)}, ${num(r.tuition_nonresident)},`);
  sql.push(`  ${num(r.median_grant)}, ${num(r.pct_receiving_grants)}, ${num(r.pct_full_tuition)},`);
  sql.push(`  ${num(r.full_time_faculty)}, ${num(r.student_faculty_ratio)},`);
  sql.push(`  ${num(employmentBiglaw)}, ${num(employmentFc)}, ${num(employmentBiglawFc)},`);
  sql.push(`  ${num(employmentJdRequired)}, ${num(employmentGov)}, ${num(employmentPi)},`);
  sql.push(`  ${num(unemploymentRate)}, ${num(emp?.bar_passage_rate)}, ${esc(emp?.bar_passage_jurisdiction ?? null)},`);
  sql.push(`  ${esc(SOURCE.id)}, 1.0`);
  sql.push(`WHERE NOT EXISTS (`);
  sql.push(`  SELECT 1 FROM school_metrics WHERE school_id = (SELECT id FROM schools WHERE slug = ${esc(slug)}) AND source_name = ${esc(SOURCE.id)}`);
  sql.push(`);`);
  sql.push("");

  // 4. Insert observations for each variable
  const observations: [string, number | undefined][] = [
    ["aba509:median_lsat", r.median_lsat],
    ["aba509:lsat_25th", r.lsat_25th],
    ["aba509:lsat_75th", r.lsat_75th],
    ["aba509:median_gpa", r.median_gpa],
    ["aba509:gpa_25th", r.gpa_25th],
    ["aba509:gpa_75th", r.gpa_75th],
    ["aba509:acceptance_rate", acceptanceRate],
    ["aba509:total_applicants", r.total_applicants],
    ["aba509:total_enrolled", r.total_enrolled],
    ["aba509:class_size", r.total_enrolled],
    ["aba509:tuition_resident", r.tuition_resident],
    ["aba509:tuition_nonresident", r.tuition_nonresident],
    ["aba509:median_grant", r.median_grant],
    ["aba509:pct_receiving_grants", r.pct_receiving_grants],
    ["aba509:pct_full_tuition", r.pct_full_tuition],
    ["aba509:full_time_faculty", r.full_time_faculty],
    ["aba509:student_faculty_ratio", r.student_faculty_ratio],
    // Cycle dynamics + retention
    ["aba509:yield_rate", r.yield_rate],
    ["aba509:attrition_rate", r.attrition_rate_1l],
    ["aba509:transfer_in_count", r.transfer_in_count],
    // Employment (from scrape)
    ["aba509:employment_biglaw", employmentBiglaw],
    ["aba509:employment_fc", employmentFc],
    ["aba509:employment_jd_required", employmentJdRequired],
    ["aba509:employment_government", employmentGov],
    ["aba509:employment_pi", employmentPi],
    ["aba509:unemployment_rate", unemploymentRate],
    ["aba509:bar_passage_rate", emp?.bar_passage_rate],
    ["aba509:state_clerkship", stateClerk != null && totalGrads ? stateClerk / totalGrads : undefined],
  ];

  let obsCount = 0;
  for (const [varId, value] of observations) {
    if (value == null) continue;
    sql.push(`INSERT INTO observations (school_id, variable_id, value_numeric, metric_year, source_name, confidence)`);
    sql.push(`SELECT (SELECT id FROM schools WHERE slug = ${esc(slug)}), ${esc(varId)}, ${num(value)}, ${SOURCE.data_year}, ${esc(SOURCE.id)}, 1.0`);
    sql.push(`WHERE NOT EXISTS (`);
    sql.push(`  SELECT 1 FROM observations WHERE school_id = (SELECT id FROM schools WHERE slug = ${esc(slug)}) AND variable_id = ${esc(varId)} AND source_name = ${esc(SOURCE.id)}`);
    sql.push(`);`);
    obsCount++;
  }
  sql.push("");
}

// ─── Write SQL ──────────────────────────────────────────────────────────────

writeSql("aba509_ingest.sql", sql);

// ─── Write Wiki Files ───────────────────────────────────────────────────────

console.log("\nWriting wiki files...");
let wikiCount = 0;

for (const { record, employment: emp2, slug } of parsed) {
  const r = record;
  const totalOffers = r.total_offers;
  const totalApplicants = r.total_applicants;
  const acceptanceRate = (totalOffers && totalApplicants && totalApplicants > 0)
    ? (totalOffers / totalApplicants * 100).toFixed(1)
    : "N/A";

  const lines: string[] = [];
  lines.push(`## ABA 509 Data (${SOURCE.data_year})`);
  lines.push("");
  lines.push("### Admissions");
  if (r.median_lsat) lines.push(`- Median LSAT: ${r.median_lsat} (25th: ${r.lsat_25th ?? "N/A"}, 75th: ${r.lsat_75th ?? "N/A"})`);
  if (r.median_gpa) lines.push(`- Median GPA: ${r.median_gpa.toFixed(2)} (25th: ${r.gpa_25th?.toFixed(2) ?? "N/A"}, 75th: ${r.gpa_75th?.toFixed(2) ?? "N/A"})`);
  if (r.total_applicants) lines.push(`- Applicants: ${r.total_applicants.toLocaleString()}`);
  lines.push(`- Acceptance Rate: ${acceptanceRate}%`);
  if (r.yield_rate != null) lines.push(`- Yield Rate: ${(r.yield_rate * 100).toFixed(1)}%`);
  if (r.total_enrolled) lines.push(`- Enrolled (1L): ${r.total_enrolled}`);
  lines.push("");

  // Retention — only render the section if we have at least one field.
  if (r.attrition_rate_1l != null || r.transfer_in_count != null || r.transfer_out_1l_count != null) {
    lines.push("### Retention");
    if (r.attrition_rate_1l != null) lines.push(`- 1L Attrition: ${(r.attrition_rate_1l * 100).toFixed(1)}%`);
    if (r.transfer_in_count != null) lines.push(`- Transfers In: ${r.transfer_in_count}`);
    if (r.transfer_out_1l_count != null) lines.push(`- 1L Transfers Out: ${r.transfer_out_1l_count}`);
    lines.push("");
  }
  lines.push("### Cost");
  if (r.tuition_resident) lines.push(`- Tuition (Resident): $${r.tuition_resident.toLocaleString()}`);
  if (r.tuition_nonresident) lines.push(`- Tuition (Non-Resident): $${r.tuition_nonresident.toLocaleString()}`);
  if (r.living_expenses) lines.push(`- Living Expenses: $${r.living_expenses.toLocaleString()}`);
  if (r.median_grant) lines.push(`- Median Grant: $${r.median_grant.toLocaleString()}`);
  if (r.pct_receiving_grants != null) lines.push(`- Receiving Grants: ${(r.pct_receiving_grants * 100).toFixed(1)}%`);
  if (r.pct_full_tuition != null) lines.push(`- Full Tuition Scholarships: ${(r.pct_full_tuition * 100).toFixed(1)}%`);

  // Employment outcomes
  if (emp2 && emp2.total_grads) {
    const tg = emp2.total_grads;
    const pct = (n: number | undefined) => n != null ? (n / tg * 100).toFixed(1) + "%" : "N/A";
    lines.push("");
    lines.push("### Employment (10 months post-grad)");
    lines.push(`- Total Graduates: ${tg}`);
    lines.push(`- BigLaw (501+): ${emp2.employed_law_firms_501_plus ?? 0} (${pct(emp2.employed_law_firms_501_plus)})`);
    lines.push(`- Federal Clerkships: ${emp2.employed_federal_clerkship ?? 0} (${pct(emp2.employed_federal_clerkship)})`);
    const biglawFc = (emp2.employed_law_firms_501_plus ?? 0) + (emp2.employed_federal_clerkship ?? 0);
    lines.push(`- BigLaw + FC: ${biglawFc} (${(biglawFc / tg * 100).toFixed(1)}%)`);
    lines.push(`- Government: ${emp2.employed_government ?? 0} (${pct(emp2.employed_government)})`);
    lines.push(`- Public Interest: ${emp2.employed_public_interest ?? 0} (${pct(emp2.employed_public_interest)})`);
    lines.push(`- Unemployed Seeking: ${emp2.unemployed_seeking ?? 0} (${pct(emp2.unemployed_seeking)})`);
    if (emp2.bar_passage_rate != null) {
      lines.push(`- Bar Passage: ${(emp2.bar_passage_rate * 100).toFixed(1)}% (${emp2.bar_passage_jurisdiction ?? "N/A"})`);
    }
  }

  lines.push("");
  lines.push("### Faculty");
  if (r.full_time_faculty) lines.push(`- Full-Time Faculty: ${r.full_time_faculty}`);
  if (r.student_faculty_ratio) lines.push(`- Student-Faculty Ratio: ${r.student_faculty_ratio.toFixed(1)}`);

  const canonicalName = r.school_name.includes(",")
    ? (() => {
        const parts = r.school_name.split(",").map(s => s.trim());
        return parts.slice(1).join(" ") + " " + parts[0];
      })()
    : r.school_name;

  const section: WikiSection = {
    source_id: SOURCE.id,
    content: lines.join("\n"),
  };

  writeSchoolWiki(slug, section, { canonical_name: canonicalName });
  wikiCount++;
}

// ─── Summary ────────────────────────────────────────────────────────────────

const totalObs = parsed.reduce((sum, p) => {
  const r = p.record;
  const totalOffers = r.total_offers;
  const totalApplicants = r.total_applicants;
  const acceptanceRate = (totalOffers && totalApplicants && totalApplicants > 0) ? 1 : 0;
  let count = 0;
  if (r.median_lsat != null) count++;
  if (r.lsat_25th != null) count++;
  if (r.lsat_75th != null) count++;
  if (r.median_gpa != null) count++;
  if (r.gpa_25th != null) count++;
  if (r.gpa_75th != null) count++;
  if (acceptanceRate) count++;
  if (r.total_applicants != null) count++;
  if (r.total_enrolled != null) count += 2; // enrolled + class_size
  if (r.tuition_resident != null) count++;
  if (r.tuition_nonresident != null) count++;
  if (r.median_grant != null) count++;
  if (r.pct_receiving_grants != null) count++;
  if (r.pct_full_tuition != null) count++;
  if (r.full_time_faculty != null) count++;
  if (r.student_faculty_ratio != null) count++;
  if (r.yield_rate != null) count++;
  if (r.attrition_rate_1l != null) count++;
  if (r.transfer_in_count != null) count++;
  return sum + count;
}, 0);

console.log(`\n─── Summary ───`);
console.log(`Schools processed: ${parsed.length}`);
console.log(`Wiki files written: ${wikiCount}`);
console.log(`Observations emitted: ${totalObs}`);
console.log(`Validation errors: ${errors.length}`);
console.log(`SQL file: scripts/output/aba509_ingest.sql`);

// ─── Apply to D1 ───────────────────────────────────────────────────────────

if (!DRY_RUN) {
  console.log(`\nApplying to D1 (lawsignal-db)...`);
  const sqlFile = resolve(import.meta.dirname, "../output/aba509_ingest.sql");
  const fullSql = readFileSync(sqlFile, "utf-8");

  // Split on school boundaries (lines starting with "-- ") to keep statements intact
  // Each school block is ~160 lines. Target ~20 schools per batch.
  const MAX_CHUNK = 400_000;
  const lines = fullSql.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    // Split at school comment boundaries when approaching limit
    if (line.startsWith("-- ") && !line.startsWith("-- ABA") && current.length > MAX_CHUNK) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) chunks.push(current);

  console.log(`Split into ${chunks.length} chunks`);

  const batchDir = resolve(import.meta.dirname, "../output/aba509_batches");
  mkdirSync(batchDir, { recursive: true });

  let failed = 0;
  for (let i = 0; i < chunks.length; i++) {
    const batchFile = resolve(batchDir, `batch_${String(i).padStart(3, "0")}.sql`);
    writeFs(batchFile, chunks[i], "utf-8");
    process.stdout.write(`  Batch ${i + 1}/${chunks.length}...`);
    try {
      const result = execFileSync("npx", [
        "wrangler", "d1", "execute", "lawsignal-db",
        "--remote",
        "--file", batchFile,
      ], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024 });
      console.log(" ✓");
    } catch (err: any) {
      // Check if it's a real error vs just warnings on stderr
      const stderr = err.stderr || "";
      const hasRealError = stderr.includes("ERROR") || stderr.includes("SQLITE_ERROR");
      if (hasRealError) {
        console.log(" ✗");
        const errorLines = stderr.split("\n").filter((l: string) => l.includes("ERROR") || l.includes("SQLITE"));
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
  } else {
    console.log(`\nD1 apply complete — ${chunks.length} batches applied.`);
  }
} else {
  console.log(`\nDry run — skipped D1 apply. Run without --dry-run to apply.`);
}
