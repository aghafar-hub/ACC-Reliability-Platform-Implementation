# ACC Reliability Platform
# 093_COMPONENT_STANDARD.md

## Document Control

| Item | Value |
|---|---|
| Document ID | UI-093 |
| Title | Component Standard |
| Version | 1.0 |
| Status | Approved Design Standard |
| Owner | ACC Reliability Department |
| Applies To | Shared UI component library |

---

## Purpose

This document defines the required shared UI components for the ACC Reliability Platform.

The goal is to prevent each module from creating inconsistent versions of the same UI elements.

---

## Required Shared Components

The platform should maintain shared components for:

- Page header
- KPI card
- Section card
- Filter bar
- Status chip
- Data table
- Card list
- Timeline
- Report preview
- Upload drop zone
- Review queue
- Dialog / modal
- Toast notification
- Empty state
- Loading skeleton
- Error state
- Permission denied state

---

## KPI Card Standard

KPI cards must support:

- Title
- Value
- Optional trend
- Optional icon
- Optional click action
- Status emphasis when needed

---

## Status Chip Standard

Status chips must use platform status colors consistently.

Examples:

- Normal
- Caution
- Alert
- Draft
- Open
- In Progress
- Waiting Shutdown
- Completed
- Verified
- Closed

---

## Data Table Standard

Data tables must support:

- Sorting
- Pagination
- Loading state
- Empty state
- Row click action
- Contractor-scoped data
- Mobile card fallback where required

---

## Filter Bar Standard

Filter bars must support:

- Search
- Dropdown filters
- Date filters
- Active filter display
- Reset filters
- Mobile filter drawer

---

## Upload Component Standard

Upload components must support:

- Single file upload
- Batch file upload where required
- Progress state
- Failed upload state
- Review queue integration
- Google Drive file reference when applicable

---

## Timeline Component Standard

Timeline components must support:

- Past events
- Future events
- Configurable direction
- Status-colored markers
- Mobile responsive behavior
- Export to PDF where required

---

## Dialog Standard

Dialogs must be used for:

- Confirmation
- Duplicate detection
- Review decisions
- Short forms

Long forms should use page layouts or wizard dialogs.

---

## Engineering Rules

UI-093-001: Modules must reuse shared components unless a justified exception is approved.

UI-093-002: Components must support desktop, tablet, and mobile behavior.

UI-093-003: Components must support Arabic/RTL where applicable.

UI-093-004: Components must not hardcode contractor scope or branding.

---

## Change Log

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-07-05 | Initial component standard |

