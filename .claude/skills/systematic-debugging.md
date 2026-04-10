---
name: systematic-debugging
description: Deterministically isolate and fix a specific LawSignal bug with the smallest verifiable change.
---

# When to Use

- Reproducible bug with a clear failure
- White screen, broken filter behavior, wrong scoring, broken API response, or build failure
- Specific file or subsystem is suspected
- Need a safe fix, not a refactor

# Workflow

## 1. Inspect

- Identify the failing surface: UI, score pipeline, school data, Pages Function, or build
- Capture the exact error, symptom, or wrong behavior
- Confirm repro steps

## 2. Diagnose

- Classify the bug: runtime, hook ordering, logic, data-shape, async-state, config, or deploy
- Trace the data flow to one likely failure point
- Form a single root cause hypothesis

## 3. Check common LawSignal gotchas first

- Named React imports only; no `React.useEffect`
- Hook/state ordering in `src/App.jsx`
- `savedIds` declared before `matchedExcluded`
- Missing props passed to `AboutPage`
- Bucket file edited without running `npm run firms:sync`
- D1 binding/config mismatch for Pages Function work

## 4. Apply the minimal fix

- Change the smallest boundary that resolves the cause
- Avoid cleanup refactors during the bug fix
- Match existing patterns

## 5. Verify

- Re-run the repro steps
- Run targeted commands such as `npm run firms:sync`, `npm run firms:verify`, or `npm run build` when relevant
- Check adjacent behavior for regressions

# Guardrails

- No speculative rewrites
- No generated-data hand edits unless the toolchain itself is broken
- No unrelated dependency changes
- If root cause is uncertain, say so and stop widening the change
