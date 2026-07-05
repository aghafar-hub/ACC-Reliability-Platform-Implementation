# ACC Reliability Platform
# 126_ACC_ERROR_STATE_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-126 |
| Title | ACC Reliability Platform — Error State Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §10 (Error States) into the specific cases a screen may encounter, adding Engineering Workflow errors. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure an error state never hides or softens an engineering-relevant fact, across every kind of failure the platform can encounter.

## 3. Philosophy

An error must never disguise a real failure as something less serious, or as "no data" (104 §10). This applies with zero exceptions.

## 4. Design Principles

- An error is localized to what actually failed (112) — a screen-wide failure gets a screen-level treatment; a field/action failure stays local.
- Every error states what failed, in plain terms, plus a path forward — never a bare code or generic message alone.

## 5. Standard Structure

What failed (plain language) + the path forward (retry, correct, contact).

## 6. Engineering Rules

- **Validation errors** (104 §10) — attached to the exact offending field or action.
- **System errors** — an unexpected platform-level failure (104 §10's Unexpected Error fallback), used only when no more specific case applies.
- **Sync errors** (104 §10 Sync Failure) — state what failed to synchronize; tied to 109's offline/Not-Synced status icon (103 §5).
- **Permission errors** (104 §10) — state exactly what is restricted; distinct from a "no permission" Empty State (125): an Error is an attempted action that was denied; an Empty State is a view with nothing to show due to scope.
- **Engineering workflow errors** — an attempted state transition that violates the platform's Record/Decision rules (e.g., approving a record not yet ready), stated in engineering terms the user understands (e.g., "cannot approve: lab results not yet entered"), never a raw technical exception.

## 7. Desktop Rules

Errors are shown inline near their cause, with a persistent path to retry without losing other unsaved work on the screen (110).

## 8. Mobile Rules

The same localization discipline applies; connectivity-related errors are explicitly distinguished from validation errors, since field conditions make connection failures common and expected (109).

## 9. Accessibility

Every error is announced to screen readers at the moment it occurs, associated with its field or region (104 §13).

## 10. Correct Examples

- "Cannot approve: lab results not yet entered" appears directly on the action that was blocked.
- A sync failure shows exactly which record failed to sync, with a retry option.

## 11. Incorrect Examples

- A raw technical exception message is shown to the user with no plain-language explanation.
- A permission error is shown identically to a "no data" empty state, leaving the user unsure whether something is broken or simply absent.

## 12. Future Considerations

An AI-driven action that fails (e.g., a recommendation that cannot be applied) is shown with the same honesty standard as any other error — never silently dropped.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §10
- 103_ACC_ICONOGRAPHY_STANDARD.md — §5 (Synced/Not Synced)
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §10, §13
- 108_ACC_INFORMATION_ARCHITECTURE.md — Record/Decision states
- 109_ACC_MOBILE_DESIGN_STANDARD.md
- 112_ACC_SCREEN_TEMPLATE_STANDARD.md — region-level error behavior
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — permission scoping
- 125_ACC_EMPTY_STATE_STANDARD.md — empty-vs-error boundary

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform error-state standard established. Pending approval. |
