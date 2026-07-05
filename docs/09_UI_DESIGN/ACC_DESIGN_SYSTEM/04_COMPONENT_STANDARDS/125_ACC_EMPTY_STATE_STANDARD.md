# ACC Reliability Platform
# 125_ACC_EMPTY_STATE_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-125 |
| Title | ACC Reliability Platform — Empty State Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §9 (Empty States) into the specific cases a screen may encounter. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure an empty state is always a compact, honest fact with a next action — never a decorative dead end.

## 3. Philosophy

An empty state is a fact about the world, not a failure of the interface (104 §9, 099 §10). It must be stated plainly and always paired with what to do next.

## 4. Design Principles

- Never a large decorative illustration.
- The reason for emptiness is always distinguishable — no data, no results, no permission, and not-yet-used each imply a different next action.

## 5. Standard Structure

One compact statement of why + one specific next action (104 §9).

## 6. Engineering Rules

- **No data** — the entity/list genuinely has nothing yet; the next action is usually "create/add."
- **No search / no results** — filters or search narrowed to nothing; the next action is "clear filters/search," distinct from "no data" since data exists elsewhere.
- **No permission** — the user's role/scope (115) doesn't include this data; stated plainly, never disguised as "no data."
- **Loading finished** — a transition state, not a standing empty state: once a Skeleton (104 §7) resolves to genuinely nothing, it must transition to one of the states above, never linger as a stale loading shape.
- **First use** — a genuinely new module/screen with nothing entered yet; the next action is typically a guided first step, e.g., a link into the relevant Wizard (111).

## 7. Desktop Rules

The empty state occupies only the space its region would have used with content — never expanded to fill extra whitespace.

## 8. Mobile Rules

Same compact treatment, consistent with 109's density discipline.

## 9. Accessibility

The reason and next action are both exposed as readable text, never conveyed by icon alone.

## 10. Correct Examples

- "No critical equipment. [Clear filters]" — compact, honest, actionable.
- A brand-new module's Register shows "No equipment registered yet. [Add Equipment]."

## 11. Incorrect Examples

- A full-width illustrated graphic with a lighthearted caption and no next step.
- A "no permission" case disguised as "no data," leaving the user to wonder if something is broken.
- A loading Skeleton lingers indefinitely instead of transitioning to a real empty state once loading finishes with nothing found.

## 12. Future Considerations

An AI-suggested "why don't you try..." next action, if ever added to an empty state, must remain optional and clearly secondary to the standard next action.

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §10
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §7, §9
- 109_ACC_MOBILE_DESIGN_STANDARD.md
- 111_ACC_UI_SCREEN_CATALOG.md — Wizard as a common first-use next action
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — no-permission distinct from no-data
- 126_ACC_ERROR_STATE_STANDARD.md — empty-vs-error boundary

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform empty-state standard established. Pending approval. |
