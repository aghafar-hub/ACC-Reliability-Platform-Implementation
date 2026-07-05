# ACC Reliability Platform
# 117_ACC_FORM_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-117 |
| Title | ACC Reliability Platform — Form Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §5 (Input Components) and §10 (Error States). Does not redefine those rules, and does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To ensure every data-entry form in the platform captures an engineering fact correctly, once — never as a showcase of UI variety.

## 3. Philosophy

A form's only job is accurate capture of a Record tied to `Equipment_ID` (108). Per 099 §10 Truth Before Beauty, a form must never let incomplete or invalid engineering data appear complete.

## 4. Design Principles

- Mandatory fields are minimal and justified by what makes the record valid — never by convenience.
- Validation happens at the field, immediately (104 §10) — never as a disconnected form-wide banner.
- Fields are grouped by engineering meaning, not by database structure.
- A form's workflow state always maps to 108's Record/Decision states — never a form-local status invented separately.

## 5. Standard Structure

A header stating the record and its equipment context (114); grouped sections in a fixed order (identity → engineering values → notes/attachments → workflow state); a fixed-position action area (112) for save/cancel.

## 6. Engineering Rules

- **Engineering forms** — capture lab/engineering values using the numeric rules of 102 §4 (right-aligned once saved).
- **Edit vs Create** — a Create form establishes a new Record against an `Equipment_ID` (108); an Edit form never changes which equipment it belongs to — that would be a new record, not an edit.
- **Mandatory fields** — marked consistently platform-wide; minimal; each one justified by record validity.
- **Validation** — field-level, immediate, per 104 §10; never a generic "something is wrong" message with no pointer to the offending field.
- **Grouping** — by engineering meaning (e.g., "lab values," "identity," "workflow"), never by arbitrary convenience.
- **Section order** — identity/context first, then engineering data, mirroring 100 §7's information hierarchy applied to a form.
- **Save philosophy** — an explicit save action; any consequential/irreversible submission (e.g., locking lab values) is preceded by a Confirmation dialog (104 §8).
- **Autosave** — permitted only for low-stakes draft state (e.g., mid-Wizard progress, 111); never for a final engineering submission, which always requires explicit confirmation.
- **Confirmations** — 104 §8; used before locking or approving a record.
- **Engineering workflow** — a form's draft/pending/approved state always maps onto 108's Record/Decision states, never a separate form-only status vocabulary.

## 7. Desktop Rules

Multi-column field grouping is permitted only where fields are genuinely related, never for decoration; keyboard tab order follows the section order exactly (110).

## 8. Mobile Rules

Single-column presentation (109); autosave draft state is more valuable here given field connectivity conditions, consistent with 109's offline rule.

## 9. Accessibility

Labels are always visible, never placeholder-only; error text is programmatically attached to its field (104 §13).

## 10. Correct Examples

- A lab-result form groups contamination, viscosity, and particle-count fields together under one "Lab Values" section.
- Submitting an approval-locking form shows a Confirmation dialog stating exactly what will be locked.

## 11. Incorrect Examples

- A form relies on placeholder text as the only field label.
- A final engineering submission autosaves silently with no explicit confirm step.
- An Edit form is used to reassign a record to a different `Equipment_ID`.

## 12. Future Considerations

AI-assisted field suggestions must appear as a distinct, dismissible suggestion — never silently auto-filled into a field (099 §10, 100 §11).

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §10
- 100_ACC_BRAND_IDENTITY.md — §7, §11
- 102_ACC_TYPOGRAPHY_STANDARD.md — §4
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §5, §8, §10, §13
- 108_ACC_INFORMATION_ARCHITECTURE.md — Record/Decision states
- 109_ACC_MOBILE_DESIGN_STANDARD.md — offline/autosave
- 110_ACC_DESKTOP_WORKSTATION_STANDARD.md
- 111_ACC_UI_SCREEN_CATALOG.md — Wizard screens
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform form standard established. Pending approval. |
