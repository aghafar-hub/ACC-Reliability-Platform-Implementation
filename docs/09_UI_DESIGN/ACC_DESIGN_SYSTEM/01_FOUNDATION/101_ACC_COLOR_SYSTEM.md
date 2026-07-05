# ACC Reliability Platform
# 101_ACC_COLOR_SYSTEM.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-101 |
| Title | ACC Reliability Platform — Color System |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md |
| Source | `reference/brand/ACC_Official_Logo.png` — the only source of brand color. No color in this document is derived from Material Design, Tailwind, Bootstrap, or any generic template. |

---

## Logo Analysis (source of truth)

The official ACC logo contains exactly three colors, and no others:

1. A deep navy/indigo blue block — the dominant field of the mark, carrying the company name.
2. A confident, clean mid-green olive branch — a single accent element, not a field.
3. White — used only as text and background, never as a color decision in its own right.

There is no third accent color, no gradient, and no secondary hue anywhere in the logo. This is deliberate restraint, and the platform's color system inherits that same restraint: **two brand colors, used for two different purposes, and nothing else invented alongside them.**

---

## 1. Brand Color Philosophy

Color in the ACC Reliability Platform represents authority and clarity, not decoration.

- The platform's color identity is not chosen — it is **inherited** from the ACC logo. Nothing here is a fashion or trend decision.
- Blue is the platform's dominant identity because it is the dominant field of the logo. It says: *this is ACC, this is the authority operating this instrument.*
- Green appears only as the logo's accent, and is used the same way in the platform — as an accent, never as the platform's dominant identity, and never repurposed to mean "normal" or "success" merely because it happens to be green (see Section 4).
- Every other color in the platform (status reds, ambers, grays) exists to carry engineering meaning, not brand meaning. Brand color and meaning color are always kept conceptually separate, even where they may coincidentally share a hue family.

---

## 2. Primary Brand Color

**Source:** the deep navy/indigo blue field of the ACC logo.

This is the platform's dominant identity color. It is what makes any screen immediately recognizable as *the* ACC Reliability Platform, before a user reads a single word.

**Usage:**
- Global navigation and sidebar
- Header / top command surfaces
- Active/selected controls (the currently active nav item, an engaged toggle, a focused primary action)
- Any element whose job is to say "this is the platform," not "this is a piece of data"

**Rules:**
- The primary brand blue is an identity color, not a status color. It must never be reused to mean "informational alert" (see Section 4) — those are related but distinct roles, and conflating them would make the platform's own chrome look like it's constantly signaling something to the user.
- The primary brand blue appears once, consistently, as the platform's frame — it does not vary module to module.

---

## 3. Secondary Colors

Secondary colors exist to hold content, not to express identity. They are quiet by design so that equipment data and status colors are what draw the eye.

- **Backgrounds (canvas):** a near-neutral, very light tone — the page must read as calm working space, not as another brand statement.
- **Panels / Cards:** a clean surface tone, distinct enough from the canvas to show separation, without introducing a new hue.
- **Borders / dividers:** the quietest tone in the system — present only to organize, never to decorate.

Secondary colors are always neutral-leaning. They may be tinted very slightly toward the primary blue's undertone so the whole interface feels like one coherent instrument, but they must never be bright, saturated, or attention-seeking. Their entire job is to recede.

---

## 4. Semantic Colors

Semantic colors carry engineering meaning. They are the platform's most important colors because a wrong or inconsistent semantic color can lead to a wrong decision.

| Semantic role | Meaning | May be used when |
|---|---|---|
| **Alert** | Immediate engineering risk — equipment, sample, or action requires urgent attention | Only for genuine alert conditions — never for emphasis, never for "important but not urgent" |
| **Caution** | Elevated risk or a condition trending toward alert | Warning-level findings, approaching deadlines, degraded-but-functioning states |
| **Normal** | Acceptable, in-compliance condition, within normal parameters | Only when a condition is genuinely within normal parameters — never used decoratively to make a screen feel positive |
| **Information** | Neutral, non-urgent status or process state | Workflow/process states (e.g. "pending," "in review") that carry no risk judgment |
| **Disabled** | Not applicable, not yet available, or intentionally inactive | Controls or data that cannot currently be acted on |

