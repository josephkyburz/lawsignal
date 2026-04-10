import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const WIKI_DIR = resolve(import.meta.dirname, "../../data/schools");

export interface WikiSection {
  source_id: string;
  content: string;
}

/**
 * Write or update a school wiki file with a source-delimited section.
 * Creates the file if it doesn't exist; appends/replaces the section if it does.
 */
export function writeSchoolWiki(
  slug: string,
  section: WikiSection,
  frontmatter?: Record<string, string>,
): void {
  const path = resolve(WIKI_DIR, `${slug}.md`);
  const beginTag = `<!-- BEGIN:${section.source_id} -->`;
  const endTag = `<!-- END:${section.source_id} -->`;
  const sectionBlock = `${beginTag}\n${section.content}\n${endTag}`;

  if (existsSync(path)) {
    let existing = readFileSync(path, "utf-8");
    const beginIdx = existing.indexOf(beginTag);
    const endIdx = existing.indexOf(endTag);

    if (beginIdx !== -1 && endIdx !== -1) {
      // Replace existing section
      existing = existing.slice(0, beginIdx) + sectionBlock + existing.slice(endIdx + endTag.length);
    } else {
      // Append new section
      existing = existing.trimEnd() + "\n\n" + sectionBlock + "\n";
    }
    writeFileSync(path, existing, "utf-8");
  } else {
    // Create new file
    const fm = frontmatter || {};
    const fmBlock = [
      "---",
      `slug: ${slug}`,
      `review_status: needs_review`,
      `last_ingest: ${new Date().toISOString().split("T")[0]}`,
      `sources_ingested: [${section.source_id}]`,
      ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`),
      "---",
    ].join("\n");

    writeFileSync(path, `${fmBlock}\n\n# ${slug}\n\n${sectionBlock}\n`, "utf-8");
  }
}
