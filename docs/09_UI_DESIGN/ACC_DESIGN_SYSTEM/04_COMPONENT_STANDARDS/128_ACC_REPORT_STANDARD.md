# ACC Reliability Platform
# 128_ACC_REPORT_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-128 |
| Title | ACC Reliability Platform — Report Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 102 §8 (Report Typography) and 104 §4 (Report Preview) into a full Report standard, and clarifies the Dashboard-vs-Report boundary introduced in 106. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every Report in the platform is a trustworthy, read-only, point-in-time synthesis of History for a Decision — never a live surface, and never confused with a Dashboard.

## 3. Philosophy

A Report is derived from History for a Decision (108). It is frozen at its generation time; it is never a substitute for the platform's live data, and it is never itself a primary data source.

## 4. Design Principles

- Readability under print/black-and-white conditions is non-negotiable (102 §8, 101 §8).
- A Report's hierarchy mirrors the platform's fixed information hierarchy (100 §7) — never a document-local structure.

## 5. Standard Structure

One title, a small number of sections, tables/figures following the same typographic and color-honesty rules as the live platform, a generation timestamp, and a scope statement (equipment/date range/contractor scope covered).

## 6. Engineering Rules

- **Engineering reports** — dense, Monospace-heavy (102 §4), tables and IDs prominent — written for a technical judgment.
- **Executive reports** — the most restrained document type (102 §8); headline figures prominent, everything else compact.
- **PDF reports** — the Report Preview (104 §4) mirrors the exported PDF exactly; what a user previews on screen is what gets exported.
- **Print reports** — must remain legible in plain black-and-white (102 §8, 101 §8); meaning is never carried by color alone.
- **Dashboards vs. Reports** — a Dashboard is live, interactive, and always current (106); a Report is frozen at generation time and read-only. A screen must never blur the two — a Report is never editable, and a Dashboard is never treated as an archival document.
- **Report readability** — follows 102 §8's document hierarchy exactly: one Heading-equivalent title, Section-equivalent divisions, Body/Monospace content — a reader navigates a long report by its headings alone.

## 7. Desktop Rules

The full report preview renders close to its final print/export form (110).

## 8. Mobile Rules

Reports remain viewable on mobile but are primarily authored/exported from a device suited to full-page review (110 vs. 109); mobile never truncates a report's content, only its on-screen presentation density.

## 9. Accessibility

Exported PDF/print reports retain a logical reading order and real, selectable text — never a flattened image of text — consistent with 104 §13 extended to exported documents.

## 10. Correct Examples

- A monthly Reliability Report shows the same figures on screen and in its exported PDF, with a clear generation timestamp and scope statement.
- An Executive Report leads with headline figures and compact supporting sections, legible in grayscale print.

## 11. Incorrect Examples

- A Report is made directly editable, blurring it with a Detail page.
- A chart in a Report relies on color alone to distinguish Alert from Normal, and the distinction disappears when printed in grayscale.
- A Dashboard is treated as if it were a frozen Report, with no generation timestamp or scope statement.

## 12. Future Considerations

AI-generated report narration or summaries must be clearly labeled as AI-generated within the report itself and must cite the underlying data they summarize (099 §10, 100 §11).

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §10
- 100_ACC_BRAND_IDENTITY.md — §7, §11
- 101_ACC_COLOR_SYSTEM.md — §8
- 102_ACC_TYPOGRAPHY_STANDARD.md — §8
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §4, §13
- 106_ACC_DASHBOARD_PHILOSOPHY.md — Dashboard vs. Report boundary
- 108_ACC_INFORMATION_ARCHITECTURE.md — Report derived from History
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md — device context
- 111_ACC_UI_SCREEN_CATALOG.md — Reports category

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform report standard established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical"→"Alert" (chart example) per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
