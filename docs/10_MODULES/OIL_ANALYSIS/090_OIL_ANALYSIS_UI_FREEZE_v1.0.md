# 090_OIL_ANALYSIS_UI_FREEZE_v1.0.md

# ACC Reliability Platform — Oil Analysis UI Design Freeze v1.0

**Status:** Approved / Frozen  
**Date:** 2026-07-05  
**Scope:** Oil Analysis Module UI/UX Modernization  
**Important:** This document controls UI implementation. Do not redesign database, migration scripts, authentication, or contractor isolation.

---

## 1. Global Oil Analysis Module Rules

- Use existing main platform shell.
- ACC logo and contractor logo come from platform configuration.
- Contractor isolation must remain enforced.
- Contractor users see only their own contractor data.
- ACC users can see all contractors and compare RHI/ASEC.
- Equipment_ID remains the master asset.
- LP_ID is the oil analysis/lubrication tracking unit.
- Do not create new duplicate statuses.
- Oil sample report status must be reused consistently across all Oil Analysis screens.
- Original laboratory PDF cell colors must be preserved in reports where extracted.
- No sample is saved from PDF/OCR until engineer review is completed.

---

## 2. Approved Oil Analysis Menu

```text
Oil Analysis
├── Dashboard
├── Equipment & LP Register
├── Equipment Details
├── Oil Sample Report
├── Add Sample
├── Actions
├── Timeline
├── Reports
└── Settings
```

Notes:

- `Timeline` replaces old `Sample Tracker` and `Oil Change History` as separate tabs.
- `Actions` inside Oil Analysis is a filtered module view only.
- `Engineering Actions` remains the main platform-wide action center.

---

# OA-001 — Equipment & LP Register

**Reference image:** `reference_images/oil_analysis/OA001_equipment_lp_register.png`

## Purpose

Show every LP_ID in contractor scope with its current oil analysis status and sampling priority.

## Business Question

> Which LPs require attention, sampling, or review?

## Row Definition

One row = one LP_ID.

## Opening View

- Contractor login: automatically scoped to contractor; contractor filter locked; other contractors hidden.
- ACC login: can see all contractors and filter by contractor.

## Filters

- Global search.
- LP_ID dropdown.
- Area dropdown.
- Contractor dropdown for ACC only.
- Sampling date.
- Status dropdown.

## Default Visible Columns

- LP_ID.
- Equipment Name.
- Last Sample.
- Next Sample.
- Last Sample Status.

## Actions / Clicks

- Click row or LP_ID: open Equipment Details.
- Click Last Sample Status: open Oil Sample Report filtered by that Equipment/LP.
- Available actions: View Details, Add Sample, Open Report, Export, Create Action.
- No direct editing on this screen.

## Not Shown

- No recommendations.
- No long action history.

## Mobile Behavior

- Table becomes cards or controlled horizontal scroll.
- Filters collapse into drawer.

---

# OA-002 — Equipment Details

**Reference image:** `reference_images/oil_analysis/OA002_equipment_details_or_report_reference.png`

## Purpose

Digital Equipment Passport for one Equipment_ID showing its LPs and current oil health.

## Business Question

> What is the complete oil-analysis health story of this equipment?

## Page Level

One page = one Equipment_ID, showing all related LPs.

## Header Fields

- Equipment Name.
- Equipment_ID.
- Area is not required in final compact header unless existing system shows it.
- Contractor is not required in final compact header unless needed by scope.
- Asset Class.
- Criticality.
- Oil Type.
- Oil Quantity.
- Overall Health Status.

No equipment photo.

## Quick Actions

Top-right actions:

- Add Sample.
- Latest Report.
- Export PDF.
- Create Action.

## LP Cards

Show all LPs under the Equipment_ID as selectable cards.

Each LP card shows:

- LP_ID.
- LP name/component.
- Status color.

Selecting an LP refreshes the page sections below.

## Sections

1. Latest Sample Summary.
2. Sample Timeline.
3. Laboratory Trends.
4. Recommendations from lab.
5. Last Action Status.
6. Oil Change History.
7. Historical Samples.

## Historical Samples

Clicking a sample opens the full Oil Sample Report page.

## Mobile Behavior

- LP cards become horizontal scroll.
- Sections stack vertically.
- Charts become scrollable/simplified.

---

# OA-003 — Oil Sample Report

**Reference image:** old Mobil report screenshots + approved modern report image.

## Purpose

Professional engineering report for one selected sample while displaying last 5 sample trend context.

## Business Question

> What is the condition of this LP/sample, what values caused it, and what did the lab recommend?

## Report Level

One report = one selected sample.

However, the report table displays the last 5 samples as in Mobil report style.

## Structure

Keep same engineering structure as old report:

1. Equipment/search selector at top.
2. Latest condition label.
3. Oil change summary strip.
4. Account Information.
5. Sample Information.
6. Equipment Information.
7. Sample Data & Trends table.
8. Charts:
   - Viscosity.
   - Wear.
   - Contaminants.
   - Physical Properties.
   - Additives.
9. Recommendations / Comments from lab.
10. Sample Timeline section.
11. Last 5 Actions table.
12. Original PDF button.

