---
name: ci-failure-analyzer
description: Identify the root cause of a build or deploy failure for LawSignal and propose the smallest verifiable fix.
---

# When to Use

- GitHub Actions, Vite build, or Cloudflare deploy is failing
- Logs or the failing step are available
- Need a fast unblock without broad changes

# Workflow

## 1. Inspect failure

- Identify the failing step: install, build, or deploy
- Extract the exact error and location
- Note environment details: Node version, Cloudflare target, branch, command

## 2. Classify

- `install`
- `build`
- `deploy/config`
- `runtime after deploy`

## 3. Trace root cause

- Map the error to source or config
- Check recent changes
- Prefer one precise root cause over a list of guesses

## 4. Plan the minimal fix

- Fix source or config, not the symptom
- Prefer targeted config correction over architecture changes
- Keep the change localized and reversible

## 5. Verify

- Re-run the failing command locally when possible
- Check the next adjacent step
- Confirm the fix did not create a second-order failure

# LawSignal checks

- `package.json` scripts
- `vite.config.js`
- `wrangler.toml` or deploy command assumptions
- Pages Function imports and runtime-safe APIs
- D1 binding names and env references
- Generated firm-data sync status when data changes are involved

# Guardrails

- Do not bypass CI or deploy gates
- Do not change unrelated workflow steps
- Do not invent env values
- State unknowns clearly when logs are incomplete
