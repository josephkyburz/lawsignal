# LawSignal — Research Variables (RVs)

Extracted from `data/research/Law School Decision Matrix.txt` — the
author's actual decision between Berkeley, Georgetown, and Vanderbilt
as a FLEP (Funded Legal Education Program) Army officer. This is
ground truth for what actually matters when choosing a law school.

Source confidence: **1.0** — first-person decision document from a
real applicant weighing a real choice with real constraints.

---

## RV Catalog

### Cost & Affordability

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-C01 | Tuition (sticker) | currency | yes | ABA 509 |
| RV-C02 | Tuition after scholarship/grant | currency | partial | school-specific, negotiated |
| RV-C03 | Institutional tuition cap willingness | boolean | no | negotiation outcome |
| RV-C04 | BAH (Basic Allowance for Housing) by location | currency | yes | DoD BAH tables by ZIP |
| RV-C05 | Cost of living — housing | currency | yes | Census/Zillow/rent indices |
| RV-C06 | Cost of living — total | currency | yes | BLS COLA indices |
| RV-C07 | Housing square footage per dollar | ratio | yes | rental market data |
| RV-C08 | Ability to build wealth (home purchase feasibility) | composite | partial | VA loan + local market |
| RV-C09 | Travel cost to family/home | currency | estimable | flight prices, distance |
| RV-C10 | Annual total income (BAH + pay) | currency | yes | DoD pay tables |
| RV-C11 | Median debt at graduation | currency | yes | ABA 509 |

### Rank & Prestige

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-P01 | US News overall rank | rank | yes | US News |
| RV-P02 | Peer assessment score | score | yes | US News |
| RV-P03 | Lawyer/judge assessment score | score | yes | US News |
| RV-P04 | "Name" value — national recognition | ordinal | subjective | reputation, author judgment |
| RV-P05 | "Shock and awe" factor (signal strength of school + background combo) | ordinal | subjective | author: "Infantry Officer from West Point with Berkeley Law is an immediate attention grabber" |
| RV-P06 | T14/T10/T6 tier membership | categorical | yes | US News |
| RV-P07 | Specialty rankings (IP, national security, etc.) | rank | yes | US News specialty |

### Geographic & Location

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-G01 | City/metro area | categorical | yes | school data |
| RV-G02 | Region (West Coast, South, Mid-Atlantic, etc.) | categorical | yes | derived |
| RV-G03 | Distance to family/home | miles | yes | geocoding |
| RV-G04 | Weather/climate quality | ordinal | yes | climate data |
| RV-G05 | Proximity to practice market (where grads work) | composite | yes | ABA 509 employment by state |
| RV-G06 | Geographic portability of degree | ordinal | partial | employment data breadth |
| RV-G07 | City "fun" / nightlife / social scene | ordinal | subjective | city data + author judgment |
| RV-G08 | Dating market quality | ordinal | subjective | author: Nashville > DC > SF |
| RV-G09 | Familiarity with area (pre-existing network) | binary | personal | user-specific |
| RV-G10 | Flight accessibility / travel hub quality | ordinal | yes | airport data |

### Culture & Student Life

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-L01 | Collaborative vs. competitive culture | ordinal | partial | student surveys, reputation |
| RV-L02 | Grading system (pass/fail vs. curved grades) | categorical | yes | school policy |
| RV-L03 | Grade curve generosity | ordinal | partial | school-reported curve |
| RV-L04 | Student body "impressiveness" / intellectual caliber | ordinal | partial | median LSAT/GPA as proxy |
| RV-L05 | Diversity of thought / ideological range | ordinal | subjective | reputation |
| RV-L06 | Friendliness / community feel | ordinal | subjective | visit impressions, surveys |
| RV-L07 | Veteran community / military-friendly culture | ordinal | partial | vet enrollment, clubs |
| RV-L08 | "Too fun" risk (lifestyle vs. growth tradeoff) | ordinal | subjective | author: Nashville risk |
| RV-L09 | Political/ideological lean of student body | ordinal | partial | reputation, author: "maybe too liberal even for me" |

