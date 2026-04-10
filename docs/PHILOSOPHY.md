# LawSignal — Build Philosophy

This is the operating philosophy for how LawSignal gets built —
how the contributor (human or AI) makes decisions about scope,
scope creep, code, copy, and what to ship vs. polish. Distinct
from `docs/IDENTITY.md`, which is the product's identity (who it
serves, what it refuses to be, what it believes about its users).

These principles shape contributor behavior. They overlap with the
product principles in IDENTITY.md in places, but the source is
different — IDENTITY is about the user, PHILOSOPHY is about the
builder.

## Core principles

### 1. Clarity is leadership

If contributors are confused, the spec is wrong. Define:

- the objective
- the constraints
- the success criteria

Repeat them until they're obvious. Ambiguous instructions cost
more than over-explanation. If a future contributor reads a doc
and cannot figure out what the right move is, the doc is at fault,
not the contributor.

### 2. Decisions require ownership

No anonymous consensus. Someone owns each call, and everyone
understands why. Contributors who make load-bearing decisions
write down the reasoning so future contributors can reconstruct
the *why*, not just the *what*. See `docs/DECISIONS.md` for the
load-bearing decision log pattern — D-001 (anonymous byline) and
D-002 (headline choice) are the templates.

### 3. Show your work

Reasoning beats conclusions. Encourage contributors to surface:

- their assumptions
- the alternatives they considered and rejected
- the second-order effects of the chosen path

The goal is not to be right; the goal is to be defensible and to
make the next contributor's job easier. A wrong call with visible
reasoning is more useful than a right call with no trail.

### 4. Default to action

Avoid analysis paralysis. Make the best call with available
information. Adjust fast. Perfect is the enemy of shipped, and
the right time to refine a design is after it's running, not
before it's started.

The corollary: if you're stuck choosing between two defensible
paths, pick one and ship. The cost of being wrong is usually a
small refactor. The cost of deliberating forever is a feature
that never lands.

### 5. Build systems, not heroics

If something works once, systematize it. If something fails,
diagnose the process, not just the person. The goal is a codebase
and a workflow that holds up without depending on any one
contributor's heroics.

### 6. Stress-test everything

Before shipping any meaningful change, ask:

- What would break this?
- What are we missing?
- What would a hostile reader say?
- What does the failure mode look like, and can we live with it?

The product surface is small but the user is making a permanent
decision. Bugs that would be tolerable in a SaaS dashboard are
not tolerable here. The tool must hold up under scrutiny because
the user will scrutinize it.

### 7. Respect reality, not ego

Good ideas can come from anywhere — the user, an agent, a
contributor outside the immediate team, a critic. Bad ideas don't
get protected because someone's ego is attached to them. The test
is always whether the idea serves the user, not whose name is on
it.

If you wrote something and later realize it was wrong, say so and
fix it. The decision log (`docs/DECISIONS.md`) supports this with
its append-only "when reopened" pattern: you don't edit history,
you add to it.

## Execution beats elegance

A usable, imperfect system beats a perfect one nobody acts on.
The mom-rule applies to the build itself: name what matters
(shipping), constrain the problem (this iteration), choose
(deliberately), and ship. Refine after the user has hands on it.

When in doubt about whether to polish or ship, ship. Polish has
no upper bound; the user's patience does.

## Decision discipline (six rules)

These are the rules for any non-trivial decision the project has
to make — about scope, architecture, copy, design, or anything
else:

1. **Define the problem first.** Most contributors solve the wrong
   problem. You don't move until the objective is clear and the
   constraints are known.
2. **Make tradeoffs explicit.** Every decision has a cost. If you
   can't name the cost, you don't understand the decision.
3. **Act under uncertainty.** Waiting for perfect information is
   failure. Make the best call, adjust fast.
4. **Own the outcome.** No blaming inputs, people, or conditions.
   You chose; you own it.
5. **Stress-test your thinking.** Ask: what am I missing? What
   would break this? What would the other side argue?
6. **Build systems, not one-offs.** If it works, make it
   repeatable. If it fails, fix the process.

## Why this exists

LawSignal is a public-interest project run by a single person
with limited time. Every minute spent on the wrong thing is a
minute the user doesn't get. This document exists so contributors
(human or AI) don't have to re-derive the operating philosophy
every session. It's not a style guide; it's a posture.

The product identity is in `docs/IDENTITY.md`. The design system
is in `docs/DESIGN.md`. The load-bearing decisions are in
`docs/DECISIONS.md`. This file is the substrate they all sit on
top of.
