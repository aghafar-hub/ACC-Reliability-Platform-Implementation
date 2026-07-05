# ACC Reliability Platform
# 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-104 |
| Title | ACC Reliability Platform — Component and Interaction Language |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md |
| Scope Note | This is the implementation *contract* — every reusable component and interaction pattern a screen may use, and the rules governing each. It does not discuss color, typography, icon design, CSS, React, or any other implementation detail. |

---

## 1. Component Philosophy

Components exist to support an engineering decision — never to express a developer's or a screen's individual style.

- **Consistency is more important than creativity.** A component that is slightly more elegant in one screen but inconsistent with the rest of the platform is a defect, not an improvement.
- **Every identical action must use the same component everywhere.** If two screens both let a user approve something, they use the same Approval dialog — not two different-looking implementations of the same idea.
- A component's value is measured by how quickly and correctly it lets an engineer act — not by how novel or visually distinctive it is.

---

## 2. Layout Components

| Component | Definition |
|---|---|
| **Platform Shell** | The outer frame present on every screen. Owns branding, global navigation, and the user's platform-wide context. No module may redefine or bypass it. |
| **Sidebar** | The persistent, primary means of moving between modules and between a module's own screens. Always present, always in the same position. |
| **Top Navigation** | Global utilities only — search, notifications, user identity, theme/language. Never module-specific navigation; that belongs to the Sidebar. |
| **Page Header** | Exactly one per screen. States what screen this is and its immediate context. Never duplicated within the Content Area below it. |
| **Breadcrumb** | Used only when a screen sits more than one level deep in a hierarchy (e.g., Module → Equipment → Sample). Shows the path back, not a decoration. |
| **Footer** | The quietest region of the platform. Carries only system-level information (timestamps, sync state) — never navigation, never calls to action. |
| **Content Area** | The scrollable work surface beneath the Page Header. Everything a screen actually does lives here. |
| **Split Panels** | A two-region layout (e.g., a primary table beside a secondary detail/summary rail). Used when a screen has one dominant task and one supporting context, never for two equally-weighted unrelated tasks. |
| **Resizable Panels (future)** | Reserved concept for a user-adjustable Split Panel boundary. Not yet available; any future implementation must still respect the same dominant/supporting relationship Split Panels already enforce. |

