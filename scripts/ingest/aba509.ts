#!/usr/bin/env tsx
/**
 * ABA 509 Required Disclosures Ingest
 *
 * Source: https://www.abarequireddisclosures.org/
 * The single most authoritative source for law school data.
 *
 * Run:
 *   npm run ingest:aba509:dry   — parse + validate, write SQL, don't apply
 *   npm run ingest:aba509       — parse + validate + write SQL
 *
 * After dry run, apply:
 *   npx wrangler d1 execute lawsignal-db --remote --file=scripts/output/aba509_ingest.sql
 *
 * TODO: Implement scraping / parsing of ABA 509 data.
 * The ABA publishes 509 disclosures as PDFs and an interactive site.
 * Options:
 *   1. Download the compilation spreadsheet (Excel) from ABA site
 *   2. Scrape the interactive site per-school
 *   3. Use a pre-parsed dataset (e.g., from LST or community sources)
 */

import { SOURCES } from "../lib/sources.js";

const SOURCE = SOURCES.aba509_2025;
const DRY_RUN = process.argv.includes("--dry-run");

console.log(`\n─── ABA 509 Ingest (${SOURCE.data_year}) ───`);
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
console.log(`Source: ${SOURCE.url}`);
console.log(`\nTODO: Implement data loading and parsing.`);
console.log(`This script is scaffolded and ready for implementation.`);
console.log(`\nExpected output: scripts/output/aba509_ingest.sql`);
console.log(`Fields: ${SOURCE.fields.join(", ")}`);
