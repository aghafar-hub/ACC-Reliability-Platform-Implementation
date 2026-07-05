# ACC Reliability Platform
# 110_ACC_DESKTOP_WORKSTATION_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-110 |
| Title | ACC Reliability Platform — Desktop Workstation Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature, on desktop workstations |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md, 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md |
| Scope Note | This document extends 104 §11 (desktop-specific interaction rules) into a full engineering-workstation standard. It does not redefine those rules, and does not discuss color, typography detail, icon design, CSS, React, or implementation. |

---

## Purpose

To define how the platform behaves at its fullest — on the large-monitor, keyboard-and-mouse, engineering-office workstation where reliability engineers do their deepest, most sustained work — so that desktop is never treated as merely "mobile that happens to have more room."

---

## Philosophy

Desktop is the platform's primary engineering workstation. It is where sustained judgment, cross-referencing, and comparison happen, and where the platform must offer its highest density and fullest capability, unconstrained by the touch and battery compromises that govern 109_ACC_MOBILE_DESIGN_STANDARD.md. Every desktop-specific capability in this document exists for one reason: to let an experienced engineer move through more information, faster and more precisely — never to add visual richness for its own sake (099 §6).

---

## Rules

**Large monitors.** Additional screen width is used to reveal more Engineering Table columns (104 §4) and to enable Split Panels (104 §2) side by side. Extra width is never converted into extra whitespace or decorative margins.

**Dual monitors.** The platform must support a workflow where an entity's detail (e.g., an Equipment Details screen) is open on one monitor while a list or dashboard remains open on the other. This depends on Deep Links (105) remaining stable and independently navigable per window — each monitor is simply another instance of the same trustworthy, bookmarkable platform.

**Engineering offices.** Desktop use assumes a stable connection and full keyboard/mouse input, unlike the field conditions 109 must accommodate. The platform may present its highest-density, most complete view here, with the least progressive disclosure of any device context.

**Table density.** The Engineering Table (104 §4) reaches its maximum practical density on desktop — the most rows and columns visible at once, and the least need to hide secondary columns responsively (contrast with 109's table-to-card adaptation).

**Mouse interaction.** Hover and right-click affordances (104 §11) are fully available on desktop. They accelerate expert workflows but never become the *only* way to reach a function — every hover/right-click action remains reachable another way, per 104 §11's own rule.

**Keyboard shortcuts philosophy.** Shortcuts exist to accelerate expert, repeated engineering workflows — moving between rows, opening a selected record, confirming a routine action. A shortcut is never the only path to an action, and a shortcut's meaning must never differ between modules (100 §9 One Platform, One Language) — if a key means "open selected record" in one module, it means exactly that everywhere.

**Split panels.** Desktop is the primary environment for Split Panels and future Resizable Panels (104 §2) — for example, an Engineering Table beside an Equipment Summary, letting an engineer work across both without losing context. This pattern is available on tablet landscape (109) only where width genuinely allows; it is desktop's default working mode.

**Comparison views.** Desktop's width is used to place two entities, or two time periods, side by side — two contractors, two pieces of equipment, a before/after reading. This is a desktop-native capability; mobile instead relies on sequential drill-down (109), since it lacks the width for true side-by-side comparison.

**Engineering productivity.** Every rule above serves the same measure of success: an experienced engineer completing a correct decision faster than they could have on any other device or in any other platform. Nothing in this document exists to make desktop screens look more impressive.

---

## Engineering Examples

- An engineer keeps the fleet dashboard open on one monitor while investigating a specific equipment's full History on the other, both remaining independently navigable.
- A reliability engineer uses a keyboard shortcut to move down a table of samples and open each one for review without touching the mouse.
- Two contractors' monthly performance are placed side by side in a comparison view only available on a wide desktop layout.

---

## Correct Usage

- The Engineering Table on desktop shows every column relevant to the current view, with no responsive hiding.
- A keyboard shortcut for "approve" behaves identically in Oil Analysis and in Vibration.
- A Split Panel lets an engineer keep a table and a detail summary visible at once while triaging a queue.

---

## Incorrect Usage

- A desktop screen leaves large unused margins instead of using the space for more Engineering Table density.
- A module defines its own keyboard shortcut scheme that conflicts with another module's.
- A comparison view is the *only* way to see two pieces of equipment's data — with no way to view them individually, breaking progressive disclosure (099 §7).

---

## Future Considerations

- Resizable Panels, referenced as a future concept in 104 §2, should be prioritized for desktop first, since desktop is where the width to make resizing meaningful already exists.
- As AI Insights mature, desktop's comparison-view capability is a natural home for "AI-suggested vs. actual" side-by-side review, without inventing a new layout concept.
- Future dual-monitor-aware features (e.g., "send to other window") should be evaluated against the Deep Link stability rule in 105 before being adopted.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §6 Engineering Before Marketing, §7 Progressive Disclosure
- 100_ACC_BRAND_IDENTITY.md — §9 Platform Consistency Rules
- 102_ACC_TYPOGRAPHY_STANDARD.md — §5 Table Typography
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2 Layout Components (Split Panels), §4 Data Components, §11 Interaction Rules
- 105_ACC_NAVIGATION_ARCHITECTURE.md — deep-link stability that dual-monitor workflows depend on
- 109_ACC_MOBILE_DESIGN_STANDARD.md — the counterpart standard for field/mobile use

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — large-monitor, dual-monitor, density, keyboard-shortcut, and comparison-view standards established for the primary engineering workstation. Pending approval. |
