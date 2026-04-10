# Skill Synthesis

Periodic meta-skill that reviews `.claude/memory/skills-learned.md` for
recurring patterns and proposes new skills when clusters emerge.

## Trigger

Invoke manually (`/skill-synthesis`) or when the skills-learned log has
grown by 10+ entries since the last synthesis run.

## Workflow

### 1. Load the log

Read `.claude/memory/skills-learned.md`. Parse each `###` entry into:
- timestamp, branch, pattern tag
- commit message
- files changed

### 2. Count pattern tags

Group entries by `pattern:` tag. For each tag with **3 or more entries**,
check whether a corresponding skill file already exists:

| Tag           | Expected skill file                          |
|---------------|----------------------------------------------|
| ingest        | source-ingestion-runbook.md                  |
| ingest-lib    | source-ingestion-runbook.md                  |
| ui            | ui-refactor.md                               |
| api           | schema-migration.md                          |
| scoring       | (none yet — candidate)                       |
| data-fix      | firm-audit.md                                |
| docs          | (none yet — candidate)                       |
| schema        | schema-migration.md                          |
| infra         | (none yet — candidate)                       |

### 3. Propose new skills

For each uncovered cluster (3+ entries, no matching skill):

1. Read the commit messages and files changed to understand the pattern
2. Draft a skill file following the standard format:
   - `# Skill Name`
   - `## Trigger` — when should an agent invoke this?
   - `## Workflow` — numbered procedural steps
   - `## Safety Rules` — gotchas specific to this pattern
3. Present the draft to the user for review before writing

### 4. Update the log

After synthesis, append a separator entry to skills-learned.md:

```
---
**Synthesis run:** YYYY-MM-DDTHH:MM:SSZ — reviewed N entries, proposed M skills
---
```

## Safety Rules

- Never auto-create skill files without user approval
- Don't propose skills that duplicate existing ones — check the full
  `.claude/skills/` directory first
- Keep proposed skills focused — one skill per pattern, not catch-alls
- If a pattern spans two existing skills, propose a linking note in the
  graph rather than a new skill
