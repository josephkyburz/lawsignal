# Schema Migration Skill

Trigger: changing the D1 database schema.

## Steps

1. **Create migration file** at `migrations/NNNN_description.sql` (next sequential number).
2. **Write SQL** — `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE`, `CREATE INDEX IF NOT EXISTS`. Always idempotent.
3. **Test locally**: `npx wrangler d1 execute lawsignal-db --local --file=migrations/NNNN_description.sql`
4. **Apply remotely**: `npx wrangler d1 execute lawsignal-db --remote --file=migrations/NNNN_description.sql`
5. **Update CLAUDE.md** if the change affects the documented schema.
6. **Never** use `DROP TABLE` or `DROP COLUMN` without explicit user approval.
7. **Never** use `BEGIN`/`COMMIT` — D1 doesn't support them. Rely on `IF NOT EXISTS` / `WHERE NOT EXISTS` guards.
