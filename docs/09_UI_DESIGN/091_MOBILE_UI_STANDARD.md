# ACC Reliability Platform
# 091_MOBILE_UI_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | UI-091 |
| Title | Mobile UI Standard |
| Version | 1.0 |
| Status | Approved Design Standard |
| Owner | ACC Reliability Department |
| Applies To | All modules and PWA/mobile views |

---

## Purpose

This document defines the mobile and responsive behavior standard for the ACC Reliability Platform.

The platform must work professionally on desktop, tablet, and mobile devices.

---

## Mobile Philosophy

Mobile must not be a compressed desktop screen.

The mobile interface shall preserve full functionality while adapting layout, spacing, navigation, tables, forms, and actions for touch use.

---

## Breakpoint Guidance

| Device | Behavior |
|---|---|
| Desktop | Full shell, sidebar, tables, multi-column layouts |
| Tablet | Compact sidebar, reduced grids, responsive cards |
| Mobile | Drawer navigation, stacked cards, single-column forms |

---

## Mobile Navigation

- Sidebar becomes drawer or bottom-access menu.
- Module tabs should be scrollable or converted to a compact menu.
- Primary actions should remain accessible without horizontal overflow.

---

## Mobile Filters

Filter bars shall collapse into a filter drawer or filter sheet.

Visible minimum:

- Search
- Active filter count
- Filter button
- Clear filters

---

## Mobile Tables

Large tables must not be squeezed.

Approved patterns:

- Card list
- Horizontal scroll with sticky first column
- Compact row summary with expandable details

---

## Mobile Forms

Forms must become single-column.

Fields must be touch-friendly.

Save buttons must remain visible or easy to access.

---

## Mobile KPI Cards

KPI cards should use:

- 2-column grid on phones where possible
- Single-column if content is long
- Clear labels and values

---

## Mobile Timeline

Timeline must support:

- Vertical layout on mobile
- Horizontal scroll if long history is shown
- Touch-friendly event markers
- Popup/detail sheet on event tap

---

## Mobile Reports

Reports must be previewable on mobile, but official outputs remain PDF and Excel.

PDF export layout shall follow desktop report quality standards.

---

## Touch Targets

Interactive elements should be large enough for field use.

Buttons, chips, dropdowns, and event markers must be touch-friendly.

---

## Arabic / RTL

Mobile layouts must support Arabic and RTL without breaking:

- Navigation
- Tables
- Forms
- Timelines
- Reports
- Filter drawers

---

## Engineering Rules

UI-091-001: Every screen implementation must include mobile behavior.

UI-091-002: No table may overflow mobile width without an approved scroll/card strategy.

UI-091-003: No primary action may be hidden on mobile.

UI-091-004: Arabic/RTL must be considered during mobile layout implementation.

---

## Change Log

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-07-05 | Initial mobile UI standard |

