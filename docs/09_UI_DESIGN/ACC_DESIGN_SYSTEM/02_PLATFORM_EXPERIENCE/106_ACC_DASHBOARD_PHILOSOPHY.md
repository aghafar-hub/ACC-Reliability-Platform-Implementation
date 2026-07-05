# ACC Reliability Platform
# 106_ACC_DASHBOARD_PHILOSOPHY.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-106 |
| Title | ACC Reliability Platform — Dashboard Philosophy |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md, 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md |
| Scope Note | This document defines what a dashboard is and is not, platform-wide, and how the Information Components of 104 §3 are composed into one. It does not redefine those components, and does not discuss color, typography, icon design, CSS, React, or implementation. |

---

## Purpose

To ensure every dashboard in every module — present and future — is built as a decision surface, not a report, a status wall, or a vanity display. This document defines the one dashboard philosophy the entire platform shares.

---

## Philosophy

**What a dashboard is:** a decision surface. It answers, at a glance, "what requires attention right now, and what should be done about it" (099 §1, §4).

**What a dashboard is NOT:** it is not an archive (that is History Log, 104 §4), not a substitute for a formal Report (104 §4 Report Preview), not a place to display numbers because they exist, and not a marketing-style status wall meant to look impressive rather than be useful (099 §6, §10).

**Decision-first design.** Every element on a dashboard must trace to a decision. If removing an element would not change what a user does next, it does not belong (099 §4, §9).

---

## Rules

**KPI philosophy.** Every KPI Tile (104 §3) on a dashboard drills down to more detail or to the action it represents. A KPI is phrased as a fleet- or module-relevant fact, never as a decorative statistic. KPI color follows the semantic rules of 101 §4 and §7 exactly — a dashboard never invents its own KPI color meaning.

**Widget philosophy.** Every widget answers exactly one engineering question (099 §9) and is drawn from the existing Information/Data component catalog (104 §3, §4) — a dashboard never invents a new widget type ad hoc. If no existing widget answers the question at hand, that is a signal to extend 104 through governance (104 §15), not to build a one-off.

**Owner vs Contractor dashboard.** An ACC (owner) dashboard is fleet-wide and cross-contractor, per 100 §5 — ACC is never presented as a peer of, or compared alongside, the contractors it oversees. A Contractor dashboard is scoped to that contractor's own execution responsibilities. The two are different views of the same platform, never different products.

**Executive dashboards.** The highest information-density-to-glance ratio in the platform. Favor Statistics Panel and KPI Tile (104 §3); raw Engineering Tables are rare here, since an executive dashboard exists to be absorbed in moments, not investigated.

**Engineering dashboards.** Denser and drill-heavy, including Engineering Table and Timeline widgets (104 §4) — built for someone who will act immediately on what they see, not merely be briefed by it.

**Module dashboards.** Every module's dashboard follows this same philosophy and the same fixed information hierarchy (see Information Priority below) — a module dashboard differs in data domain, never in values or structure, per 100 §9.

**AI dashboard (future).** AI-generated insight is delivered as an AI Insight Card (104 §3) integrated into an existing dashboard, never as a separate "AI dashboard" — a separate AI surface would fragment the one-platform experience (099 §8, 100 §11) and would imply AI output is a different category of trustworthy fact than the rest of the dashboard.

**Dashboard hierarchy.** Platform-level overview (if one exists) sits above module dashboards, which sit above an equipment-scoped view — the same nesting defined in 108_ACC_INFORMATION_ARCHITECTURE.md. A dashboard at any level must respect what sits above and below it; it does not attempt to be all levels at once.

**Information priority.** Every dashboard, regardless of module, follows the fixed hierarchy from 100 §7: critical equipment condition and required decisions first; what must be acted on today second; contractor and lab/workflow context third; trends and analytics fourth; everything else last. No module dashboard may reorder this for its own convenience.

**Empty dashboard rules.** When there is nothing critical, a dashboard states that plainly and compactly (104 §9 Empty States) — it never fabricates content, pads itself with decorative filler, or hides the fact that everything is currently fine. An honest "all clear" is a successful outcome, not an empty one (099 §10).

---

## Engineering Examples

- An Oil Analysis module dashboard for an ACC user shows fleet-wide alert counts and a Contractor Comparison restricted to RHI vs. ASEC, with ACC never appearing as a bar in that comparison.
- A contractor-scoped user opens the same dashboard and sees only their own contractor's equipment and actions, with the same information hierarchy and the same KPI drill-down behavior.
- An executive opens a summary view and, without clicking anything, already knows whether the fleet is in a normal or concerning state.

---

## Correct Usage

- A KPI Tile for "Overdue Samples" links directly to the filtered list of those samples.
- A dashboard with zero critical equipment shows a single compact line stating that, with no illustration.
- A module dashboard's top zone always shows equipment condition before it shows a trend chart.

---

## Incorrect Usage

- A dashboard displays a chart with no clear decision it supports, included only because "dashboards should have charts."
- An executive dashboard is built from the same dense Engineering Table used in an engineering dashboard, overwhelming its intended reader.
- A contractor is shown alongside ACC in a "performance comparison" widget.
- An empty dashboard state shows a large illustrated graphic instead of a compact factual statement.

---

## Future Considerations

- As AI Insight Cards mature, dashboards must continue to treat AI output as one more decision-supporting fact subject to the same information hierarchy — never elevated above verified engineering data by default.
- Future modules (ERP Integration, Reliability, Route Center, etc.) inherit this philosophy directly; a new module dashboard is a configuration of the existing widget catalog, not a new dashboard concept.
- As the platform gains more contractors beyond RHI/ASEC, the Owner vs Contractor dashboard rule extends without modification — any number of contractors are compared to each other, never to ACC.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §1 Purpose, §4 Decision Before Information, §8 One Platform — One Language, §9 Every Widget Has a Purpose, §10 Truth Before Beauty
- 100_ACC_BRAND_IDENTITY.md — §5 Owner vs Contractor Philosophy, §7 Information Hierarchy, §8 Decision-Driven Design, §11 Future AI Readiness
- 101_ACC_COLOR_SYSTEM.md — §4 Semantic Colors, §7 Charts
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3 Information Components, §4 Data Components, §9 Empty States
- 108_ACC_INFORMATION_ARCHITECTURE.md — the nesting a dashboard hierarchy must respect

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — dashboard definition, KPI/widget philosophy, owner-vs-contractor and executive-vs-engineering dashboard distinctions established. Pending approval. |
