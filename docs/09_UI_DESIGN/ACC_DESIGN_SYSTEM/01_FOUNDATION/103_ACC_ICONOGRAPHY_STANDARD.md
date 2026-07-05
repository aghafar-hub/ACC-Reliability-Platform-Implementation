# ACC Reliability Platform
# 103_ACC_ICONOGRAPHY_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-103 |
| Title | ACC Reliability Platform — Iconography Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md |
| Scope Note | This document defines the icon *language* — philosophy, style rules, and the fixed vocabulary of icon meanings. It does not select an icon library, and it does not discuss color, typography, components, or implementation. |

---

## 1. Icon Philosophy

An icon in the ACC Reliability Platform is a communication tool, not a decoration. Its purpose is to let an engineer recognize an action, a status, a piece of equipment, or a navigation target faster than reading the word for it would take — especially under time pressure, on a small screen, or when scanning a long list.

Icons must communicate exactly one of the following, and nothing else:

- **Action** — what will happen if the user interacts with this control.
- **Status** — what condition something is currently in.
- **Navigation** — where this control will take the user.
- **Equipment** — what physical asset or asset category is being represented.
- **Engineering concept** — a recognized technical idea (trend, inspection, lubrication point, etc.) that benefits from instant visual recognition.

An icon that exists only to make a screen "feel less empty," to add visual interest, or to mirror a generic template has no place in this platform. If removing an icon would not reduce a user's recognition speed or clarity, the icon should not be there.

Every icon must also be paired with a text label or be immediately, unambiguously understood in context — an icon never replaces meaning on its own (see Section 9).

---

## 2. Icon Style

The platform uses exactly one icon style, applied without exception across every module, so that visual language never has to be relearned screen to screen.

- **Stroke vs Filled:** the platform uses a single consistent approach — outlined/stroke icons for the general vocabulary (navigation, actions, equipment categories), with filled treatment reserved only for a small, deliberate set of status indicators where a solid mark reads faster than an outline (see Section 5). A module may never introduce filled icons for ordinary navigation/action use just because it prefers the look.
- **Corner style:** corner treatment (sharp vs. rounded) must be uniform across the entire icon set — mixing sharp-cornered and rounded-cornered icons within the same interface reads as inconsistency and undermines the "one platform" identity.
- **Line weight consistency:** stroke width is fixed across the entire icon set, regardless of the icon's subject or size context — a thin bearing icon next to a thick notification icon would visually compete rather than sit together as one family.
- **Optical balance:** icons must appear equally "weighted" to the eye at their intended size — a visually dense icon (e.g., a gearbox) must be balanced so it doesn't appear heavier or more prominent than a simpler icon (e.g., a bell) sitting beside it in the same row or menu.
- **Recognition at small sizes:** every icon in the platform's vocabulary must remain identifiable at the smallest size it will actually be used at (e.g., a dense table row or a compact mobile nav bar) — an icon that only "works" at a large size is not fit for this platform, since dense engineering screens are the norm, not the exception.

(This document defines these style rules only. Selecting a specific icon library or asset set is an implementation decision made later, against these rules.)

---

## 3. Platform Icons

These represent platform-level capabilities that exist outside any single module — the icons a user learns once and relies on everywhere.

| Concept | Represents |
|---|---|
| Dashboard | The command/overview surface of a module or the platform |
| Equipment | The physical asset entity itself, at the platform level (distinct from equipment-type icons in Section 6) |
| Actions | An engineering action or task requiring follow-through |
| Reports | Generated or exportable documents summarizing engineering data |
| Notifications | System- or event-driven alerts requiring the user's awareness |
| Settings | Configuration of the platform or a module |
| Search | Free-text lookup across records |
| Filter | Narrowing a list or table by criteria |
| Export | Sending platform data out (e.g., to a file) |
| Import | Bringing external data into the platform |
| History | A past record of events tied to an entity |
| Timeline | A chronological, sequential view of events tied to an entity |
| Approval | A formal sign-off decision step |
| Review | An in-progress evaluation step, prior to a decision |
| Documents | Stored files/attachments tied to an entity |
| AI Insights (future) | A platform-generated recommendation or analysis, always visually distinct from human-entered data |

---

## 4. Module Icons

Each module has exactly one icon, used consistently everywhere that module is referenced (navigation, module switchers, cross-module links). A module's icon must visually represent its engineering subject, not an abstract or generic symbol.

- Oil Analysis
- Lubrication
- Vibration
- Reliability
- Route Center
- Equipment Management
- Reporting
- Administration
- Future modules — each new module is assigned one new icon under this same rule; a new module must never reuse another module's icon, and must never launch without one clearly distinct icon of its own.

---

## 5. Status Icons

Status icons are the platform's most safety-critical icon category, because a misread status icon can lead to a wrong engineering decision. Every status icon must correspond exactly to the semantic roles defined in 101_ACC_COLOR_SYSTEM.md — an icon must never introduce a status meaning that document does not already define.

| Status | Icon role |
|---|---|
| Normal | Confirms a normal, in-compliance condition |
| Information | Marks a neutral, non-urgent state |
| Caution | Marks an elevated-risk condition requiring monitoring |
| Alert | Marks an urgent condition requiring immediate attention |
| Pending | Marks a state awaiting a decision or process step |
| Approved | Marks a completed, affirmative decision |
| Rejected | Marks a completed, negative decision |
| Overdue | Marks a time-based failure to meet a deadline |
| Offline | Marks a system/device/connection that is not currently reachable |
| Online | Marks a system/device/connection that is currently reachable |
| Synced | Marks data confirmed consistent with its source of truth |
| Not Synced | Marks data pending or failed synchronization |

