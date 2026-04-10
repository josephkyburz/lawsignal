# Law School Transparency Ingestion — Self-Contained Prompt

You are working on the LawSignal project at `/Users/joekyburz/Code/lawsignal`.

Read these files first:
- `CLAUDE.md`
- `.claude/skills/source-ingestion-runbook.md`
- `scripts/lib/sources.ts` (find `lst_2025` entry)

## Task

Ingest Law School Transparency (LST) data. LST provides independent employment analysis, cost calculations, and consumer-oriented metrics that complement ABA 509 raw data.

### Data to collect

- Combined BigLaw + FC rate (their calculation, may differ slightly from raw ABA)
- Public interest placement rate
- Government placement rate
- Median debt at graduation
- Total cost of attendance (including COL)
- Debt-to-income ratio
- Employment score (their composite)

### Getting the data

Check `data/raw/lst/` first. If empty:
1. **LST Reports**: https://www.lawschooltransparency.com/ — they publish per-school profiles
2. **LST Data Downloads**: They sometimes offer bulk data or APIs
3. **Web scraping**: Per-school pages contain structured data

### Variables to populate

- `lst:employment_biglaw_fc` (rate)
- `aba509:employment_pi` (may update/supplement ABA data)
- `aba509:employment_government` (may update/supplement)
- `aba509:median_debt` (may update/supplement)
- `lst:total_coa` (currency)
- `lst:debt_to_income` (ratio)
- `lst:npv_outcome` (currency)

### Matching

Match against existing spine. LST uses school names close to official names.

### Output

- `scripts/output/lst_ingest.sql`
- Updated wiki sections via wiki-writer
- Console summary

### Prerequisite

ABA 509 spine must exist. LST data supplements and cross-validates ABA data.
