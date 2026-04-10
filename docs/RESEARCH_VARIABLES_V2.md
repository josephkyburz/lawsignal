# LawSignal — Research Variables v2

Merged from two sources:
1. `Law School Decision Matrix.txt` — author's real decision (v1, 60+ RVs)
2. `Considerations Broad.rtf` — three parallel AI analyses (Perplexity,
   Copilot, Grok) using an 11-section framework. 111 variables extracted.

After deduplication: **~130 unique research variables** across 10 categories.

---

## Variable Classification Hierarchy

From the Considerations Broad framework:

- **Tier 1 — Quantifiable**: Hard outcome data from ABA 509, NALP, US News.
  Directly observable, no inference needed.
- **Tier 2 — Proxy-based**: Geographic pipelines, network density, OCI
  quality, curve effects. Semi-quantifiable via indirect measures.
- **Tier 3 — Non-quantifiable**: Culture, identity fit, subjective
  satisfaction. Editorial-only in the tool; user provides their own score.

This maps to our schema: Tier 1 → `observations` table with confidence 1.0.
Tier 2 → `observations` with confidence 0.5-0.8. Tier 3 → editorial in
school wiki + user-editable scores in the frontend.

---

## New Variables from Considerations Broad (not in v1)

### Employment — Deeper Cuts

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-E13 | BigLaw placement by firm size tier (100+/250+/501+) | 1 | ABA 509 | Finer granularity than just 501+ |
| RV-E14 | State clerkship rate | 1 | ABA 509 | Separate from federal clerkship |
| RV-E15 | Full-time long-term employment rate | 1 | ABA 509 | The "real" employment rate |
| RV-E16 | School-funded positions share | 1 | ABA 509 | Inflates raw rates — flag it |
| RV-E17 | Median starting salary | 1 | NALP | Bimodal: BigLaw peak vs. rest |
| RV-E18 | Salary distribution / percentiles | 2 | NALP | 25th/50th/75th |
| RV-E19 | OCI firm count | 2 | school website | Proxy for employer demand |
| RV-E20 | OCI structure / format | 3 | school website | Callback rates, pre-select vs. lottery |
| RV-E21 | Career services staff ratio | 2 | school website | Staff per student |
| RV-E22 | Career services quality | 3 | none | Subjective, survey-based |
| RV-E23 | Firm-school hiring matrix | 3 | none | Which firms hire from which schools — latent |
| RV-E24 | Firm GPA cutoffs | 3 | none | Minimum GPA by firm — latent, anecdotal |
| RV-E25 | Clerkship pipeline quality | 2 | external | Feeder judge relationships |
| RV-E26 | Judge-alma mater overlap | 2 | external | Reuters clerkship data |
| RV-E27 | Faculty advocacy for clerkships | 3 | none | Subjective |
| RV-E28 | Non-legal career pathways | 2 | external | Consulting, policy, tech placement |
| RV-E29 | In-house counsel placement | 2 | NALP | |
| RV-E30 | Entrepreneurship support | 3 | school website | Incubators, solo practice support |
| RV-E31 | Lateral mobility (career stage) | 3 | none | Ability to move markets later |
| RV-E32 | Public interest fellowship count | 2 | school website | School-funded PI fellowships |
| RV-E33 | Market cycle sensitivity | 2 | NALP | How much outcomes vary by econ cycle |

### Cost — Deeper Cuts

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-C12 | Conditional scholarship share | 1 | ABA 509 | % of scholarships requiring GPA maintenance |
| RV-C13 | Scholarship retention risk | 2 | ABA 509 | P(losing scholarship) given curve |
| RV-C14 | Scholarship rescission rate | 2 | ABA 509 | Actual rate scholarships are pulled |
| RV-C15 | Debt-to-income ratio | 2 | LST | Expected debt / realistic starting salary |
| RV-C16 | NPV of debt vs. earnings | 2 | LST | Net present value under repayment scenarios |
| RV-C17 | IDR eligibility and terms | 2 | external | Income-driven repayment modeling |
| RV-C18 | PSLF eligibility alignment | 2 | external | Does career path qualify for PSLF? |
| RV-C19 | Scholarship negotiation leverage | 3 | none | Can you use competing offers? |

### Academic — Deeper Cuts

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-A15 | Grading curve rigor | 2 | school website | Mandatory curve, median GPA set-point |
| RV-A16 | Grade inflation patterns | 2 | external | Relative to peer schools |
| RV-A17 | Law review access method | 2 | school website | Write-on, grade-on, hybrid |
| RV-A18 | Externship count / placements | 2 | school website | |
| RV-A19 | Simulation/practice credits | 2 | school website | Trial advocacy, negotiation, etc. |
| RV-A20 | Practice readiness (composite) | 3 | none | How ready are grads for day-one practice |
| RV-A21 | Writing training intensity | 3 | none | Legal writing program quality |
| RV-A22 | Faculty research strength | 2 | school website | Publications, citations, grants |
| RV-A23 | Classroom pedagogy quality | 3 | none | Teaching effectiveness |
| RV-A24 | Attrition rate | 1 | ABA 509 | Students dropping/transferring out |
| RV-A25 | Transfer-in count | 1 | ABA 509 | Transfer friendliness signal |

