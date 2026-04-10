# LawSignal — Design System

> A design.md for AI agents and human contributors. When generating UI
> for LawSignal, read this first. When in doubt, read it again.

## 1. Identity in one paragraph

LawSignal is editorial legal-education reference, not a SaaS product.
Its visual neighborhood is ABA 509 disclosures, Law School
Transparency reports, US News methodology pages, and Spivey
Consulting's public analyses. It is meant to feel like something a
pre-law advisor could open without rolling their eyes and an applicant
could trust with a six-figure, career-shaping decision. The typography
does identity work, not just hierarchy work. The restraint is the
brand.

If a UI choice would not feel at home in a printed law journal but
would feel at home in a B2B SaaS dashboard, it is wrong.

## 2. The four anchors

Every design decision should serve at least one of these. If it
serves none, cut it.

1. **Credibility** — earn the trust the decision requires
2. **Clarity** — one thing to do at a time, in order
3. **Calm** — a person making a hard decision should feel less
   anxious after using this, not more
4. **Discovery** — surface schools and ideas the user didn't know to
   ask for, without ever feeling like a marketing pitch

## 3. Typography

Three families, each with one job. Never substitute, never add a
fourth.

```
--font-display: 'Cormorant Garamond', Georgia, serif
--font-body:    'Crimson Pro', Georgia, serif
--font-mono:    'JetBrains Mono', 'Courier New', monospace
```

### Roles

| Family | Purpose | When to use |
|---|---|---|
| Cormorant Garamond | Display, hero, school names, section titles | Anywhere a pre-law advisor might glance and judge the seriousness |
| Crimson Pro | Body text, editorial profiles, descriptive copy | Anything meant to be read, not skimmed |
| JetBrains Mono | Labels, chips, metadata, scores, ornaments | Anything structural, exact, or instrumented |

### Scale

- Hero / school name: 28–40px Cormorant Garamond, weight 400, line-height 1.1
- Section title: 18–22px Cormorant Garamond, weight 500
- Body: 14–16px Crimson Pro, weight 400, line-height 1.55
- Editorial profile: 15px Crimson Pro, weight 300 italic for tradeoffs
- Mono label: 9–11px JetBrains Mono, weight 400, letter-spacing 0.13–0.20em, UPPERCASE
- Mono inline: 10–13px JetBrains Mono, weight 400, no transform

### Rules

- Body text uses Crimson Pro at no smaller than 13px. Mono can go to 9px.
- Letter-spacing is generous on all mono uppercase labels: 0.13em
  minimum, 0.20em for ornaments.
- Cormorant Garamond is never bold above weight 500. Heavier weights
  look wrong.
- Italics in Crimson Pro are reserved for editorial voice
  ("tradeoffs", "why this school", paraphrased commentary). Italics
  elsewhere is wrong.
- Numbers in school scores, tuition, medians, and metadata use
  JetBrains Mono so they align in tables and feel instrumented.

## 4. Color

Restrained. Used as semantic markers, not decoration.

### Paper / ink (the substrate)

```
--color-paper:   #FAFAF7   /* default background */
--color-paper-2: #F4F2ED   /* hover, raised panel */
--color-paper-3: #EDE9E1   /* pressed, disabled fill */
--color-ink:     #18160F   /* primary text */
--color-ink-2:   #3D3A30   /* secondary text */
--color-ink-3:   #6B6658   /* tertiary text */
--color-ink-4:   #9C9585   /* quaternary, captions */
--color-rule:    #DED9CF   /* borders */
--color-rule-2:  #CBC5B8   /* stronger borders */
```

### Accents (semantic only — never decorative)

