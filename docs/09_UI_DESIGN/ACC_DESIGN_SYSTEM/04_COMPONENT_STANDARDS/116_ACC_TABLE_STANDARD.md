# ACC Reliability Platform
# 116_ACC_TABLE_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-116 |
| Title | ACC Reliability Platform — Table Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §4 (Data Components) and 102 §5 (Table Typography) into the platform's full table standard. Does not redefine those rules, and does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every table in the platform — regardless of module or data type — behaves identically, so an engineer's scanning skill transfers instantly from one table to the next.

## 3. Philosophy

A table is the platform's primary scanning instrument. Engineers spend more sustained reading time in tables than in any other component. Consistency here is not a nicety — it is what lets someone scan a 200-row table reliably (099 §9, 102 §5).

## 4. Design Principles

- Consistency outranks local convenience (104 §1) — no module's table behaves differently "for a good reason."
- Density is a floor to defend, not a ceiling to avoid (104 §4).
- Identity and status lead every row; actions trail.
- Default sort is by severity/urgency, never alphabetical, unless no severity dimension exists (104 §4).

## 5. Standard Structure

A sticky header row; uniform body rows; an optional grouping/hierarchy level; a trailing row-action column; a footer or "View All" link in place of unnecessary pagination (106).

## 6. Engineering Rules

- **Engineering tables** — dense, decision-oriented (e.g., an Alert Equipment table); the platform's default table type.
- **History tables** — chronological, append-only, mirroring 108's History level; never edited in place.
- **Log tables** — immutable audit records (e.g., an Import/Audit Log); entries are never edited or deleted, only appended.
- **KPI tables** — grouped-metric rows distinct from a single KPI Tile (104 §3, 120); used when several related counts need shared row context.
- **Report tables** — follow 102 §8's print-safe typography; identical on screen and in export (128).
- **Hierarchy tables** — a Tree Table (104 §4) with expand/collapse; sorting applies within one level only, never across the whole tree.
- **Sticky headers** — mandatory for any table taller than one screen (104 §4).
- **Frozen columns** — identity/ID columns never scroll away horizontally on a wide table, extending 104 §4's "never hidden" rule to "never scrolled off."
- **Sorting philosophy** — one column sorted at a time, visible indicator, severity-first default (104 §4).
- **Filtering philosophy** — filter state is owned externally (118), never duplicated inside the table itself.
- **Density** — compact by default, always (104 §4).
- **Row actions** — a consistent trailing column/icon position across every table in the platform (103 §7).
- **Expandable rows** — used only for genuine parent/child hierarchy or supplementary detail; never to hide primary columns that should simply be visible.
- **Engineering IDs** — Monospace, left-aligned (102 §4).
- **Status columns** — semantic color plus text label, never color alone (101 §4, §6, §8).
- **Contractor columns** — identity only, present on any owner-scoped table (115); comparison between contractors happens in a Chart (121), never inside the table itself.
- **Equipment columns** — every row is one click from its Equipment page (114) — a table is never a dead end.

## 7. Desktop Rules

Maximum practical density: the most rows and columns visible at once, sticky header, frozen ID column, hover-row highlight (110).

## 8. Mobile Rules

A desktop table becomes a stack of cards, preserving the exact field order and status indicator of the source row — only the layout reflows (104 §12, 109).

## 9. Accessibility

Status is never color-only; every table is fully keyboard-navigable and sortable; header cells are programmatically associated with their column's data (101 §8, 104 §13).

## 10. Correct Examples

- A 200-row Engineering Table keeps identical structure row to row, sorted by severity, with a sticky header and frozen `Equipment_ID` column.
- A Log table shows an unbroken, unedited chronological record of every import event.

## 11. Incorrect Examples

- A table hides its ID column responsively to save space on a narrow screen.
- A History table allows an entry to be edited after the fact.
- A contractor column is used to sort contractors into a "ranking" inside the table itself.

## 12. Future Considerations

An AI-flagged row (e.g., an AI-suggested priority) must be marked with a distinct, clearly-labeled indicator — never by silently overriding the row's verified semantic status color.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §9
- 101_ACC_COLOR_SYSTEM.md — §4, §6, §8
- 102_ACC_TYPOGRAPHY_STANDARD.md — §4, §5
- 103_ACC_ICONOGRAPHY_STANDARD.md — §7
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §4, §12, §13
- 108_ACC_INFORMATION_ARCHITECTURE.md — History level
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md
- 112_ACC_SCREEN_TEMPLATE_STANDARD.md — Tables region
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md
- 118_ACC_FILTER_STANDARD.md — externally-owned filter state
- 121_ACC_CHART_STANDARD.md — contractor comparison boundary

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform table standard established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
