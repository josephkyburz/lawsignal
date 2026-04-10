# LawSignal — Decision Variables (DVs)

Mapping from Research Variables to the scoring dimensions users
will weight. Derived from `docs/RESEARCH_VARIABLES.md`.

---

## Revised Dimensions

The original 8 dimensions from the AGENT.md scaffold hold up well
but need refinement based on what actually drove a real decision.
**The biggest gap is the absence of a "Growth & Fit" dimension** —
the author's #1 tiebreaker.

### Final 9 Dimensions

| # | Dimension | What it measures | Key RVs |
|---|---|---|---|
| 1 | **Selectivity** | How hard is it to get in? Proxy for peer caliber. | RV-P01, P02, P03, P06, L04 (median LSAT/GPA, acceptance rate, peer score) |
| 2 | **Employment Outcomes** | What happens after graduation? The ROI denominator. | RV-E01–E08 (BigLaw+FC, JD-required, unemployment, bar passage) |
| 3 | **Cost & Value** | Can I afford this? What's the debt load? | RV-C01–C02, C05–C06, C10–C11 (tuition, COL, debt, scholarships) |
| 4 | **Geographic Strength** | Where will I practice? How portable is this degree? | RV-G01–G06, G10, E09 (location, alumni footprint, portability) |
| 5 | **Academic Quality** | Will I learn well here? Faculty, class structure, clinics. | RV-A01–A14 (class size, S:F ratio, faculty, clinics, journals, specialties) |
| 6 | **Prestige & Reputation** | What doors does the name open? | RV-P01–P07 (rank, peer assessment, specialty rankings, tier membership) |
| 7 | **Culture & Community** | What's the vibe? Collaborative, competitive, tight-knit? | RV-L01–L09 (grading, collaboration, vet community, diversity, political lean) |
| 8 | **Quality of Life** | What's daily life like for 3 years? | RV-G04, G07–G08, C05, C07 (weather, nightlife, dating, housing, convenience) |
| 9 | **Growth & Fit** | Will this school make me the person I want to become? | RV-F01–F05, L08 (comfort zone disruption, excitement, engagement, vote of confidence) |

### Why 9 and not 8

"Growth & Fit" is the dimension that doesn't exist in any published
ranking but was the #1 tiebreaker in the author's actual decision.
Every applicant weighs some version of: "Am I choosing the
comfortable option or the one that stretches me?" Separating it
from Culture and Quality of Life gives users a direct slider for
"how much do I want to be challenged?"

This is LawSignal's equivalent of FirmSignal's "mentorship &
culture" dimension — the thing the data can't fully capture but
the user absolutely cares about. The tool handles it the same way:
give the user a slider, let them weight it, provide editorial
framing, and make scores editable.

---

## RV → DV Mapping Detail

### 1. Selectivity

**What feeds in:**
- Median LSAT, LSAT 25th/75th (RV from ABA 509)
- Median GPA, GPA 25th/75th (RV from ABA 509)
- Acceptance rate (RV from ABA 509)
- Total applicants (RV from ABA 509 / LSAC)
- Yield rate (derived)

**What does NOT feed in (commonly confused):**
- US News rank — that's Prestige, not Selectivity. A school can be
  selective without being highly ranked (e.g., Yale accepts ~6% but
  so do some unranked programs with tiny classes).

**Normalization:** percentile rank against all ABA schools. Higher
selectivity = higher score.

### 2. Employment Outcomes

**What feeds in:**
- BigLaw placement (firms 501+) (ABA 509)
- Federal clerkship rate (ABA 509)
- BigLaw + FC combined (LST)
- JD-required employment rate (ABA 509)
- Bar-required employment rate (ABA 509)
- Unemployment rate (ABA 509)
- Bar passage rate (ABA 509)
- Government placement rate (ABA 509)
- Public interest placement rate (ABA 509)

**Key insight from research:** The author doesn't treat BigLaw
placement as universally desirable — as a FLEP officer, their
post-grad path is JAG. Employment outcomes matter as a signal of
school quality and as optionality for post-service career. The
dimension should weight breadth of outcomes, not just BigLaw rate.

**Normalization:** composite of BigLaw+FC rate (for BigLaw-seeking
users) and JD-required rate (for everyone). User's stated career
goal shifts the internal weighting.

### 3. Cost & Value

**What feeds in:**
- Tuition (resident and nonresident) (ABA 509)
- Median grant amount (ABA 509)
- Percentage receiving grants (ABA 509)
- Percentage receiving full tuition (ABA 509)
- Median debt at graduation (ABA 509)
- Cost of living index for school's city (BLS)
- Total cost of attendance (LST)

**Key insight from research:** Cost is both a **hard constraint**
(Army tuition cap = binary yes/no) and a **gradient** (COL in SF
vs. Nashville). The tool should support dealbreaker-style cost
filters AND a continuous cost dimension.

**Normalization:** inverse — lower net cost = higher score. Adjust
for COL. Scholarship generosity matters more than sticker price.

