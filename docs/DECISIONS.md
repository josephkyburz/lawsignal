# LawSignal — Decision Log

A running log of foundational decisions, the reasoning behind them,
and the conditions under which they should be revisited.

When a decision is reopened, append a new dated sub-section below
the original rather than editing it. The point of this log is to
preserve **why** something was decided so future contributors don't
waste time re-litigating it without context.

---

## D-001: Author byline — anonymous-but-institutional, deferred

**Date:** 2026-04-09
**Status:** Active
**Owner:** Joe

### Decision

The landing modal and the About page will not name the author by full
name in v1. The byline reads "Built by a Berkeley Law student." The
About page is written in first-person voice but signed
"— a Berkeley 2L" (or similar institutional-but-anonymous).

### Context

The natural impulse and external UX feedback both pointed toward a
full byline as a credibility signal. ABA 509 reports, LST analyses,
Spivey Consulting, and most editorial legal-education reference
projects either sign work or are clearly attached to a named
individual. The credibility case for naming is real: a single person
staking their name on a project is the strongest authenticity signal
available, and it's distinct from "Built by LawSignal LLC."

The case against naming is also real:

1. **Bar character & fitness exposure.** Joe is still in law school.
   Public association with anything schools or firms perceive as
   adversarial is a non-zero cost during admission, even when the
   underlying speech is protected.
2. **C&D exposure.** Schools and their counsel have sent threatening
   letters over less. Most are bluster, but each one consumes time,
   money, and emotional bandwidth — costs Joe cannot easily absorb
   during finals or bar prep.
3. **Permanence.** Once the name is in Google attached to LawSignal,
   it's there forever. The site can come down; the indexed pages,
   screenshots, and Reddit threads cannot.
4. **Sibling project risk.** LawSignal is a sibling to FirmSignal.
   The same exposure logic that applies there applies here — and
   naming on one project makes anonymity on the other moot.

### What we considered

- **Full naming.** Highest credibility, highest exposure. Rejected
  for v1 on the grounds above.
- **Hybrid (anonymous landing, named About).** ~85% of the
  credibility benefit at ~20% of the personal exposure. Rejected
  because Joe still doesn't want his name searchable against the
  project at all yet, even one click in.
- **Anonymous-but-institutional (the chosen path).** "Built by a
  Berkeley Law student." Carries enough institutional signal to read
  as authentic without making Joe personally searchable. The About
  page is written in first-person voice without a name attached.

### Why this is the right call FOR NOW

LawSignal is being treated as a public-interest project, not as a
credential Joe is claiming on his resume during the law school
window. That framing makes the exposure asymmetry the dominant
variable. The credibility cost of going anonymous-institutional is
small (the institution itself does most of the work the name would
do) and the exposure savings are large (no personal Google
attachment, no bar-admission risk vector, no personal C&D target).

This decision is consistent with FirmSignal D-001. Same reasoning,
same conditions, same author.

### When to revisit

Reopen this decision when ANY of the following becomes true:

1. Joe has been admitted to the bar and the character & fitness
   window has closed.
2. Joe decides to claim LawSignal publicly on his resume for
   clerkship, public-interest, government, or any other application
   where "I built a tool to help students navigate law school
   admissions" is a credential feature rather than a liability.
3. The project grows beyond a one-person scope and there is a real
   organizational case for transparent ownership.
4. Joe's career trajectory changes such that the exposure concern
   no longer applies (e.g., committed to PI / government work with
   no plans to lateral into BigLaw).

When reopened, the migration path is straightforward:

- Update the landing byline from "Built by a Berkeley Law student"
  to "Built by [Joe's name], Berkeley Law."
- Add a signed name to the About letter.
- Append a new dated sub-section to this entry explaining what
  changed.

Until then: the anonymous-institutional byline is the right call
and should not be debated again without one of the four conditions
above being met.

---

## D-002: Headline framing — mentorship, not information warfare

**Date:** 2026-04-09
**Status:** Active
**Owner:** Joe

### Decision

The landing modal headline is **"Choose a law school the way a mentor
would teach you to."**

The David Lat structural argument about information asymmetry stays
in the project's DNA but lives in a paragraph in the About page,
NOT in the landing copy. The About paragraph frames the problem as
a critique of the admissions information landscape as a system, not
as a have/have-not split between students with lawyer parents and
students without.

### Context

Three headline candidates were considered:

1. "Choose a law school the way a mentor would teach you to."
2. "Pick your priorities. Then pick your schools."
3. "The information your classmates' admissions consultants already
   have, given to everyone."

#3 carries the strongest version of the information asymmetry thesis
but alienates a meaningful portion of the audience: students who DO
have lawyers in the family or admissions consultants, who use
LawSignal as a check on that guidance or because they want a
structured framework their advisors didn't provide. Compressing the
thesis into a one-line headline makes it sound like class warfare
instead of structural critique.

#1 carries the mentorship framing that matches the tool's actual
behavior — a guided weighted decision matrix walking the user
through the technique a mentor would teach. This is what the tool
actually does.

#2 is the safest fallback, more direct but less warm.

### Why #1 wins

The mentorship frame is the truest single-sentence description of
what LawSignal does. The technique IS the mentorship — it's the
weighted decision matrix Joe's mom taught him, scaled to 200+ law
schools, given away free. That story belongs at the front door
because it's the strongest emotional anchor for a user arriving
anxious and uncertain.

This is the same framing that won for FirmSignal (D-002 there). The
technique is the same; the domain changed. The reasoning carries
over without modification.

### What lives where now

- **Landing modal headline**: #1 only.
- **About page**: a paragraph that makes the information asymmetry
  argument carefully, framed as system critique not class warfare.
- **Sub-headline / fallback copy**: #2 ("Pick your priorities. Then
  pick your schools.") is reserved as a future variant if #1 ever
  needs to be tested against an alternative.

### When to revisit

Reopen if user research shows the mentorship frame is being read
literally ("does LawSignal pair me with a human mentor?") and
generating support load. In that case, fall back to #2.
