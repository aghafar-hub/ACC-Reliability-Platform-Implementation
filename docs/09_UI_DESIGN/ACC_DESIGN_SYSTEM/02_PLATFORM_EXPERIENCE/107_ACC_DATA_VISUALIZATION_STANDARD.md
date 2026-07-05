# ACC Reliability Platform
# 107_ACC_DATA_VISUALIZATION_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-107 |
| Title | ACC Reliability Platform — Data Visualization Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md, 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md |
| Scope Note | This document defines *when* each visualization type is the correct choice and when it is not. It does not redefine the components themselves (104 §3, §4), and does not discuss color, typography, icon design, CSS, React, or implementation. |

---

## Purpose

To ensure every chart, table, and visual data form in the platform is chosen because it is the correct instrument for a specific engineering question — never because it looks good, fills space, or adds variety to a screen.

---

## Philosophy

A visualization is evidence submitted in support of a decision, not an illustration. The type of visualization is selected by the shape of the question being asked, not by aesthetic preference or by what a screen "seems to be missing." If a visualization cannot be stated as answering a specific engineering question, it must not appear (099 §9).

Color within any visualization follows 101 §7 exactly: semantic colors first, brand color only as a fallback for non-semantic single-series data, and never a decorative palette.

---

## Rules

| Form | Use when | Do not use when |
|---|---|---|
| **KPI** (104 §3) | A single number is itself the entire answer to the question (e.g., "how many alerts right now") | The question involves a relationship between multiple values — use a Table or Statistics Panel instead |
| **Table** (104 §4) | Comparing many records field-by-field, or when exact values matter more than shape | The question is about a trend over time — use a Line chart instead |
| **Timeline** (104 §4) | Showing chronological history for one specific entity | Comparing multiple entities at once — use a Table |
| **Line chart** | Showing a trend over time (e.g., samples processed per month) | Comparing discrete unrelated categories — use a Bar chart |
| **Bar chart** | Comparing discrete categories side by side (e.g., contractor vs. contractor counts) | Showing the proportion of a whole — use a Donut |
| **Stacked bar** | Comparing categories *and* their internal composition at once (e.g., each contractor's alert/caution/normal breakdown) | The composition itself carries no meaning — a plain Bar chart is sufficient and clearer |
| **Donut** | Showing the proportion of a whole made of a small number of semantic categories (e.g., fleet health distribution) | There are more than roughly five or six categories, or exact ranking by magnitude matters — use a Bar chart |
| **Gauge** | A single value must be read against a known threshold or target range (e.g., compliance percentage vs. target) — used sparingly | As a decorative substitute for a KPI Tile when there is no meaningful threshold to show |
| **Heatmap** | Spotting a pattern across two dimensions at scale (e.g., risk density by area and time period) | A simpler Table or chart already answers the same question with more precision |
| **Matrix** | Cross-referencing two categorical dimensions directly (e.g., equipment type × contractor) | The matrix would exceed a screen's worth of density — split into smaller matrices or tables instead |

**Universal rule:** every visualization on every screen must be traceable to a specific engineering decision question. A screen that cannot state which question a chart answers must remove the chart, not keep it "for context."

---

## Engineering Examples

- A Donut showing Alert/Caution/Normal proportion of the fleet answers: "how is the fleet's overall condition distributed right now?"
- A Line chart of monthly sample counts answers: "are we sampling on pace, or falling behind?"
- A Stacked bar of contractor alert/caution/normal counts answers: "which contractor has both more issues and worse issues?"
- A Heatmap of equipment area × month answers: "is there a location or time pattern to failures worth investigating?"

---

## Correct Usage

- A dashboard uses a Bar chart to compare RHI vs. ASEC alert counts, colored using the exact semantic colors from 101 §4.
- A Gauge is used once, for compliance percentage against its defined target, and nowhere else as decoration.
- A Table is used to let an engineer scan exact lab values across 50 samples, where a chart would obscure the precision needed.

---

## Incorrect Usage

- A dashboard includes a Donut with more than eight slices, each a different arbitrary color, because "it looks fuller."
- A Gauge is added next to a KPI Tile showing the same number twice, with no threshold logic behind it.
- A Heatmap is used where a two-column Table would have answered the same question more clearly and with exact values.
- A Line chart is used to compare five unrelated categories instead of a trend, because "the line chart component was already built."

---

## Future Considerations

- AI-driven forecasting (100 §11) may introduce predictive Line chart overlays, but any such overlay must remain visually and semantically distinguishable from verified historical data, per 099 §10 Truth Before Beauty.
- As new modules introduce new data types (e.g., Vibration frequency spectra), any new visualization form must be added to this standard through the same governance process as new components (104 §15) before it is used anywhere.
- Route Center and future geo-aware modules may eventually require map-based visualization; that form must be evaluated against this same "answers one decision question" rule before being formalized here.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §9 Every Widget Has a Purpose, §10 Truth Before Beauty
- 101_ACC_COLOR_SYSTEM.md — §4 Semantic Colors, §7 Charts
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3 Information Components, §4 Data Components, §15 Component Governance
- 106_ACC_DASHBOARD_PHILOSOPHY.md — KPI and widget philosophy that this standard supports

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — when-to-use / when-not-to-use rules established for every visualization form in the platform. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical/Caution/Healthy"→"Alert/Caution/Normal" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
