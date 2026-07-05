# ACC Reliability Platform
# 118_ACC_FILTER_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-118 |
| Title | ACC Reliability Platform — Filter Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §5 (Input Components — Filter) and the externally-owned filter-state rule already established in 104 §4/116. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every filterable screen exposes filtering the same way, so a user narrows toward a decision without relearning the mechanism per module.

## 3. Philosophy

A filter narrows toward a decision — it is not a browsing tool for its own sake (099 §4). Filters are visible by default, never hidden behind an undiscoverable "advanced" toggle for common criteria.

## 4. Design Principles

- Active filters are always visibly counted and chipped.
- One clear reset is always available (104 §5).
- Filter state belongs to the screen's Filter component alone — a table or list never duplicates it (104 §4, 116).

## 5. Standard Structure

A quick-filter row (always visible); an advanced-filter panel/drawer (opened deliberately, 104 §8); a saved-filter mechanism; an active-filter chip row.

## 6. Engineering Rules

- **Quick filters** — the 3–5 most decision-relevant criteria for the screen (e.g., status, area, contractor); always visible, no extra click required.
- **Advanced filters** — secondary criteria, opened via an explicit control (104 §8 Drawer).
- **Saved filters** — a named, reusable criteria set; a convenience layer only — never a substitute for the platform's fixed information hierarchy, and never overriding what a KPI drill-down (120) or notification deep-link (105, 123) already applies.
- **Engineering filters** — status/condition/equipment/contractor/date-range, reusing 101 §4's exact semantic status values — never a filter-local status vocabulary.
- **Filter priority** — status/condition filters lead; date and free-text search follow, mirroring 100 §7's hierarchy applied to filter ordering.
- **Filter chips** — every active filter shown as a removable chip, so a user always sees at a glance why a list looks the way it does.

## 7. Desktop Rules

A full quick-filter row plus a persistently visible active-filter chip strip (110).

## 8. Mobile Rules

Quick filters collapse into a single "Filters" entry point carrying a badge count, consistent with 109's density and collapse rules.

## 9. Accessibility

Every filter control is keyboard-operable; the active-filter count is announced to screen readers (104 §13).

## 10. Correct Examples

- An Alert Equipment table's quick filters expose Status and Contractor directly, with Area and Oil Type behind an Advanced panel.
- Clearing all filters is always a single, obvious action.

## 11. Incorrect Examples

- A commonly-needed filter is buried three clicks deep in an "Advanced" panel.
- A saved filter silently overrides a KPI's drill-down filter, confusing the user about what they're looking at.
- A filter introduces its own status labels that don't match 101 §4's semantic vocabulary.

## 12. Future Considerations

AI-suggested filters (e.g., "show me what's likely to need attention") must appear as an explicit, labeled suggestion the user applies deliberately — never a silent, invisible pre-filter.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §4, §7
- 100_ACC_BRAND_IDENTITY.md — §7
- 101_ACC_COLOR_SYSTEM.md — §4
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §4, §5, §8
- 105_ACC_NAVIGATION_ARCHITECTURE.md — deep-link interaction with filters
- 109_ACC_MOBILE_DESIGN_STANDARD.md
- 116_ACC_TABLE_STANDARD.md — externally-owned filter state
- 119_ACC_SEARCH_STANDARD.md — search/filter relationship
- 120_ACC_KPI_STANDARD.md — KPI drill-down filters
- 123_ACC_NOTIFICATION_STANDARD.md — notification deep-link filters

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform filter standard established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
