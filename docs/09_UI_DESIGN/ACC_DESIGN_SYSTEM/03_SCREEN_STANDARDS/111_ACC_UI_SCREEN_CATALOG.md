# ACC Reliability Platform
# 111_ACC_UI_SCREEN_CATALOG.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-111 |
| Title | ACC Reliability Platform — UI Screen Catalog |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–110 (full Design System to date) |
| Scope Note | This document classifies every allowed *category* of screen. It does not define a screen's internal template (112), its layout arrangement (113), or its components (104) — only what kind of screen it is, for whom, and how it relates to equipment and to other screens. |

---

## Purpose

To ensure no module ever invents an unclassified kind of screen. Every screen in every module — present or future — must belong to exactly one of the categories defined here, so that a user's expectations of "what this kind of screen does" transfer instantly between modules.

---

## Scope

This catalog applies to every screen in every module, including future modules (Reliability Engineering, Route Center, AI Assistant, etc.). It governs screen *classification* only — purpose, audience, entry point, information priority, expected actions, and relationship to `Equipment_ID` and to other categories. It does not govern internal structure (112), layout (113), or component choice (104).

---

## Design Philosophy

A screen's category must be decided before its layout or components are chosen (099 §2 Platform Before Module). Categorization is what lets a new module be understood instantly by someone who already knows the platform — they recognize "this is a Register" or "this is an Equipment page" before they read a single word of module-specific content (100 §9 Platform Consistency Rules).

---

## Engineering Rules

**Platform screens** — Purpose: platform-wide, module-agnostic surfaces (authentication, global settings, module selection). Primary users: everyone. Entry: the Platform Shell itself, before any module is chosen. Information priority: identity and orientation only. Expected actions: authenticate, choose a module. Equipment_ID: none — the only category with no equipment relationship. Relation to other categories: sits above every Module Dashboard.

**Module dashboards** — Purpose: the decision surface for a module (106). Primary users: engineers/managers of that module, plus the ACC owner view. Entry: Sidebar module selection. Information priority: the fixed hierarchy in 106. Expected actions: drill into Registers, Equipment pages, or Action queues. Equipment_ID: aggregates many, links out to each. Relation: sits above Registers and Analytics for its module.

**Registers** — Purpose: the full browsable list of a module's governed entities (e.g., an Equipment & LP Register). Primary users: engineers performing bulk review. Entry: Sidebar, or a dashboard's "View All" link. Information priority: a scannable, status-first Engineering Table (104 §4). Expected actions: filter/search, open a specific Equipment page. Equipment_ID: one row represents one equipment (or one lubrication point tied to one). Relation: feeds directly into Equipment pages.

**Equipment pages** — Purpose: the platform's central page type (114) — everything about one `Equipment_ID` in one place. Primary users: everyone. Entry: from a Register row, a dashboard's critical-equipment row, or universal search. Information priority: identity and condition first (100 §7). Expected actions: review history, open records, raise actions. Equipment_ID: this category's entire subject. Relation: the hub connecting Detail, Action, Approval, and Report pages for that equipment.

**Detail pages** — Purpose: the full view of one Record (e.g., one sample report). Primary users: engineers reviewing or verifying a specific record. Entry: from an Equipment page's record list. Information priority: the record's own data. Expected actions: verify, approve, comment. Equipment_ID: inherited from the parent equipment. Relation: a child of an Equipment page.

**Action pages** — Purpose: manage one Engineering Action end-to-end. Primary users: engineers and contractors executing the work. Entry: from an Equipment page, a dashboard action queue, or a notification. Information priority: what must be done, and by when. Expected actions: update status, assign, close. Equipment_ID: always tied to exactly one. Relation: a child of an Equipment page; may also surface in a Module Dashboard's action queue (106).

**Approval pages** — Purpose: a formal sign-off decision, expanded to a full page when the decision needs more supporting context than the Approval dialog (104 §8) can hold. Primary users: managers and ACC authority. Entry: from a review/approval queue. Information priority: what is being approved and its supporting evidence. Expected actions: approve or reject, with a reason. Equipment_ID: tied to the record/action being approved. Relation: the terminal step before History is updated (108).

**Settings** — Purpose: user- or module-level configuration. Primary users: administrators and module owners. Entry: Sidebar settings entry. Information priority: configuration grouped logically. Expected actions: change and save configuration. Equipment_ID: typically none. Relation: platform/module-level, not equipment-level.

**Configuration** — Purpose: platform-level technical or business-rule configuration (e.g., threshold rules), distinct from per-user Settings. Primary users: administrators. Entry: the Administration area. Information priority: rule clarity and change history. Expected actions: modify governing rules. Equipment_ID: may reference an equipment class, not an individual equipment. Relation: governs how other categories behave (e.g., threshold rules feed Equipment Health, per 101/106).

**Reports** — Purpose: a formatted, exportable synthesis of History for a Decision (108). Primary users: managers and executives. Entry: a Reports module screen, or generated directly from an Equipment page. Information priority: per 102 §8 Report Typography. Expected actions: export, print, share. Equipment_ID: scoped to one equipment or many. Relation: derived from Equipment History; always read-only, never itself a data source (108).

