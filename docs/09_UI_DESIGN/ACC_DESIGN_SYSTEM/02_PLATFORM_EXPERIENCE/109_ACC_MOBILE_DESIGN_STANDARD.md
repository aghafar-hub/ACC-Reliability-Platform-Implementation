# ACC Reliability Platform
# 109_ACC_MOBILE_DESIGN_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-109 |
| Title | ACC Reliability Platform — Mobile Design Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature, on phone and tablet |
| Governs Under | 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md, 100_ACC_BRAND_IDENTITY.md, 101_ACC_COLOR_SYSTEM.md, 102_ACC_TYPOGRAPHY_STANDARD.md, 103_ACC_ICONOGRAPHY_STANDARD.md, 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md |
| Scope Note | This document extends 102 §7 (Mobile Typography), 103 §8 (Mobile icon rules), and 104 §12 (Mobile Adaptation) into a full field-engineering mobile standard. It does not redefine those rules, and does not discuss color, typography detail, icon design, CSS, React, or implementation. |

---

## Purpose

To ensure the platform remains a genuine engineering instrument in the hands of a field engineer — not a compromised, shrunk copy of the desktop experience — across phone and tablet, connected or not.

---

## Philosophy

Mobile is a field instrument, not a smaller desktop. A field engineer using the platform may be standing next to loud, hot, or hazardous equipment, wearing gloves, in direct sunlight, with unreliable connectivity, holding the device in one hand. The mobile experience must remain fully usable — per 099, engineering usefulness under real conditions outranks visual polish.

Everything defined for mobile in 102, 103, and 104 is inherited here; this document adds the platform-specific rules those documents do not cover: offline behavior, device context (phone vs. tablet, portrait vs. landscape), and field-condition performance.

---

## Rules

**Field engineers** are the primary mobile persona. Mobile screens must surface equipment identity, current condition, and the required action fast enough to be read in a single glance, one-handed where possible.

**Tablet usage** sits between phone and desktop density — more Engineering Table columns are visible than on phone (104 §4), while interaction remains touch-first throughout.

**Offline usage.** The platform must degrade gracefully when connectivity is lost: last-known equipment condition remains viewable from cache, and actions taken offline are queued for sync rather than lost. Sync state is always shown using the platform's existing Synced / Not Synced status icons (103 §5) — never silently hidden.

**Touch targets** follow the sizing already defined in 103 §8 and 104 §13 — referenced here, not restated.

**Landscape / Portrait.** Portrait is the default, single-column flow. Landscape — especially on tablet — may reveal the Split Panel layout (104 §2) where width genuinely allows it, but this is never forced on a phone-sized screen.

**Mobile dashboards** preserve the exact information hierarchy defined in 106_ACC_DASHBOARD_PHILOSOPHY.md — critical equipment and required decisions are never placed behind a collapsed accordion by default; only secondary zones collapse (104 §12).

**Tables → Cards.** A desktop Engineering Table becomes a stack of Summary/Status Cards (104 §3) on mobile, preserving the exact same field order and status indicator as the source row — only the layout reflows, per 104 §12.

**Accordions** follow 104 §12 exactly: secondary/supporting content collapses by default; primary decision content never does.

**Performance.** Field connectivity is often poor. Screens must remain usable with partial or slow data — Skeleton states (104 §7) show structure while content loads; a screen is never left blank or frozen while waiting on the network.

**Battery awareness.** Continuous or decorative animation must be avoided, especially anything that would drain battery over a long field shift — this is a direct extension of 099 §6 Engineering Before Marketing: no unnecessary animation, on any device, but doubly so where battery life affects whether the engineer can finish their shift with a working device.

**Future PWA considerations.** An installable, offline-first experience is a natural extension of the offline rule above — not a separate philosophy requiring its own set of rules.

---

## Engineering Examples

- A field engineer opens the platform on a tablet with no signal, still sees the last-synced condition of the equipment in front of them, and logs a reading that queues for sync once connectivity returns.
- A phone-sized Alert Equipment list renders as a stack of compact cards, each showing the same LP ID, status, and required action a desktop table row would show.
- Rotating a tablet to landscape while reviewing an equipment record reveals a Split Panel showing the record beside its History, which was stacked in portrait.

---

## Correct Usage

- A mobile dashboard's critical equipment section is visible immediately on load, never inside a collapsed accordion.
- An offline action shows a clear "Not Synced" indicator until connectivity returns and it syncs.
- Table-to-card conversion on mobile keeps the equipment ID and status on every card, exactly as they appeared in the desktop table's leading columns.

---

## Incorrect Usage

- A mobile screen hides the critical-equipment section behind a collapsed accordion "to save space."
- An action taken offline disappears silently instead of showing a queued/not-synced state.
- A desktop table is simply shrunk and horizontally scrollable on mobile instead of being restructured into cards.
- A mobile screen includes continuous background animation with no functional purpose.

---

## Future Considerations

- As tablet usage grows for engineering-office-adjacent roles, the line between "tablet" and "desktop workstation" (110) density may need periodic re-validation, without altering the phone-first rules in this document.
- Offline-first PWA capability should be evaluated module by module, starting with whichever module has the clearest field-usage case (e.g., Route Center), while remaining governed by the offline rules already defined here.
- Future AI features on mobile must respect the same battery-awareness and performance rules as any other mobile content — an AI feature is not exempt from field-condition constraints.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §6 Engineering Before Marketing
- 102_ACC_TYPOGRAPHY_STANDARD.md — §7 Mobile Typography
- 103_ACC_ICONOGRAPHY_STANDARD.md — §5 Status Icons, §8 Mobile Rules
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2 Layout Components (Split Panels), §3 Information Components, §7 Feedback Components (Skeleton), §12 Mobile Adaptation, §13 Accessibility
- 106_ACC_DASHBOARD_PHILOSOPHY.md — the information hierarchy mobile dashboards must preserve
- 110_ACC_DESKTOP_WORKSTATION_STANDARD.md — the counterpart standard for the primary workstation environment

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — field-engineering mobile standard established, extending 102/103/104's mobile rules with offline, device-context, and performance guidance. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical Equipment"→"Alert Equipment" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
