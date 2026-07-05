# ACC Reliability Platform
# 112_ACC_SCREEN_TEMPLATE_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-112 |
| Title | ACC Reliability Platform — Screen Template Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–110, 111_ACC_UI_SCREEN_CATALOG.md |
| Scope Note | This document defines which structural *regions* a screen may be composed of and the rules for each. It does not redefine the components that fill those regions (104), the macro layout arrangement of the page (113), or a screen's category (111). |

---

## Purpose

To ensure every screen, in every module, is assembled from the same fixed, bounded set of structural regions — so that consistency is structural, not just stylistic, and a new module cannot silently drift into an unrecognizable shape.

---

## Scope

Applies to the internal structure of every screen category defined in 111. Does not apply to Dialogs' internal simplicity (104 §8 already governs those) beyond noting that dialogs use a reduced subset of these regions.

---

## Design Philosophy

A screen is not designed freely — it is composed from a known, bounded set of regions, each with a fixed rule. Consistency is more important than creativity (104 §1); a screen that is locally clever but structurally unlike every other screen is a defect, not an innovation.

---

## Engineering Rules

**Page Header** (104 §2) — exactly one per screen; states the screen's identity and immediate context.

**Breadcrumb** (104 §2, §6; 105) — present only when the screen is genuinely more than one level deep in the hierarchy (108).

**Toolbar** — the screen's primary actions (export, add, refresh); fixed, predictable position; never duplicated elsewhere on the same screen.

**Filters** (104 §5) — owns all filter state for the screen; a table on the same screen never duplicates filter controls of its own.

**KPIs** (104 §3; 106) — appear only where a headline fact genuinely applies (dashboards, some registers); not a mandatory region on every screen.

**Primary workspace** — the screen's dominant content region (an Engineering Table, an Equipment Summary, etc.). Every screen has exactly one.

**Secondary workspace** — supporting content alongside the primary workspace (e.g., a queue or summary rail). Optional; always visually subordinate to the primary workspace.

**Sidebar** (screen-local, distinct from the platform Sidebar of 104 §2) — supplementary context tied only to the current screen.

**Tables** (104 §4) — density and behavior per 102 §5 and 104 §4; referenced here, not restated.

**Charts** (107) — included only when they answer a specific engineering decision question, exactly as 107 requires.

**Timeline** (104 §4) — used only for its defined purpose (one entity's chronological history); never as a generic list substitute.

**Action area** — where the screen's primary decision-driven controls live (approve, assign, close); always visually distinct from passive/informational content.

**Footer** (104 §2) — the quietest region on the screen; system information only.

**Screen spacing** — one fixed spacing rhythm platform-wide, consistent with the typographic hierarchy discipline in 102; no screen invents its own spacing scale.

**Responsive behaviour** — this document defines the regions; 109 (mobile) and 110 (desktop) define how those regions adapt per device.

**Loading behaviour** — Skeleton states per region while loading (104 §7); never one full-screen spinner blocking a screen that has partially available content.

**Empty behaviour** — per 104 §9: compact, honest, and always paired with a next action.

**Error behaviour** — per 104 §10: localized to the affected region; never disguising a genuine failure as "no data."

**Maximum visual complexity** — a screen shows only the regions genuinely required by its category (111). A Detail page and a Module Dashboard do not share the same complexity budget.

**Maximum number of widgets** — bounded by how many distinct engineering questions the screen genuinely needs answered at once (099 §9), not by a fixed universal count. If a screen keeps needing more widgets to feel complete, the screen's scope is wrong — not its widget budget.

**Maximum hierarchy depth** — consistent with 105's navigation-depth rule and 108's fixed information flow: a screen's internal structure never nests deeper than Section → Widget (104 §2, §3) — no widget-within-a-widget-within-a-widget.

---

## Correct Usage

- A Module Dashboard uses Page Header, Filters, KPIs, a primary workspace (Alert Equipment table), a secondary workspace (action/review queues), and a Footer — nothing more than it needs.
- A Detail page omits KPIs and Filters entirely, since neither applies to reviewing one record.
- Loading a table shows a table-shaped Skeleton, while the rest of the already-loaded screen remains interactive.

---

## Incorrect Usage

- A Detail page includes a Filter region with nothing to filter, added out of habit.
- A screen nests a widget inside a widget inside a widget to fit more information into a Section.
- A screen's error state blanks the entire page for a failure that only affected one table.

---

## Engineering Examples

- The Oil Analysis Dashboard: Page Header → Filters → KPIs → primary workspace (Alert Equipment) + secondary workspace (Action Queue, Review/Approval, Forecast) → Analytics → Recent Activity → Footer — each region present because its category (Module Dashboard) genuinely needs it.
- An Equipment Details page: Page Header → Breadcrumb → primary workspace (Equipment Summary + cross-module tabs, per 114) → Action area (raise action, request review) → Footer.

---

## Future Considerations

- As new screen categories are formalized (111), any new structural region they might require must be added to this standard through the same governance discipline as new components (104 §15) — never invented locally.
- Future AI-augmented screens must fit within these same regions (e.g., an AI Insight Card lives in the Secondary workspace or Action area), never introducing a new region type just because the content is AI-generated.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §9 Every Widget Has a Purpose
- 102_ACC_TYPOGRAPHY_STANDARD.md — §5 Table Typography
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §1, §2, §3, §4, §6, §7, §9, §10, §15
- 105_ACC_NAVIGATION_ARCHITECTURE.md — Breadcrumb depth rule
- 106_ACC_DASHBOARD_PHILOSOPHY.md — KPI region usage
- 107_ACC_DATA_VISUALIZATION_STANDARD.md — Chart region usage
- 108_ACC_INFORMATION_ARCHITECTURE.md — hierarchy depth rule
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md — responsive behaviour of these regions
- 111_ACC_UI_SCREEN_CATALOG.md — screen categories this template composes
- 113_ACC_PAGE_LAYOUT_STANDARD.md — the macro arrangement of these regions

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — the fixed set of screen regions and their rules established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
