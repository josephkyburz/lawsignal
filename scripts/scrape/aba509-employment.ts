#!/usr/bin/env tsx

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import XLSX from "xlsx";

const ABA_509_YEAR = 2025;
const EMPLOYMENT_REPORT_YEAR = 2024;
const BAR_PASSAGE_REPORT_YEAR = 2026;
const USER_AGENT = "LawSignal ABA 509 scraper/1.0 (+https://law.firmsignal.co)";
const BASE_API_URL = "https://backend.abarequireddisclosures.org/api";
const SOURCE_XLSX = resolve(
  import.meta.dirname,
  "../../data/raw/aba509/aba509_compilation_2025_first_year_class.xlsx",
);
const OUTPUT_JSON = resolve(
  import.meta.dirname,
  "../../data/raw/aba509/aba509_employment_scraped.json",
);
const SCHOOL_LIMIT = Number.parseInt(process.env.ABA_SCRAPE_LIMIT ?? "", 10) || undefined;
const SCHOOL_FILTERS = (process.env.ABA_SCRAPE_SCHOOL ?? "")
  .split("||")
  .map(value => value.trim())
  .filter(Boolean);
const MERGE_OUTPUT = process.env.ABA_SCRAPE_MERGE === "1";

type SchoolDirectoryEntry = {
  schoolCode: number;
  schoolName: string;
  schoolYear: number;
};

type SchoolResult = {
  school_code?: number;
  employment_report_year?: number;
  bar_passage_report_year?: number;
  bar_passage_graduation_year?: number;
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

type SchoolResultMap = Record<string, SchoolResult>;

function normalizeSchoolName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/&/g, " AND ")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelayMs(): number {
  return 1000 + Math.floor(Math.random() * 1000);
}

function parseInteger(value: string): number | undefined {
  const cleaned = value.replace(/,/g, "").trim();
  if (!/^-?\d+$/.test(cleaned)) return undefined;
  return Number.parseInt(cleaned, 10);
}

function parseRate(value: string): number | undefined {
  const cleaned = value.replace(/%/g, "").replace(/,/g, "").trim();
  if (!/^[-+]?\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric / 100 : undefined;
}

function extractPdfText(pdfBuffer: Buffer): string {
  const tempDir = mkdtempSync(resolve(tmpdir(), "lawsignal-aba509-"));
  const pdfPath = resolve(tempDir, "report.pdf");

  try {
    writeFileSync(pdfPath, pdfBuffer);
    return execFileSync(
      "python3",
      [
        "-c",
        [
          "import sys",
          "from pypdf import PdfReader",
          "reader = PdfReader(sys.argv[1])",
          "texts = []",
          "for page in reader.pages:",
          "    text = page.extract_text() or ''",
          "    texts.append(text)",
          "sys.stdout.write('\\n'.join(texts))",
        ].join("\n"),
        pdfPath,
      ],
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract PDF text via python3/pypdf: ${message}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchPdfWithRetry(url: string, label: string): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(750 * attempt);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} failed after 3 attempts: ${message}`);
}

function cleanLines(text: string): string[] {
  return text
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2019/g, "'")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function sectionBetween(lines: string[], startLabel: string, endLabel: string): string[] {
  const start = lines.indexOf(startLabel);
  const end = lines.indexOf(endLabel);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not locate section "${startLabel}" -> "${endLabel}"`);
  }
  return lines.slice(start, end);
}

function findLabelIndex(lines: string[], labels: string[]): number {
  for (const label of labels) {
    const index = lines.indexOf(label);
    if (index !== -1) return index;
  }
  throw new Error(`Missing label "${labels.join('" or "')}"`);
}

function collectNumericLinesAfter(lines: string[], labels: string[], count: number): string[] {
  const index = findLabelIndex(lines, labels);
  if (index === -1) {
    throw new Error(`Missing label "${labels.join('" or "')}"`);
  }

  const values: string[] = [];
  for (let cursor = index + 1; cursor < lines.length && values.length < count; cursor += 1) {
    const candidate = lines[cursor];
    if (/^-?\d[\d,]*$/.test(candidate) || /^-?\d[\d,]*\.\d+%$/.test(candidate) || /^-?\d+%$/.test(candidate)) {
      values.push(candidate);
    }
  }

  if (values.length < count) {
    throw new Error(`Expected ${count} numeric lines after "${labels.join('" or "')}", found ${values.length}`);
  }

  return values;
}

function parseRowTotal(lines: string[], ...labels: string[]): number {
  const values = collectNumericLinesAfter(lines, labels, 5);
  const parsed = parseInteger(values[4]);
  if (parsed == null) {
    throw new Error(`Could not parse total for "${labels.join('" or "')}"`);
  }
  return parsed;
}

function parseSingleIntegerAfter(lines: string[], ...labels: string[]): number {
  const values = collectNumericLinesAfter(lines, labels, 1);
  const parsed = parseInteger(values[0]);
  if (parsed == null) {
    throw new Error(`Could not parse integer for "${labels.join('" or "')}"`);
  }
  return parsed;
}

