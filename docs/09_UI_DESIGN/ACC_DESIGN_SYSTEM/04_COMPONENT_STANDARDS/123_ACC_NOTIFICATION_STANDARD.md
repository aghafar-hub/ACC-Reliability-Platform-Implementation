# ACC Reliability Platform
# 123_ACC_NOTIFICATION_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-123 |
| Title | ACC Reliability Platform — Notification Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §7 (Notification, distinct from Toast) with philosophy, priority, escalation, grouping, and owner/contractor scoping. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure notifications bring genuine decisions to the right person at the right time, without becoming noise.

## 3. Philosophy

A notification is earned by genuine relevance to the recipient's role and scope — never sent simply because an event occurred somewhere in the platform (099 §6, §9).

## 4. Design Principles

- Every notification deep-links to its exact subject (105).
- Priority is always semantic (101 §4), never invented locally.
- A notification's scope follows the same visibility rules as its subject (115).

## 5. Standard Structure

A persistent list (104 §7), distinct from a transient Toast; each entry shows priority, subject, and a direct link.

## 6. Engineering Rules

- **Notification philosophy** — earned by genuine relevance; never sent merely because an event occurred.
- **Owner notifications** — fleet-wide relevant events: cross-contractor issues, approvals awaiting ACC (115's Owner scope).
- **Contractor notifications** — scoped strictly to that contractor's own equipment/actions (115's visibility rule).
- **Priorities** — mapped to 101 §4's semantic roles; an Alert notification never looks the same as an Informational one.
- **Escalation** — an unacknowledged Alert notification may escalate (e.g., surfaced more prominently, or to an additional recipient), governed by the same severity semantics — never a separate "escalation color."
- **Reminders** — a lower-urgency, repeated nudge for a pending item, visually distinct from a first-time Alert notification, per 101 §4's Caution/Information distinction.
- **Grouping** — multiple notifications about the same equipment or Record are grouped into one entry with a count, never flooding the list with near-duplicates (echoing 104's Activity Feed capping principle).

## 7. Desktop Rules

Full notification list accessible from Top Navigation (104 §2); unread count always visible.

## 8. Mobile Rules

Same list, condensed entries, still deep-linking exactly as desktop does (109).

## 9. Accessibility

Unread state and priority are both exposed to screen readers, never color-only (101 §8).

## 10. Correct Examples

- An Alert-condition sample result generates one notification that deep-links directly to that sample's Detail page.
- Three related overdue-action reminders for the same equipment are grouped into a single notification with a count.

## 11. Incorrect Examples

- A notification opens a generic inbox and expects the user to find the relevant item themselves.
- An escalation is shown using an invented color not defined in 101 §4.
- A contractor receives a notification about another contractor's equipment.

## 12. Future Considerations

AI-flagged notifications (e.g., "AI detected an unusual pattern") must be labeled as AI-originated and must never carry the same priority styling as a verified engineering Alert unless a human has confirmed it (100 §11, 099 §10).

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §6, §9, §10
- 100_ACC_BRAND_IDENTITY.md — §11
- 101_ACC_COLOR_SYSTEM.md — §4, §8
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2, §7
- 105_ACC_NAVIGATION_ARCHITECTURE.md — notification navigation/deep-link rule
- 108_ACC_INFORMATION_ARCHITECTURE.md
- 109_ACC_MOBILE_DESIGN_STANDARD.md
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — owner/contractor scoping

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform notification standard established. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: "Critical"→"Alert" (notification priority) per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