## Color Rule

The Sample Data & Trends table must preserve source lab PDF cell colors:

- Red stays red.
- Yellow stays yellow.
- Green/normal stays green.
- Blank stays blank/white.

Do not recolor using only calculated thresholds when source cell color exists.

## PDF Import Rule

Each Mobil PDF contains last 5 samples, but app imports only the latest sample column.

Older columns are used for report display/trend context only and must not overwrite old sample records.

## Actions Table

Show last 5 related actions with status and date.

## Mobile Behavior

- Report preview may be simplified.
- Exported PDF must remain full professional layout.
- Table can scroll horizontally.

---

# OA-004 — Add Sample / PDF Import

**Reference image:** `reference_images/oil_analysis/OA004_add_sample_pdf_import.png`

## Purpose

Import lab oil analysis reports into the app through PDF/OCR or manual backup entry.

## Input Methods

- Batch PDF upload.
- Single PDF upload.
- Manual entry as backup only.

## Workflow

```text
Upload PDF(s)
→ Store original PDF in Google Drive
→ Extract values and original cell colors
→ OCR if scanned/image PDF
→ Create review queue
→ Engineer reviews one sample at a time
→ Engineer approves/corrects/rejects
→ Save approved sample
→ Continue until batch is finished
```

## Important Rules

- No approve all.
- No saving until engineer review is completed.
- Only latest sample column from each PDF is imported.
- Original PDF stored in Google Drive.
- Sample record stores PDF File ID and PDF URL.
- Original PDF button opens the PDF for the selected/latest sample.

## Review Screen Layout

Split screen:

Left:
- Original PDF viewer.
- Zoom.
- Page navigation.

Right:
- Extracted latest sample data.
- Equipment_ID.
- LP_ID.
- Sample ID.
- Sample Date.
- Report Status.
- Oil/Lubricant.
- Ratings.
- Key values.
- Recommendations.
- OCR confidence.

Bottom:
- Previous Sample.
- Save & Next Sample.
- Reject This Sample.
- Batch progress.

## Duplicate Detection

Duplicate detection is by Sample ID.

If duplicate found, show popup:

```text
Duplicate Report Detected
This sample/report already exists.
[Overwrite / Save Corrected Version]
[Skip This Report]
[Review Manually]
```

Overwrite must keep audit/version history.

## Smart Learning Mapping

System should remember engineer corrections for Equipment_ID ↔ LP_ID mapping and suggest the same mapping in future imports.

This is rule-based mapping memory, not uncontrolled AI.

---

# OA-005 — Actions

**Reference images:**

- `reference_images/oil_analysis/OA005_actions_list.png`
- `reference_images/oil_analysis/OA005_edit_action.png`

## Purpose

Show Oil Analysis-related actions only, while main Engineering Actions remains platform-wide.

## Naming

- Main app: Engineering Actions.
- Oil Analysis module tab: Actions.

## Scope

Oil Analysis → Actions shows only actions where source = Oil Analysis.

## Main Screen

Show latest action per LP_ID.

Columns:

- Action No.
- LP_ID.
- Equipment Name.
- Sample ID.
- Priority.
- Status.
- Contractor.
- Due Date.
- Assigned To.
- Last Update.

Include button: Open Engineering Actions.

## Automatic Draft Creation

When an approved sample has status:

- Alert → draft action created.
- Caution → draft action created.
- Normal → no automatic action.

Manual action creation is allowed.

## Permissions

Editable by:

- ACC Engineer.
- ACC Manager.
- Contractor Engineer assigned to scope.
- Contractor Manager assigned to scope.

## Action Screen Fields

Auto-filled:

- Action No.
- Source.
- Created Date.
- Created By.
- Sample ID.
- Equipment_ID.
- Equipment Name.
- Oil Type.
- Contractor.
- Latest ratings.

Dropdowns:

- LP_ID.
- Oil System / Component.
- Contractor Action.
- ACC Action.
- Meeting Action.
- Assigned To.
- Status if permission allows.

Date:

- One Due Date only.

Text:

- Contractor Comment.
- ACC Comment.
- Meeting Comment.
- General Comment / Background.
- Discussion comments.

## Fast Action

Contractor-only button:

```text
Fast Action
```

Workflow:

- Contractor submits immediate action.
- ACC Engineer receives notification.
- ACC reviews/accepts/modifies.

## Workflow Statuses

```text
Draft → Open → Assigned → In Progress → Waiting Shutdown → Completed → Verified → Closed
```

## Integration

If final/meeting action requires oil task, system sends it to Oil Lubrication module responsible engineer for review and technician assignment.

---

# OA-006 — Dashboard

**Reference image:** `reference_images/oil_analysis/OA006_dashboard.png`

## Purpose

Operational control center for Oil Analysis.

## Business Question

> What requires my attention today?

## KPI Cards

Include all groups:

- Total LPs with Sampling.
- Alert Equipment.
- Caution Equipment.
- Normal Equipment.
- Samples Due Today.
- Overdue Samples.
- Pending Review.
- Pending Approval.
- Open Actions.