**Important rule:** the "Normal" semantic color is *not* the same token as the brand accent green from Section 2, even though both are green. Brand green answers "whose platform is this" (constant, identity-level). Normal green answers "is this equipment okay right now" (variable, data-level). They must remain independently definable — a future change to the brand accent must never accidentally change the meaning of "Normal," and vice versa.

The same reasoning applies to Information: it is a distinct, purpose-built blue — not a reuse of the primary brand navy — because the brand navy must remain a constant identity marker, not a status signal.

**Note:** "Alert," "Caution," and "Normal" describe an equipment or record's current **Condition Status** only. They are never used to describe **Equipment Criticality** (Critical / Important / Standard), a separate, independent concept defined in 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md §7. This document does not assign colors to Equipment Criticality; that remains a future extension, not defined here.

---

## 5. Neutral Palette

A grayscale range, cool-leaning (very slightly toward the brand blue's undertone rather than warm/yellow-leaning), used for:

- **Text** — from primary (near-black, highest contrast) through secondary (muted, for supporting text) to placeholder/disabled text.
- **Dividers** — the lightest, quietest step in the scale.
- **Surfaces** — canvas and panel tones (see Section 3), expressed as steps within this same neutral scale so the whole platform feels tonally unified.
- **Disabled controls** — a fixed, low-emphasis step reserved only for "not currently actionable" — never reused for anything else.

The neutral palette exists so that color is scarce and meaningful. If most of a screen is neutral and only equipment condition and required actions carry color, the platform is working as intended.

---

## 6. Status Color Rules

Every module uses the same five semantic colors from Section 4. No module defines its own color meaning. This table exists to make that explicit per domain:

| Domain | Alert | Caution | Normal | Information | Disabled |
|---|---|---|---|---|---|
| **Equipment** | Failure imminent / shutdown-level condition | Degrading condition, needs monitoring | Operating within normal parameters | N/A (equipment is never merely "informational") | Decommissioned / out of scope |
| **Oil Samples** | Lab result indicates alert-level contamination/wear | Result trending toward limit | Result within normal range | Sample submitted / awaiting lab, no risk judgment yet | Sample cancelled/superseded |
| **Actions** | Action severely overdue | Approaching due date | Completed / closed correctly | Open, not yet due | Cancelled / not applicable |
| **Notifications** | Requires immediate acknowledgment | Should be reviewed soon | N/A (a notification is rarely "normal," it is resolved or dismissed) | General/system notice | Dismissed / expired |
| **Approvals** | Rejected / blocked | Pending with a risk flag | Approved | Pending, no flag | Withdrawn / not applicable |
| **Routes** | Missed high-priority stop | Behind schedule | On schedule / completed | Route not yet started | Route disabled/inactive |
| **Reliability** | Asset in alert-level reliability risk band | Asset trending into risk | Asset within acceptable reliability band | Baseline/monitoring data, no judgment yet | Not yet assessed |

Where a domain has no natural fit for a given semantic role (marked N/A above), that role is simply not used in that domain — a domain must never invent a substitute meaning for it.

---

## 7. Charts

Charts are engineering instruments, not illustrations. Their color rule is strict and ordered:

1. **Semantic colors first.** If a chart represents equipment condition, contractor risk, action status, or any other concept with an established semantic meaning (Section 4), it uses those exact semantic colors — an "Alert" slice is always the Alert color, everywhere, in every chart, in every module.
2. **Brand colors second.** Only when a chart has no semantic dimension at all (for example, a single neutral trend line with no condition being judged) does it fall back to the primary brand blue as its default mark color.
3. **Never a decorative palette.** Charts must never introduce an arbitrary multi-color palette chosen for visual variety. If a chart would require more distinct colors than the semantic system provides, that is a signal the chart is trying to show too many concepts at once — not a reason to invent new colors.

A user must be able to look at any chart in any module and already know what each color means, because they learned it once, from the semantic system, not from that chart.

---

## 8. Accessibility

- All text and status color must meet at least WCAG AA contrast against its background (4.5:1 for normal text, 3:1 for large text and meaningful graphical elements).
- **Color is never the only indicator of meaning.** Every semantic color must be paired with a label, icon, or text that would still convey the same meaning if viewed without color (e.g., color-blind users, printed reports, low-brightness displays in the field).
- This applies without exception to Alert status — an alert condition must never rely on "the user noticed it was red."

---

## 9. Dark Theme

The platform's identity must remain unmistakably the same instrument in dark theme — only the surfaces invert, not the meaning.

- The primary brand blue remains the platform's identity marker but is used as an accent/text/icon tone against dark surfaces rather than as a filled field everywhere, so it stays legible without glaring.
- Dark surfaces are near-black with the same cool undertone as the light-theme neutrals — never a pure flat black, and never warm.
- Semantic colors (Alert, Caution, Normal, Information) keep their exact meaning and general hue identity, adjusted only in lightness/saturation so they remain readable and correctly contrasted on dark surfaces. An Alert condition is still unmistakably the same "Alert" a user recognizes from light theme.
- The green brand accent remains rare and deliberate — it does not become more prominent simply because dark surfaces make color pop more.

---

## 10. Light Theme

Light theme is the platform's default, everyday presentation.

- Primary brand blue is dominant in navigation/header/active-state surfaces, exactly as described in Section 2.
- Canvas and panels use the light, cool-neutral tones from Sections 3 and 5 — calm, quiet, never stark white without any structure.
- The green accent appears only where the identity documents call for brand presence (e.g., logo-adjacent marks), not scattered through the interface.
- Semantic colors carry their full, undiluted meaning against the light neutral background — this is the reference condition every other theme is checked against.

---

## 11. Forbidden Colors

The following must never appear anywhere in the platform, because they are not derived from the ACC logo and they undermine the platform's authority:

- Any color sourced from Material Design, Tailwind, Bootstrap, or any other generic UI framework's default palette.
- Bright, saturated "SaaS" gradients (e.g., purple-to-pink, teal-to-blue decorative gradients).
- Neon or overly saturated variants of any color, semantic or brand — the platform is calm and authoritative, not vibrant.
- Arbitrary "chart palette" colors not tied to a semantic meaning (see Section 7).
- Any hue not present in, or directly derived from, the ACC logo's navy and green — no purple, no teal, no pink, no orange, unless and until it is formally adopted as a new semantic role through this document, not invented ad hoc by a module or a screen.
- Using the brand green for anything that is not (a) brand identity presence or (b) the specifically defined Normal semantic — it must never be used simply because "green looks nice here."

---

## 12. Examples

**Correct:**
- The sidebar and header use the primary brand navy, consistently, in every module — a user always knows they are inside the ACC platform.
- An Alert equipment row is the same Alert red whether it appears in Oil Analysis, Vibration, or Reliability Engineering.
- A donut chart showing equipment condition uses Alert/Caution/Normal exactly as defined, with no additional colors invented to make the chart "look fuller."
- A pending approval is shown as an Information-blue chip alongside the word "Pending," so the meaning survives even without color.

**Incorrect:**
- A module introduces its own "brand teal" accent because a designer liked it — this is forbidden; there is no teal in the ACC logo.
- A dashboard uses the brand green to mean "this number is good" in one place and the Normal-status green in another, as if they were the same token — this conflates identity and meaning and is forbidden.
- A chart uses six different bright colors for six categories with no semantic basis — forbidden decorative palette.
- An Alert status is shown only as a red dot with no text or icon — forbidden, because color is the only indicator.
- The primary brand navy is used to also mean "informational" on a notification — forbidden, because it collapses identity and semantic meaning into one color.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — color system derived from analysis of `reference/brand/ACC_Official_Logo.png`. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: condition-status semantic role renamed "Critical"→"Alert" and "Healthy"→"Normal" throughout, per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. "Critical" is now reserved exclusively for Equipment Criticality (not colored here). No philosophy, rule, or content added/removed. |
