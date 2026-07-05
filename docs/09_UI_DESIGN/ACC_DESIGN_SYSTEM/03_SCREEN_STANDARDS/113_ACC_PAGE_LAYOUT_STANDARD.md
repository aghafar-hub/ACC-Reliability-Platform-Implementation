# ACC Reliability Platform
# 113_ACC_PAGE_LAYOUT_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-113 |
| Title | ACC Reliability Platform — Page Layout Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–110, 111_ACC_UI_SCREEN_CATALOG.md, 112_ACC_SCREEN_TEMPLATE_STANDARD.md |
| Scope Note | This document defines the macro layout patterns that arrange the regions defined in 112, and exactly when each pattern is allowed. It does not redefine those regions, their components (104), or a screen's category (111). |

---

## Purpose

To fix, once, the platform's layout vocabulary — so that "how much of the screen is used for what" is governed by information density and decision need, never by a module's or developer's aesthetic preference.

---

## Scope

Applies to the macro arrangement of every screen defined in 111, using the regions defined in 112. Device-specific adaptation of these patterns is governed by 109 (mobile) and 110 (desktop).

---

## Design Philosophy

Layout is chosen by the shape of the information and the decision it must support — never by how a screen "looks better." Whitespace exists only where it aids scanning; it is never decoration (099 §6, extending the same restraint already established for color in 101 and typography in 102).

---

## Engineering Rules

**Single-column** — used for narrow/mobile contexts (109) and for focused Detail or Action pages (111) where there is one dominant subject and no need for a side-by-side supporting region.

**Two-column** — the platform's most common desktop pattern: one primary workspace with one clearly subordinate secondary workspace (112). Used whenever a screen has exactly one dominant task and one supporting context.

**Three-column** — reserved for desktop contexts with a genuine three-way relationship (e.g., navigation rail, primary content, contextual detail). Used sparingly — only when collapsing to two columns would force two regions to compete for primary attention.

**Split layouts** — the general term for any side-by-side arrangement (104 §2 Split Panels); two-column and three-column are specific cases of a Split layout.

**Master-detail** — a list (master) beside the selected item's detail. Used for Registers and Equipment pages (111) on desktop and tablet landscape (109, 110); collapses to sequential single-column navigation on phone.

**Workspace layouts** — a dense, multi-region arrangement for sustained engineering work (e.g., a Module Dashboard). The primary home for the Module Dashboard and Analytics categories (111).

**Full-screen layouts** — used only for a focused, singular task with no need for platform chrome (e.g., a Wizard screen, 111). Never used merely to make a screen "feel more spacious."

**Dialog layouts** — the fixed internal structure of a Modal or Drawer (104 §8): compact, single-task, never a full page layout in disguise.

**Report layouts** — follow 102 §8's document-hierarchy rules; print/export-first rather than screen-first.

**Mobile layouts** — per 109: effectively always single-column, with Master-detail becoming sequential drill-down rather than side-by-side.

**Information density rules** — default to the densest layout that still lets the user scan reliably (104 §4). Density is a floor to defend, not a ceiling to avoid.

**Whitespace philosophy** — whitespace separates meaningfully different regions or rows; it is never inserted to make a screen "feel calmer" at the cost of information shown per screen.

**Engineering productivity principles** — every layout choice must be justified by how much faster and more accurately it lets an engineer reach a decision (extending 110's productivity principle to every layout, not desktop alone).

---

## Correct Usage

- A Module Dashboard uses a Workspace layout with a two-column Split beneath its KPI strip: a dominant Alert Equipment table beside a narrower action/review sidebar.
- An Equipment Details screen uses Master-detail on desktop (equipment list beside the open record) and sequential drill-down on phone.
- A Wizard screen uses a Full-screen layout because its singular task benefits from no navigation distraction.

---

## Incorrect Usage

- A screen adds a third column purely to fill a wide monitor, with no genuine third relationship to show.
- A Report is designed screen-first with interactive widgets, breaking its print/export-first requirement.
- A Detail page is given a two-column Split with an empty or decorative second column.

---

## Engineering Examples

- Oil Analysis Dashboard: Workspace layout, KPI strip, then a two-column Split (Alert Equipment table + sidebar of Action Queue/Review/Forecast), then a Three-chart Analytics row, then a Recent Activity list.
- Equipment Details: Master-detail on desktop, allowing an engineer to move between LP records for one equipment without losing the equipment context.

---

## Future Considerations

- Future Resizable Panels (104 §2) extend the Split layout family without introducing a new layout category — they remain a variant of Split, user-adjustable rather than fixed.
- As Route Center introduces map-based or sequential-stop views, those must be evaluated against this same fixed vocabulary before any new layout pattern is formalized here.
- AI-augmented screens must fit within existing layout patterns (e.g., an AI Insight Card occupies a Secondary workspace slot within a Two-column layout), never justifying a new pattern on their own.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §6 Engineering Before Marketing
- 101_ACC_COLOR_SYSTEM.md — restraint philosophy extended here to whitespace
- 102_ACC_TYPOGRAPHY_STANDARD.md — §8 Report Typography
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2 Layout Components, §4 Data Components, §8 Dialog Components
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md — device-specific adaptation of these patterns
- 112_ACC_SCREEN_TEMPLATE_STANDARD.md — the regions these layouts arrange

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — the platform's fixed layout vocabulary and when each pattern is allowed established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
