# ACC Reliability Platform
# 122_ACC_TIMELINE_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-122 |
| Title | ACC Reliability Platform — Timeline Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §4 (Timeline) and 114's Equipment Timeline rule into a full standard covering every module-specific timeline. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every Timeline in the platform is chronologically honest and, for a given equipment, complete across every contributing module.

## 3. Philosophy

A Timeline is the chronological proof behind a Decision (108). It answers: what happened, in what order, and does that explain the current condition.

## 4. Design Principles

- One equipment's Timeline is always complete across contributing modules — never module-siloed (114).
- Chronology is genuine and immutable — a Timeline is never curated to tell a different story than the real sequence of events (099 §10).

## 5. Standard Structure

A chronological list, in a fixed direction per module convention; each entry shows what happened, when, and links to its full Record or Action.

## 6. Engineering Rules

- **Equipment Timeline** — the unified, cross-module timeline for one equipment (114); the canonical Timeline every module contributes to.
- **Reliability timeline** — Reliability Engineering's contribution to the Equipment Timeline — same rules, different event source.
- **Oil timeline** — Oil Analysis's contribution: samples, PDF imports, oil changes.
- **Vibration timeline** — Vibration's contribution: readings, alerts.
- **Engineering actions** — appear inline at the moment raised and again when closed, so cause and resolution are both visible in sequence.
- **Contractor actions** — shown identically in structure to ACC-raised actions; attribution (which contractor) is metadata, never a separate contractor-specific timeline — one Timeline per equipment, never one per contractor (114).
- **Filtering** — a Timeline may be filtered by module, event type, or date range (118), but filtering only narrows what's shown; it never reorders the fixed chronology.
- **Chronology** — always genuinely chronological; never manually reordered or curated (099 §10).

## 7. Desktop Rules

More entries visible per screen, full chronology reachable without excessive scrolling (110).

## 8. Mobile Rules

Same chronology, condensed entry cards (109).

## 9. Accessibility

Each entry's date/time and event type are exposed as structured, readable text — never conveyed by position or color alone (104 §13).

## 10. Correct Examples

- An Equipment Timeline shows an Oil Analysis alert, the resulting Engineering Action, and its later closure, in that true order.
- A contractor-raised action appears in the same Timeline as an ACC-raised one, distinguished only by an attribution tag.

## 11. Incorrect Examples

- A Timeline is reordered to place a resolved item before the alert that caused it, to "read better."
- Vibration events are only visible in a separate, Vibration-only timeline with no link from the Equipment page.

## 12. Future Considerations

AI-generated summaries of a long Timeline (e.g., "3 alerts and 1 resample last quarter") must link back to the actual entries they summarize, never standing alone as an unverifiable claim.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §10
- 100_ACC_BRAND_IDENTITY.md — §6
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §4, §13
- 108_ACC_INFORMATION_ARCHITECTURE.md — History
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md — Equipment Timeline, cross-module tabs
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — contractor attribution
- 118_ACC_FILTER_STANDARD.md — Timeline filtering

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform timeline standard established. Pending approval. |
