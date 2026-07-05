# ACC Reliability Platform
# 121_ACC_CHART_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-121 |
| Title | ACC Reliability Platform — Chart Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 107_ACC_DATA_VISUALIZATION_STANDARD.md with platform-wide rules on when a chart is allowed, forbidden, and how chart honesty is enforced. Does not redefine 107's when-to-use table, and does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every chart in the platform is evidence for a decision, and that charts are never added, styled, or shaped in a way that misleads.

## 3. Philosophy

A chart is evidence submitted in support of a decision (107). This document adds the platform-wide discipline of when a chart is not allowed at all, and the honesty rules every chart must obey.

## 4. Design Principles

- Every chart must answer a stated engineering question (099 §9, 107).
- A chart never exists to fill space or look impressive (099 §6).
- Color follows 101 §7 exactly: semantic first, brand color only as a non-semantic single-series fallback, never a decorative palette.

## 5. Standard Structure

A title stating the question the chart answers (102 §6); the visual; a legend/label sufficient to read the chart without color alone (101 §8).

## 6. Engineering Rules

- **When charts are allowed** — a genuine trend, comparison, distribution, or pattern-detection question exists (107's when-to-use table).
- **When charts are forbidden** — no decision question exists, or the same data is more precisely read as a Table or KPI (107); a chart is never added merely because "dashboards have charts."
- **Engineering charts** — equipment health, sample trend, per 106's Engineering dashboard category.
- **Trend charts** — Line charts (107); always labeled with their time unit.
- **Comparison charts** — Bar/Stacked bar (107); contractor-vs-contractor per 115, never contractor-vs-ACC.
- **Distribution charts** — Donut (107); capped at roughly five or six semantic categories.
- **Future AI charts** — a predictive overlay or AI-suggested pattern must be visually distinguished from verified historical data, never rendered identically to real data (099 §10, 100 §11).
- **Chart honesty** — 099 §10 Truth Before Beauty applied specifically to charts: no truncated or misleading axis choices, no cherry-picked time windows that flatter a metric, no omitted "no data" gap disguised as a zero value.

## 7. Desktop Rules

Charts sit in a bounded row within a Workspace layout (112, 113); full-screen only on a dedicated Analytics screen (111) where that scope is genuinely justified.

## 8. Mobile Rules

Charts collapse into an Analytics accordion (109) — never the first thing shown above the fold.

## 9. Accessibility

Every chart has a text-equivalent summary or an adjacent data table carrying the same values (101 §8, 104 §13).

## 10. Correct Examples

- A Bar chart compares RHI vs. ASEC alert counts using the exact semantic colors from 101 §4.
- A Donut chart's slice count stays within the platform's semantic category limit.

## 11. Incorrect Examples

- A Donut with more than eight arbitrarily-colored slices, added "to look fuller."
- A trend chart's axis is truncated to exaggerate a small change.
- A chart is included on a dashboard with no stated decision question behind it.

## 12. Future Considerations

As AI Insights mature, forecast charts must cite their basis/confidence within the chart's own labeling, not only in a separate card.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §6, §9, §10
- 100_ACC_BRAND_IDENTITY.md — §11
- 101_ACC_COLOR_SYSTEM.md — §7, §8
- 102_ACC_TYPOGRAPHY_STANDARD.md — §6
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3, §13
- 106_ACC_DASHBOARD_PHILOSOPHY.md
- 107_ACC_DATA_VISUALIZATION_STANDARD.md — the parent standard this extends
- 111_ACC_UI_SCREEN_CATALOG.md — Analytics category
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — contractor comparison rule
- 120_ACC_KPI_STANDARD.md — KPI/chart companion relationship

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — chart allow/forbid rules and chart honesty established. Pending approval. |
