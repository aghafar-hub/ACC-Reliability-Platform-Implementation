# ACC Reliability Platform
# 102_ACC_TYPOGRAPHY_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-102 |
| Title | ACC Reliability Platform — Typography Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, report, and feature — desktop, tablet, mobile, print |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md |
| Scope Note | This is an engineering typography *language* — hierarchy, categories, and usage rules. It does not select a font family, and it does not discuss color, icons, components, or implementation. |

---

## 1. Typography Philosophy

Typography is not decoration in engineering software — it is the primary tool by which the platform tells an engineer what matters most, in what order, at a glance, under time pressure, and after hours of continuous use.

A reliability engineer reads this platform under real working conditions: long shifts, dense tables, urgent decisions, glare from a phone screen in the field, a printed report handed to a manager. Typography must perform correctly in every one of those conditions, not just in a clean screenshot.

The typography of the ACC Reliability Platform must feel:

- **Professional** — it reads like instrumentation and engineering documentation, not like a marketing site.
- **Technical** — it favors clarity and precision over personality.
- **Confident** — weight and size are used deliberately to state facts, not to hedge or decorate.
- **Calm** — nothing shouts unless something genuinely requires urgent attention; visual noise is the enemy of a fast correct decision.
- **Precise** — every character serves the reading of a fact (an ID, a value, a status) exactly as it is, with zero ambiguity.
- **Long-hour readable** — legible and low-fatigue across an entire shift, on desktop, tablet, and mobile alike.

Typography in this platform must **never** be playful, trendy, whimsical, or decorative. If a typographic choice would suit a consumer app, a marketing page, or a lifestyle brand, it does not belong here.

---

## 2. Font Categories

The platform recognizes a fixed set of typographic categories. Every piece of text in every module must be assigned to one of these categories — never to an ad hoc size or weight invented for a single screen. (Font families are intentionally out of scope for this document; categories only.)

| Category | Purpose |
|---|---|
| **Display** | The platform's own identity mark and rare, top-level statements (e.g., the platform name in the outermost shell). Used sparingly — this is not a category for everyday screens. |
| **Heading** | Module and screen-level titles — tells the user what part of the platform, and what subject, they are looking at. |
| **Section** | Titles of panels, widgets, and grouped content within a screen — organizes a screen into its working parts. |
| **Body** | The default reading category for prose, descriptions, form labels, and general content — the workhorse category, used more than any other. |
| **Caption** | Secondary/supporting text — timestamps, helper text, footnotes, metadata that supports but does not lead. |
| **Monospace** | Any engineering identifier or value where character-for-character precision matters (see Section 4) — used whenever alignment, comparison, or exactness is the point. |
| **Numeric Display** | Large, prominent numeric values that are themselves the primary content of a widget (e.g., a KPI figure) — distinct from Monospace because its job is emphasis and instant readability at a glance, not row-to-row alignment. |

No screen may introduce a category outside this list. A designer or developer who feels a screen "needs" a new text treatment must first ask which of these seven categories it actually belongs to.

---

## 3. Information Hierarchy

Typographic weight and prominence must always follow the platform's fixed information hierarchy — never a module's local preference.

| Level | Typographic role |
|---|---|
| **Platform** | Identity-level presence only — appears once, in the global shell, using the Display category. Never repeated inside module content. |
| **Module** | Uses Heading — tells the user which capability of the platform they are in (e.g., Oil Analysis, Vibration). |
| **Screen** | Uses Heading, one step below Module in prominence when both appear together — tells the user which screen within the module. |
| **Section** | Uses Section category — organizes a screen's panels and widgets; must be clearly subordinate to the Screen heading. |
| **Widget** | Section or Body depending on the widget's own internal hierarchy (a KPI widget's label is Body/Caption; its value is Numeric Display). |
| **Table** | Headers use a distinct, quieter treatment than body rows (see Section 5) — the table's own title (if present) uses Section. |
| **Dialog** | Its title uses Heading or Section depending on the dialog's weight in the workflow; its body uses Body/Caption. Never uses Display. |
| **Report** | Follows its own document-level hierarchy (Section 8) — Report titles may approach Heading weight because a report is often read standalone, away from the platform shell. |
| **Sidebar** | Navigation-category text only (see below) — never Heading or Display weight, since the sidebar is a wayfinding tool, not a content surface. |
| **Navigation** | A distinct, restrained treatment — legible, compact, and consistent regardless of module; active/current item is distinguished by weight, not by growing in size. |
| **Footer** | Caption category exclusively — the quietest text on any screen. |