Status icons use the filled treatment referenced in Section 2 — a deliberate, singular exception to the platform's otherwise stroke-first icon language, because status recognition benefits from the faster, more solid read a filled mark provides.

---

## 6. Engineering Icons

These represent physical equipment types and engineering concepts a user must recognize instantly, especially when scanning equipment lists or reports.

**Equipment types:**
Equipment (generic), Bearing, Gearbox, Motor, Pump, Fan, Conveyor, Compressor

**Oil analysis & lab:**
Oil Sample, Oil Bottle, Laboratory, PDF Report, Trend

**Condition monitoring:**
Temperature, Vibration

**Lubrication & inspection:**
Lubrication Point, Inspection

**Work & documentation:**
Engineering Action, Work Order Reference, Route, Document

Every engineering icon must be immediately recognizable as its specific subject — a Bearing icon must not be visually confusable with a generic Equipment icon, and a Pump must not be confusable with a Fan. Where two engineering concepts risk visual confusion at small size, the platform must choose more distinct silhouettes rather than relying on a label to disambiguate them (labels remain required regardless, per Section 9).

---

## 7. Interactive Icons

Icon behavior must be predictable and identical regardless of where it appears — inside a button, a table, a menu, a dialog, or a card.

- **Buttons:** icon reinforces the action's label; an icon-only button is permitted only where the action is universally understood platform-wide (and must still carry an accessible text equivalent — see Section 9).
- **Tables:** icons in table rows/cells follow the same recognition-at-small-size requirement as Section 2 — a table is the densest, most demanding context an icon will appear in.
- **Menus:** icons aid quick scanning of a list of options; every menu icon must come from the platform's fixed vocabulary (Sections 3–6), never a one-off symbol invented for a single menu.
- **Dialogs:** icons used sparingly — a dialog's job is a focused decision, and icon clutter works against that focus.
- **Cards:** an icon may anchor a card's subject (e.g., an equipment type), but must not multiply into decorative repetition across a card's content.

**State treatments**, applied consistently to every interactive icon regardless of category:
- **Hover:** a subtle, immediate visual acknowledgment that the icon is interactive — never a change that could be mistaken for a status change.
- **Selected:** a clearly distinct, persistent treatment showing the icon's control is currently active/engaged.
- **Disabled:** visually muted in a way that is unambiguous even without comparing it side-by-side to an enabled icon.
- **Loading:** a dedicated, calm loading treatment — never a repurposed status icon (e.g., never using the Caution icon to mean "loading").

---

## 8. Mobile Rules

- **Touch size:** every interactive icon must be sized for reliable touch interaction — an icon that is easy to tap precisely at a desk with a mouse is not automatically acceptable for a thumb in the field.
- **Recognition:** the same recognition-at-small-size discipline from Section 2 applies with even less margin on mobile — if an icon's silhouette degrades on a small screen, it must be reconsidered at the platform level, not patched per-module.
- **Spacing:** icons that trigger different actions must be spaced far enough apart that an imprecise touch (gloved hand, motion, field conditions) cannot trigger the wrong one — icon density that is acceptable on desktop is not automatically acceptable on mobile.

---

## 9. Accessibility

- **Meaning without color:** no icon may rely on color alone to convey its meaning — an icon's shape/silhouette must be distinguishable even if viewed without color (reinforcing 101_ACC_COLOR_SYSTEM.md, Section 8).
- **Screen readers:** every icon that conveys meaning (as opposed to being purely decorative and thus not permitted per Section 1) must have an accessible text equivalent — an icon is never the sole carrier of information for a user relying on assistive technology.
- **Contrast:** icons must meet the same contrast standard as text against their background (per 101_ACC_COLOR_SYSTEM.md, Section 8) — an icon that is hard to perceive is functionally equivalent to a missing icon.
- **Consistency:** the same concept must always use the same icon, everywhere in the platform, without exception — an icon vocabulary that shifts meaning between modules destroys the recognition-speed benefit icons exist to provide in the first place.

---

## 10. Examples

**Icon purpose**
- ✅ Correct: an icon appears next to "Export" because it lets a user recognize the action faster than reading the word alone.
- ❌ Incorrect: an icon is added to a panel header purely because the panel "looked empty" without one.

**Icon style consistency**
- ✅ Correct: every navigation icon in the sidebar shares the same stroke weight, corner style, and visual weight.
- ❌ Incorrect: one module's icons are filled and rounded while another module's are stroked and sharp-cornered.

**Status icons**
- ✅ Correct: the Alert icon is the same filled mark everywhere it appears — Oil Analysis, Vibration, Reliability — and is always paired with the word "Alert" or equivalent text.
- ❌ Incorrect: a module invents its own "urgent" icon distinct from the platform's Alert icon, splitting the vocabulary.

**Engineering icons**
- ✅ Correct: Bearing, Gearbox, and Pump are each instantly distinguishable from one another at table-row size.
- ❌ Incorrect: several equipment-type icons are so visually similar at small size that a user must read the label every time to tell them apart, defeating the icon's purpose.

**Mobile**
- ✅ Correct: two adjacent action icons in a mobile toolbar are spaced far enough apart that a touch reliably hits only one.
- ❌ Incorrect: icons are packed edge-to-edge on mobile the same way they are on desktop, causing frequent mis-taps.

**Accessibility**
- ✅ Correct: an icon-only button still exposes an accessible text label for screen readers.
- ❌ Incorrect: a status is conveyed by icon color alone, with no distinct shape and no text equivalent.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — icon philosophy, style rules, and the platform's fixed icon vocabulary established. No icon library selected. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: Status Icons renamed "Healthy"→"Normal" and "Critical"→"Alert" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