function parseEmploymentReport(pdfText: string): Omit<SchoolResult, "school_code" | "bar_passage_rate" | "bar_passage_jurisdiction" | "bar_passage_report_year" | "bar_passage_graduation_year"> {
  const lines = cleanLines(pdfText);
  const statusSection = sectionBetween(lines, "EMPLOYMENT STATUS", "EMPLOYMENT TYPE");
  const typeSection = sectionBetween(lines, "EMPLOYMENT TYPE", "LAW SCHOOL/UNIVERSITY FUNDED POSITIONS");

  return {
    employment_report_year: EMPLOYMENT_REPORT_YEAR,
    total_grads: parseSingleIntegerAfter(statusSection, "Total Graduates"),
    employed_bar_required: parseRowTotal(
      statusSection,
      "Bar Admission Required/Anticipated",
      "Employed - Bar Admission Required/Anticipated",
    ),
    employed_jd_advantage: parseRowTotal(statusSection, "J.D. Advantage", "Employed - J.D. Advantage"),
    unemployed_seeking: parseSingleIntegerAfter(statusSection, "Unemployed - Seeking"),
    employed_law_firms_solo: parseRowTotal(typeSection, "Solo"),
    employed_law_firms_2_10: parseRowTotal(typeSection, "1 - 10"),
    employed_law_firms_11_25: parseRowTotal(typeSection, "11 - 25"),
    employed_law_firms_26_50: parseRowTotal(typeSection, "26 - 50"),
    employed_law_firms_51_100: parseRowTotal(typeSection, "51 - 100"),
    employed_law_firms_101_250: parseRowTotal(typeSection, "101 - 250"),
    employed_law_firms_251_500: parseRowTotal(typeSection, "251 - 500"),
    employed_law_firms_501_plus: parseRowTotal(typeSection, "501 +"),
    employed_federal_clerkship: parseRowTotal(typeSection, "Clerkships - Federal"),
    employed_state_clerkship: parseRowTotal(typeSection, "Clerkships - State, Local, and Territorial"),
    employed_government: parseRowTotal(typeSection, "Government"),
    employed_public_interest: parseRowTotal(typeSection, "Public Interest"),
  };
}

function findBarPassageYearRow(lines: string[]): { graduationYear: number; lineIndex: number } {
  const sectionStart = lines.indexOf("First-Time Bar Admission");
  if (sectionStart === -1) {
    throw new Error('Missing "First-Time Bar Admission" section');
  }

  const detailsIndex = lines.findIndex(line => line.startsWith("Details "));
  if (detailsIndex === -1) {
    throw new Error("Missing details section in bar passage report");
  }

  for (let i = sectionStart; i < detailsIndex; i += 1) {
    if (/^\d{4}$/.test(lines[i])) {
      return { graduationYear: Number.parseInt(lines[i], 10), lineIndex: i };
    }
  }

  throw new Error("Could not locate first graduation-year row in bar passage report");
}

function parseBarPassageReport(pdfText: string): Pick<SchoolResult, "bar_passage_rate" | "bar_passage_jurisdiction" | "bar_passage_report_year" | "bar_passage_graduation_year"> {
  const lines = cleanLines(pdfText);
  const { graduationYear, lineIndex } = findBarPassageYearRow(lines);
  const firstRowValues = lines.slice(lineIndex + 1, lineIndex + 14);
  if (firstRowValues.length < 13) {
    throw new Error(`Could not parse first-time bar row for graduation year ${graduationYear}`);
  }
  const rate = parseRate(firstRowValues[8]);

  if (rate == null) {
    throw new Error(`Could not parse bar passage rate for graduation year ${graduationYear}`);
  }

  const detailsLabel = `Details ${graduationYear}:`;
  const detailsStart = lines.indexOf(detailsLabel);
  if (detailsStart === -1) {
    throw new Error(`Missing details section "${detailsLabel}"`);
  }

  let jurisdiction: string | undefined;
  for (let i = detailsStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("Details ") || line === "Two-Year Ultimate Bar Admission") {
      break;
    }
    if (/^\d+\s+REMAINING JURISDICTIONS$/.test(line)) {
      jurisdiction = line;
      break;
    }
    if (
      line === "Jurisdiction" ||
      line === "Takers" ||
      line === "Passers" ||
      line === "law schools" ||
      line.includes("Pass %") ||
      line.includes("State Pass %") ||
      line.includes("Difference") ||
      /^[-+]?\d/.test(line)
    ) {
      continue;
    }
    jurisdiction = line;
    break;
  }

  if (!jurisdiction) {
    throw new Error(`Could not parse primary jurisdiction for graduation year ${graduationYear}`);
  }

  return {
    bar_passage_report_year: BAR_PASSAGE_REPORT_YEAR,
    bar_passage_graduation_year: graduationYear,
    bar_passage_rate: rate,
    bar_passage_jurisdiction: jurisdiction,
  };
}

function loadSchoolNames(): string[] {
  const workbook = XLSX.readFile(SOURCE_XLSX);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return rows
    .map(row => String(row.SchoolName ?? "").trim())
    .filter(Boolean);
}

function buildDirectoryMap(entries: SchoolDirectoryEntry[]): Map<string, SchoolDirectoryEntry> {
  return new Map(entries.map(entry => [normalizeSchoolName(entry.schoolName), entry]));
}