The rule that governs all of this: **prominence is earned by importance to the current decision, not by a module's or a developer's preference.** A screen must never make a secondary element louder than the primary one just because it "needs more attention" locally.

---

## 4. Engineering Numbers

Engineering identifiers and values are the platform's most trust-critical text. They must be treated differently from ordinary prose.

**Use Monospace for:**
- `Equipment_ID`
- `LP_ID`
- Sample IDs
- Report IDs
- Route IDs
- Any alphanumeric engineering identifier that a user must read exactly, compare across rows, or transcribe without error

**Reasoning:** monospace gives every character equal width, which is what makes an ID scannable and comparable at a glance across a table, and prevents visual confusion between similar-looking characters (e.g., `0`/`O`, `1`/`l`) that proportional text can introduce.

**Use Numeric Display for:**
- KPI values (the large figure itself, not its label)
- Percentages shown as headline figures
- Any number whose entire purpose on a screen is to be read instantly, at a glance, as the primary fact of a widget

**Use Monospace (not Numeric Display) for:**
- Dates
- Times
- Running Hours
- Oil Quantities
- Laboratory Values
- Any numeric value appearing inside a table, list, or report where **row-to-row alignment and comparison** matter more than single-glance emphasis

**The distinguishing question:** if the number's job is to be compared against other numbers in a column or list, it is Monospace. If the number's job is to be the singular, standalone headline fact of a widget, it is Numeric Display. A KPI figure is Numeric Display; that same figure repeated in a table column later is Monospace.

---

## 5. Table Typography

Tables are where engineers spend the most sustained reading time, and where typographic discipline matters most.

- **Headers:** quieter and smaller than body rows, but never so faint they are hard to scan — their job is orientation, not emphasis. Headers must be visually distinct from data rows at a glance without needing to be read.
- **Rows:** Body category by default — consistent size and weight row to row, so the eye can scan down a column without re-adjusting.
- **Status:** status text (Alert/Caution/Normal/etc.) uses the same weight as surrounding row text — status is communicated through the color and label defined in 101_ACC_COLOR_SYSTEM.md, not through making the text itself bigger or bolder than its row.
- **Numeric columns:** right-aligned, Monospace, so digits stack cleanly and magnitude is comparable top to bottom.
- **Engineering ID columns:** left-aligned, Monospace, for the same scanning reason.
- **Alignment overall:** text left-aligned, numbers right-aligned, IDs left-aligned — never centered, which breaks vertical scanning.
- **Scanning large tables:** the single most important rule is that every row must be typographically identical in structure to every other row. A user reliably scanning hundreds of rows for the one that matters depends entirely on that consistency — any row that "stands out" typographically for a reason other than genuine status must be treated as a defect.

---

## 6. Dashboard Typography

- **KPI values:** Numeric Display — the largest, most confident text on the dashboard, because a KPI is a headline fact demanding instant recognition.
- **KPI labels:** Caption — quiet, small, present only to name what the adjacent large number means; never competing with the value for attention.
- **Chart values (data labels on a chart):** Monospace when they must be compared point to point (e.g., a value at each point in a trend); otherwise Caption-weight if merely annotative.
- **Chart titles:** Section category — identifies what engineering question the chart answers, subordinate to the KPI row above it.
- **Notifications:** Body for the message itself, Caption for the timestamp/metadata — a notification must never out-rank the KPI/critical-equipment content of the dashboard it appears on.
- **Engineering Summary (fleet-wide condition statement):** Body weight, but may use a single emphasized figure inline (Numeric Display treatment for that figure only) — the surrounding sentence stays Body so the number remains the thing that stands out.
- **Decision panels** (e.g., action queues, review/approval panels): Section for the panel title, Body for each actionable line item — every line must read with equal weight to its siblings, since the panel's job is to let the user scan a list of equally-important next actions, not to rank them by font size.

---

## 7. Mobile Typography

Mobile typography is not desktop typography scaled down. Shrinking every category proportionally would collapse the platform's hierarchy exactly when screen space is most constrained and hierarchy matters most.