### Academic & Educational Quality

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-A01 | 1L class size (entering class) | count | yes | ABA 509 |
| RV-A02 | Total enrollment | count | yes | ABA 509 |
| RV-A03 | Student-faculty ratio | ratio | yes | ABA 509 |
| RV-A04 | Faculty count (full-time) | count | yes | ABA 509 |
| RV-A05 | Minority faculty percentage | rate | yes | ABA 509 |
| RV-A06 | Minority student percentage | rate | yes | ABA 509 |
| RV-A07 | Faculty accessibility / mentorship quality | ordinal | partial | surveys, reputation. Author: "Vanderbilt > Berkeley > Georgetown" |
| RV-A08 | Faculty intellectual caliber | ordinal | subjective | reputation, publications |
| RV-A09 | Section/mod structure (small sections vs. large lectures) | categorical | yes | school curriculum |
| RV-A10 | Clinical program breadth | count | yes | school websites |
| RV-A11 | Specialty program strength (IP, natsec, etc.) | ordinal | partial | US News specialty + school data |
| RV-A12 | Journals available | count | yes | school websites |
| RV-A13 | Study abroad / semester-away options | count | partial | school websites |
| RV-A14 | Cross-disciplinary opportunities (e.g., nuclear engineering + law) | binary | yes | university program catalog |

### Employment & Career Outcomes

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-E01 | BigLaw placement rate (firms 501+) | rate | yes | ABA 509 |
| RV-E02 | Federal clerkship rate | rate | yes | ABA 509 |
| RV-E03 | BigLaw + FC combined rate | rate | yes | ABA 509 / LST |
| RV-E04 | Government placement rate | rate | yes | ABA 509 |
| RV-E05 | Public interest placement rate | rate | yes | ABA 509 |
| RV-E06 | JD-required employment rate | rate | yes | ABA 509 |
| RV-E07 | Unemployment rate | rate | yes | ABA 509 |
| RV-E08 | Bar passage rate | rate | yes | ABA 509 |
| RV-E09 | Regional network strength (where alumni are) | ordinal | partial | alumni data, employment geography |
| RV-E10 | FLEP/JAG-specific network strength | ordinal | subjective | author: "Vanderbilt has a very strong FLEP network within JAG corps" |
| RV-E11 | Veteran employer network | ordinal | partial | career services data |
| RV-E12 | Post-military career optionality | ordinal | subjective | author thinking about BigLaw, clerkship, GS, MBA |

### Personal Growth & Fit

| ID | Variable | Type | Observable? | Source |
|---|---|---|---|---|
| RV-F01 | Comfort zone disruption (growth potential) | ordinal | subjective | author: "stress my systems and create a new network" |
| RV-F02 | "What person I want it to make me" | ordinal | subjective | author's central framing question |
| RV-F03 | Extracurricular engagement likelihood | ordinal | subjective | author: more likely at Berkeley due to needing to build network |
| RV-F04 | School's "vote of confidence" in admitting you | emotional | subjective | author: "Berkeley has given me a large vote of confidence" |
| RV-F05 | Excitement / gut feeling about the school | emotional | subjective | visit impressions |

---

## Key Findings

### 1. The decision is NOT primarily about rankings

The author explicitly frames the decision as "balancing where I want
to live 25-28, future opportunities, and what person I want it to
make me." Rankings are mentioned but are not the deciding factor
between T9 and T17. The growth/fit dimension is the tiebreaker.

### 2. Cost structure is constraint-based, not gradient

For a FLEP officer, cost isn't "cheaper is better" — it's "does the
school agree to the Army's tuition cap?" This is a binary constraint
that eliminates options entirely. COL matters on the margin but BAH
adjusts for it. This suggests cost should be modeled as both a
hard constraint (can I afford this?) and a gradient (how much
financial cushion do I have?).

### 3. "Personal growth" is a real dimension that rankings ignore

The author's decision ultimately comes down to: Berkeley forces
growth (new city, new network, out of comfort zone) while Vanderbilt
is comfortable. This is not captured in ANY existing law school
ranking or dataset. It's deeply personal but universally relevant —
every applicant weighs comfort vs. growth.

### 4. Culture is not one thing

The author distinguishes between:
- Collaborative vs. competitive (Berkeley/Vandy collaborative, Georgetown competitive)
- Grading philosophy (pass/fail vs. curved)
- Student body character (impressive, friendly, diverse)
- Political lean
- "Too fun" risk

These are at least 3-4 separate sub-variables that collapse into
one "culture" dimension in most rankings.

### 5. Geographic considerations go way beyond "location"

The author's geographic analysis includes: housing, weather, dating
market, nightlife, proximity to family, flight accessibility,
familiarity, wealth-building opportunity (VA loan), and "would I
live here at any other time in my life?" This is richer than any
school dataset captures.

### 6. Network effects are source-specific

"Network" means different things: FLEP/JAG alumni network (Vanderbilt
strong), regional legal market network (Georgetown for DC, Berkeley
for West Coast), veteran community, and personal social network.
These should be disaggregated.

### 7. Specialty fit matters when it matters

IP law at Berkeley, national security at Georgetown — these are
tiebreakers for specific students, not universal dimensions. The
schema needs to support specialty-level data without forcing every
student to care about it.
