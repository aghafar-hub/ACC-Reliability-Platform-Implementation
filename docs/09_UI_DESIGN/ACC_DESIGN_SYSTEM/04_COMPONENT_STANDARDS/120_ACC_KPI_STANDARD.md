# ACC Reliability Platform
# 120_ACC_KPI_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-120 |
| Title | ACC Reliability Platform — KPI Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §3 (KPI Tile) and 106's KPI philosophy into a full standard. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every KPI in the platform is a headline fact that leads to an action — never a decorative number.

## 3. Philosophy

A KPI exists to be acted on (099 §9). If a KPI does not change what a user does next, it should not exist.

## 4. Design Principles

- Every KPI is clickable and drills down (106).
- KPI color is always semantic (101 §4, §7), never decorative.
- A KPI's definition is fixed platform-wide regardless of viewer — only the number differs by scope (115).

## 5. Standard Structure

Value (Numeric Display, 102 §4) + label (Caption) + optional trend indicator + severity rail (101).

## 6. Engineering Rules

- **KPI philosophy** — one headline fact, drills down, never decorative (106).
- **Clickable KPIs** — every KPI, without exception, supports a destination — a filtered list, a queue, or a detail screen. A KPI with no destination is a defect.
- **Severity** — mapped exactly to 101 §4's semantic roles (Alert/Caution/Normal/Information/Disabled) — never a KPI-local severity scale.
- **Color rules** — 101 §4, §7: semantic first; brand color is never used to mean a KPI is "good."
- **Trends** — an optional secondary indicator of direction over a stated period; always paired with the comparison period in text, never a bare arrow with no context.
- **Percentages** — always computed against a stated, consistent, knowable denominator (099 §10).
- **Engineering KPIs** — module-scoped equipment/sample/action counts (106).
- **Contractor KPIs** — execution-scoped counts belonging to one contractor; visible to that contractor and to Owner/Manager (115), never to another contractor.
- **Owner KPIs** — fleet-wide, cross-contractor aggregates; visible only at Owner/Manager scope (115) — a Contractor never sees the fleet-wide aggregate as if it were their own.

## 7. Desktop Rules

The full KPI row, every defined KPI visible at once (110).

## 8. Mobile Rules

A horizontally scrollable KPI strip, same values and click behavior as desktop (109).

## 9. Accessibility

Value and label are exposed to screen readers as one unit; severity is never color-only (101 §8).

## 10. Correct Examples

- "Alert Equipment: 24" is colored Alert, clickable, and filters the Alert Equipment table to Alert status.
- A Contractor's dashboard shows their own "Open Actions" KPI using the exact same component and color rules as the Owner's fleet-wide KPI.

## 11. Incorrect Examples

- A KPI shows a percentage with no stated denominator.
- A trend arrow appears with no comparison period stated.
- A Contractor's dashboard shows the fleet-wide aggregate as if it were their own count.

## 12. Future Considerations

AI-predicted KPIs (e.g., a forecast figure) must be visually and textually marked as predicted — never presented identically to a verified current-state KPI (099 §10, 100 §11).

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §9, §10
- 100_ACC_BRAND_IDENTITY.md — §11
- 101_ACC_COLOR_SYSTEM.md — §4, §7, §8
- 102_ACC_TYPOGRAPHY_STANDARD.md — §4
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3
- 106_ACC_DASHBOARD_PHILOSOPHY.md — KPI philosophy
- 108_ACC_INFORMATION_ARCHITECTURE.md
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md
- 121_ACC_CHART_STANDARD.md — trend-visualization companion

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform KPI standard established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: resolved mixed "Critical"/"Alert" example (audit finding); "Critical/Caution/Healthy"→"Alert/Caution/Normal", "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