- **Hierarchy is preserved by re-ordering prominence, not just by resizing.** On mobile, the categories that matter most to an in-field decision (Numeric Display for KPIs, Monospace for the equipment ID in front of the user) must remain fully legible even if surrounding categories (Section, Caption) compress more aggressively.
- **Body text has a firm minimum** below which it may not shrink, regardless of layout pressure — long-hour readability does not relax on a small screen; if anything, field conditions (glare, gloves, motion) make it more important.
- **Headings compress in scale but not in relative weight** — a Heading on mobile is still clearly heavier/larger than Body around it, even if its absolute size is smaller than its desktop counterpart.
- **Tables adapt structurally, not just typographically** — when a table cannot fit its full row width, the typographic treatment of each field (Monospace IDs, right-aligned numerics, Body labels) must carry over unchanged into whatever stacked/condensed presentation is used; only the layout changes, never the category assigned to a given piece of information.
- **Never allow mobile constraints to justify recategorizing text** — a value that is Monospace on desktop does not become a smaller Body string on mobile just because space is tight.

---

## 8. Report Typography

Reports are read outside the live platform — printed, exported as PDF, or reviewed by someone who may never open the application itself. Their typography must stand on its own.

- **PDF and printed reports:** typographic hierarchy must be legible in black-and-white/grayscale printing, since color cannot be relied upon on paper — this reinforces, rather than replaces, the requirement in Section 9 that meaning never depends on color alone.
- **Executive summaries:** the most restrained, highest-signal document type — headline figures at Numeric Display prominence, everything else compact Body/Caption; an executive reader should grasp the fleet's condition from the summary's typographic hierarchy alone, without reading every word.
- **Engineering reports:** denser than executive summaries — expect more Monospace (IDs, lab values, running hours) and tables, since the reader is making a technical judgment, not a summary one.
- **Reliability reports:** follow the same rules as engineering reports, with Section-level structure used generously to let a reader navigate a long document by its headings alone, exactly as they would navigate a screen by its section titles.
- **Document-level hierarchy:** every report has exactly one Heading-equivalent title, a small number of Section-equivalent divisions, and Body/Monospace content beneath — a report must never invent its own separate hierarchy scheme from the rest of the platform; it is the same typographic language, formatted for a page instead of a screen.

---

## 9. Accessibility

- **Reading distance:** the platform must remain legible at typical desk viewing distance and at typical handheld mobile distance without requiring the user to change position or zoom — this constrains how small Caption and table text may ever go.
- **Contrast:** typography must always meet the contrast requirements defined in 101_ACC_COLOR_SYSTEM.md (Section 8 of that document) — typography and color are two halves of the same readability requirement, not independent concerns.
- **Long sessions:** an engineer may keep a dashboard or table open for hours; body and table text must be sized and weighted for sustained reading, not just first-glance impression.
- **Eye fatigue:** avoid overly light font weights for body/table content and avoid excessive all-capitals text outside short labels/eyebrows — both increase strain over a long session.
- **Numeric readability:** every numeric category (Monospace, Numeric Display) must remain unambiguous at a glance — no digit or engineering-ID character may be easily confused with another at the platform's minimum permitted size.

---

## 10. Examples

**Platform / Module / Screen hierarchy**
- ✅ Correct: the module name appears once, clearly senior to the screen title beneath it, which is senior to each panel's Section title.
- ❌ Incorrect: a screen's panel title is styled larger or bolder than the screen title above it, inverting the hierarchy.

**Engineering IDs**
- ✅ Correct: `Equipment_ID`, `LP_ID`, and Sample IDs are set in Monospace everywhere they appear, so a user can compare them across rows without misreading a character.
- ❌ Incorrect: an `Equipment_ID` is set in the same proportional Body font as surrounding prose, making it harder to scan and easier to misread.

**KPI values**
- ✅ Correct: a KPI's number is the single largest, boldest thing in its widget (Numeric Display), with its label quiet beneath it (Caption).
- ❌ Incorrect: a KPI's label is styled as large as its value, so the eye cannot tell instantly which is the fact and which is the description.

**Tables**
- ✅ Correct: every row in a 200-row table shares identical type size, weight, and alignment rules; only the status color/label changes row to row.
- ❌ Incorrect: certain rows are given larger or bolder text "to draw attention," breaking the table's scannability.

**Mobile**
- ✅ Correct: on a small screen, the critical equipment ID and its condition remain fully readable at full weight, while supporting captions compress.
- ❌ Incorrect: every text category on a screen is shrunk by the same percentage to "fit mobile," flattening the hierarchy that helps a user act quickly.

**Reports**
- ✅ Correct: a printed engineering report's structure (title, sections, tables, IDs) is legible and unambiguous in plain black-and-white.
- ❌ Incorrect: a report relies on colored text to distinguish a critical finding from a normal one, and the distinction disappears when printed in grayscale.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — typography categories, hierarchy, and usage rules established. No font family selected. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: status example "Critical/Caution/Healthy"→"Alert/Caution/Normal" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
