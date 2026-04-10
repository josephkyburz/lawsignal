/**
 * Generate a URL-safe slug from a school name.
 * "Harvard Law School" → "harvard"
 * "University of Chicago Law School" → "uchicago"
 * "NYU School of Law" → "nyu"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\blaw school\b/gi, "")
    .replace(/\bschool of law\b/gi, "")
    .replace(/\buniversity of\b/gi, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");
}
