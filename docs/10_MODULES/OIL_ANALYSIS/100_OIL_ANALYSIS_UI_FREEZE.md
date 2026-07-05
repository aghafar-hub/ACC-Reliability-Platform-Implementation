# ACC Reliability Platform
# 100_OIL_ANALYSIS_UI_FREEZE.md

## Document Control

| Item | Value |
|---|---|
| Document ID | MOD-UI-100 |
| Title | Oil Analysis UI Freeze |
| Version | 1.0 |
| Status | Approved UI Freeze |
| Owner | ACC Reliability Department |
| Module | Oil Analysis |
| Date | 2026-07-05 |

---

## Purpose

This document freezes the approved UI/UX design for the Oil Analysis module.

Implementation teams shall follow this document and shall not redesign screens without approval.

---

## Approved Module Screens

1. Dashboard
2. Equipment & LP Register
3. Equipment Details
4. Oil Sample Report
5. Add Sample / PDF Import
6. Actions
7. Timeline
8. Reports
9. Settings

---

## OA-001 Equipment & LP Register

### Purpose

Show every contractor-scoped LP and its current oil analysis condition.

### Rules

- One row equals one LP_ID.
- Contractor users see only their own contractor scope.
- ACC users may see all contractors.
- Contractor filter is locked/hidden for contractor users.

### Filters

- Global search
- LP_ID dropdown
- Area dropdown
- Contractor dropdown for ACC only
- Sampling date
- Status dropdown

### Default Columns

- LP_ID
- Equipment Name
- Last Sample
- Next Sample
- Last Sample Status

### Actions

- Row click opens Equipment Details.
- Status click opens Oil Sample Report filtered by equipment/LP.
- No inline editing.
- No recommendations on this screen.

---

## OA-002 Equipment Details

### Purpose

Digital Equipment Passport for one Equipment_ID.

### Header

- Equipment Name
- Equipment_ID
- Area
- Contractor
- Asset Class
- Criticality
- Oil Type
- Oil Quantity
- Overall Health Status

No equipment photo is required.

### Quick Actions

- Add Sample
- Latest Report
- Export PDF
- Create Action

### Sections

- LP selector cards
- Latest sample summary
- Sample timeline
- Laboratory trends
- Recommendations
- Last action status
- Oil change history
- Historical sample list

### Behavior

Selecting an LP refreshes the page content.

Clicking a historical sample opens Oil Sample Report.

---

## OA-003 Oil Sample Report

### Purpose

Professional engineering report for oil analysis condition and laboratory results.

### Key Rules

- Preserve the original report structure as much as possible.
- Show all last sample columns visually, but only the latest sample is imported from each PDF.
- Lab report cell colors must be preserved: green, yellow, red.
- Additives graph must be included.
- Original PDF link must be available.
- Recommendations come from the laboratory report.
- Show latest sample critical values.
- Show last 5 actions and their status/date.
- No extra user recommendations on this report.

---

## OA-004 Add Sample / PDF Import

### Purpose

Import oil analysis reports from PDF and review extracted samples before saving.

### Input Methods

- Batch PDF upload
- Single PDF upload
- Manual entry as backup

### Workflow

```text
Upload PDF(s)
Store original PDFs in Google Drive
Extract values and colors
Use OCR for scanned/image PDFs
Create review queue
Engineer reviews one sample at a time
Save and continue
Finish batch
```

### Rules

- No Approve All.
- No sample is saved until engineer review is completed.
- Only the latest sample column from each PDF is imported as a sample record.
- Older sample columns are used only for report display/reference.
- Duplicate detection is by Sample ID.
- Duplicate popup allows Skip, Overwrite/Save Corrected Version, or Review Manually.
- Smart learning mapping remembers corrected Equipment_ID / LP_ID mappings.
- Store PDF File ID, Drive URL, upload date, and uploaded by.

---

## OA-005 Actions

### Purpose

