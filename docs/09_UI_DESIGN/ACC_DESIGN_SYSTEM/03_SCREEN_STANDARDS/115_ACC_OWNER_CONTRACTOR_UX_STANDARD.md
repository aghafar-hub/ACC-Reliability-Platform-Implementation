# ACC Reliability Platform
# 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-115 |
| Title | ACC Reliability Platform — Owner / Contractor UX Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–110, 111_ACC_UI_SCREEN_CATALOG.md, 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md |
| Scope Note | This document defines UX differences by role — visibility, navigation, dashboard, table, KPI, notification, and permission scope. It does not redefine the components (104), the color/status semantics (101), or the equipment-centric pattern (114) — those remain identical for every role; only scope and authority differ. |

---

## Purpose

To ensure the platform's single Owner-supervises / Contractor-executes relationship (099 §5, 100 §5) is expressed consistently in every screen, for every role, so that no module ever blurs who is overseeing whom.

---

## Scope

Applies to every role that uses the platform — ACC Owner, Contractor, Manager, Engineer, Administrator — and to every module. Governs visibility and authority differences only; the platform's components, colors, and equipment-centric pattern never change per role.

---

## Design Philosophy

ACC supervises. Contractors execute. Every role sees the same platform, the same components, and the same semantic meanings — the platform never looks or behaves like a different product depending on who is logged in. What differs between roles is **scope** (what data is visible) and **authority** (what actions are permitted) — never the platform's structure, vocabulary, or values.

---

## Engineering Rules

**ACC Owner** — fleet-wide, cross-contractor visibility. The only role that can see and use cross-contractor comparisons (106, 107). Typically holds final Approval authority (104 §8).

**Contractor** (currently RHI, ASEC; extensible) — strictly scoped to their own assigned equipment and actions. Never sees another contractor's data, and never sees themselves compared against ACC (100 §5) — ACC is never a peer entity in any contractor-facing view.

**Manager** — typically ACC-side oversight, similar in kind to Owner visibility but potentially scoped to a business unit or area rather than the entire fleet. Holds Approval authority within that scope.

**Engineer** — works inside the detail layer (Equipment pages, Records, Actions, per 114). May or may not hold Approval authority depending on the workflow, mirroring the Review-vs-Approval distinction already defined in 104 §8.

**Administrator** — platform/module configuration and user/role management (111 Administration category). Broad visibility for configuration purposes, but this is a governance capability, not a reliability-oversight one — it must never be conflated with ACC's supervisory role over contractors.

**Approval authority** is a permission explicitly granted to a role (typically Manager or ACC Owner), never implied simply because a role has broad visibility. Visibility and approval authority are independent permissions and must always be defined separately.

**Visibility rules.** A contractor's UI never renders a data row belonging to another contractor. This is enforced consistently across every table, dashboard, and export — not only the primary list view.

**Navigation differences.** The Sidebar and screen categories (105, 111) are structurally identical for every role. What differs is which data resolves into them — a contractor does not receive a "simplified" navigation; they receive the same navigation, scoped to less data.

**Dashboard differences.** Per 106: Owner dashboards are fleet-wide and cross-contractor; Contractor dashboards are scoped to that contractor's own execution responsibilities. Both share the same information hierarchy and widget philosophy — they differ in data scope only.

**Table differences.** The same Engineering Table structure (104 §4) is used for every role. Rows are filtered by scope; columns and behavior are never altered per role.

**KPIs.** The same KPI Tile component and semantic meaning is used for every role (106). The number shown differs by scope; the definition of the KPI never does.

**Notifications** are scoped the same way as data visibility — a contractor is notified only within their own scope; ACC/Managers may receive fleet-wide notifications consistent with their oversight role.

**Permissions** govern *action* authority (approve, assign, edit) independently from *visibility* scope (what can be seen). The two must always be defined separately for every role — never assumed to be the same permission.

**Equipment visibility.** Every role navigates the same equipment-centric pattern (114); the set of equipment visible to them is scoped exactly as their tables and dashboards are.

**Cross-contractor behaviour.** No UI ever places two contractors' data in a way that implies they can see or compare each other. Only ACC's Owner view may compare contractors to one another (100 §5, 106).

**Future external contractor support.** Additional contractors beyond RHI/ASEC are added as new instances of the same Contractor role — never requiring new UX rules of their own.

**Future OEM support.** An OEM (original equipment manufacturer) role, if introduced, must be scoped narrowly — most likely to specifications/documentation for equipment they manufactured, not to operational contractor-style execution data — and formally defined here, through the same governance discipline as a new component (104 §15), before implementation.

**Future consultant access.** A consultant role, if introduced, is a temporary, narrowly-scoped visibility grant — never as broad as Manager/Owner by default, and always understood as time-bounded in principle, even where the specific implementation of that boundary is out of scope for this document.

---

## Correct Usage

- A contractor opens the Oil Analysis Dashboard and sees only their own equipment, actions, and KPIs — using the exact same dashboard structure an ACC Owner would see, just narrower in scope.
- A Manager approves an action within their assigned area; the same Approval dialog (104 §8) is used platform-wide, regardless of who is using it.
- A Contractor Comparison chart is visible only to ACC Owner/Manager roles and is never rendered for a Contractor-scoped user.

---

## Incorrect Usage

- A contractor's dashboard is built as a visually different, simplified product instead of the same dashboard scoped to less data.
- A contractor is shown a "performance comparison" that includes ACC as one of the compared parties.
- An Administrator's broad configuration access is used to grant them the same reliability-oversight standing as an ACC Owner, conflating two distinct kinds of authority.

---

## Engineering Examples

- ACC Owner viewing the Oil Analysis Dashboard sees a Contractor Comparison of RHI vs. ASEC; the same dashboard opened by an RHI user shows no Contractor Comparison widget at all, since it has no meaning at their scope.
- A Manager approves a sample review within their business unit; an Engineer without Approval authority can open and read the same screen but cannot complete the approval action.

---

## Future Considerations

- As Route Center introduces field crews, the same Owner/Contractor/Manager/Engineer role model must be reused rather than inventing a parallel role system for that module.
- OEM and consultant roles should be formally specified (visibility scope, permitted actions) before either is implemented, using this document as the template for defining any future role.
- Cross-contractor collaboration features, if ever introduced, must be evaluated against the "no contractor sees another contractor's data" rule as a hard constraint, not a default to be relaxed for convenience.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §5 Owner Before Executor
- 100_ACC_BRAND_IDENTITY.md — §5 Owner vs Contractor Philosophy
- 101_ACC_COLOR_SYSTEM.md — §6 Status Color Rules
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3, §4, §8, §15
- 105_ACC_NAVIGATION_ARCHITECTURE.md — navigation structure shared across roles
- 106_ACC_DASHBOARD_PHILOSOPHY.md — Owner vs Contractor dashboard rule
- 108_ACC_INFORMATION_ARCHITECTURE.md — Decision authority within the information flow
- 111_ACC_UI_SCREEN_CATALOG.md — Administration category
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md — the equipment-centric pattern every role navigates

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — role-based visibility and authority rules established, grounded in the Owner-supervises/Contractor-executes philosophy. Pending approval. |
