---
name: test-gap-finder
description: Identify the highest-risk missing tests for a specific change or code path.
---

# When to Use
- A PR changes logic, branching, or data flow
- Existing tests feel thin or overly happy-path
- A bugfix needs regression coverage
- You want to know what to test before merge

# When NOT to Use
- Writing a full test suite from scratch
- Performance, load, or security testing plans
- Broad QA planning across an entire product
- Trivial copy or styling-only changes

# Inputs
- PR diff or changed files
- Existing related tests (if any)
- Description of intended behavior (optional)

# Workflow

## 1. Inspect Change Surface
- Identify changed files and functions
- Classify change type: bugfix / new logic / refactor with behavior risk / config change

## 2. Trace Behavior Changes
- Identify what behavior can now differ:
  - New branches or conditions
  - Changed defaults
  - New error states
  - New async or state transitions

## 3. Map Existing Coverage
- Check whether related tests already cover:
  - Happy path
  - Edge cases
  - Failure paths
  - Regression path
- Distinguish real coverage from superficial coverage

## 4. Identify Highest-Risk Gaps
- Prioritize missing tests for:
  - Correctness-critical logic
  - User-visible failures
  - Data loss or corruption risk
  - Auth or permissions
  - API contract changes
  - Null / undefined / empty inputs

## 5. Propose Minimal Test Set
- Smallest set of tests that meaningfully reduces risk
- Prefer targeted cases over broad test sprawl
- Include regression test for known bug if applicable

## 6. Define Test Intent
For each proposed test, state:
- Scenario
- Expected result
- Why it matters

# Output

**Type:** bugfix / new logic / refactor / config
**Risk Level:** low / medium / high
**Coverage Status:** good / partial / weak

**Existing Coverage:**
- <what is already tested>
- <what is not meaningfully tested>

**Highest-Risk Gaps:**
1. <scenario>
   - Expected: <result>
   - Why: <risk addressed>

2. <scenario>
   - Expected: <result>
   - Why: <risk addressed>

**Minimal Recommended Test Set:**
1. <test name or scenario>
2. <test name or scenario>
3. <test name or scenario>

**Notes:**
- Assumptions: <if any>
- Unknowns: <missing info that affected analysis>

# Guardrails
- Read changed code and related tests before proposing gaps
- Do not propose a full suite when a small targeted set is enough
- Do not suggest tests for unchanged behavior unless regression risk is real
- Prefer behavior-level tests over brittle implementation-detail tests
- Focus on correctness and breakage risk — not coverage vanity
- State uncertainty explicitly when intended behavior is unclear