**Analytics** — Purpose: interactive, cross-entity trend and pattern exploration — distinct from a Report, which is a fixed document. Primary users: engineers and managers investigating a pattern. Entry: a Module Dashboard's chart drill-down. Information priority: per 107's visualization rules. Expected actions: filter, compare, drill into a specific equipment. Equipment_ID: many, aggregated. Relation: sits between Module Dashboards and Equipment pages.

**Administration** — Purpose: platform-wide governance (users, roles, contractors, modules). Primary users: administrators and ACC authority. Entry: a dedicated Administration area. Information priority: governance clarity. Expected actions: manage users, roles, permissions. Equipment_ID: none. Relation: platform-level; governs the role differences defined in 115.

**Dialogs** — Purpose: a focused, single-task interruption (104 §8). Primary users: whoever is mid-workflow. Entry: triggered from another screen; never navigated to directly. Information priority: the one decision at hand. Expected actions: confirm, cancel, or complete the task. Equipment_ID: inherited from the triggering screen. Relation: always a child of another category, never standalone.

**Wizard screens** — Purpose: guide a user through an infrequent, structured multi-step process (e.g., onboarding new equipment). Primary users: whoever performs that task. Entry: an explicit "start" action. Information priority: current step and overall progress. Expected actions: advance, go back, complete. Equipment_ID: established during the wizard, or supplied at the start. Relation: produces a new Record or Equipment entry feeding into the standard hierarchy (108) once complete.

**Mobile screens** — Not a separate category of content, but the mobile-adapted presentation of every other category (109). Listed here explicitly to confirm that mobile never invents a new screen type of its own. Primary users: field engineers. Entry: the same navigation, adapted chrome (105, 109). Equipment_ID and information priority: identical to the desktop counterpart. Relation: mobile is a presentation mode of the other categories, not a category unto itself.

**Error screens** — Purpose: communicate a platform-level failure that prevents normal use (distinct from the localized, in-page Error States of 104 §10). Primary users: anyone hitting a hard failure (e.g., no permission to an entire route). Entry: automatic, on failure. Information priority: what failed, and what to do next. Expected actions: retry, go back, contact support. Equipment_ID: preserved in context where known, so the user can return to it once resolved. Relation: can interrupt any other category.

**Loading screens** — Purpose: full-screen indication that the platform itself is initializing (distinct from the localized Loading/Skeleton states of 104 §7). Primary users: anyone on initial load or authentication. Information priority: minimal — confirms the platform is starting. Expected actions: wait. Equipment_ID: none. Relation: precedes Platform screens.

**Maintenance screens** — Purpose: inform users the platform itself is undergoing planned maintenance. Primary users: everyone. Entry: automatic, platform-wide. Information priority: expected duration/status. Expected actions: none required. Equipment_ID: none. Relation: can temporarily override any other category.

**Future AI screens** — Not a separate destination, but the presentation surface for AI Insight Cards (104 §3) and AI-augmented Reports/Analytics (106, 107) once built. Primary users: whoever already uses the underlying dashboard, report, or equipment page. Entry: same as the category it augments. Information priority: same hierarchy, with AI content always clearly marked as such (100 §11). Expected actions: same as the underlying category, plus review/accept an AI recommendation. Equipment_ID: same relationship as the category it augments. Relation: augments existing categories; never a standalone new category (099 §8 One Platform — One Language).

---

## Correct Usage

- A new module's list screen is built and labeled as a Register, reusing the same expectations a user already has from other modules' Registers.
- A future AI recommendation appears as a card inside an existing Equipment page, not as a separate "AI screen" a user must learn to find.
- An in-progress multi-step equipment onboarding flow is built as a Wizard screen, not disguised as a long Settings form.

---

## Incorrect Usage

- A module builds a screen that mixes a Register's list behavior with an Equipment page's detail behavior into one ambiguous hybrid.
- A "Reports" screen is made directly editable, blurring it with a Detail page and violating the read-only rule in 108.
- An error condition is shown using the in-page Error State pattern (104 §10) when the failure is actually platform-wide and should be a full Error screen.

---

## Engineering Examples

- Oil Analysis: Dashboard (Module dashboard) → Equipment & LP Register (Register) → Equipment Details (Equipment page) → Sample Report (Detail page) → Engineer Review (Approval page).
- A contractor receives a notification (104 §7) that deep-links (105) directly into an Action page for one piece of equipment.

---

## Future Considerations

- Route Center will introduce Route-specific screens; these must be classified into the existing categories (e.g., a route list is a Register, a route stop's detail is a Detail page) rather than inventing "Route screens" as a new category.
- The AI Assistant module, when built, must express itself through Future AI screens as defined here — augmenting existing categories — not as a standalone application-within-the-platform.
- As the catalog is used, any genuinely new category that emerges must be added here through the same governance discipline as new components (104 §15).

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §2 Platform Before Module, §8 One Platform — One Language
- 100_ACC_BRAND_IDENTITY.md — §7 Information Hierarchy, §9 Platform Consistency Rules, §11 Future AI Readiness
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3, §4, §7, §8, §10
- 106_ACC_DASHBOARD_PHILOSOPHY.md — Module Dashboard definition
- 107_ACC_DATA_VISUALIZATION_STANDARD.md — Analytics screen basis
- 108_ACC_INFORMATION_ARCHITECTURE.md — Report/History relationship
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md — Equipment pages as the platform's hub

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — the full platform screen catalog, 19 categories, established. Pending approval. |
