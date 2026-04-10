---
name: safe-dependency-upgrade
description: Upgrade dependencies with minimal breakage risk using controlled, incremental changes.
---

# When to Use
- Updating outdated packages
- Fixing security advisories
- Stabilizing builds before deploy
- Reducing dependency drift
- Unlocking a newer API before adding a feature

# When NOT to Use
- Major framework migrations (e.g., Next 12 → 14 full rewrite)
- Build or test baseline is already failing
- Bulk "upgrade everything" operations
- Dependency purpose is unclear

# Inputs
- `package.json`
- Lockfile (`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`)
- Target dependency (or list)
- Current vs desired version (optional)
- Build/test status (optional)

# Workflow

## 1. Inspect
- Read `package.json` — identify current version
- Determine direct vs transitive dependency
- Note related peer deps and plugins

## 2. Classify
- Patch — generally safe
- Minor — usually safe
- Major — breaking risk, requires justification

## 3. Assess Risk
- Count how many files import the package
- Is it on the critical path or peripheral?
- Any peer dependency constraints?
- Framework-coupled? (e.g., ESLint plugins, Babel presets)

## 4. Plan
- One dependency at a time
- Isolate major upgrades — do not batch with other changes
- Prefer the smallest version that satisfies the need

## 5. Minimal Change
- Update version in `package.json` only
- Do not edit unrelated dependencies
- Do not manually edit the lockfile

## 6. Anticipate Breakage
- API or export changes
- Type signature changes
- Config format changes
- Runtime behavior differences

## 7. Verify
- Run install
- Run build
- Run tests (if present)
- Smoke test critical paths

# Output

**Package:** `<name>`
**Current → Target:** `<old>` → `<new>`
**Type:** patch / minor / major
**Risk:** low / medium / high

**Usage:** <where and how it's imported>
**Peer Dependencies:** <issues or none>
**Breaking Risk:** <specific concerns or none>

**Minimal Change:**
```json
<updated package.json snippet>
```

**Verification Plan:**
1. Install deps
2. Run build
3. Run tests
4. Smoke test: <critical flow>

**Recommendation:** Proceed / Proceed with caution / Defer

**Notes:**
- Assumptions: <list or none>
- Unknowns: <list or none>

# Guardrails
- No multi-major upgrades in one pass
- No manual lockfile edits
- No new packages introduced
- Read package files before proposing changes
- Prefer deferral over a risky upgrade
- State uncertainty explicitly
