---
name: token-efficient-context-builder
description: Construct minimal, high-signal context for LawSignal tasks without dragging in giant files or generated data.
---

# When to Use

- Preparing context for work in this repo
- Task is narrow but the repo has a few very large files
- Repeated agent failures come from reading too much irrelevant code
- Need fast iteration on filter, scoring, data, or Pages Function work

# When NOT to Use

- Full architecture walkthroughs
- Broad refactors spanning most of the app
- When the user explicitly wants a full-repo audit
- When debugging already has a tight repro and failure surface

# Workflow

## 1. Identify the exact task

- What changed?
- What output is needed?
- What would count as done?

## 2. Start from the narrowest file boundary

- Firm data edit: `src/data/schools-buckets/<letter>.js`
- Filter UI: `src/components/filters/` first, then the App wiring point
- Weights / scoring: `src/components/priorities/`, `src/hooks/`, `src/lib/scoring.js`
- Interpretation / sensitivity: `src/lib/interpretation.js`, `src/lib/sensitivity.js`
- Backend: `functions/api/[[route]].js` plus the direct caller

## 3. Exclude low-signal context

- Do not load all of `src/App.jsx` unless the task truly needs it
- Do not load `src/data/schools.js` for ordinary firm edits
- Do not paste large generated files into context
- Do not include unrelated components just because they are nearby

## 4. Prune what you carry forward

- Keep only the relevant functions, props, imports, and state edges
- Summarize large files instead of pasting them in full
- Include configs or scripts only when they affect the behavior under change

## 5. Validate sufficiency

Before moving ahead, ask:

- Can this task be solved from the selected files alone?
- Would anything missing force guessing about behavior or data shape?

If yes, add only the missing boundary.

# Guardrails

- Do not modify source files while building context
- Do not confuse human-editable firm buckets with generated compatibility output
- Do not pad context "just in case"
- Flag assumptions explicitly when code and docs differ