function mergeErrors(existing: SchoolResult | undefined, errorMessage: string): SchoolResult {
  return {
    ...(existing ?? {}),
    errors: [...(existing?.errors ?? []), errorMessage],
  };
}

async function main(): Promise<void> {
  console.log(`\n─── ABA 509 Employment + Bar Scrape (${ABA_509_YEAR} school spine) ───`);

  const schoolNames = loadSchoolNames();
  const selectedSchoolNames = schoolNames
    .filter(schoolName => SCHOOL_FILTERS.length === 0 || SCHOOL_FILTERS.includes(schoolName))
    .slice(0, SCHOOL_LIMIT);

  console.log(
    `Loaded ${schoolNames.length} schools from first-year class spreadsheet; ` +
      `scraping ${selectedSchoolNames.length}`,
  );

  const employmentDirectoryResponse = await fetchJson<{ universityListEntities: SchoolDirectoryEntry[] }>(
    `${BASE_API_URL}/Master/GetEQUniversityListByYear?schoolYear=${EMPLOYMENT_REPORT_YEAR}`,
  );
  const barDirectoryResponse = await fetchJson<{ universityListEntities: SchoolDirectoryEntry[] }>(
    `${BASE_API_URL}/Master/GetBAQUniversityListByYear?schoolYear=${BAR_PASSAGE_REPORT_YEAR}`,
  );

  const employmentDirectory = buildDirectoryMap(employmentDirectoryResponse.universityListEntities);
  const barDirectory = buildDirectoryMap(barDirectoryResponse.universityListEntities);

  console.log(
    `Employment directory: ${employmentDirectory.size} schools (${EMPLOYMENT_REPORT_YEAR}), ` +
      `Bar directory: ${barDirectory.size} schools (${BAR_PASSAGE_REPORT_YEAR})`,
  );

  const results: SchoolResultMap =
    MERGE_OUTPUT && existsSync(OUTPUT_JSON)
      ? (JSON.parse(readFileSync(OUTPUT_JSON, "utf8")) as SchoolResultMap)
      : {};

  for (const [index, schoolName] of selectedSchoolNames.entries()) {
    const normalized = normalizeSchoolName(schoolName);
    const employmentEntry = employmentDirectory.get(normalized);
    const barEntry = barDirectory.get(normalized);
    const schoolCode = employmentEntry?.schoolCode ?? barEntry?.schoolCode;
    const prefix = `[${index + 1}/${selectedSchoolNames.length}] ${schoolName}`;

    if (!schoolCode) {
      const errorMessage = "No ABA employment or bar school code match found";
      console.error(`${prefix} — ERROR: ${errorMessage}`);
      results[schoolName] = { errors: [errorMessage] };
      continue;
    }

    let result: SchoolResult = { school_code: schoolCode };

    try {
      if (employmentEntry) {
        const employmentUrl =
          `${BASE_API_URL}/EmploymentOutcomes/GenerateIndividualEQSummaryReport` +
          `?schoolId=${employmentEntry.schoolCode}&year=${EMPLOYMENT_REPORT_YEAR}`;
        const pdfBuffer = await fetchPdfWithRetry(employmentUrl, `${schoolName} employment PDF`);
        const employmentText = extractPdfText(pdfBuffer);
        result = { ...result, ...parseEmploymentReport(employmentText) };
      } else {
        result = mergeErrors(result, `Missing employment directory entry for ${EMPLOYMENT_REPORT_YEAR}`);
      }

      await sleep(randomDelayMs());

      if (barEntry) {
        const barUrl =
          `${BASE_API_URL}/BarPassageOutcomes/GenerateIndividualBarPassageReport` +
          `?schoolId=${barEntry.schoolCode}&year=${BAR_PASSAGE_REPORT_YEAR}`;
        const pdfBuffer = await fetchPdfWithRetry(barUrl, `${schoolName} bar passage PDF`);
        const barText = extractPdfText(pdfBuffer);
        result = { ...result, ...parseBarPassageReport(barText) };
      } else {
        result = mergeErrors(result, `Missing bar directory entry for ${BAR_PASSAGE_REPORT_YEAR}`);
      }

      const firms501 = result.employed_law_firms_501_plus ?? 0;
      const fc = result.employed_federal_clerkship ?? 0;
      console.log(`${prefix} — 501+ firms: ${firms501}, FC: ${fc}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${prefix} — ERROR: ${message}`);
      result = mergeErrors(result, message);
    }

    results[schoolName] = result;

    if (index < selectedSchoolNames.length - 1) {
      await sleep(randomDelayMs());
    }
  }

  writeFileSync(OUTPUT_JSON, `${JSON.stringify(results, null, 2)}\n`, "utf8");

  const successCount = Object.values(results).filter(result => !result.errors?.length).length;
  const errorCount = Object.values(results).filter(result => result.errors?.length).length;

  console.log(`\nWrote ${OUTPUT_JSON}`);
  console.log(`Successful schools: ${successCount}`);
  console.log(`Schools with errors: ${errorCount}`);
}

main().catch(error => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