```
--color-gold:        #A8832A   /* primary accent: priority, primary action, top-tier emphasis */
--color-gold-lt:     #C9A84C   /* hover state of gold */
--color-gold-pale:   #F7F0DC   /* gold backgrounds, edited-score chrome */
--color-gold-deep:   #7A5E18   /* gold text on pale backgrounds */
--color-scarlet:     #8B1A1A   /* warning, dealbreaker, "filtered out" */
--color-scarlet-pale:#FDF0F0
--color-cobalt:      #1A2E5A   /* compare, secondary action, navigation */
--color-cobalt-pale: #EEF3FA
--color-forest:      #1C3D2A   /* success, "saved", confirmations */
--color-forest-pale: #EBF5EF
```

### Color rules (not negotiable)

- Background is always paper (#FAFAF7). Never pure white. Never gray.
- Text is ink, ink-2, ink-3, or ink-4 — never pure black, never blue links.
- Gold is the ONLY primary action color. Cobalt is secondary actions only.
- Scarlet means warning or removal. It never means "primary CTA."
- Forest means saved / committed / confirmed. It never means "go."
- Pale variants are for backgrounds only. Deep variants are for text on pale backgrounds.
- No gradients. No shadows beyond the existing button hover (0 4px 14px).
- Borders are always `--rule` or `--rule-2`. Never custom hex.
- A screen with more than 3 accent colors is wrong. Pick which two are doing work.

## 5. Spacing (rhythm, not values)

Spacing is a rhythm, not a token table. The rule is editorial generosity.

- Section gap (between major panels): 22–28px
- Internal panel padding: 18–22px
- Row gap (between school cards, list items): 10–14px
- Inline gap (between chips, labels, icons): 6–10px
- Section title to first content: 12–16px
- Border radius: 2–3px almost always. NEVER 8px+ except buttons.
  Editorial UIs do not have rounded corners.

If a layout feels cramped, the answer is more padding, not smaller text.
If a layout feels sparse, the answer is more content, not more padding.

## 6. Layout

### Grid

- Max content width: 920–980px on desktop, full-bleed below 1024px
- Sidebar: 340px fixed on desktop (>=1024px), bottom sheet on mobile
- Header: 56px fixed
- Editorial gutter: 22–28px between sidebar and main

### Anatomy of a screen

```
+---------------------------------------------------+
| Header (56px, fixed)                              |
+----------+----------------------------------------+
| Sidebar  | Main                                   |
| (340px,  | - Section title (Cormorant)            |
|  fixed)  | - Subtitle / editorial line (mono)     |
|          | - Content                              |
|          | - Ornament divider                     |
|          | - Next section                         |
+----------+----------------------------------------+
```

### Breakpoints

- 1024px+: sidebar visible, main content max 920–980px
- 640–1023px: sidebar collapses to overlay, main full-width
- <640px: sidebar becomes bottom sheet, content stacks, mono labels stay readable (min 10px on mobile)

## 7. Ornaments (the pattern that makes it editorial)

The single most distinguishing visual pattern in LawSignal is the
**section ornament**: a thin rule with a centered mono uppercase
label. It's the print typography move that says "this is structured
editorial content, not a wireframe."

```
-----------------  SELECTIVITY  -----------------
```

Use ornaments to:
- Open every major section
- Separate logical groups inside a panel
- Mark the start of editorial copy in school detail sheets

Do NOT use ornaments to:
- Decorate empty space
- Replace section titles
- Appear inside form rows or inline

Implementation: existing `Ornament` component, JetBrains Mono 9px,
0.20em letter-spacing, ink-4 color, --rule line on both sides.

## 8. The trust layer (visible above the fold on the landing modal)

LawSignal earns trust the way editorial reference does — by stating
its independence, sourcing, and methodology in plain editorial voice.
Never with social proof. Never with "trusted by." Never with metrics.

The four trust signals, in order of importance:

1. **Free.** Nothing to buy, no email capture, no upsell.
2. **Independent.** No school paid to be ranked or to soften copy.
3. **Sourced.** Public sources, named: ABA 509 disclosures, US News,
   Law School Transparency, NALP, LSAC.
4. **Transparent.** Methodology visible, scores editable, built to be
   argued with.

The canonical placement on the landing modal:

```
                    --- L A W S I G N A L ---

      Choose a law school the way a mentor would teach you to.

   Free. Independent. No school paid to be ranked or to soften copy.
       200+ ABA-accredited schools. Public sources: ABA 509,
             US News, Law School Transparency, NALP, LSAC.
   Methodology visible. Scores editable. Built to be argued with.

                        -------------------

           [ I'm building an apply list ]    [ I'm choosing between offers ]

                  Built by a Berkeley Law student.
```

The author byline carries enough institutional signal to read as
authentic without making the author personally searchable. See
`docs/DECISIONS.md` D-001 for the reasoning and the conditions under
which to revisit naming.

## 9. Components

### Buttons

Three variants, no more.

| Variant | Purpose | Visual |
|---|---|---|
| `next-btn dark` | Primary action (commit, save, continue) | ink fill, paper text |
| `next-btn gold` | Emphasis primary (rare — landing CTA, "Start your ranking") | gold fill, paper text |
| `next-btn ghost` | Secondary action (cancel, back, dismiss) | transparent, ink-3 text, rule border |

Mono 10–11px, UPPERCASE, 0.13em letter-spacing, padding 12px 26px,
border-radius 2px. Hover adds box-shadow 0 4px 14px and a slightly
lighter background. No transitions over 200ms.

Anti-pattern: a third tier of "tertiary" or "tertiary outline"
buttons. If you need three button hierarchies, your screen has too
many actions.

### Badges / chips

- Mono 9–10px, UPPERCASE, 0.07–0.13em letter-spacing
- Border-radius 2px (NEVER pill shape)
- Padding 3px 9px
- Backgrounds: paper-2 default, accent-pale for semantic chips
- Border: 1px solid rule or accent

Variants: default, gold (priority), forest (saved), scarlet
(excluded), cobalt (compare), outline (neutral).

### Cards (school rows)

- Paper background, rule border, 2–3px radius
- Score badge on the left edge as a colored strip (tier-coded)
- School name in Cormorant Garamond 18–22px
- Location/type subtitle in Crimson Pro 13px italic ink-3
- Metadata row in JetBrains Mono 10px ink-4
- Hover: paper-2 background, no scale, no transform
- Click: open SchoolDetailSheet (slide-over from right)

### Sliders (priority weights)

- Track 4px tall, paper-3 background
- Thumb 18px gold circle with 2px white border, drop shadow
- Filled portion: gold gradient
- Zero state: thumb becomes rule-2 (gray) — visual signal that this
  dimension is off
- Hover: thumb scales to 1.2

### Toggles

- 38x21px track, paper-3 off / scarlet on
- 13px thumb, white, smooth slide
- Use scarlet for "dealbreaker" toggles only — semantic, not aesthetic
- For other on/off states, use the cobalt outline variant

### Inputs

- 1px rule border, 2px radius, paper-2 background
- Focus state: gold border, gold-pale background, gold-deep text
- Mono 11px for score edits and numeric inputs
- Crimson Pro 14px for free text inputs
- "Dirty" / edited state: gold border + gold-pale background — signals
  the user has overridden a system value

### Detail sheets (slide-over)

- Slide in from right, 280ms ease, max 720px wide
- Full-width on mobile
- Header with school name (Cormorant), close button (top-right ghost)
- Tabbed sections: Overview / Scores / Employment / Cost
- Escape closes; click-outside closes
- Always above main content (z-100); modals above sheets (z-200)

## 10. Motion

Motion is restrained editorial, not playful product. No spring
physics. No bounce. No parallax.

- Default ease: `cubic-bezier(0.16, 1, 0.3, 1)` — slow-out, fast-in, calm
- Step transitions (questionnaire screens fading in): 400ms
- Card / row reveals: 280ms
- Hover state changes: 150–180ms
- Sheet slide-in: 280ms
- Score bar fill: 650ms (the one place where slow motion serves
  credibility — the bar fills like results being calculated, not
  animated for fun)

Anti-patterns: scroll-jacking, parallax, anything spring-based,
anything that bounces, page transitions over 500ms.

## 11. Iconography

LawSignal does not use an icon library. Icons appear sparingly and
only where a glyph adds meaning a label cannot:

- ★ (saved, U+2605)
- ✓ (confirmed, U+2713)
- x (close, multiplication sign U+00D7)
- ▾ ▴ (disclosure, geometric U+25BE / U+25B4)
- ─ (rules, ornaments, U+2500)

If you reach for a custom SVG icon, ask first whether a JetBrains
Mono label would serve the same purpose. It usually does.

Anti-pattern: importing lucide-react, heroicons, or any icon set.
They make the UI feel like a product. LawSignal isn't a product,
it's a reference.

## 12. Voice

The same restraint applies to copy. Voice is editorial-direct.

- **Active over passive.** "We weight your priorities" not "Your
  priorities are weighted."
- **Concrete over abstract.** "200+ ABA-accredited schools scored"
  not "Comprehensive law school database."
- **Numbers when they help.** "Saved 4 schools" not "You've saved a
  few schools."
- **Plain English over jargon — except where the jargon is the
  vocabulary the user needs to learn.** "Median LSAT" stays.
  "BigLaw+FC rate" stays. "Bar passage" stays. "Holistic admissions
  ecosystem" never appears.
- **Never address the user as "you" twice in a row.** Editorial voice
  talks about the situation, not at the reader.
- **Never use marketing intensifiers.** "Comprehensive," "powerful,"
  "intuitive," "seamless," "world-class" — all forbidden.
- **Never use emoji in product copy.** Not even one. Editorial
  registers don't.

### Tone targets

| Surface | Tone |
|---|---|
| Landing modal | Direct, calm, one promise |
| Onboarding questions | Quiet recognition of the situation. Never "we know it's hard." Closer to "this is the step where you decide what you actually want before looking at the options. Take your time." |
| Section labels | Mono uppercase, structural |
| Editorial profiles (per school) | Foreign Affairs paragraph, no listicle bullets |
| Empty states | A reason and a next step, never "oops" |
| Errors | A reason, never blame |
| Success states | Quiet acknowledgment, never celebration |

### Canonical copy examples

- **Landing headline**: "Choose a law school the way a mentor would teach you to."
- **Welcome modal sublines** (any of these — keep one):
  - "The information law school admissions assumes you already have."
  - "Pick your priorities. Then pick your schools."
- **Mode screen**: "Where are you in this?" (no encouragement, no explanation)
- **Priorities intro**: "Before you look at schools, name what matters. The list will rank itself against your priorities, not the other way around. Take your time."
- **Reveal (Apply mode)**: "Here are 200+ ABA-accredited schools, ranked by what you said matters. Save the ones worth a closer look — for the apply list, the shortlist, or the conversation with someone you trust."
- **Reveal (Decide mode)**: "Here are the schools you're choosing between, ranked by what you said matters."
- **Save acknowledgment**: "Four schools saved. Compare them side-by-side, or keep browsing."
- **Empty state (no schools match)**: "No schools match these filters. Loosen one, or remove a dealbreaker."
- **Sensitivity hint**: "If you weighted employment outcomes 20% higher, two schools move up."

### Anti-examples (do not write like this)

- "You're all set!"
- "Awesome! Let's find your perfect law school."
- "Our powerful scoring engine analyzes..."
- "Discover your dream law school match."
- "Stop guessing."
- "Trusted by thousands of pre-law students."
- "Find the best law school for YOU in 60 seconds."

## 13. Patterns specific to LawSignal

These are the patterns that make it LawSignal and not a generic
ranking app. Preserve them.

### a. Priorities before options

Every flow that culminates in a ranking presents priorities BEFORE
schools appear. The user articulates what matters before they see
what's available. This is the mom-rule and it's load-bearing. Never
tease results before priorities are set — that teaches users to
reverse-engineer their priorities to match a preordained list, which
is the bias LawSignal exists to prevent.

### b. Editable scores everywhere

Any number LawSignal computes can be overridden by the user. Edited
values get gold-pale backgrounds and persist across sessions. The
ability to disagree with the tool is the tool.

### c. The ornament between sections

Every section change is marked by a mono-label rule. This is the
print typography move that distinguishes editorial UI from SaaS UI.

### d. Tier-coded score badges

School scores are color-coded by tier with a vertical strip, not a
star rating or a number-only badge. The strip says "this school is
in tier X" without requiring the user to read the number.

### e. Mono for metadata, serif for meaning

Anything instrumental (score, median LSAT, median GPA, tuition,
bar passage rate, BigLaw+FC rate) is in JetBrains Mono. Anything
human (school name, why this school, tradeoffs) is in Crimson Pro
or Cormorant Garamond. The eye learns this rhythm and trusts it.

### f. Sensitivity panel — not a feature, a teaching moment

The sensitivity analysis isn't a power-user feature buried in
advanced. It surfaces at the moment the user's ranking is sensitive
to one priority — "if you weighted employment outcomes 20% higher,
two schools move up." This is how the tool earns the user's trust in
the methodology. Surface it inline at the right moment, not in a
sidebar tab.

## 14. Inline vs modal — the rule

| Moment | Pattern | Why |
|---|---|---|
| Landing -> start the flow | **Modal** | Commitment, focus, framing |
| Inside the questionnaire | **Inline** (full-screen step transitions) | Momentum, calm |
| Filter / priority adjustment | **Inline** (sidebar) | No interruption to a thinking user |
| School detail | **Inline slide-over** (right sheet) | Context preserved, dismissable |
| Save shortlist / share / export | **Modal** | Conversion moment, justified interruption |
| Compare 2–4 schools | **Full-screen view** (not a modal) | Decide mode is its own room, not an overlay |
| Onboarding (returning users) | **Nothing** | The flow is once. Don't replay it. |

If you find yourself reaching for a modal mid-flow, ask: is this a
commitment moment, or am I just interrupting? If the second, make it
inline.

## 15. Anti-patterns (the things that would ruin it)

Things that, if they appeared, would tell us we drifted into SaaS-land:

- Pure white background (#FFF). Always paper.
- A "primary blue" or "brand blue." Cobalt is for compare and
  navigation only.
- Pill-shaped chips or buttons (border-radius >= 12px).
- Lucide / heroicons / any icon library.
- Emoji in product copy.
- Drop shadows beyond the button hover.
- Gradients (except the one on the priority slider track).
- Hero images, illustrations, or stock photography.
- "Get started for free" buttons (it's already free; no "get").
- Multiple CTAs above the fold competing for the eye.
- Spinners. Use a "Calculating..." mono label or fade the previous state.
- Tooltips that explain decoration. Tooltips only explain meaning.
- Bouncy or springy animations.
- Toast notifications. Use the existing inline acknowledgment pattern
  (gold-pale background flash, fades after 2.2s).
- "Pro tips" or coachmark overlays.
- Typeform-style "press Enter to continue" cuteness.
- Sticky bottom action bars on desktop.
- Scroll-jacking, parallax, or any animation tied to scroll position.
- Email capture for "get updates" or any kind of newsletter signup.
- Social proof phrasing ("trusted by", "used by", "X students agree").
- "60 seconds" / "instant" / "AI-powered" / any speed-or-magic claim.
- Teasing results before priorities are set.

## 16. The test

When in doubt about a UI choice, ask:

> Would this look at home in a Law School Transparency report, an ABA
> 509 disclosure, a Spivey Consulting analysis, or a serious editorial
> treatment of legal education?

If yes, ship it.
If no, redesign it.