### 4. Geographic Strength

**What feeds in:**
- Primary state of employment for graduates (ABA 509)
- Breadth of employment across states (ABA 509)
- City/state of school (school data)
- Regional legal market size (BLS)
- Alumni geographic distribution (partial — school/LST data)

**Key insight from research:** The author needed Berkeley for West
Coast network, Georgetown for DC network, Vanderbilt for
South/Midwest. Geographic strength is about WHERE the degree
works, not just WHERE the school is.

**Normalization:** match against user's stated target geography.
Broader geographic reach = higher base score; perfect match to
target = bonus.

### 5. Academic Quality

**What feeds in:**
- Student-faculty ratio (ABA 509)
- Full-time faculty count (ABA 509)
- 1L class size (ABA 509)
- Clinic count (school websites)
- Journal count (school websites)
- Library volumes (ABA 509)
- Section/mod structure (school data)
- Specialty program rankings (US News)
- Cross-disciplinary opportunities (university data)
- Study abroad options (school data)

**Key insight from research:** Faculty accessibility matters as much
as faculty brilliance. "Berkeley faculty is incredibly gifted...
but less accessible." Small sections (mods) vs. large lectures
matters. These are hard to quantify but real.

### 6. Prestige & Reputation

**What feeds in:**
- US News overall rank
- US News peer assessment score
- US News lawyer/judge assessment score
- Specialty rankings
- T14/T10/T6 tier membership
- General reputation / "name" value

**Key insight from research:** Prestige interacts with personal
background. "Infantry Officer from West Point with Berkeley Law"
has a different signal than "Infantry Officer with Vanderbilt Law."
The tool can't capture this interaction, but it can surface the raw
prestige data and let the user weight it.

### 7. Culture & Community

**What feeds in:**
- Grading system (pass/fail, curve type)
- Collaborative vs. competitive reputation
- Veteran enrollment / military-friendly
- Student body diversity
- Political/ideological lean
- Community tightness (class size as proxy)

**Key insight from research:** "Collaborative" and "competitive"
are the dominant axis. Grading system is a strong proxy: pass/fail
= collaborative, harsh curve = competitive. Veteran community
is a sub-variable that matters enormously to some users and not
at all to others — surface it but don't force it into the main
score.

### 8. Quality of Life

**What feeds in:**
- City climate/weather
- Nightlife/social scene quality
- Housing affordability and quality
- Dating market (yes, really — the author listed it)
- Proximity to family
- Travel accessibility
- City familiarity

**Key insight from research:** This is the "where do I want to live
for 3 years" dimension. It's deeply personal and poorly served by
any dataset. The tool should provide the data it can (weather, COL,
city stats) and make everything else editable.

### 9. Growth & Fit

**What feeds in:**
- Comfort zone disruption (moving to a new city vs. staying home)
- "What person I want it to make me" (author's framing)
- School's "vote of confidence" in admitting you
- Excitement / gut feeling from visit
- Extracurricular engagement likelihood
- Diversity of thought exposure

**Key insight from research:** This is the least quantifiable and
most important dimension. The author chose Berkeley over Vanderbilt
substantially because of growth. The tool handles this by:
1. Giving it a slider (so the user can weight it to 0 if they
   don't care, or to max if it's their tiebreaker)
2. Making scores fully editable (the user knows their own growth
   needs better than any algorithm)
3. Providing editorial framing in the school detail sheet
4. Surfacing it in sensitivity analysis ("if you weighted growth
   20% higher, these schools move up")

---

## Schema Implications

### New variables needed in catalog

The current `migrations/0001_school_schema.sql` covers most of
the observable RVs through `school_metrics` and `observations`.
Gaps to add:

1. **Grading system** — `grading_system TEXT` on `schools` table
   (values: 'pass_fail', 'curved', 'modified_curve', 'other')
2. **Curve details** — variable in catalog: `curve_median_gpa`,
   `curve_type`
3. **Section structure** — variable: `first_year_section_size`,
   `first_year_section_type` ('mod', 'section', 'plenary')
4. **Veteran enrollment** — variable: `veteran_enrolled_count`,
   `veteran_club_exists`
5. **Study abroad count** — variable: `study_abroad_programs_count`
6. **Dual degree programs** — variable: `dual_degree_count`
7. **Political lean** — variable: `political_lean_index` (if data
   exists from surveys; otherwise editorial only)
8. **City climate index** — variable in external dataset
9. **City COL index** — variable in external dataset

### Migration needed

A `0002_culture_academics.sql` migration to add:
- `grading_system TEXT` to `schools`
- Additional variables to the `variables` catalog
- No structural changes to `observations` — it already supports
  arbitrary variables via `variable_id`

### Frontend implications

- 9 weight sliders instead of 8
- "Growth & Fit" slider needs editorial framing ("How much do you
  want to be challenged? How important is it that this school
  pushes you out of your comfort zone?")
- Culture & Community needs sub-filters (grading system, vet
  community) that can be dealbreakers
