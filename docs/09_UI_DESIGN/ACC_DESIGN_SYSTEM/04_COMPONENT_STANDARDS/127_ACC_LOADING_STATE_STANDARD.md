# ACC Reliability Platform
# 127_ACC_LOADING_STATE_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-127 |
| Title | ACC Reliability Platform — Loading State Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §7 (Progress, Loading, Skeleton, Busy State) into the specific loading contexts a screen may encounter. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure loading never looks like a blank failure, and never blocks a screen that has partially available content.

## 3. Philosophy

Loading is an honest, temporary state — it must never imply more or less progress than is genuinely known, and it must never be indistinguishable from a failure (104 §7, 099 §10).

## 4. Design Principles

- Prefer Skeleton (structural, shaped like the real content) over a generic spinner wherever the eventual shape is known.
- Each widget/region loads and resolves independently — a slow one never blocks an already-ready one.

## 5. Standard Structure

A region-scoped Skeleton or Busy indicator matching the shape of the screen's regions (112) — never one full-screen blocker for a partial load.

## 6. Engineering Rules

- **Loading philosophy** — determinate Progress when length is known, indeterminate Loading when it isn't, Skeleton for structural placeholders, Busy State for a processing control (104 §7).
- **Dashboard loading** — each widget/region resolves independently; a slow chart never blocks an already-ready KPI row or table (106).
- **Table loading** — row-shaped Skeletons preserving the table's column structure, so real data doesn't visually "jump" once it arrives.
- **Form loading** — existing values load with field-shaped Skeletons; the save/submit control shows Busy State only while actually processing, never pre-emptively.
- **Progressive loading** — critical, above-the-fold content (099 §7, 106) loads first; secondary/analytics content may resolve after.
- **Offline loading** — a loading state that cannot resolve due to no connectivity must transition to a clear Connection error (104 §10), never spin indefinitely with no explanation (109).

## 7. Desktop Rules

Loading is rarely visible for long given stable connectivity (110); still governed by the same rules when it occurs.

## 8. Mobile Rules

Loading is a normal, expected condition given field connectivity (109) — Skeletons and progressive loading matter more here, not less.

## 9. Accessibility

Loading state is announced to screen readers; focus is never trapped on a loading region.

## 10. Correct Examples

- A dashboard's Alert Equipment table appears as soon as it resolves, even while an Analytics chart beside it is still loading.
- A form's Save button shows Busy State only while a submission is actually being processed.

## 11. Incorrect Examples

- A dashboard shows one full-screen spinner blocking already-available KPI data.
- A loading spinner continues indefinitely with no explanation after connectivity is lost.

## 12. Future Considerations

An AI computation that takes longer than a normal data load must use the same Loading/Progress vocabulary — never a bespoke "AI is thinking" treatment that breaks platform consistency.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §7
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §7, §9
- 106_ACC_DASHBOARD_PHILOSOPHY.md
- 109_ACC_MOBILE_DESIGN_STANDARD.md
- 110_ACC_DESKTOP_WORKSTATION_STANDARD.md
- 112_ACC_SCREEN_TEMPLATE_STANDARD.md — region-level loading behavior

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform loading-state standard established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
