# ACC Reliability Platform
# 119_ACC_SEARCH_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-119 |
| Title | ACC Reliability Platform — Search Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module |
| Governs Under | 099–115 |
| Scope Note | Extends 104 §5 (Search input) and 105's Universal Search Philosophy into a full search standard. Does not discuss implementation, React, CSS, HTML, JavaScript, or code. |

## 2. Purpose

To define the platform's one universal search experience and its module/equipment-scoped variants, so search behaves identically no matter where it is invoked from.

## 3. Philosophy

Search resolves to entities, not pages (105). This document operationalizes that rule in full detail across every search surface in the platform.

## 4. Design Principles

- One search behavior, learned once, reused everywhere (100 §9).
- Search follows the same Equipment → Record → Action resolution order as 108's Search Hierarchy.
- Search is fuzzy-tolerant but never so loose that it returns unrelated equipment.

## 5. Standard Structure

A single search input (104 §5); a results list grouped by entity type (Equipment first, then Record, then Action, per 108); a recent-searches shortcut.

## 6. Engineering Rules

- **Global search** — platform-wide, reachable from Top Navigation (104 §2, 105), resolving across all modules.
- **Module search** — the same search experience, scoped to the current module's data only — identical behavior, narrower scope, exactly as 115 scopes by role rather than by module.
- **Equipment search** — the Equipment Selector (104 §5) — the one sanctioned way to find equipment by `Equipment_ID` or name, everywhere in the platform.
- **LP search** — the LP Selector (104 §5) — scoped to a previously chosen equipment, same interaction pattern.
- **Fuzzy search** — tolerant of minor typos and partial IDs, since engineering identifiers are easy to mistype under field conditions; never so fuzzy that it returns unrelated equipment.
- **Recent searches** — a short list of the user's own recent queries/entities; never shared between users; a convenience layer only.

## 7. Desktop Rules

Search-as-you-type with immediate result preview (110).

## 8. Mobile Rules

Full-screen search takeover on phone, per 109's single-column default; same result ordering as desktop.

## 9. Accessibility

Results are announced by count and top entity type; the result list is fully keyboard-navigable (104 §13).

## 10. Correct Examples

- Typing an `Equipment_ID` fragment into global search returns that equipment first, ahead of loosely related free-text matches.
- A module search box behaves exactly like global search, just scoped to that module's data.

## 11. Incorrect Examples

- Two modules implement their own search boxes with different result ordering or fuzziness behavior.
- Search returns a bare Report or History entry with no equipment context attached.

## 12. Future Considerations

AI-assisted natural-language search (e.g., "show me overdue RHI actions") must still resolve into the same Equipment → Record → Action structure — never a separate, AI-only search experience (099 §8).

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §8
- 100_ACC_BRAND_IDENTITY.md — §9
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2, §5
- 105_ACC_NAVIGATION_ARCHITECTURE.md — Search navigation, Universal Search Philosophy
- 108_ACC_INFORMATION_ARCHITECTURE.md — Search hierarchy
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md — Equipment Selector
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — scoping analogy
- 118_ACC_FILTER_STANDARD.md — search/filter relationship

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — full platform search standard established. Pending approval. |
