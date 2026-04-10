# School Audit Skill

Trigger: editing/verifying an existing school's data in LawSignal.

## Steps

1. **Identify the school** — find it in `src/data/schools.js` or D1.
2. **Cross-reference sources** — check `data/schools/{slug}.md` wiki for all ingested source sections.
3. **Verify against authoritative source** — ABA 509 is the gold standard. US News for rankings. LST for employment analysis.
4. **Make the edit** — update the relevant field. If the change affects scoring dimensions, note which ones.
5. **Build verify** — `npx vite build`.
6. **Update wiki** — ensure the wiki file reflects the edit with source attribution.