## Global Filters

- Search.
- Area.
- Contractor.
- Oil Type.
- Status.
- Date Range.

Filters affect whole dashboard.

## Largest Section

Equipment Requiring Immediate Attention.

Columns:

- LP_ID.
- Equipment Name.
- Area.
- Contractor.
- Report Status.
- Last Sample.
- Last Action.
- Assigned To.
- Open.

## Charts

- Equipment Health.
- Sample Trend.
- Contractor Comparison.
- Oil Type Distribution.

Contractor comparison:

- ACC view: compare RHI vs ASEC.
- Contractor view: show only own contractor statistics.

## Review / Approval Summary

Show:

- PDF Queue.
- Pending Review.
- Pending Approval.
- New Contractor Actions.

## Engineering Priorities

Show a card listing rule-based priorities:

- Alert samples needing action.
- PDF reports waiting review.
- Contractor actions awaiting ACC.
- Samples due this week.

## Recent Activity Footer

Show:

- Recent Uploaded Samples.
- Recent Actions.
- Recent Oil Changes.
- Recent Comments.

---

# OA-007 — Timeline

**Reference image:** `reference_images/oil_analysis/OA007_timeline.png`

## Purpose

Combined history of oil samples and oil changes for one LP.

## Replaces

- Sample Tracker.
- Oil Change History.

## Business Question

> When did we sample this LP, when did we change its oil, and what is planned next?

## Search

- Global search.
- LP_ID dropdown.

## Header Shows Only

- Equipment Name.
- Equipment_ID.
- LP_ID.
- Sampling Frequency.
- Oil Change Frequency.
- Current Status.

Do not show:

- Area.
- Contractor.
- Oil Type.
- Oil Quantity.

## Summary Cards

- Last Sample.
- Next Sample.
- Last Oil Change.
- Next Oil Change.
- Days Remaining.

## Timeline

One combined timeline, not separate sample/oil change timelines.

Events:

- Normal Sample.
- Caution Sample.
- Alert Sample.
- Oil Changed.
- Future Sample.
- Future Oil Change.

Display all history.

Timeline direction controlled from Module Settings.

## Click Behavior

Click event opens small popup only:

- For sample: date + status.
- For oil change: date + oil changed tag.

Do not open reports, actions, recommendations, or PDFs from Timeline.

## Export

Export PDF required.

---

# OA-008 — Reports

**Reference image:** `reference_images/oil_analysis/OA008_reports.png`

## Purpose

Professional Oil Analysis Reporting Center.

## Business Question

> What report do I need, for which scope, and can I preview it before export?

## Report Categories

Use category cards:

- Operational.
- Condition.
- Engineering.
- Management.
- Compliance.

## Filters

- Date From.
- Date To.
- LP_ID with Select All.
- Equipment_ID.
- Area.
- Contractor.
- Oil Type.
- Report Status.
- Equipment Status.
- Sample ID.

## Output Formats

- PDF.
- Excel.

## Workflow

```text
Select report category
→ Select report template
→ Apply filters
→ Preview report
→ Export PDF / Excel
```

## Rules

- All reports must be professionally designed.
- No draft-looking reports.
- Charts included where useful.
- ACC sees contractor comparison.
- Contractor sees own scope only.
- Users can favorite/pin reports.
- App Owner can enable/disable templates from module settings.
- Future scheduled reports should be architecturally supported.

---

# OA-009 — Settings

**Reference image:** `reference_images/oil_analysis/OA009_settings.png`

## Purpose

Configure Oil Analysis module behavior without code changes.

## Access

App Owner only.

## Setting Groups

- PDF Import & OCR.
- Sampling Rules.
- Automatic Workflow.
- Report Settings.
- Timeline Settings.
- Dashboard Settings.
- Storage Configuration.
- Laboratory Status Color Mapping.
- Advanced Settings.

## Key Decisions

- Auto draft actions for Alert + Caution.
- Manual action creation allowed.
- Duplicate detection by Sample ID.
- Low OCR confidence marks fields for engineer review.
- No saving until engineer review is completed.
- Batch upload size configurable.
- Branding inherited from main platform.
- Notifications controlled from App Owner platform settings.
- PDF storage configurable in module settings.
- Color mapping only:
  - Green = Normal.
  - Yellow = Caution.
  - Red = Alert.
- No orange mapping.
- Advanced settings collapsed by default.

## Storage Configuration

App Owner configures:

- Google Drive folder.
- Folder structure.
- Retention period.
- Test connection.

---

# 3. Implementation Guardrails

Cursor/Claude must not:

- Redesign database.
- Modify migration scripts.
- Break contractor isolation.
- Replace Equipment_ID as master asset.
- Replace LP_ID tracking logic.
- Hardcode ACC/contractor logos inside module pages.
- Save PDF-imported samples before engineer review.
- Import historical sample columns from a PDF as new samples.
- Create duplicate action systems per module.

Cursor/Claude must:

- Reuse shared platform components where safe.
- Create missing reusable components only when needed.
- Keep current data services unless broken by UI refactor.
- Maintain mobile responsiveness.
- Follow the approved reference images and design system.
