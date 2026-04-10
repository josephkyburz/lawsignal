# Wiki Health Check

Graph integrity checker for the school wiki layer (`data/schools/`) and the
skill graph (`.claude/skills/graph/`).

## Trigger

Run after any ingestion pass, after adding new graph nodes, or on demand
when investigating data quality issues.

## Workflow

### 1. Firm Wiki Integrity

Check `data/schools/` for structural issues:

```bash
# Count wiki files vs firms in src/data/schools.js
WIKI_COUNT=$(ls data/schools/*.md 2>/dev/null | grep -v "^_" | wc -l)
FIRM_COUNT=$(grep -c "^  {" src/data/schools.js)
echo "Wikis: $WIKI_COUNT  Firms: $FIRM_COUNT"
```

**Checks:**
- [ ] Every firm in `src/data/schools.js` has a corresponding wiki file
- [ ] Every wiki file has valid frontmatter (slug, base_firms_id)
- [ ] No orphan wikis (wiki exists but firm was removed)
- [ ] Source sections use correct delimiters (`<!-- BEGIN:source_name -->`)
- [ ] `_index.md` lists all wiki files
- [ ] `_log.md` has entries for the most recent ingestion

### 2. Skill Graph Integrity

Check `.claude/skills/graph/` for link rot and orphans:

**Checks:**
- [ ] Every `[[wiki-link]]` in MOC files points to an existing `.md` file
- [ ] Every content node is referenced by at least one MOC
- [ ] `_index.md` references all MOC files
- [ ] No duplicate `name:` values in frontmatter across the graph
- [ ] All MOC files use `type: moc` in frontmatter

### 3. Cross-Layer Consistency

**Checks:**
- [ ] Sources listed in `scripts/lib/sources.ts` have corresponding
      graph nodes in `.claude/skills/graph/sources/`
- [ ] D1 schema tables in `migrations/` are documented in the codebase
      graph (`.claude/skills/graph/codebase/`)

### 4. Report

Output a structured report:

```
=== Wiki Health Check ===
Firm wikis: 346/337 firms covered (9 orphans)
Missing wikis: [list]
Orphan wikis: [list]
Broken source delimiters: [list]

=== Skill Graph Health ===
Nodes: 42  MOCs: 5  Broken links: 2
Orphan nodes: [list]
Broken [[links]]: [list]

=== Cross-Layer ===
Undocumented sources: [list]
Undocumented tables: [list]
```

## Safety Rules

- Read-only — never modify wiki files or graph nodes during a health check
- Report issues; don't auto-fix (fixes may need human judgment)
- If orphan count > 10, flag as systemic rather than listing individually