### Culture — Deeper Cuts

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-L10 | Alumni network quality (depth) | 3 | none | Willingness to help, not just headcount |
| RV-L11 | Alumni helpfulness / mentoring | 3 | none | Subjective |
| RV-L12 | Alumni sentiment / satisfaction | 3 | none | Survey-based |
| RV-L13 | First-gen student support | 2 | school website | Programs, resources |
| RV-L14 | Diversity support infrastructure | 2 | school website | Affinity groups, DEI office |
| RV-L15 | Sense of belonging | 3 | none | Identity/community fit |
| RV-L16 | Micro-network depth | 3 | none | Close study group / mentor relationships |
| RV-L17 | Continuing-generation advantage | 3 | none | Lawyer-parent advantage |
| RV-L18 | Student mental health climate | 3 | none | Institutional support |
| RV-L19 | Demographic placement gaps | 3 | none | Outcome differences by group |

### Prestige — Deeper Cuts

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-P08 | Employer reputation by market | 2 | external | How specific markets view the school |
| RV-P09 | Signaling premium | 3 | none | Credential signal vs. human capital |
| RV-P10 | Tier classification (T6/T14/T20/T50) | 1 | US News | Bright-line tier membership |

### Application Process (NEW category)

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-AP01 | Status checker availability | 1 | school website | Yes/no + flow description |
| RV-AP02 | Interview required / available | 1 | school website | Required, invitation-only, optional, none |
| RV-AP03 | Interview format | 2 | school website | Kira, phone, Skype, in-person |
| RV-AP04 | Decision communication method | 2 | school website | Phone, email, mail, status checker |
| RV-AP05 | Merit aid timeline | 2 | school website | When scholarship info is released |
| RV-AP06 | Need-based aid availability | 1 | school website | Yes/no + process |
| RV-AP07 | Seat deposit amount(s) | 1 | school website | Often 2 deposits |
| RV-AP08 | Seat deposit deadline(s) | 1 | school website | First and second deadlines |
| RV-AP09 | Scholarship deposit deadline | 1 | school website | Sometimes earlier than seat |
| RV-AP10 | Military fee waiver policy | 1 | school website | From your military waiver spreadsheet |
| RV-AP11 | Admitted student event dates | 2 | school website | ASW dates, travel reimbursement |
| RV-AP12 | Yield rate | 1 | ABA 509 | % of admitted who enroll |
| RV-AP13 | Applicants per seat | 2 | LSAC | Cycle demand pressure |
| RV-AP14 | Application list strategy fit | 3 | none | Reach/target/safety classification |
| RV-AP15 | Student revealed preferences | 2 | external | Actual matriculation given multiple offers |

### Growth & Fit — Deeper Cuts

| ID | Variable | Tier | Source | Notes |
|---|---|---|---|---|
| RV-F06 | Risk tolerance alignment | 3 | none | User's willingness to accept outcome variance |
| RV-F07 | Target job type fit | 2 | ABA 509 | School pipeline ↔ desired career path |
| RV-F08 | Partner/family constraints | 3 | none | Location locked by relationship |
| RV-F09 | Long-term satisfaction | 3 | none | Graduate satisfaction years later |

---

## Decision Model (from Considerations Broad)

All three AI sources converge on a utility function:

```
E[utility] = E[career_payoff - debt_cost]
           - risk_aversion × variance
           + fit_bonus
```

Where:
- `career_payoff` = f(employment outcomes, salary, geographic placement)
- `debt_cost` = f(tuition, scholarship, COL, repayment terms)
- `variance` = outcome variance by class rank within the school
- `fit_bonus` = user-weighted culture/growth/QoL dimensions

This maps directly to `computeScore()`:
- Career payoff → Employment Outcomes dimension
- Debt cost → Cost & Value dimension
- Variance → partially captured by Employment spread; also relates to
  grading curve rigor (high curve risk = high variance)
- Fit bonus → Culture, Growth & Fit, Quality of Life dimensions

---

## Failure Modes & Regret Patterns (from Considerations Broad)

These inform what the sensitivity panel should surface:

1. **Prestige trap**: Choosing the highest-ranked school regardless of
   fit, debt, or geography. LawSignal counters by requiring priorities
   before options.
2. **Sticker shock avoidance**: Rejecting expensive schools without
   calculating net cost after scholarships. The cost dimension should
   show BOTH sticker and net.
3. **Geographic lock-in blindness**: Not realizing a regional school
   constrains career geography. Geographic Strength dimension handles
   this.
4. **Curve risk ignorance**: Not understanding that a generous
   scholarship at a school with a harsh curve has a meaningful
   rescission probability. Flag conditional scholarships.
5. **Peer prestige anchoring**: Choosing based on what friends/family
   recognize rather than personal fit. Growth & Fit dimension counters.
6. **Employment rate numeracy failure**: Not distinguishing JD-required
   rate from overall employment rate, or not adjusting for school-funded
   positions. The tool should always show the honest rate.

---

## Total Variable Count

| Category | v1 (Decision Matrix) | v2 (+ Considerations Broad) | Total |
|---|---|---|---|
| Cost & Affordability | 11 | +8 | 19 |
| Rank & Prestige | 7 | +3 | 10 |
| Geographic & Location | 10 | +4 | 14 |
| Culture & Community | 9 | +10 | 19 |
| Academic & Education | 14 | +11 | 25 |
| Employment & Career | 12 | +21 | 33 |
| Growth & Fit | 5 | +4 | 9 |
| Quality of Life | (in Geographic) | — | (merged above) |
| Application Process | 0 | +15 | 15 |
| **Total** | **~68** | **+76** | **~144** |

Of these ~144:
- **~55 are Tier 1** (directly quantifiable from public data)
- **~45 are Tier 2** (proxy-based, partially observable)
- **~44 are Tier 3** (non-quantifiable, editorial + user-editable)
