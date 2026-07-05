# ACC Reliability Platform
# 105_ACC_NAVIGATION_ARCHITECTURE.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-105 |
| Title | ACC Reliability Platform — Navigation Architecture |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md, 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md |
| Scope Note | This document extends 104's navigation components (Sidebar, Tabs, Breadcrumb, Quick Navigation, Module Navigation, Back Navigation, Deep Links) with the *architecture* governing how they connect. It does not redefine those components, and does not discuss color, typography, icon design, CSS, React, or implementation. |

---

## Purpose

Navigation exists so that any user — engineer, manager, or contractor — can always answer two questions without hesitation: *where am I in the platform*, and *how do I reach the equipment, record, or decision I need*. This document defines the architecture that guarantees both answers stay true across every module, for the life of the platform.

---

## Philosophy

Navigation is not a menu convenience — it is a direct expression of the platform's identity and information architecture. A user must never navigate the ACC Reliability Platform the way they would navigate a generic admin tool, guessing at menu labels. Every navigation path exists because it leads toward a decision (099 §4), and every path ultimately leads back to a piece of equipment (099 §3).

Because the platform must remain coherent for more than ten years and absorb modules not yet built, navigation architecture is defined once, here, and inherited by every module — never invented locally per module.

---

## Rules

**Platform navigation.** The Sidebar and Top Navigation (104 §2) together form the platform's only navigation chrome. The Sidebar carries module switching and in-module structure; the Top Navigation carries only platform-global utilities. No module may add a second, competing navigation surface.

**Module navigation.** Within a module, the Sidebar exposes that module's screens as a flat, predictable list. A module's internal navigation must never require the user to first understand the module's internal data model — screen names describe user tasks, not internal structures.

**Equipment-centric navigation.** Per 099 §3, every module's navigation must offer a direct path to a specific `Equipment_ID` in a small, bounded number of steps. If a module's navigation cannot get a user from "module home" to "this specific piece of equipment" quickly, the navigation is deficient, regardless of how well-organized it otherwise appears.

**Cross-module navigation.** When a record in one module relates to the same equipment in another module (e.g., an Oil Analysis finding and a Vibration reading for the same `Equipment_ID`), the platform must provide a direct link between them. A user must never be required to re-search for the same equipment in a second module after already having it open in the first.

**Search navigation.** Quick Navigation (104 §6) is the platform's fast, search-driven jump mechanism. It resolves to entities — equipment, records, actions — not to pages or menu items. See also the Universal Search Philosophy below.

**Breadcrumb rules.** Breadcrumbs (104 §2, §6) appear only when a screen sits genuinely more than one level deep in the hierarchy defined in 108_ACC_INFORMATION_ARCHITECTURE.md. A breadcrumb must always reflect the real information hierarchy — it is never a decorative trail of arbitrary click history.

**Notification navigation.** Every notification deep-links directly to the exact entity or screen it concerns. A notification that only opens a generic inbox, forcing the user to re-locate the subject themselves, is a defect.

**Deep-link rules.** A URL must resolve to the same exact entity or screen regardless of how the user arrived at it — bookmarked, shared, or freshly navigated. Deep links must remain stable across platform versions; this stability is part of what makes the platform trustworthy across a ten-year horizon (099 §12).

**Universal search philosophy.** There is exactly one search experience across the platform (Search, 104 §5, surfaced via Quick Navigation). It searches across equipment, records, and actions using the same information hierarchy defined in 108, never a module-local search box with different behavior or scope rules than the platform's universal search.

**Future module scalability.** A new module's navigation entry slots into the Sidebar the same way every existing module's entry does, without requiring the restructuring of existing entries. Navigation architecture is proof of its own soundness only if a tenth future module fits exactly as easily as the second one did.

---

## Engineering Examples

- An engineer viewing an equipment item in Alert condition on the Oil Analysis Dashboard clicks through to Equipment Details, then follows a direct cross-module link to that same equipment's latest Vibration reading — no re-search required.
- A manager receives a notification that a contractor action is overdue and is taken directly to that action's detail, not to a general notifications list.
- A field engineer bookmarks a specific `Equipment_ID`'s detail page and returns to the exact same screen a week later via that same link.

---

## Correct Usage

- The Sidebar lists Oil Analysis, Lubrication, Vibration, Reliability, and Route Center identically in structure, each exposing its own screens the same way.
- A Breadcrumb shows `Oil Analysis → Equipment → LP-114 → Sample OA-2026-0044` because the screen is genuinely four levels deep.
- Universal search returns an `Equipment_ID` match before it returns a loosely related free-text document match.

---

## Incorrect Usage

- A module adds its own secondary top bar with module-specific navigation, duplicating the Sidebar's role.
- A breadcrumb is shown on a shallow, top-level screen "for consistency," when there is no real hierarchy to display.
- A notification opens a generic list screen and expects the user to find the relevant item themselves.
- Two modules implement their own separate search boxes with different result behavior.

---

## Future Considerations

- AI-generated recommendations (100 §11) must surface through the same equipment-centric navigation paths defined here — never through a separate "AI navigation" system that fragments the one-platform experience (099 §8).
- Future ERP integration must map its own records onto the existing `Equipment_ID` scheme so that cross-system navigation follows this same architecture rather than introducing a parallel one.
- As new modules are added, this document's navigation rules must be re-validated against them, not re-written for them.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §3 Equipment Before Everything, §4 Decision Before Information, §8 One Platform — One Language, §12 Longevity
- 100_ACC_BRAND_IDENTITY.md — §7 Information Hierarchy
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2 Layout Components (Sidebar, Breadcrumb), §5 Input Components (Search), §6 Navigation Components
- 108_ACC_INFORMATION_ARCHITECTURE.md — hierarchy that Breadcrumb and Search must reflect

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — platform, module, equipment-centric, cross-module, search, and deep-link navigation architecture established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical"→"Alert condition" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
