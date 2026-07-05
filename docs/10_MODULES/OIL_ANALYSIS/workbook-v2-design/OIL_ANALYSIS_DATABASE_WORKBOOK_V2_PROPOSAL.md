# Oil Analysis Database Workbook V2 — Architecture & Engineering Design Proposal

**Document ID:** `OIL_ANALYSIS_DATABASE_WORKBOOK_V2_PROPOSAL`  
**Status:** Design Draft — Awaiting Engineering Approval  
**Date:** 2026-07-05  
**Author:** ACC Reliability Platform Engineering (Design Task)  
**Prototype:** `ACC_OIL_ANALYSIS_DATABASE_V2_DRAFT.xlsx`  
**Diagram:** `WORKBOOK_RELATIONSHIP_DIAGRAM.md`

> **Scope:** Design only. No production workbook, Apps Script, application, or database changes.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Workbook Philosophy](#2-workbook-philosophy)
3. [Three-Level Data Architecture](#3-three-level-data-architecture)
4. [Worksheet Catalog](#4-worksheet-catalog)
5. [Column Specifications](#5-column-specifications)
6. [Validation Rules](#6-validation-rules)
7. [Relationships & Keys](#7-relationships--keys)
8. [Data Flow](#8-data-flow)
9. [Emergency Operation](#9-emergency-operation)
10. [V1 Workbook Analysis](#10-v1-workbook-analysis)
11. [Migration Considerations](#11-migration-considerations)
12. [Future Integrations](#12-future-integrations)
13. [Recommendations](#13-recommendations)
14. [Approval Checklist](#14-approval-checklist)

---

## 1. Executive Summary

Version 2 redesigns the Arabian Cement Oil Analysis Google Workbook as a **professional, long-life engineering database** (10+ year horizon) that:

- Aligns with the **approved Oil Analysis UI** (OA-001 through OA-008 freeze)
- Respects **ACC Platform architecture** and module ownership boundaries
- Preserves the **existing engineering workflow** engineers have used for years
- Introduces a **controlled staging layer** for future OCR and Google Drive integration
- Keeps **`Data_Entry` as the sole approved production sample table**
- Converts **Action Tracker** and **Oil Change Log** to **read-only platform mirrors**
- Continues to function when the web app, Apps Script, OCR, or Drive are unavailable

The workbook remains an **engineering emergency fallback**, not the application database.

---

## 2. Workbook Philosophy

### 2.1 Purpose

| Principle | Implementation |
|-----------|----------------|
| **Clarity** | Tab names, color bands, and README sheet explain level and editability at a glance |
| **Safety** | Staging ≠ Production. OCR never auto-writes samples. No hard deletes — audit log + `Record_Status` |
| **Continuity** | V1 column order and lab parameter names preserved where possible |
| **Platform alignment** | `Equipment_ID`, `LP_ID`, `Sample_ID`, `Action_No` naming matches platform standards |
| **Ownership discipline** | Oil changes and engineering actions are **viewed**, not owned, in this workbook |
| **Manual-first fallback** | Direct `Data_Entry` entry always works without automation |

### 2.2 What This Workbook Is

- Engineering master record for **approved oil analysis samples**
- Emergency operations console when the ACC Reliability Platform is down
- Staging and review surface for PDF/OCR imports (future)
- Analytics source for trackers, reports, and dashboards

### 2.3 What This Workbook Is Not

- The platform application database
- The master for engineering actions (`Action_No` lives in Platform Engineering Actions)
- The master for oil changes (owned by Oil Lubrication Module)
- An uncontrolled OCR output dump

### 2.4 Tab Color Convention (Google Sheets implementation)

| Color | Level | Editability |
|-------|-------|-------------|
| Dark Blue header | Navigation / README | Read-only |
| Green band | Level 2 Production (`Data_Entry`) | Engineer editable |
| Light Blue band | Level 2 Reference (`Equipment_Registry`, `LP_Register`) | Reference — limited emergency edit |
| Gray band | Level 2 Viewer (`Action_Tracker`, `Oil_Change_Log`) | Read-only — protected |
| Purple band | Level 3 Analytics | Formula-only — protected |
| Yellow band | Level 1 Staging (`OCR_Review`) | Engineer review only |
| Hidden tabs | System (`OCR_Import_Queue`, audit, config) | System / admin |

---

## 3. Three-Level Data Architecture

### LEVEL 1 — Staging (Temporary)

**Purpose:** Hold imported, unapproved data. Nothing here is production truth.

| Sheet | Visibility |
|-------|------------|
| `OCR_Import_Queue` | Hidden |
| `OCR_Review` | Visible to engineers |

**Exit criteria:** Engineer approval → single row promoted to `Data_Entry` → audit event appended.

### LEVEL 2 — Production & Reference

| Category | Sheets |
|----------|--------|
| **Production (editable)** | `Data_Entry` only |
| **Reference** | `Equipment_Registry`, `LP_Register` |
| **Viewer (read-only)** | `Action_Tracker`, `Oil_Change_Log` |

### LEVEL 3 — Analytics (Never Manually Edited)

| Sheet | Replaces V1 |
|-------|-------------|
| `Dashboard` | `Sheet1` (hidden dashboard) |
| `Oil_Sample_Tracker` | `Oil Sample Tracker` |
| `Oil_Sample_Timeline` | `Oil Sample Tracker 1` |
| `Analysis_Reports` | `📊Analysis Reports` |

All L3 cells are formula-driven or query-driven from Level 2. Sheet protection blocks manual override except header filter controls.

---

## 4. Worksheet Catalog

### 4.1 README

| Attribute | Value |
|-----------|-------|
| **Purpose** | Engineer onboarding, tab index, data-flow summary, emergency instructions |
| **Owner** | Reliability Engineering |
| **Editable** | Read-only (admin updates on version change) |
| **Data Source** | Static documentation |
| **Data Destination** | None |

---

### 4.2 Data_Entry ★ PRODUCTION

| Attribute | Value |
|-----------|-------|
| **Purpose** | **Sole approved production table** for oil analysis sample records |
| **Owner** | Reliability Engineers |
| **Editable** | **Yes** — manual entry and approved OCR promotion only |
| **Data Source** | Manual entry; approved rows from `OCR_Review`; optional platform sync (future) |
| **Data Destination** | All L3 analytics; ACC Oil Analysis App (when available) |
| **Layout** | Rows 1–3: title/instructions; Row 4: year/month filters; Row 5: headers; Row 6+: data |
| **Protection** | Header rows protected; data region editable for authorized engineers |

**V1 preservation:** Retains 5-row header structure and year/month filter pattern from V1 `onEdit` hide-row behavior (implemented in Apps Script at deployment — not in this design deliverable).

---

### 4.3 Equipment_Registry

| Attribute | Value |
|-----------|-------|
| **Purpose** | Master equipment reference keyed by `Equipment_ID` |
| **Owner** | Platform Equipment Registry (workbook = emergency copy) |
| **Editable** | Reference — emergency add only when platform unavailable |
| **Data Source** | Platform sync; manual emergency entry |
| **Data Destination** | Validates `Data_Entry.Equipment_ID`; populates OCR equipment suggestions |

**V1 columns retained:** Code, Description, Asset ID, Asset Class, Lubricant Grade, Interval, Manufacturer, Model, Area.

**V2 additions:** `Contractor_ID`, `Criticality`, `Active`, `Last_Synced`.

---

### 4.4 LP_Register

| Attribute | Value |
|-----------|-------|
| **Purpose** | Lubrication point reference keyed by `LP_ID` — aligns with OA-001 Equipment & LP Register |
| **Owner** | Oil Lubrication Module (workbook = emergency copy) |
| **Editable** | Read-only mirror |
| **Data Source** | Platform / Oil Lubrication sync |
| **Data Destination** | Validates `Data_Entry.LP_ID`; populates OCR review LP dropdown |

**Rationale:** V1 tracked samples per `Equipment_ID` only. Platform UI is LP-centric. This sheet bridges legacy equipment codes to `LP_ID` without breaking equipment-level history.

---

### 4.5 OCR_Import_Queue (Hidden)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Store uploaded PDF metadata and raw OCR extraction results |
| **Owner** | System (Apps Script / future integration) |
| **Editable** | System append-only |
| **Data Source** | PDF upload pipeline |
| **Data Destination** | `OCR_Review`, `PDF_Archive`, `Import_Audit_Log` |

---

### 4.6 OCR_Review

| Attribute | Value |
|-----------|-------|
| **Purpose** | Engineer reviews extracted samples before production |
| **Owner** | Reliability Engineers |
| **Editable** | Review fields editable; promotion is explicit action |
| **Data Source** | `OCR_Import_Queue` |
| **Data Destination** | `Data_Entry` (on approve); `LP_Mapping_Memory` (on LP confirm); `Import_Audit_Log` |

**UI alignment:** Mirrors OA-004 Add Sample / PDF Import review screen (split review workflow).

---

### 4.7 Action_Tracker (Viewer)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Display Oil Analysis-related engineering actions only |
| **Owner** | Platform Engineering Actions (master) |
| **Editable** | **Read-only** — displays "🔒 VIEWER" banner |
| **Data Source** | Platform sync where `Source = Oil Analysis` |
| **Data Destination** | `Dashboard`, `Analysis_Reports` (last 5 actions) |

**Not allowed:** Manual action creation as master record. Emergency workaround: create action in platform when available; temporary notes in `Data_Entry.Sample_Analysis` only.

**V2 column alignment (OA-005):** `Action_No`, `LP_ID`, `Equipment_ID`, `Sample_ID`, `Priority`, `Status`, `Contractor`, `Assigned_To`, `Due_Date`.

---

### 4.8 Oil_Change_Log (Viewer)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Condition-based oil change history for context in analysis |
| **Owner** | Oil Lubrication Module |
| **Editable** | **Read-only** |
| **Data Source** | Oil Lubrication Module sync |
| **Data Destination** | `Dashboard`, `Analysis_Reports` oil change strip |

**V2 improvement:** Add `LP_ID`, remove ambiguous column `323` from V1. Status remains formula-derived in source module, not overwritten locally (preserves V1 Apps Script rule).

---

### 4.9 Dashboard

| Attribute | Value |
|-----------|-------|
| **Purpose** | Fleet-level KPIs and equipment diagnostic summary |
| **Owner** | Analytics (formula engine) |
| **Editable** | **Never** — equipment selector only |
| **Data Source** | `Data_Entry`, `Action_Tracker`, `Oil_Change_Log` |
| **Data Destination** | Engineer visual review; optional app cache comparison |

**KPIs (aligned with app):** Critical / Caution / Normal counts (latest sample per LP), overdue oil changes, open actions, total samples.

---

### 4.10 Oil_Sample_Tracker

| Attribute | Value |
|-----------|-------|
| **Purpose** | Monthly matrix of sample status per `LP_ID` (replaces equipment-only V1 tracker) |
| **Owner** | Analytics |
| **Editable** | **Never** |
| **Data Source** | `Data_Entry` — latest sample per LP per month |
| **Data Destination** | Engineer compliance view; aligns with deprecated app "Sample Tracker" now in Timeline UI |

**Cell format (preserved from V1):** `Status|DD Mon YYYY` e.g. `Alert|20 Apr 2026` or `MISSING`.

---

### 4.11 Oil_Sample_Timeline

| Attribute | Value |
|-----------|-------|
| **Purpose** | Sampling interval compliance — last sample, next due, days remaining |
| **Owner** | Analytics |
| **Editable** | **Never** |
| **Data Source** | `Data_Entry`, `LP_Register.OA_Interval_Days` |
| **Data Destination** | Replaces `Oil Sample Tracker 1` interval view; aligns with OA Timeline screen |

---

### 4.12 Analysis_Reports

| Attribute | Value |
|-----------|-------|
| **Purpose** | Per-sample engineering report layout (Mobil-style sections) |
| **Owner** | Analytics |
| **Editable** | **Never** |
| **Data Source** | `Data_Entry` selected sample + last 5 trend rows + `Action_Tracker` + `Oil_Change_Log` |
| **Data Destination** | Engineer review; PDF export (future script) |

**Preserves:** Lab PDF cell color intent (Normal/Caution/Alert), 5-sample trend table, recommendations section.

---

### 4.13 LP_Mapping_Memory (Hidden)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Remember engineer-confirmed `Equipment_ID` → `LP_ID` mappings by report pattern |
| **Owner** | System + engineer learning |
| **Editable** | System append/update on approved OCR review |
| **Data Source** | `OCR_Review` approvals |
| **Data Destination** | `OCR_Review` LP suggestions |

**Aligns with:** `lp-mapping-memory.service.ts` in application (rule-based, not AI).

---

### 4.14 PDF_Archive (Hidden)

| Attribute | Value |
|-----------|-------|
| **Purpose** | PDF metadata only — not binary storage |
| **Owner** | System |
| **Editable** | System append-only |
| **Data Source** | Google Drive upload (future) |
| **Data Destination** | `Data_Entry.PDF_File_ID`, `Data_Entry.PDF_URL` |

---

### 4.15 Import_Audit_Log (Hidden)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Append-only log of every import event |
| **Owner** | System |
| **Editable** | Append-only — **nothing deleted** |
| **Event Types** | `Uploaded`, `Approved`, `Rejected`, `Skipped`, `Overwritten`, `Manual_Entry` |
| **Data Source** | All import and promotion workflows |
| **Data Destination** | Compliance audit; future platform sync |

---

### 4.16 _Config_Validation (Hidden)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Dropdown source lists for data validation |
| **Owner** | Engineering admin |
| **Editable** | Admin only |
| **Contains** | Report statuses, import sources, record statuses, review statuses, audit event types |

---

### 4.17 _Sync_Metadata (Hidden)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Last sync timestamps per external entity |
| **Owner** | System |
| **Editable** | System |
| **Tracks** | Action_Tracker, Oil_Change_Log, LP_Register, optional Data_Entry bidirectional sync |

---

## 5. Column Specifications

### 5.1 Data_Entry (49 columns)

| Col | Field | Type | Required | Validation | V1 Map |
|-----|-------|------|----------|------------|--------|
| A | `Equipment_ID` | Text | Yes | Must exist in `Equipment_Registry` | A: Equipment Code |
| B | `LP_ID` | Text | Yes* | Must exist in `LP_Register` when set | **NEW** |
| C | `Equipment_Description` | Text | No | Auto-fill from registry | B: Description |
| D | `Sample_ID` | Text | Yes | Unique among `Record_Status=Active` | C: sample ID |
| E | `Sample_Date` | Date | Yes | ≤ today + 7 days tolerance | D: Sample Date |
| F | `Report_Status` | List | Yes | Normal, Caution, Alert | E: Report Status |
| G | `Contamination_Rating` | List | Yes | Normal, Caution, Alert | F: Contamination Rating |
| H | `Equipment_Rating` | List | Yes | Normal, Caution, Alert | G: Equipment Rating |
| I | `Lubricant_Rating` | List | Yes | Normal, Caution, Alert | H: Lubricant Rating |
| J | `Particle_Count_>4um` | Number | No | ≥ 0 | I |
| K | `Particle_Count_>6um` | Number | No | ≥ 0 | J |
| L | `Particle_Count_>14um` | Number | No | ≥ 0 | K |
| M | `PQ_Index` | Number | No | ≥ 0 | L: PQ Index |
| N | `Visc@40C_cSt` | Number | No | > 0 | M: Visc@40C |
| O | `TAN_mgKOHg` | Number | No | ≥ 0 | N: TAN |
| P | `Oxidation_Abcm` | Number | No | ≥ 0 | O: Oxidation |
| Q | `Water_VolPct` | Number | No | 0–100 | P: Water |
| R | `Ag_ppm` | Number | No | ≥ 0 | Q: Ag |
| S | `Al_ppm` | Number | No | ≥ 0 | R: Al |
| T | `Cr_ppm` | Number | No | ≥ 0 | S: Cr |
| U | `Cu_ppm` | Number | No | ≥ 0 | T: Cu |
| V | `Fe_ppm` | Number | No | ≥ 0 | U: Fe |
| W | `Mo_ppm` | Number | No | ≥ 0 | V: Mo |
| X | `Ni_ppm` | Number | No | ≥ 0 | W: Ni |
| Y | `Pb_ppm` | Number | No | ≥ 0 | X: Pb |
| Z | `Sn_ppm` | Number | No | ≥ 0 | Y: Sn |
| AA | `K_ppm` | Number | No | ≥ 0 | Z: K |
| AB | `Na_ppm` | Number | No | ≥ 0 | AA: Na |
| AC | `Si_ppm` | Number | No | ≥ 0 | AB: Si |
| AD | `B_ppm` | Number | No | ≥ 0 | AC: B |
| AE | `Ba_ppm` | Number | No | ≥ 0 | AD: Ba |
| AF | `Ca_ppm` | Number | No | ≥ 0 | AE: Ca |
| AG | `Mg_ppm` | Number | No | ≥ 0 | AF: Mg |
| AH | `P_ppm` | Number | No | ≥ 0 | AG: P |
| AI | `Zn_ppm` | Number | No | ≥ 0 | AH: Zn |
| AJ | `Alert_Type` | Text | No | Free text / lab category | AI: Alert Type |
| AK | `Sample_Analysis` | Text | No | Long text — lab narrative | AJ: Sample Analysis |
| AL | `Lubricant_Grade` | Text | No | e.g. MOBIL SHC 630 | **NEW** |
| AM | `Contractor_ID` | List | No | RHI, ASEC, etc. | **NEW** |
| AN | `Import_Source` | List | Yes | manual, ocr-approved, platform-sync | **NEW** |
| AO | `PDF_File_ID` | Text | No | Drive file ID | **NEW** |
| AP | `PDF_URL` | URL | No | Drive view link | **NEW** |
| AQ | `Record_Status` | List | Yes | Active, Cancelled | **NEW** |
| AR | `OCR_Queue_ID` | Text | No | FK to staging | **NEW** |
| AS | `Approved_By` | Text | No | Engineer name | **NEW** |
| AT | `Approved_At` | DateTime | No | ISO 8601 | **NEW** |
| AU | `Created_By` | Text | No | | **NEW** |
| AV | `Created_At` | DateTime | No | | **NEW** |
| AW | `Last_Modified` | DateTime | Yes | Auto-stamp | AK: Last Modified |
| AX | `Row_Version` | Integer | Yes | Starts at 1; increments on overwrite | **NEW** |

\*`LP_ID` required for all new samples post-migration; legacy rows may have blank `LP_ID` during transition period with migration flag.

---

### 5.2 Equipment_Registry

| Col | Field | Type | Required | Validation |
|-----|-------|------|----------|------------|
| A | `Equipment_ID` | Text | Yes | Unique |
| B | `Description` | Text | Yes | |
| C | `Asset_ID` | Text | No | |
| D | `Asset_Class` | Text | No | Gear Drive, Hydraulics, etc. |
| E | `Lubricant_Grade` | Text | No | |
| F | `Sampling_Interval` | Text | No | e.g. 3 Months, 6 Months |
| G | `Manufacturer` | Text | No | |
| H | `Model` | Text | No | |
| I | `Area` | Text | No | Kiln, Raw Mill, etc. |
| J | `Contractor_ID` | List | No | |
| K | `Criticality` | List | No | Low, Medium, High, Critical |
| L | `Active` | List | Yes | Yes, No |
| M | `Last_Synced` | DateTime | No | Platform sync stamp |

---

### 5.3 LP_Register

| Col | Field | Type | Required | Validation |
|-----|-------|------|----------|------------|
| A | `LP_ID` | Text | Yes | Unique |
| B | `Equipment_ID` | Text | Yes | FK → Equipment_Registry |
| C | `LP_Name` | Text | Yes | |
| D | `Position` | Text | No | Drive End, Gearbox, etc. |
| E | `Lubricant_Spec` | Text | No | |
| F | `OA_Required` | List | Yes | Yes, No |
| G | `OA_Interval_Days` | Integer | No | Required if OA_Required=Yes |
| H | `Contractor_ID` | List | No | |
| I | `Active` | List | Yes | Yes, No |
| J | `Last_Synced` | DateTime | No | |

---

### 5.4 OCR_Import_Queue

| Col | Field | Type | Required | Notes |
|-----|-------|------|----------|-------|
| A | `Queue_ID` | Text | Yes | `OCR-YYYY-NNNN` |
| B | `Received_At` | DateTime | Yes | |
| C | `PDF_File_Name` | Text | Yes | |
| D | `Drive_File_ID` | Text | No | Future Drive |
| E | `Drive_URL` | URL | No | |
| F | `Report_Pattern` | Text | No | mobil-alert-v3, etc. |
| G | `Page_Count` | Integer | No | |
| H | `OCR_Status` | List | Yes | Queued, Extracting, Extracted, Failed |
| I | `Extract_JSON_Ref` | Text | No | Pointer to raw JSON blob |
| J | `Duplicate_Sample_ID` | Text | No | Pre-check result |
| K | `Import_Batch_ID` | Text | No | Batch upload grouping |
| L | `Equipment_ID_Extracted` | Text | No | OCR output |
| M | `Sample_ID_Extracted` | Text | No | OCR output |
| N | `Sample_Date_Extracted` | Date | No | OCR output |
| O | `Report_Status_Extracted` | List | No | |
| P | `OCR_Confidence` | Number | No | 0.0–1.0 |

---

### 5.5 OCR_Review

| Col | Field | Type | Required | Notes |
|-----|-------|------|----------|-------|
| A | `Queue_ID` | Text | Yes | FK → OCR_Import_Queue |
| B | `PDF_File_Name` | Text | Yes | Display |
| C | `Equipment_ID_Suggested` | Text | Yes | Editable |
| D | `LP_ID_Confirmed` | Text | No* | Required before approve |
| E | `Sample_ID` | Text | Yes | Editable |
| F | `Sample_Date` | Date | Yes | |
| G | `Report_Status` | List | Yes | |
| H | `OCR_Confidence` | Number | No | Display |
| I | `Review_Status` | List | Yes | Pending, Pending LP Mapping, Approved, Rejected, Skipped |
| J | `Reviewer` | Text | No | |
| K | `Reviewed_At` | DateTime | No | |
| L | `Duplicate_Resolution` | List | No | Skip, Overwrite, Manual |
| M | `Notes` | Text | No | |
| N–AS | Lab parameters | Various | No | Mirror Data_Entry extract fields for correction |

---

### 5.6 Action_Tracker (Viewer)

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | `Action_No` | Text | Platform master key |
| B | `Equipment_ID` | Text | |
| C | `LP_ID` | Text | OA-005 alignment |
| D | `Equipment_Name` | Text | |
| E | `Sample_ID` | Text | Triggering sample |
| F | `Priority` | List | Low, Medium, High, Critical |
| G | `Status` | List | Open, In Progress, Waiting Stoppage, Completed, Cancelled |
| H | `Contractor` | Text | |
| I | `Assigned_To` | Text | |
| J | `Due_Date` | Date | |
| K | `Sample_Date` | Date | Context |
| L | `Sample_Result` | List | Normal, Caution, Alert |
| M | `Sample_Analysis` | Text | |
| N | `ACC_Action` | Text | |
| O | `Contractor_Action` | Text | |
| P | `Agreed_Action` | Text | |
| Q | `Completed_Date` | Date | |
| R | `Last_Synced` | DateTime | |

---

### 5.7 Oil_Change_Log (Viewer)

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | `Equipment_ID` | Text | Was "Asset" |
| B | `LP_ID` | Text | **NEW** |
| C | `Equipment_Name` | Text | |
| D | `LP_Name` | Text | |
| E | `Frequency_Type` | Text | Oil Analysis, Calendar, etc. |
| F | `Oil_Type` | Text | |
| G | `Brand` | Text | |
| H | `Qty_L` | Number | |
| I | `Last_Change_Date` | Date | |
| J | `Next_Due_Date` | Date | |
| K | `Status` | Text | OK, Overdue, Due Soon — from source |
| L | `Change_Reason` | Text | Condition-based, Scheduled |
| M | `Last_Synced` | DateTime | |

---

### 5.8 Import_Audit_Log

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | `Audit_ID` | Text | `AUD-NNNNN` monotonic |
| B | `Event_Timestamp` | DateTime | ISO 8601 |
| C | `Event_Type` | List | Uploaded, Approved, Rejected, Skipped, Overwritten, Manual_Entry |
| D | `Queue_ID` | Text | Nullable |
| E | `Sample_ID` | Text | Nullable |
| F | `Equipment_ID` | Text | |
| G | `LP_ID` | Text | |
| H | `Actor` | Text | User or System |
| I | `Details` | Text | Free text |
| J | `Prior_Row_Version` | Integer | For overwrites |

---

## 6. Validation Rules

### 6.1 Data_Entry Business Rules

1. `Sample_ID` must be unique among rows where `Record_Status = Active`.
2. `Equipment_ID` must exist in `Equipment_Registry` with `Active = Yes`.
3. `LP_ID` must reference an LP where `LP_Register.Equipment_ID` matches row `Equipment_ID`.
4. `Report_Status`, `Contamination_Rating`, `Equipment_Rating`, `Lubricant_Rating` ∈ {Normal, Caution, Alert}.
5. `Import_Source` ∈ {manual, ocr-approved, platform-sync}.
6. Rows with `Import_Source = ocr-approved` must have non-empty `Approved_By` and `OCR_Queue_ID`.
7. **No row deletion** — set `Record_Status = Cancelled` and log to `Import_Audit_Log`.
8. Overwrite of duplicate `Sample_ID` increments `Row_Version` and logs `Overwritten` event.

### 6.2 OCR Workflow Rules

1. Only the **latest sample column** from each PDF is imported (OA-003/OA-004).
2. OCR confidence below threshold highlights fields for manual confirmation — never blocks review.
3. `LP_ID` is never auto-assigned without engineer confirmation.
4. Rejected items remain in `OCR_Review` with status `Rejected` — not deleted.

### 6.3 Viewer Sheet Rules

1. `Action_Tracker` and `Oil_Change_Log` are sheet-protected.
2. Local edits are overwritten on next platform sync.
3. Emergency action tracking: use platform when possible; do not revert to V1 manual action ownership.

---

## 7. Relationships & Keys

```
Equipment_Registry (1) ──< (N) LP_Register
Equipment_Registry (1) ──< (N) Data_Entry
LP_Register      (1) ──< (N) Data_Entry
Data_Entry       (1) ──< (0..1) PDF_Archive  [via Sample_ID]
OCR_Import_Queue (1) ──< (1) OCR_Review
OCR_Review       (1) ──< (0..1) Data_Entry   [on approval]
Platform Actions (1) ──< (1) Action_Tracker [mirror]
Oil Lube Module  (1) ──< (1) Oil_Change_Log  [mirror]
```

**Primary keys:**

| Entity | Key |
|--------|-----|
| Sample record | `Sample_ID` (+ `Row_Version` for history) |
| Equipment | `Equipment_ID` |
| Lubrication point | `LP_ID` |
| OCR item | `Queue_ID` |
| Action (viewer) | `Action_No` |
| Audit event | `Audit_ID` |

---

## 8. Data Flow

See `WORKBOOK_RELATIONSHIP_DIAGRAM.md` for full diagrams.

**Canonical path:**

```text
PDF → OCR_Import_Queue → OCR_Review → [Engineer Approval] → Data_Entry
  → Oil_Sample_Tracker / Oil_Sample_Timeline / Analysis_Reports / Dashboard
  → [optional] Oil Analysis Application
```

**Parallel read mirrors:**

```text
Platform Engineering Actions (Source=Oil Analysis) → Action_Tracker
Oil Lubrication Module → Oil_Change_Log
Platform LP Registry → LP_Register
```

---

## 9. Emergency Operation

The workbook **must** remain fully operable when:

| Failure | Engineer workflow |
|---------|-------------------|
| Web application down | Enter samples directly in `Data_Entry`; use trackers and dashboard for analysis |
| Apps Script down | Manual sheet operation; no auto tracker update — engineer runs periodic formula refresh on open (acceptable degradation) |
| OCR down | Manual `Data_Entry` entry; PDFs stored locally until Drive available |
| Google Drive down | `PDF_File_ID` blank; sample data still captured in `Data_Entry` |

**Minimum viable emergency:** `Equipment_Registry` + `Data_Entry` + `Oil_Sample_Tracker` (formulas).

**README sheet** documents this explicitly for shift handover.

---

## 10. V1 Workbook Analysis

### 10.1 V1 Sheet Inventory (studied)

| Sheet | Rows (approx) | Engineering purpose |
|-------|---------------|---------------------|
| `Data_Entry` | ~690 samples | Master sample table — **retained as core** |
| `Data Entry_BD` | ~740 rows | Hidden backup duplicate — **retire** (use audit + Record_Status) |
| `Equipment Registry` | ~150 equipment | Equipment reference — **retained, extended** |
| `Oil Sample Tracker` | Monthly matrix | Compliance heatmap — **retained, LP-centric** |
| `Oil Sample Tracker 1` | Interval view | Sampling interval tracking — **retained as Timeline** |
| `📊Analysis Reports` | Per-equipment report | Engineering report — **retained, formula-only** |
| `Action Tracker` | ~640 actions | Action tracking — **converted to viewer** |
| `Oil Change Log` | ~150 assets | Oil change scheduling — **converted to viewer** |
| `Sheet1` | Dashboard | KPI dashboard — **retained** |
| `Analysis Report` | Hidden calc | Legacy — **retired** |

### 10.2 V1 Strengths to Preserve

- Rich lab parameter column set (wear metals, contaminants, physical properties)
- Monthly tracker matrix with `Status|Date` cell format
- Year/month row filters on `Data_Entry`
- Three-tier status model: Normal / Caution / Alert
- Sample analysis narrative field for engineering notes
- Equipment Registry as familiar lookup

### 10.3 V1 Gaps Addressed in V2

- No `LP_ID` — added throughout
- Action Tracker owned locally — now platform viewer
- Oil Change Log owned locally — now Oil Lube viewer
- No OCR staging — added L1 sheets
- No audit trail — `Import_Audit_Log`
- Duplicate `Data Entry_BD` — eliminated
- Ambiguous Oil Change Log columns — cleaned

---

## 11. Migration Considerations

### Phase 0 — Design Approval (current)

- Review this proposal and prototype workbook
- Confirm column mapping and LP migration strategy

### Phase 1 — Workbook Structure

- Create V2 workbook from approved design
- Import `Equipment_Registry` from V1
- Import `Data_Entry` with column mapping (see §5.1 V1 Map)
- Leave `LP_ID` blank initially; run LP mapping project

### Phase 2 — LP Backfill

- Export LP list from Oil Lubrication platform
- Populate `LP_Register`
- Engineering team maps historical samples: equipment code → LP_ID
- Use migration helper column `LP_ID_Migration_Notes` (temporary; removed after completion)

### Phase 3 — Viewer Cutover

- Freeze manual edits on V1 Action Tracker and Oil Change Log
- Populate `Action_Tracker` and `Oil_Change_Log` from platform
- Sheet-protect viewer tabs

### Phase 4 — Analytics

- Rebuild tracker formulas for LP_ID rows
- Validate Dashboard KPIs against application dashboard
- Retire hidden `Analysis Report` and `Data Entry_BD` tabs

### Phase 5 — OCR (future)

- Enable `OCR_Import_Queue` / `OCR_Review` automation
- Connect Drive and `PDF_Archive`
- Enable `LP_Mapping_Memory` learning

**Data_Entry column mapping script (conceptual):**

| V1 Col | V2 Col |
|--------|--------|
| A → A | Equipment_ID |
| B → C | Equipment_Description |
| C → D | Sample_ID |
| D → E | Sample_Date |
| E–AJ | F–AK | Same parameters |
| AK → AW | Last_Modified |
| — | B | LP_ID (new — blank OK in Phase 1) |
| — | AN | Import_Source = `manual` for all migrated rows |

---

## 12. Future Integrations

| Integration | Workbook touchpoints | Direction |
|-------------|---------------------|-----------|
| **Oil Analysis App** | `Data_Entry`, viewers | Bidirectional sync when online; workbook wins on conflict during outage |
| **Google Drive** | `PDF_Archive`, `PDF_File_ID` | Upload PDF → store metadata |
| **OCR pipeline** | `OCR_Import_Queue`, `OCR_Review` | Automated extract → manual approve |
| **Platform Engineering Actions** | `Action_Tracker` | Platform → workbook |
| **Oil Lubrication** | `Oil_Change_Log`, `LP_Register` | Platform → workbook |
| **LP Mapping Memory** | `LP_Mapping_Memory` | Shared logic with app service |

**Sync conflict policy (recommended):**

- Application is master when online
- Workbook changes during outage queue in `_Sync_Metadata` for engineer-led merge
- `Import_Audit_Log` is authoritative for sample promotion history

---

## 13. Recommendations

1. **Approve LP_Register as mandatory reference** before enforcing `LP_ID` on new `Data_Entry` rows.
2. **Run 30-day parallel operation** — V1 read-only alongside V2 production validation.
3. **Assign workbook admin** responsible for `_Config_Validation` and hidden sheet access.
4. **Do not implement OCR automation** until `OCR_Review` manual workflow is validated by engineers.
5. **Retain V1 Apps Script read endpoints** during migration; add V2 endpoints incrementally (post-approval implementation).
6. **Use Equipment_ID strings exactly as V1** — do not rename codes (e.g. `111.AF040 (R)`).
7. **Train engineers** on staging vs production distinction — single most important operational change.
8. **Monthly audit** of `Import_Audit_Log` and `Record_Status=Cancelled` rows.

---

## 14. Approval Checklist

| # | Item | Approver | Status |
|---|------|----------|--------|
| 1 | Three-level architecture (Staging / Production / Analytics) | Reliability Manager | ☐ |
| 2 | `Data_Entry` as sole production table | Lead Engineer | ☐ |
| 3 | `LP_ID` column and `LP_Register` sheet | Oil Lube + OA leads | ☐ |
| 4 | Action Tracker as read-only viewer | Platform Engineering | ☐ |
| 5 | Oil Change Log as read-only viewer | Oil Lube lead | ☐ |
| 6 | OCR staging workflow | Reliability Manager | ☐ |
| 7 | Column mapping from V1 | Lead Engineer | ☐ |
| 8 | Migration phasing | Project Manager | ☐ |
| 9 | Prototype workbook layout | Engineering team | ☐ |

---

**Next step:** Engineering review meeting → approve or annotate → implementation phase (workbook build + Apps Script — separate task).

*End of proposal.*
