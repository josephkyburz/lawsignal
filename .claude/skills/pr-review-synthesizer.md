---
name: pr-review-synthesizer
description: Extract key risks and actionable feedback from a pull request with minimal noise.
---

# When to Use
- Reviewing a PR quickly before merge
- Large PR where full manual review is costly
- Need structured, high-signal feedback

# When NOT to Use
- Deep architectural review
- Initial repo exploration
- Debugging a failing PR (use ci-failure-analyzer)
- Trivial changes (e.g., typo-only PR)

# Inputs
- PR diff or changed files
- PR description (optional)
- Relevant context: linked issue, feature goal (optional)

# Workflow

## 1. Inspect Scope
- Identify files changed
- Classify change type: feature / bugfix / refactor / config

## 2. Detect High-Risk Areas
- Auth or data access changes
- API contract changes
- State management changes
- Async logic
- Schema or type changes

## 3. Analyze Change Quality
- Correctness vs stated intent
- Edge case handling
- Error handling
- Type safety
- Consistency with existing patterns

## 4. Identify Regressions
- Compare before vs after behavior
- Look for removed safeguards, changed defaults, silent behavior changes

## 5. Check Test Coverage
- Are new code paths tested?
- Are critical paths untested?
- Are tests meaningful or superficial?

## 6. Synthesize Feedback
Prioritize in order:
1. Blocking issues
2. Correctness risks
3. Maintainability concerns

Keep feedback concise and actionable.

# Output

**Type:** feature / bugfix / refactor / config
**Scope:** <brief description>
**Risk Level:** low / medium / high

**Blocking Issues**
- <issue + why it matters>

**Key Risks**
- <concrete risks>

**Suggested Changes**
1. <specific, minimal fix>
2. <specific, minimal fix>

**Test Gaps**
- <missing or weak coverage>

**Verdict:** Approve / Approve with changes / Request changes

**Notes:**
- Assumptions: <if any>
- Unknowns: <missing info that affected review>

# Guardrails
- Read the diff before forming conclusions
- Focus on correctness and risk — not style preferences
- Do not suggest nits unless they have real impact
- Do not rewrite large sections of code
- Avoid speculative issues without evidence in the diff
- Keep feedback minimal, clear, and actionable