Show Oil Analysis-related actions inside the module while full Engineering Actions remains a main platform service.

### Rules

- Main platform screen name: Engineering Actions.
- Oil Analysis tab name: Actions.
- Oil Analysis Actions show only Source = Oil Analysis.
- Automatic draft action is created when approved sample status is Alert or Caution.
- Manual action creation is allowed.

### Action Fields

- Action No. auto-filled
- LP_ID dropdown
- Sample ID auto-filled from latest sample
- Equipment Name auto-filled
- Equipment_ID auto-filled
- Oil Type auto-filled
- Contractor auto-filled
- Contractor Action dropdown
- ACC Action dropdown
- Meeting Action dropdown
- Assigned To dropdown
- One Due Date only
- Comments thread
- Status workflow

### Fast Action

Contractor users have a Fast Action button.

Fast Action creates immediate contractor action and notifies ACC engineer.

---

## OA-006 Dashboard

### Purpose

Operational command center answering: what requires attention today?

### KPI Groups

- Total LPs with sampling
- Samples due today
- Overdue samples
- Pending review
- Pending approval
- Open actions
- Alert equipment
- Caution equipment
- Normal equipment
- Samples this month
- Completed this month
- Compliance percentage

### Main Widget

Largest widget: Equipment requiring immediate attention.

Columns:

- LP_ID
- Report Status
- Last Action

### Dashboard Zones

- Immediate Attention
- Needs Review
- Recent Activity
- Engineering Priorities
- Charts

### Charts

- Equipment health distribution
- Monthly sample trend
- Contractor comparison for ACC view
- Oil type distribution

Contractor users only see their own contractor statistics.

---

## OA-007 Timeline

### Purpose

Combined oil sample and oil change timeline for one LP.

### Replaces

- Sample Tracker
- Oil Change History

### Search

- Global search
- LP_ID dropdown

### Header

- Equipment Name
- Equipment_ID
- LP_ID
- Sampling Frequency
- Oil Change Frequency
- Current Status

### Summary Cards

- Last Sample
- Next Sample
- Last Oil Change
- Next Oil Change
- Days Remaining

### Timeline Rules

- One combined timeline.
- Show all history.
- Direction controlled from module settings.
- Sample events show date and status color.
- Oil change events show date and oil change tag/color.
- Future events include Next Sample and Next Oil Change.
- Click event opens small popup only.
- No actions, recommendations, or report details.
- Export PDF required.

---

## OA-008 Reports

### Purpose

Professional reporting center for oil analysis.

### Report Categories

- Operational
- Condition
- Engineering
- Management
- Compliance

### Filters

- Date From / Date To
- LP_ID multi-select with Select All
- Equipment_ID
- Area
- Contractor
- Oil Type
- Report Status
- Equipment Status
- Sample ID

### Output

- PDF
- Excel

### Workflow

- Select report
- Apply filters
- Preview report
- Export PDF / Excel

### Rules

- All reports must be well-designed, not draft exports.
- ACC sees contractor comparison.
- Contractor users see only their own scope.
- User can pin favorite reports.
- Future scheduled reports are supported by design.

---

## OA-009 Settings

### Access

App Owner only.

### Setting Groups

- PDF Import & OCR
- Sampling Rules
- Automatic Workflow
- Report Settings
- Timeline Settings
- Dashboard Settings
- Advanced Settings

### Decisions

- Auto draft actions for Alert + Caution.
- Duplicate detection by Sample ID.
- Low OCR confidence marks fields needing review.
- No save until engineer review completed.
- Batch upload size configurable.
- Branding inherited from main platform.
- Notifications controlled from platform App Owner settings.
- PDF storage configurable in module settings.
- Color mapping: green, yellow, red only.
- Advanced settings collapsed by default.

---

## Implementation Rule

Cursor / Claude Code shall not redesign these screens.

Implementation must follow this UI freeze and the platform design system.

---

## Change Log

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-07-05 | Oil Analysis UI design freeze approved |

