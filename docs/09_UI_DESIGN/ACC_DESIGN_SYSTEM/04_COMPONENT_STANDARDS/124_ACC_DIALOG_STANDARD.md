# ACC Reliability Platform
# 124_ACC_DIALOG_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-124 |
| Title | ACC Reliability Platform — Dialog Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §8 (Dialog Components) with the specific rules for each dialog type. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every dialog in the platform interrupts deliberately, and that friction is always proportional to consequence.

## 3. Philosophy

A dialog exists only when a decision genuinely cannot be made inline (099 §7 Progressive Disclosure). It is an interruption, and interruptions must be earned.

## 4. Design Principles

- The higher the consequence, the higher the friction (104 §8's Delete as the highest-friction example) — friction is proportional to reversibility, never uniform.
- Every dialog states its consequence in plain terms before asking for confirmation.

## 5. Standard Structure

A title stating the decision; a body stating context and consequence; action buttons in a fixed, consistent order — the destructive action is never placed where a habitual user would click by reflex.

## 6. Engineering Rules

- **Confirmation dialogs** (104 §8) — precede any consequential action; state the exact consequence.
- **Destructive dialogs** — Delete-tier (104 §8); the highest friction in the platform; state precisely and irreversibly what will be removed.
- **Engineering approvals** — Approval/Reject (104 §8); always log who and when; Reject always requires a stated reason.
- **Warnings** — a non-blocking Warning (104 §7) shown inline where possible; escalated to a Dialog only when it would otherwise be missed before a consequential action.
- **Information dialogs** — used sparingly; justified only when information genuinely must be acknowledged before proceeding, never merely displayed.
- **Multi-step dialogs** — used only for a short, tightly-scoped sub-task; anything requiring true multi-step guidance is a Wizard screen (111), not a multi-step Dialog.

## 7. Desktop Rules

Dialogs center on screen with a dimmed background; focus is trapped inside per 104 §13.

## 8. Mobile Rules

Dialogs may adapt to a Drawer presentation (104 §8) with the same content and button order as desktop.

## 9. Accessibility

Focus moves into the dialog on open and returns to the triggering control on close; every dialog is dismissible by keyboard.

## 10. Correct Examples

- Deleting a Record shows a dialog stating precisely what will be permanently removed.
- A Reject decision always requires the reviewer to enter a reason before it can be submitted.

## 11. Incorrect Examples

- A destructive action executes immediately with only a Toast afterward.
- A multi-step onboarding process is crammed into a single Dialog instead of being built as a Wizard screen.
- An Information dialog interrupts the user for content that could have been shown inline.

## 12. Future Considerations

An AI-suggested action requiring approval uses the same Engineering Approval dialog as a human-raised one — never a separate "AI approval" dialog type.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §7
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §7, §8, §13
- 111_ACC_UI_SCREEN_CATALOG.md — Wizard vs. multi-step dialog boundary
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — approval authority by role

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform dialog standard established. Pending approval. |
