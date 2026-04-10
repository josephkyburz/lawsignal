# Raw Data Review Skill

Trigger: user drops a new file into `data/raw/` and asks for review.

## Steps

1. **Identify the source** from the folder name and file type.
2. **Read a sample** — first 50-100 rows or the first few KB. Never load the entire file into context if it's large.
3. **Assess structure**:
   - What columns/fields are present?
   - What's the row count?
   - What identifier can we use to match to canonical schools? (school name, IPEDS ID, ABA code, etc.)
   - Are there obvious quality issues? (missing values, encoding problems, duplicate rows)
4. **Map fields** to our schema:
   - Which fields map to `school_metrics` columns?
   - Which fields map to `observations` via `variables`?
   - Are there fields we don't have a variable for yet? (flag for variable catalog update)
5. **Estimate match rate** — how many schools in this file will match our existing spine? (if spine exists)
6. **Recommend next steps**:
   - Write/update the Zod validator for this source
   - Write/update the ingest script
   - Flag any fields that need new variables in the catalog
   - Flag any schools that might need alias additions to the matcher

## Output format

```
## Raw Data Review: {filename}

**Source:** {source_name}
**Records:** {count}
**Format:** {CSV/JSON/Excel}
**Key identifier:** {field used for school matching}

### Field mapping
| Source field | → LawSignal field | Notes |
|---|---|---|

### Quality issues
- {issue 1}
- {issue 2}

### Recommended actions
1. {action}
2. {action}
```

## Rules

- **Never load files > 5 MB fully into context.** Use `head`, `wc -l`, or a subagent.
- **Never modify raw files.** They're immutable source-of-truth.
- **Always validate a sample with the Zod schema** before recommending a full ingest.
- **Flag PII immediately** — student names, applicant data, SSNs should never enter the pipeline.
