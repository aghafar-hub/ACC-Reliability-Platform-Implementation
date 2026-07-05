# ACC Reliability Platform
# 108_ACC_INFORMATION_ARCHITECTURE.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-108 |
| Title | ACC Reliability Platform — Information Architecture |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md, 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md |
| Scope Note | This document defines how information flows and is organized platform-wide — the backbone that Navigation Architecture (105) and Dashboard Philosophy (106) both sit on top of. It does not discuss color, typography, icon design, CSS, React, or implementation. |

---

## Purpose

To define, once, the fixed flow information takes through the ACC Reliability Platform — from the platform itself down to a single decision — so that every module organizes its data the same way, regardless of its subject matter.

---

## Philosophy

Information in this platform flows in one direction, always:

```text
Platform
  ↓
Module
  ↓
Equipment
  ↓
Record
  ↓
Action
  ↓
History
  ↓
Report
  ↓
Decision
```

This flow is not a diagram of convenience — it is the platform's backbone. Every screen in every module sits at exactly one of these levels, and every screen must respect what sits above and below it. Equipment is the fixed center of this flow (099 §3): everything below it exists to explain the equipment's condition, and everything above it exists to organize access to it.

---

## Rules

**Hierarchy.** Each level has one fixed role:
- **Platform** — the identity and shell shared by everything beneath it.
- **Module** — a capability of the platform (Oil Analysis, Vibration, etc.), never a separate application.
- **Equipment** — the digital twin subject; the true center of the architecture (099 §3).
- **Record** — a specific piece of data tied to one equipment (a sample, a reading, a route stop).
- **Action** — an engineering task arising from a Record.
- **History** — the accumulated, unabridged trail of Records and Actions for one equipment (104 §4 History Log).
- **Report** — a formatted, read-only output derived from History for a decision-maker (104 §4 Report Preview).
- **Decision** — the terminal point every path in the platform ultimately serves (099 §4, 100 §8).

**Grouping.** Information is grouped by equipment first, by process/module second — never the reverse. A user should be able to describe any screen as "this is about equipment X," even when the screen's proximate subject is a sample, action, or report.

**Relationships.** A Record always references exactly one `Equipment_ID`. An Action always references the Record or Equipment that prompted it. History is the append-only union of a given equipment's Records and Actions. A Report is always a derived, read-only view — it is never itself a primary data source that other parts of the platform read from.

**Progressive disclosure.** Per 099 §7, each level of this hierarchy reveals only enough to let the user decide whether to go one level deeper — a Module view shows equipment condition summaries, not full History; an Equipment view shows recent Records and open Actions, not the entire History by default.

**Information ownership.** Equipment identity (`Equipment_ID`) is owned by the platform, never forked or duplicated by a module. A module owns the Records and Actions it creates against that equipment, but never owns or redefines the equipment identity itself (099 §3).

**Navigation depth.** Per 105_ACC_NAVIGATION_ARCHITECTURE.md, moving from Platform to a specific Decision must be reachable in a small, bounded number of steps regardless of which module the path runs through.

**Search hierarchy.** Universal search (105) resolves in the same order this architecture defines: Equipment first, then Record, then Action. A search result is never a bare Report or History entry disconnected from the equipment that owns it.

---

## Engineering Examples

- An oil sample (Record) for `LP-114` on `Equipment_ID EQ-4021` shows a Caution result, which generates an Engineering Action (Action) to resample. Both are visible in that equipment's History, and a monthly Reliability Report (Report) summarizes the trend across many such equipment for a manager's Decision on contractor performance.
- A vibration reading and an oil sample for the same equipment both appear in that equipment's unified History, because History is organized by equipment, not by module.

---

## Correct Usage

- An Equipment Details screen shows recent Records and open Actions first, with a link to full History rather than displaying it all at once.
- A Report is generated from History and clearly marked as a derived, point-in-time output, not an editable record.
- A new module's Records all carry the platform's existing `Equipment_ID`, with no module-specific equipment identifier introduced.

---

## Incorrect Usage

- A module stores its own parallel equipment identifier instead of using the platform's `Equipment_ID`.
- A dashboard widget shows a Report figure with no path back to the equipment or History it was derived from.
- A screen skips levels arbitrarily — for example, presenting raw History as if it were a Decision-ready summary, without the Report layer's synthesis.

---

## Future Considerations

- ERP Integration must map its own entities onto this same Equipment → Record → Action flow rather than introducing a parallel information architecture.
- AI Insights (100 §11) are best understood as a new *kind* of Report — synthesized from History for a Decision — and must be positioned at that same level, not injected elsewhere in the flow.
- As Route Center and future modules introduce new Record types (route stops, inspections), they must still resolve back to `Equipment_ID` exactly as existing Record types do.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §3 Equipment Before Everything, §4 Decision Before Information, §7 Progressive Disclosure
- 100_ACC_BRAND_IDENTITY.md — §6 Equipment-Centric Philosophy, §7 Information Hierarchy
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §4 Data Components (History Log, Report Preview)
- 105_ACC_NAVIGATION_ARCHITECTURE.md — navigation depth and search hierarchy built on this architecture
- 106_ACC_DASHBOARD_PHILOSOPHY.md — dashboard hierarchy nested within this same flow

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — the fixed Platform → Module → Equipment → Record → Action → History → Report → Decision information flow established. Pending approval. |
