import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUTPUT_DIR = resolve(import.meta.dirname, "../output");

/**
 * Escape a string for SQL single-quote literals.
 */
export function esc(val: string | null | undefined): string {
  if (val == null) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Wrap a numeric value — NULL if missing.
 */
export function num(val: number | null | undefined): string {
  if (val == null || isNaN(val as number)) return "NULL";
  return String(val);
}

/**
 * Write SQL statements to the output directory.
 */
export function writeSql(filename: string, statements: string[]): void {
  const path = resolve(OUTPUT_DIR, filename);
  writeFileSync(path, statements.join("\n") + "\n", "utf-8");
  console.log(`Wrote ${statements.length} statements to ${path}`);
}
