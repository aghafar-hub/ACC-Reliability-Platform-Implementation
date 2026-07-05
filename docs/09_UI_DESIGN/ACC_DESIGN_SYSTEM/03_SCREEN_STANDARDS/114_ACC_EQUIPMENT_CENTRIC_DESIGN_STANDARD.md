# ACC Reliability Platform
# 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-114 |
| Title | ACC Reliability Platform — Equipment-Centric Design Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–110, 111_ACC_UI_SCREEN_CATALOG.md, 112_ACC_SCREEN_TEMPLATE_STANDARD.md, 113_ACC_PAGE_LAYOUT_STANDARD.md |
| Scope Note | This is one of the most important documents in the Design System. It operationalizes 099 §3 (Equipment Before Everything) and 100 §6 (Equipment-Centric Philosophy) into concrete design rules. It does not redefine the Equipment page's template (112) or its layout (113) — it defines the equipment-centric *pattern* those must express. |

---

## Purpose

To define how `Equipment_ID` becomes the literal, structural center of the platform — not a metaphor, but the actual key every module's data connects through — so that a user always feels they are navigating one continuous equipment record, never a set of isolated per-module databases that happen to share an identifier.

---

## Scope

Applies to every module that holds data about physical equipment (currently Oil Analysis and Lubrication; extending to Vibration, Reliability Engineering, Route Center, and beyond). Governs the Equipment page's content pattern, not its visual template (112) or macro layout (113).

---

## Design Philosophy

`Equipment_ID` is the platform's digital twin key (099 §3). Every module is a lens onto the equipment, not a parallel structure beside it. A user moving between modules while looking at the same equipment must feel like they are turning to a different page of the same book — never opening a different book. This is the single most important test of whether the platform is truly "one platform" (099 §8, 100 §9) rather than a collection of modules that merely share a login screen.

---

## Engineering Rules

**Equipment Header** — a fixed-identity block (`Equipment_ID`, name, criticality where known, current overall condition) shown at the top of every equipment-scoped screen, identical in structure regardless of which module the user arrived from.

**Equipment Summary** — the condensed, at-a-glance view of the equipment's current state across *all* modules, not only the module the user is currently in. This is the single component that most makes a user "feel they are navigating an equipment."

**Equipment Timeline** — the unified chronological view (104 §4 Timeline) combining Records and Actions from every contributing module for this one equipment — never a module-siloed timeline that only shows that module's own events.

**Equipment Navigation** — from any equipment-scoped screen, moving to another module's view of the *same* equipment is a single, direct step (105's cross-module navigation rule, applied specifically at the equipment level).

**Cross-module tabs** — the mechanism by which an Equipment page exposes each contributing module's view (an Oil Analysis tab, a Vibration tab, etc.) without leaving the equipment context. A tab switches the module *view*; it never switches the underlying equipment identity.

**Equipment History** — the full, unabridged History (108) for this equipment, reachable from its Equipment page.

**Equipment Reports** — Reports (111) scoped to this equipment are always reachable directly from its Equipment page, never only from a separate, disconnected Reports module that requires the user to re-search for the equipment.

**Equipment Actions** — every open or closed Engineering Action tied to this equipment is visible from its Equipment page, regardless of which module originally created the action.

**Equipment Attachments / Equipment Documents** — files and documents tied to this equipment are aggregated at the equipment level (104 §3 Documents concept), never scattered per module with no equipment-level index to find them all.

**Equipment Health** — the synthesized condition indicator combining relevant signals across contributing modules (oil condition, vibration signature, etc.) where available, always expressed using the exact semantic colors and status vocabulary of 101 and 103 — never a module-specific health scale that requires separate interpretation.

**Equipment Decision History** — a record of what decisions were made about this equipment and when, tied to 108's Decision terminus — letting a user see not just what happened to the equipment, but what was decided as a result and by whom.

**Future AI recommendations** — surfaced on the Equipment page as an AI Insight Card (104 §3), scoped specifically to this equipment — never as a separate, cross-equipment "AI-only" screen that would break the equipment-centric pattern this document exists to protect.

**Future Digital Twin compatibility** — `Equipment_ID` is the anchor key for any future digital twin representation. Nothing in the platform's data model may treat `Equipment_ID` as merely a display label; it must remain, at every layer, the canonical identity key every module's Records reference.

**The governing test:** a user should always feel they are navigating *an equipment*, not *a module*. Modules are lenses; the equipment is the subject.

---

## Correct Usage

- An engineer on an Equipment page switches from the Oil Analysis tab to the Vibration tab and sees the same equipment identity header, unchanged, throughout.
- An Equipment Summary shows condition contributions from every module that has data for that equipment, not only the module the user navigated from.
- A Report generated for one equipment is reachable with one click from that equipment's own page.

---

## Incorrect Usage

- A module's "equipment view" is really just that module's own data filtered by an ID, with no awareness of what other modules know about the same equipment.
- Two modules display slightly different values for the same equipment's name or criticality, because each maintains its own copy instead of referencing the platform's single equipment identity.
- An AI recommendation about a specific piece of equipment is only visible in a separate AI dashboard, not on that equipment's own page.

---

## Engineering Examples

- `EQ-4021`'s Equipment Summary shows: Oil Analysis condition (Caution), Vibration condition (Normal), 2 open Actions, and a Decision History entry noting a contractor was instructed to resample — all in one place, regardless of which module the user arrived from.
- A cross-module tab lets an engineer move from `EQ-4021`'s Oil Analysis sample history directly to its Vibration reading history without leaving the equipment context or re-identifying the equipment.

---

## Future Considerations

- As Vibration, Reliability Engineering, and Route Center are built, each must register itself as a contributing module to the Equipment Summary and Equipment Health pattern defined here, rather than building a parallel equipment concept of its own.
- Digital Twin and AI Assistant capabilities should be designed from the outset to read and write through `Equipment_ID`, using this document as their integration contract.
- ERP Integration must map its own asset records onto the platform's `Equipment_ID`, not introduce a second equipment identity that the platform must reconcile.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §3 Equipment Before Everything, §8 One Platform — One Language
- 100_ACC_BRAND_IDENTITY.md — §6 Equipment-Centric Philosophy, §7 Information Hierarchy, §11 Future AI Readiness
- 101_ACC_COLOR_SYSTEM.md — §4 Semantic Colors, §6 Status Color Rules
- 103_ACC_ICONOGRAPHY_STANDARD.md — §5 Status Icons, §6 Engineering Icons
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3 Information Components, §4 Data Components
- 105_ACC_NAVIGATION_ARCHITECTURE.md — cross-module and equipment-centric navigation rules
- 108_ACC_INFORMATION_ARCHITECTURE.md — the Record/Action/History/Report/Decision flow this document anchors to equipment
- 111_ACC_UI_SCREEN_CATALOG.md — the Equipment page category

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — the equipment-centric design pattern established as the platform's connective structure. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Healthy"→"Normal" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
