# Open Questions

Parking lot for unresolved items noticed during development but not
in scope for the current task. Review at session start. Promote to
a roadmap item in AGENT.md or close with a one-line resolution.

---

## 2026-04-10 — from SCORING_ALGORITHM.md draft

1. **Advanced utility mode in v1 or v2?** Leaning v2. The weighted-
   average is easier to explain and the Berkeley regression test
   proves it. Revisit after first users touch the tool.
2. **Suppressed state bar passage averages.** Small-N states (AK,
   ND, VT) have unstable first-time pass rates. Fallback: use the
   national average adjusted by a 3-year rolling window. Needs
   a decision before Phase 1.6.
3. **`target` direction normalization in v1?** The only variables
   that need it today are median GPA bands and class size. Could
   defer to v2 by treating class size as `higher_better` with a
   user filter for "small class preference." Leaning defer.
4. **Edit granularity: dimension-level vs variable-level overrides?**
   Leaning dimension-only for v1. Variable-level is a rabbit hole
   and the UI surface is brutal.
5. **`variance_penalty` formula in advanced mode.** Considerations
   Broad gives the shape but not the coefficients. Need a literature
   pass or a first-principles derivation. Blocks advanced mode.

