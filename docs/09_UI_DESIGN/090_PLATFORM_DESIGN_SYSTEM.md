# ACC Reliability Platform
# 090_PLATFORM_DESIGN_SYSTEM.md

## Document Control

| Item | Value |
|---|---|
| Document ID | UI-090 |
| Title | Platform Design System |
| Version | 1.0 |
| Status | Approved Design Standard |
| Owner | ACC Reliability Department |
| Applies To | All platform modules |

---

## Purpose

This document defines the visual design system for the ACC Reliability Platform.

The objective is to ensure that every current and future module has a consistent, professional, engineering-grade interface.

---

## Design Philosophy

The platform shall look and behave as an enterprise reliability engineering system, not as a generic admin dashboard or spreadsheet wrapper.

Every screen must answer:

> What requires the engineer's attention, and what decision should be made next?

---

## Global Layout Standard

Every page shall follow the same structure:

```text
Top Bar
Sidebar
Page Header
KPI / Summary Cards
Filter Bar
Main Work Area
Supporting Panels
```

The global shell owns branding, including:

- ACC logo
- Contractor logo
- User menu
- Language selector
- Theme selector
- Notifications

Modules shall not duplicate branding logic.

---

## Sidebar Standard

- Collapsed width: approximately 72px
- Expanded width: approximately 260px
- Icons must use one consistent icon family
- Navigation labels must be concise
- Module menus must be grouped logically
- Active item must be visually clear

---

## Typography Standard

| Element | Target Size |
|---|---:|
| Page title | 28–32px |
| Section title | 20–22px |
| Card title | 16–18px |
| Body text | 14–15px |
| Small label | 12–13px |

Use clear, readable typography suitable for desktop and mobile use.

---

## Color Standard

Platform status colors:

| Status | Color Meaning |
|---|---|
| Normal | Green |
| Caution | Yellow |
| Alert | Red |
| Information | Blue |
| Future / Planned | Purple |
| Disabled / Inactive | Gray |

Oil Analysis report cells must preserve original laboratory PDF colors where available.

---

## KPI Cards

KPI cards must be:

- Consistent in size
- Placed near the top of operational dashboards
- Limited to important indicators
- Clickable where useful
- Clear about trend or urgency

Avoid decorative KPI cards that do not support engineering decisions.

---

## Filter Bar

Preferred filter order:

1. Global Search
2. LP_ID
3. Equipment_ID
4. Area
5. Contractor
6. Module-specific filters
7. Date range

Contractor users must only see their own contractor scope.

---

## Tables

Tables shall be:

- Engineer-readable
- Sortable
- Filterable
- Paginated where needed
- Sticky header where practical
- Minimum row height about 48px
- Not visually similar to raw Excel unless required by report data

On mobile, large tables should become cards or controlled horizontal-scroll layouts.

---

## Cards

Cards shall use:

- White background
- Subtle border
- Soft shadow
- Rounded corners around 12px
- Consistent spacing

Dark cards are not preferred for main work areas.

---

## Charts

Charts must support decisions.

Approved chart use:

- Trends
- Comparisons
- Distribution
- Compliance
- Workload

Avoid decorative charts, 3D charts, and excessive gauges.

---

## Forms

Forms must be grouped into logical cards.

Long forms should use:

- Sections
- Review panels
- Wizards where appropriate
- Clear save/cancel actions

Critical workflows must display validation clearly.

---

## Empty States

Blank screens are prohibited.

Every empty state must include:

- Explanation
- Suggested action
- Primary button if relevant

---

## Loading States

Use skeleton loaders instead of endless spinners where possible.

Every page must handle:

- Loading
- Empty data
- Error
- Permission denied
- Offline / API unavailable

---

## Engineering Rule

UI-090-001: Every screen must preserve contractor isolation.

UI-090-002: Every module must reuse shared platform UI components where practical.

UI-090-003: No module shall hardcode ACC or contractor branding.

UI-090-004: Mobile behavior must be defined before implementation.

UI-090-005: Reports must be professionally designed, not raw draft exports.

---

## Change Log

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-07-05 | Initial UI/UX design system standard |