**Rules:**
- Spacing and alignment follow one fixed scale platform-wide — no screen invents its own margins or gutters.
- No screen may introduce a layout region other than the ones defined above.
- Responsive collapse always removes secondary/supporting regions first (Split Panel's supporting side, Breadcrumb, Footer detail) and preserves the primary Content Area and its most critical information last.

---

## 3. Information Components

| Component | Purpose | Use when | Do not use when |
|---|---|---|---|
| **KPI Tile** | A single headline fact with a drill-down | The number is the entire point of the widget (fleet-wide or module-wide counts) | The user needs several related numbers together — use Statistics Panel instead |
| **Status Card** | Shows the current condition of one specific entity | Heading a detail screen for one equipment/sample/action | Listing many entities — that is a table's job |
| **Summary Card** | A compact preview of a record before drilling in | Search results, list previews, cross-module references | The card would be the only source of a critical decision — it must always link to full detail |
| **Information Card** | Supporting/contextual information that is not itself actionable | Background/explanatory content (e.g., "about this module") | An action is actually expected — use Decision Card instead |
| **Decision Card** | Presents exactly one decision with its action controls | Queues, approval workflows, today's-action lists | More than one unrelated decision is combined in a single card — split them |
| **Statistics Panel** | A grouped set of related metrics needing shared context | Multi-metric breakdowns (e.g., review/approval queue counts together) | Only one number matters — use a KPI Tile instead |
| **AI Insight Card (future)** | Presents an AI-generated recommendation | The platform has a verified, decision-relevant AI output to surface | Never as a substitute for verified human/engineering data, and never blended into a Decision Card as if it were human-confirmed |

---

## 4. Data Components

| Component | Definition |
|---|---|
| **Engineering Table** | The platform's primary dense data grid. Identity/ID column(s) first, status next, supporting detail after, actions last. |
| **Compact Table** | A condensed variant for sidebars/secondary panels — fewer columns, same row-consistency discipline as the Engineering Table. |
| **Tree Table** | Hierarchical data (e.g., equipment → lubrication points), with expand/collapse rows. |
| **Timeline** | A single entity's chronological history, presented vertically, with a fixed and consistent chronological direction per module. |
| **Activity Feed** | A cross-entity, capped, reverse-chronological stream of recent events, with a path to see more. |
| **History Log** | The unabridged audit trail of one entity — unlike the Activity Feed, never capped or summarized. |
| **Equipment Summary** | A fixed-shape header block for an equipment detail screen: identity, condition, key facts. Never a table. |
| **Report Preview** | A read-only rendering of a report before export/print, matching the report's own document hierarchy exactly. |

**Rules:**
- **Sorting:** one column sorted at a time, with a visible indicator; default sort is by urgency/severity, not alphabetically, unless the table has no severity dimension at all.
- **Filtering:** filter state is owned by the screen's Filter component (Section 5), never duplicated inside the table itself.
- **Searching:** search is treated as a filter and follows the same rule.
- **Pagination:** used only for a genuinely full, paged list. Dashboards prefer a capped list with an explicit "View All" link over pagination controls.
- **Density:** compact by default everywhere, especially the Engineering Table — whitespace is never added "for breathing room" at the cost of rows visible per screen.
- **Sticky headers:** required for any table taller than one screen.
- **Column behavior:** identity/ID columns are never hidden or collapsed responsively; secondary columns collapse first on narrow viewports.

---

## 5. Input Components

| Component | Rule |
|---|---|
| **Search** | Free-text, always paired with a placeholder describing what is searchable. |
| **Filter** | Structured criteria; always shows an active-filter count; always has one clear reset. |
| **Dropdown** | Single-select from a known list of generic options. Not used for equipment or lubrication points — those have their own dedicated selectors below. |
| **Date Picker** | Dates are always shown unambiguously; no locale-ambiguous numeric-only formats. |
| **Time Picker** | Same unambiguity requirement as Date Picker. |
| **Equipment Selector** | The only sanctioned way to choose equipment anywhere in the platform. Searchable by `Equipment_ID` and name. |
| **LP Selector** | Scoped to a previously chosen equipment; follows the same interaction pattern as the Equipment Selector. |
| **File Upload** | Generic file attach — drop zone plus browse, shown with filename and file-type indicator. |
| **PDF Upload** | Same base pattern as File Upload, with an inline preview of the document. |
| **Photo Upload** | Same base pattern as File Upload, with a thumbnail preview. |
| **Text Input** | Standard free text; length/format constraints are always shown, not discovered only on error. |
| **Number Input** | Numeric entry only; right-aligned display once entered, consistent with the numeric rules in 102_ACC_TYPOGRAPHY_STANDARD.md. |
| **Toggle** | An instant binary state change; requires no confirmation unless the change is destructive. |
| **Checkbox** | Multi-select semantics only — never used where selection is meant to be exclusive. |
| **Radio** | Single-select-from-a-set semantics only — never used where multiple values are valid. |

---

## 6. Navigation Components

| Component | Rule |
|---|---|
| **Sidebar** | Persistent module and in-module navigation, always in the same place. |
| **Tabs** | Switch between views of the *same* entity or scope, sharing one data context. |
| **Secondary Tabs** | Sub-views nested within a single Tab — never more than one level of nesting. |
| **Breadcrumb** | Shows the hierarchical path back; used only when genuinely more than one level deep. |
| **Quick Navigation** | A fast, search-driven way to jump directly to a known entity or screen. |
| **Module Navigation** | Switching between platform modules — lives in the Sidebar, never duplicated elsewhere. |
| **Back Navigation** | Always returns to the logical parent context, not merely the browser's history stack. |
| **Deep Links** | A URL must resolve directly to the exact entity/screen it names, identically across every module. |

---

## 7. Feedback Components

| Component | Rule |
|---|---|
| **Notification** | Persistent; lives in a list the user can review later; never disappears on its own. |
| **Toast** | Transient, self-dismissing; confirms an action the user just took. |
| **Alert** | Prominent/blocking; reserved for conditions that require acknowledgment before proceeding. |
| **Warning** | Non-blocking, caution-level message; informs without stopping the user's work. |
| **Success** | Brief confirmation that a completed action succeeded. |
| **Confirmation** | Required before an irreversible or high-impact action; always states the exact consequence. |
| **Progress** | Determinate; shows real progress of an operation with a known length. |
| **Loading** | Indeterminate; shows an operation is underway without implying a timeline. |
| **Skeleton** | A structural placeholder matching the shape of the content that will appear — never a generic full-screen spinner for a partial load. |
| **Busy State** | A control disables and indicates it is processing without freezing the rest of the screen. |

---

## 8. Dialog Components

| Component | Rule |
|---|---|
| **Modal** | A focused single-task dialog that blocks the background until resolved. |
| **Drawer** | A side-anchored panel for supplementary detail without leaving the current screen. |
| **Confirmation** | Precedes any consequential action; states exactly what will happen. |
| **Approval** | Formal sign-off; always logs who approved and when. |
| **Reject** | Mirrors Approval; always requires a stated reason. |
| **Delete** | The highest-friction confirmation in the platform; states precisely what is being permanently removed and whether it can be undone. |
| **Assign** | Select a person or team, with an optional note. |
| **Preview** | Read-only view of a document or record before acting on it — never permits silent editing. |

---

## 9. Empty States

**Rules:**
- Never a large decorative illustration — an empty state is compact, honest, and takes up no more space than the content it stands in for would have.
- Always states plainly *why* there is nothing to show (no data yet, filtered to nothing, awaiting first entry).
- Always provides a specific next action (e.g., "Add Sample," "Clear filters") — never leaves the user with nothing to do next.
- Phrasing is consistent platform-wide for the same underlying reason (e.g., every "filtered to nothing" empty state reads the same way, regardless of module).

**Examples:**
- ✅ "No critical equipment. [Clear filters]" — compact, honest, actionable.
- ❌ A full-width graphic with a lighthearted caption and no next step.

---

## 10. Error States

| Error type | Rule |
|---|---|
| **Connection** | States plainly that the platform cannot reach its data source; offers retry. |
| **Permission** | States exactly what is restricted and why — never a generic "error" message. |
| **Validation** | Attached directly to the offending field or action — never a disconnected banner elsewhere on the screen. |
| **Missing Data** | Distinguished from a true error — "no data" is not a failure and must never be styled with alarming error treatment. |
| **Sync Failure** | States what failed to synchronize and offers retry or a manual path forward. |
| **Unexpected Error** | The fallback only when no specific case applies; never blames the user; always offers a path forward. |

**Engineering-software rule:** an error state must never hide or soften an engineering-relevant fact. If data failed to load, the platform says so plainly — it never shows a stale or blank view that could be mistaken for "everything is fine."

---

## 11. Interaction Rules

| Interaction | Rule |
|---|---|
| **Hover** | Desktop-only affordance hinting interactivity — never the sole way to reveal essential information. |
| **Focus** | Always visible; keyboard navigation order follows the visual/logical order of the screen. |
| **Keyboard** | Every action reachable by mouse must also be reachable by keyboard. |
| **Selection** | Single-select vs. multi-select must always be visually unambiguous. |
| **Double Click** | Reserved for "open/drill into" on a data row — never used for a destructive action. |
| **Right Click (desktop)** | Offers a contextual menu duplicating actions available elsewhere — never platform-exclusive functionality. |
| **Long Press (mobile)** | The mobile equivalent of a secondary action — must be discoverable, never the *only* way to reach a function. |
| **Drag & Drop (future)** | Reserved for reordering or file-drop convenience only — never required for a primary workflow, so it never becomes an accessibility trap. |
| **Copy / Paste** | Respected natively wherever text or engineering IDs appear — never blocked. |
| **Undo / Redo** | Offered wherever an action is easily reversible. Where an action is not reversible, a Confirmation dialog (Section 8) stands in for Undo. |

---

## 12. Mobile Adaptation

**What changes:** layout structure, information density per screen, and navigation chrome (the Sidebar becomes a compact/collapsible pattern).

**What never changes:** the component vocabulary itself, the meaning of any status, the fixed information hierarchy from 102_ACC_TYPOGRAPHY_STANDARD.md, and the identifier treatment of engineering IDs.

**Desktop tables → mobile cards:** each row becomes one compact card preserving the exact same field order and the same status indicator as the desktop row — nothing is dropped, only the layout reflows.

**Accordion rules:** secondary/supporting zones collapse by default on mobile. Primary decision content (critical equipment, required actions) is never placed inside a collapsed accordion by default — it must remain visible above the fold exactly as on desktop.

---

## 13. Accessibility

- **Keyboard:** full platform operability without a mouse.
- **Screen reader:** every component exposes its name, role, and current state.
- **Touch target:** every interactive element meets the platform's minimum reliable touch size (consistent with 103_ACC_ICONOGRAPHY_STANDARD.md, Section 8).
- **Focus visibility:** a visible focus indicator is always present and is never removed for aesthetic reasons.
- **Contrast:** every component's text, icon, and border meets the contrast rules defined in 101_ACC_COLOR_SYSTEM.md.

---

## 14. Examples

**Layout**
- ✅ A screen with a deep entity path shows a Breadcrumb; a shallow top-level screen does not force one.
- ❌ A module builds its own header bar instead of using the Page Header, breaking consistency with every other module.

**Information**
- ✅ A fleet-wide alert count is a KPI Tile with a drill-down; the review/approval breakdown next to it is a Statistics Panel.
- ❌ A single number is wrapped in a large Statistics Panel just to "fill the layout."

**Data**
- ✅ An Engineering Table keeps identical row structure across all 200 rows, sorted by severity, with a sticky header.
- ❌ A table hides its ID column responsively to save space on a narrow screen.

**Input**
- ✅ Choosing equipment always uses the Equipment Selector, everywhere in the platform.
- ❌ One screen lets a user type a free-text equipment name instead of using the Equipment Selector.

**Feedback**
- ✅ A destructive action shows a Confirmation dialog stating exactly what will be removed.
- ❌ A destructive action executes immediately with only a Toast afterward.

**Empty/Error**
- ✅ An empty critical-equipment list reads "No critical equipment" — a fact, not a graphic.
- ❌ A failed data load is shown as a blank table with no error state, indistinguishable from "everything is fine."

**Mobile**
- ✅ A desktop table becomes a stack of cards on mobile, each preserving the same fields and status indicator.
- ❌ A mobile screen hides the critical-equipment section inside a collapsed accordion by default.

---

## 15. Component Governance

- Before building anything new, a developer must first check whether an approved component in this document already satisfies the need.
- A developer may not invent a new component, or a one-off variant of an existing one, to solve a single screen's need.
- Any genuinely new component must be documented in this file — added here — **before** it is implemented anywhere in the platform.
- If a pattern is likely to repeat across more than one screen, it must be formalized here first rather than allowed to proliferate as several slightly different local implementations.
- Approval authority for adding to this document rests with the ACC Reliability Department (per Document Control above), not with an individual developer's judgment alone.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full component and interaction language established as the platform's implementation contract. Pending approval. |
