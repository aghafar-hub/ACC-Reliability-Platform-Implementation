# ACC Reliability Platform — Database Migration Notes

**Version:** 1.1.0  
**Date:** 2026-07-04  
**Scope:** Migration from legacy Oil Lubrication Google Sheet to the new four-workbook architecture

---

## Table of Contents

1. [Overview](#1-overview)
2. [Source: Legacy Oil Lubrication Sheet](#2-source-legacy-oil-lubrication-sheet)
3. [Target: New Workbook Architecture](#3-target-new-workbook-architecture)
4. [Field Mapping Tables](#4-field-mapping-tables)
5. [Data Transformation Rules](#5-data-transformation-rules)
6. [Migration Sequence](#6-migration-sequence)
7. [Manual Migration Steps](#7-manual-migration-steps)
8. [Validation Checklist](#8-validation-checklist)
9. [Rollback Plan](#9-rollback-plan)
10. [Known Data Quality Issues](#10-known-data-quality-issues)
11. [Post-Migration Tasks](#11-post-migration-tasks)

---

## 1. Overview

The ACC Reliability Platform previously maintained oil lubrication data in a
single monolithic Google Sheet ("the old sheet"). This document describes how
data in that sheet maps into the new four-workbook structured architecture.

**Migration goals:**
- Preserve all historical oil change and sampling records.
- Normalise equipment and LP data into the Master Data workbook.
- Separate configuration (roles, settings) from operational data.
- Establish the new schema as the single source of truth.
- Leave the old sheet intact (read-only archive) during transition.

**Migration type:** Manual copy-transform-paste with Apps Script assistance. All legacy value translations are data-driven via the **Legacy Mapping Layer** sheets in `ACC_PLATFORM_MASTER_DATA`.

**Migration flow:**

```
Legacy Workbook
      ↓
Legacy Mapping Layer  (Legacy_*_Mapping sheets)
      ↓
Platform Master Data  (Areas, Contractors, Oil_Types, …)
```

No direct hardcoded mapping is permitted in migration code. The Platform Owner maintains all translation rules in the mapping sheets.

**Migration window:** Complete before the new application goes live in production.

---

## 1.1 Area Contractor Ownership (schema patch)

Each area belongs to **exactly one** responsible contractor. There are no shared areas.

| Rule | Detail |
|---|---|
| Area ownership | `Areas.responsible_contractor_id` → `Contractors.contractor_id` (required) |
| Equipment placement | Every `Equipment_Master` row must have `area_id` |
| Contractor on equipment | Legacy `Equipment.Contractor` is validated against the area's `responsible_contractor_id`; it is **not** stored on `Equipment_Master` |
| Visibility — ACC | Platform/org `ACC` users see all areas |
| Visibility — RHI | Users see only areas where `responsible_contractor_id` = RHI contractor |
| Visibility — ASEC | Users see only areas where `responsible_contractor_id` = ASEC contractor |

**Excluded from schema (do not migrate):** `secondary_contractor_id`, `is_shared_area`, `owner_notes`.

**Legacy → target Areas columns:**

| Legacy source | Legacy column | Target column | Notes |
|---|---|---|---|
| Users_Config.Areas | Location Code | `area_code` | Copy as-is |
| Users_Config.Areas | Area Name | `area_name` | Copy as-is |
| Users_Config.Areas | Contractor | `responsible_contractor_id` | Resolve via `Legacy_Contractor_Mapping` → `Contractors.contractor_id` (after Contractors seeded) |
| Equipment Register | Line | `line` | Dominant line per area (mode of equipment lines in area) |
| Equipment Register / naming | Area | `main_area` | Production unit grouping (e.g. Kiln, Raw Mill) |
| — | — | `area_id` | Generate `AREA-NNN` |
| — | — | `status` | Default `ACTIVE` |
| — | — | `created_at` / `updated_at` | Migration timestamp |

---

## 2. Source: Legacy Oil Lubrication Sheet

The old sheet is assumed to have the following structure (common for manual
tracking sheets). Adjust column names below if your actual sheet differs.

### Assumed Legacy Sheet Tabs

| Tab Name | Content |
|---|---|
| Equipment | Equipment list with basic properties |
| Lubrication Points | LP list linked to equipment |
| Oil Changes | All oil change records (both planned and completed) |
| Oil Samples | Sampling records |
| Oil Types | Oil product catalog |
| Inventory | Current oil stock |
| Users / Technicians | User list |
| Settings | Ad-hoc configuration notes |
| Notifications (if exists) | Manual notification log |

> If your legacy sheet has different tab names, map them to the tables below using the logical content description.

---

## 3. Target: New Workbook Architecture

| Legacy Tab | Target Workbook | Target Sheet(s) |
|---|---|---|
| Equipment | ACC_PLATFORM_MASTER_DATA | Equipment_Master, Equipment_Types, Areas |
| Lubrication Points | ACC_PLATFORM_MASTER_DATA | LP_Master |
| Oil Changes (planned) | ACC_OIL_LUBRICATION_DATA | Oil_Change_Actions |
| Oil Changes (completed) | ACC_OIL_LUBRICATION_DATA | Oil_Change_History |
| Oil Samples | ACC_OIL_LUBRICATION_DATA | Oil_Sampling_Actions, Oil_Sampling_History |
| Oil Types | ACC_PLATFORM_MASTER_DATA | Oil_Types, Oil_Brands |
| Inventory | ACC_OIL_LUBRICATION_DATA | Oil_Inventory, Oil_Stock_Transactions |
| Users / Technicians | ACC_PLATFORM_SETTINGS_CONFIG | Users, Roles |
| Settings | ACC_PLATFORM_SETTINGS_CONFIG | App_Settings, Module_Settings |
| Notifications | ACC_OIL_LUBRICATION_DATA | Lubrication_Notifications |
| (none — new) | ACC_PLATFORM_SETTINGS_CONFIG | Roles, Permissions, Approval_Rules, etc. |
| (none — new) | ACC_OIL_LUBRICATION_DATA | Lubrication_Approvals, Lubrication_Audit_Log |
| (none — new) | ACC_OIL_ANALYSIS_DATA | All sheets |

---

## 3.1 Legacy Mapping Layer (Sprint 08)

All legacy-to-platform value translations are maintained in seven configurable sheets on `ACC_PLATFORM_MASTER_DATA`. The migration preview engine (`previewMasterDataMigration`) reads these sheets at runtime — no plant-specific translations are hardcoded in Apps Script.

| Mapping Sheet | Resolves | Target |
|---|---|---|
| `Legacy_Area_Mapping` | Area codes and names | `Areas.area_id` |
| `Legacy_Oil_Type_Mapping` | Lubricant type names | `Oil_Types.oil_type_id` |
| `Legacy_Oil_Brand_Mapping` | Oil brand names | `Oil_Brands.brand_id` |
| `Legacy_Equipment_Type_Mapping` | Equipment type labels | `Equipment_Types.type_id` |
| `Legacy_Contractor_Mapping` | Contractor names/codes | `Contractors.contractor_id` |
| `Legacy_Status_Mapping` | Legacy status labels | `Status_Dictionary.status_code` |
| `Legacy_Line_Mapping` | Production line labels | Normalized line identifier |

**Resolution order (preview and future execute migration):**

1. If legacy value already matches a platform master record → **Already valid**
2. Else look up `legacy_value` in the appropriate `Legacy_*_Mapping` sheet (ACTIVE rows only)
3. If mapping found and destination exists → **Mapped automatically** — continue validation
4. If mapping found but destination missing → **ERROR** (`V-MAP-002`)
5. If no mapping and no direct match → **ERROR** (`V-MAP-001`) — add row to mapping sheet

**Platform Owner responsibilities:**

- Populate mapping sheets before running migration preview
- Review `Unmapped Legacy Values` section in `Migration_Preview_Report`
- Set `status` = `INACTIVE` to ignore obsolete legacy values without deleting history

---

## 4. Field Mapping Tables

---

### 4.1a Areas → Areas

| Legacy Column | New Column | Transformation |
|---|---|---|
| Location Code | area_code | Copy as-is; resolve area references via `Legacy_Area_Mapping` |
| Area Name | area_name | Copy as-is |
| Contractor | responsible_contractor_id | Resolve via `Legacy_Contractor_Mapping` → `Contractors.contractor_id`; **required** |
| Equipment Register.Line (derived) | line | Dominant production line for this area |
| Area naming / OA registry (derived) | main_area | Plant section (e.g. Kiln, Raw Mill) |
| (new) | area_id | `AREA-NNN` |
| (new) | status | `ACTIVE` unless legacy indicates inactive |
| (new) | created_at / updated_at | Migration timestamp |

> Do **not** create `secondary_contractor_id`, `is_shared_area`, or `owner_notes`.

---

### 4.1 Equipment → Equipment_Master

| Legacy Column | New Column | Transformation |
|---|---|---|
| Equipment ID / Tag | equipment_tag | Copy as-is (unique plant tag) |
| Equipment Name | equipment_name | Copy as-is |
| Equipment Type | equipment_type_id | Resolve via `Legacy_Equipment_Type_Mapping` → `Equipment_Types.type_id` |
| Area / Location | area_id | Resolve via `Legacy_Area_Mapping` → `Areas.area_id`; **required** — block if blank |
| Parent Equipment (if any) | parent_equipment_id | Look up parent by equipment_tag; leave blank if none |
| Contractor (legacy Equipment tab) | *(validation only)* | Must match `Areas.responsible_contractor_id` for resolved area; log mismatch as WARNING |
| Criticality | criticality | Map: High→A, Medium→B, Low→C; or copy A/B/C directly |
| Active / Status | status | Map: Active/Yes→`ACTIVE`, Inactive/No→`INACTIVE` |
| (new) | equipment_id | Generate: `EQP-` + zero-padded row number |
| (new) | created_at | Use earliest date in old sheet or today |
| (new) | updated_at | Use today |

> **Frozen master fields only.** Do not migrate description, manufacturer, model, serial_number, or install_date into Equipment_Master — retain in migration notes if needed for engineering review.

---

### 4.1b Equipment Register → Equipment_Line_Assignments

| Legacy Column | New Column | Transformation |
|---|---|---|
| Line | line | Copy as-is |
| Area | area | Copy area name/code |
| Equipment Code | equipment_code | Copy as-is |
| (derived) | source_workbook | `Equipment Register` |
| (derived) | source_sheet | Source tab name (e.g. `EQ Rigester`) |
| (derived) | source_row | Original row number |
| (new) | assignment_id | Generate: `ELA-` + zero-padded row number |
| (new) | status | Default `ACTIVE` |
| (new) | created_at / updated_at | Migration timestamp |

> One equipment code may appear on multiple lines — preserve all rows here. Deduplicate to a single `Equipment_Master` row per unique `equipment_tag`.

---

### 4.2 Lubrication Points → LP_Master

| Legacy Column | New Column | Transformation |
|---|---|---|
| LP ID | lp_id | Copy or generate `LP-XXXX` |
| LP Name / Description | lp_name | Copy as-is |
| Equipment ID / Tag | equipment_id | Look up new equipment_id by equipment_tag; **required** |
| Lube Point Type | lube_point_type | Map to: GEARBOX, BEARING, HYDRAULIC, COMPRESSOR, OTHER |
| Oil Type / Specification | oil_type_id | Look up in Oil_Types by type_code; blank = migration WARNING |
| Oil Brand / Product | oil_brand_id | Look up in Oil_Brands by brand_name |
| Oil Capacity (L) | oil_capacity_liters | Copy numeric value |
| Change Interval (days) | change_interval_days | Convert if stored as weeks/months: ×7 or ×30 |
| Sampling required (derive) | sampling_required | TRUE if sampling interval or history exists; else FALSE |
| Sampling Interval (days) | sampling_interval_days | Same conversion as change interval |
| Active | status | Map: Active→`ACTIVE`, Inactive→`INACTIVE` |
| (new) | created_at | Use earliest date or today |
| (new) | updated_at | Migration timestamp |

> **Not migrated to LP_Master:** `lp_code`, `last_change_date`, `last_sample_date` — operational dates live in Oil Lubrication history sheets.

---

### 4.2b Lubricant catalog → Oil_Types, Oil_Brands, Oil_Products

| Legacy source | Target sheet | Notes |
|---|---|---|
| Lubricant Types (type/viscosity) | Oil_Types | Existing mapping |
| Lubricant Types (brand) | Oil_Brands | Existing mapping |
| Combined product rows | Oil_Products | One row per distinct commercial product; link `oil_type_id` + `oil_brand_id` |

**Oil_Products columns:** `oil_product_id`, `oil_type_id`, `oil_brand_id`, `product_name`, `iso_vg`, `application`, `oem_approval`, `density`, `viscosity`, `flash_point`, `msds_url`, `safety_notes`, `status`, `created_at`, `updated_at`

---

### 4.2c Contractors (seed before Areas)

| Legacy / seed | New Column | Transformation |
|---|---|---|
| Contractor name | contractor_name | RHI, ASEC, lab names |
| Short code | contractor_code | `RHI`, `ASEC`, etc. — unique |
| (derive) | contractor_type | `MAINTENANCE` for RHI/ASEC; `OIL_LAB` for labs |
| Contact fields | contact_person, email, phone | Copy if available |
| Service description | scope | Free text |
| Active | status | `ACTIVE` unless legacy inactive |
| (new) | contractor_id | `CTR-001`, `CTR-002`, … |
| (new) | created_at / updated_at | Migration timestamp |

---

### 4.3 Oil Changes (Planned/Open) → Oil_Change_Actions

These are oil changes that were scheduled or in progress at migration time.

| Legacy Column | New Column | Transformation |
|---|---|---|
| Record ID | (generate) | Generate action_id: `ACT-OC-` + zero-padded number |
| LP ID / Code | lp_id | Look up new lp_id by lp_code |
| Equipment Tag | equipment_id | Look up new equipment_id |
| Scheduled Date | scheduled_date | Reformat to YYYY-MM-DD |
| Assigned To | assigned_technician_id | Look up Users.user_id by name or email |
| Status | status | Map (see 5.1 below) |
| Priority | priority | Map (see 5.2 below) |
| Oil Type | oil_type_id | Look up Oil_Types.oil_type_id |
| Oil Brand | oil_brand_id | Look up Oil_Brands.brand_id |
| Quantity Required (L) | quantity_required_liters | Copy numeric value |
| Notes / Comments | notes | Copy as-is |
| Created Date | created_at | Reformat to ISO timestamp |
| Created By | created_by | Email or `migration@acc.com` |

---

### 4.4 Oil Changes (Completed) → Oil_Change_History

These are completed historical records. If the old sheet does not separate
planned from completed, migrate all completed rows here and open rows to
Oil_Change_Actions.

| Legacy Column | New Column | Transformation |
|---|---|---|
| Record ID | action_id | Copy original ID; generate history_id separately |
| (new) | history_id | Generate: `HIST-OC-` + zero-padded number |
| LP Code | lp_id | Look up LP_Master |
| Equipment Tag | equipment_id | Look up Equipment_Master |
| Completion Date / Actual Date | change_date | Reformat to YYYY-MM-DD |
| Technician Name | technician_id | Look up Users.user_id; leave blank if no match |
| Oil Type | oil_type_id | Look up Oil_Types |
| Oil Brand | oil_brand_id | Look up Oil_Brands |
| Quantity Used (L) | quantity_used_liters | Copy numeric value |
| Oil Condition Before | condition_before | Map to: GOOD, DEGRADED, CONTAMINATED, UNKNOWN |
| Oil Condition After | condition_after | Map to: GOOD, FRESH |
| Notes | notes | Copy as-is |
| Completion Date | created_at | Use completion date as ISO timestamp |
| Completed By / Technician | created_by | Use technician email or `migration@acc.com` |

---

### 4.5 Oil Samples → Oil_Sampling_Actions + Oil_Sampling_History

Split by status:
- Open/scheduled samples → Oil_Sampling_Actions
- Completed samples → Oil_Sampling_History + Oil_Samples (if lab result exists)

| Legacy Column | New Column | Transformation |
|---|---|---|
| Sample ID | (generate) | Generate action_id: `ACT-OS-XXXX` |
| LP Code | lp_id | Look up LP_Master |
| Equipment Tag | equipment_id | Look up Equipment_Master |
| Scheduled Date | scheduled_date | Reformat to YYYY-MM-DD |
| Sample Date (actual) | sample_date (History) | Reformat to YYYY-MM-DD |
| Technician | assigned_technician_id | Look up Users.user_id |
| Sampling Method | sampling_method | Map to: VACUUM, INLINE, DRAIN; default VACUUM |
| Bottle ID / Label | sample_bottle_id | Copy as-is |
| Lab Reference | lab_reference (History) | Copy as-is |
| Sent to Lab Date | sent_to_lab_date (History) | Reformat |
| Status | status | Map (see 5.1) |
| Notes | notes | Copy as-is |

---

### 4.6 Oil Types → Oil_Types + Oil_Brands

The legacy sheet may combine oil type and brand in one column or tab.

| Legacy Column | New Column | Notes |
|---|---|---|
| Oil Type Code | type_code | e.g. VG46, VG320 |
| Oil Type Name | type_name | Full product name |
| Viscosity Grade | viscosity_grade | ISO grade only (e.g. VG46) |
| Base Type | base_type | MINERAL / SYNTHETIC / SEMI-SYNTHETIC |
| Application | application_notes | Copy as-is |
| Brand / Manufacturer | brand_name, manufacturer | Split into Oil_Brands |
| Product Line | product_line | Copy as-is |

> If one legacy row contains both oil type and brand, create two rows: one in
> Oil_Types and one in Oil_Brands, linked by the lp_id references.

---

### 4.7 Inventory → Oil_Inventory + Oil_Stock_Transactions

| Legacy Column | New Column | Transformation |
|---|---|---|
| Oil Type | oil_type_id | Look up Oil_Types |
| Oil Brand | oil_brand_id | Look up Oil_Brands |
| Location / Warehouse | warehouse_location | Copy as-is |
| Current Quantity (L) | quantity_liters | Copy numeric value |
| Minimum Level (L) | min_stock_liters | Copy numeric value |
| Reorder Level (L) | reorder_point_liters | Copy numeric value |
| Last Updated | last_updated | Reformat to ISO timestamp |

**For Oil_Stock_Transactions:** Create one opening balance row per inventory
line with:
- `transaction_type = RECEIPT`
- `quantity_liters` = the opening balance quantity
- `transaction_date` = migration date
- `notes = "Opening balance — migrated from legacy sheet [date]"`

---

### 4.8 Users / Technicians → Users + Roles

| Legacy Column | New Column | Transformation |
|---|---|---|
| Name | full_name | Copy as-is |
| Email | email | Use Google Workspace email |
| Employee ID | employee_id | Copy as-is |
| Department | department | Copy as-is |
| Role / Position | role_id | Map to Roles (see 5.3) |
| Active | is_active | Map: Yes/Active→TRUE |
| (new) | user_id | Generate UUID or use `USR-XXXX` |

---

## 5. Data Transformation Rules

### 5.1 Status Mapping

The old sheet likely used free-text or abbreviated status values. Map these to
the new standard status codes:

| Legacy Status (Examples) | New status Value |
|---|---|
| Scheduled, Planned, Due, Upcoming | SCHEDULED |
| In Progress, Started, Open, Ongoing | IN_PROGRESS |
| Awaiting Approval, Pending Review | PENDING_APPROVAL |
| Approved | APPROVED |
| Done, Complete, Finished, Closed | COMPLETED |
| Cancelled, Void, Deleted | CANCELLED |
| Overdue, Late, Missed | OVERDUE |

> For any status not in this table, use best judgment. If uncertain, use
> `SCHEDULED` for future dates and `COMPLETED` for past dates.

---

### 5.2 Priority Mapping

| Legacy Priority (Examples) | New priority Value |
|---|---|
| Emergency, Urgent, P1 | CRITICAL |
| High, P2, Important | HIGH |
| Normal, Medium, P3, Standard | MEDIUM |
| Low, P4, Routine, Scheduled | LOW |
| (blank) | MEDIUM (default) |

---

### 5.3 Role Mapping

| Legacy Role / Title | New role_code |
|---|---|
| Admin, System Admin, IT Admin | PLATFORM_ADMIN |
| Supervisor, Manager, Team Lead | MAINT_SUPV |
| Technician, Tech, Field Tech | LUB_TECH |
| Engineer, Lube Engineer, Lubrication Specialist | LUB_ENG |
| Reliability Engineer, RE | REL_ENG |
| Warehouse, Store Keeper | WAREHOUSE_ADMIN |
| Lab Admin, Lab Technician | LAB_ADMIN |
| (no role) | LUB_TECH (safest default) |

---

### 5.4 Date Formats

All dates must be normalised before import:

| Source Format | Target Format | Example |
|---|---|---|
| `04/07/2025` | `2025-07-04` | Use YYYY-MM-DD |
| `July 4, 2025` | `2025-07-04` | — |
| `4-Jul-25` | `2025-07-04` | — |
| `44837` (Excel serial) | `2025-07-04` | Use Sheets formula: `=TEXT(A1,"YYYY-MM-DD")` |
| Timestamps | `2025-07-04T09:00:00` | Append `T00:00:00` if no time present |

---

### 5.5 Numeric Values

- Remove any unit suffixes (e.g. "5L" → 5, "3 days" → 3).
- Convert commas to decimal points where regional settings differ.
- Ensure all litre quantities are in decimal litres (not mL or kg).

---

### 5.6 Generating IDs

When the old sheet lacks unique IDs, generate them with this pattern:

```
equipment_id  →  EQP-0001, EQP-0002, ...
lp_id         →  LP-0001, LP-0002, ...
user_id       →  USR-0001, USR-0002, ...
action_id     →  ACT-OC-0001, ACT-OC-0002, ... (oil changes)
              →  ACT-OS-0001, ACT-OS-0002, ... (oil samples)
sample_id     →  SMP-2025-0001, SMP-2025-0002, ...
history_id    →  HIST-OC-0001, ... (oil change history)
```

You can use a Google Sheets formula for auto-generation:
```
=CONCATENATE("EQP-", TEXT(ROW()-1, "0000"))
```

---

## 6. Migration Sequence

Execute in this order to avoid broken foreign key references:

```
Step 1 — Settings workbook
  1a. Migrate Roles
  1b. Migrate Users (requires Roles.role_id)
  1c. Set up App_Settings, Module_Settings
  1d. Leave other sheets empty — configure after go-live

Step 2 — Master Data workbook
  2a. Migrate Contractors (RHI, ASEC, labs — required before Areas)
  2b. Migrate Areas (requires Contractors; set responsible_contractor_id)
  2c. Migrate Equipment_Types
  2d. Migrate Equipment_Master (requires Areas, Equipment_Types)
  2e. Migrate Equipment_Line_Assignments (from Equipment Register — traceability)
  2f. Migrate Oil_Types
  2g. Migrate Oil_Brands
  2h. Migrate Oil_Products (requires Oil_Types, Oil_Brands)
  2i. Migrate LP_Master (requires Equipment_Master, Oil_Types, Oil_Brands)
  2j. Migrate Route_Templates (requires Areas)
  2k. Populate Status_Dictionary, Priority_Dictionary, Criticality_Dictionary

Step 3 — Oil Lubrication workbook
  3a. Migrate Oil_Inventory (requires Oil_Types, Oil_Brands)
  3b. Migrate Oil_Stock_Transactions (opening balances)
  3c. Migrate Oil_Change_History (requires LP_Master, Users)
  3d. Migrate Oil_Change_Actions — open/pending only (requires LP_Master, Users)
  3e. Migrate Oil_Sampling_History (requires LP_Master, Users)
  3f. Migrate Oil_Sampling_Actions — open/pending only
  3g. Leave Notifications, Approvals, Audit_Log empty — app will populate

Step 4 — Oil Analysis workbook
  4a. Migrate Oil_Samples (requires LP_Master, Users, Contractors)
  4b. Migrate Oil_Analysis_Results (requires Oil_Samples)
  4c. Leave all other sheets empty — app and engineers will populate

Step 5 — Post-migration verification
  5a. Run validation checklist (Section 8)
  5b. Update LP_Master.last_change_date and last_sample_date
  5c. Freeze and protect the old sheet
```

---

## 7. Manual Migration Steps

### Step A: Prepare the Mapping Workbook

Before migrating, create a temporary "Migration Mapping" Google Sheet with tabs:
- **Equipment_Map**: old equipment tag → new equipment_id
- **LP_Map**: old LP code → new lp_id
- **User_Map**: old name → new user_id
- **OilType_Map**: old oil name → new oil_type_id
- **OilBrand_Map**: old brand name → new brand_id

Use VLOOKUP in all migration formulas to resolve IDs through this mapping sheet.

---

### Step B: Migrate Areas (after Contractors)

1. Open **ACC_PLATFORM_MASTER_DATA > Contractors** and confirm RHI and ASEC rows exist.
2. Open the old **Users_Config > Areas** tab (Location Code, Area Name, Contractor).
3. Open **ACC_PLATFORM_MASTER_DATA > Areas**.
4. Create one row per unique area with `responsible_contractor_id` set from legacy Contractor.
5. Derive `line` and `main_area` from Equipment Register and OA Equipment Registry where available.
6. Assign `area_code` and `area_id` (`AREA-001`, etc.); set `status = ACTIVE`.
7. Record area_id values in your mapping sheet.

---

### Step C: Migrate Equipment_Types and Oil_Types

1. Extract unique equipment type names from the old Equipment tab.
2. Create rows in **Equipment_Types** with appropriate `type_code`.
3. Extract unique oil type names from the old Oil Types tab.
4. Create rows in **Oil_Types** (viscosity, base_type, application_notes).
5. Create rows in **Oil_Brands** for each unique brand.

---

### Step D: Migrate Equipment_Master

Use a Google Sheets formula-based migration:

1. In a new column in the old equipment sheet, add:
   ```
   =CONCATENATE("EQP-", TEXT(ROW()-1, "0000"))
   ```
   This generates the new equipment_id values.

2. Copy all rows and paste-as-values into Equipment_Master.
3. Use VLOOKUP to resolve area_id and equipment_type_id.
4. Manually fix criticality, manufacturer, model where missing.
5. Add created_at = today, created_by = `migration@acc.com`.

---

### Step E: Migrate LP_Master

1. In the old LP sheet, add a formula column for `lp_id`:
   ```
   =CONCATENATE("LP-", TEXT(ROW()-1, "0000"))
   ```
2. Use VLOOKUP to resolve `equipment_id` from Equipment_Map.
3. Use VLOOKUP to resolve `oil_type_id` and `oil_brand_id`.
4. **Important:** Do NOT fill `last_change_date` and `last_sample_date` here.
   These will be set by Step G.

---

### Step F: Migrate Users

1. Extract unique names/emails from old Technicians/Users tab.
2. Create rows in **Users** sheet.
3. Assign `user_id = USR-XXXX`.
4. Map each user to a role using the Role Mapping table (Section 5.3).
5. Set `is_active = TRUE` for all active staff.

---

### Step G: Migrate Oil_Change_History (completed records)

This is the most important and largest migration step.

1. From the old Oil Changes sheet, filter rows where status = completed.
2. Sort by date ascending (oldest first).
3. For each row, create a row in **Oil_Change_History**.
4. Use VLOOKUP through LP_Map and User_Map to resolve IDs.
5. After migration, find the most recent change per LP:
   - Use `=MAXIFS(change_date, lp_id, [lp_id])` in Oil_Change_History.
   - Update each LP row in LP_Master with `last_change_date`.

---

### Step H: Migrate Oil_Change_Actions (open records only)

1. From old Oil Changes, filter for open/pending/scheduled status.
2. Create rows in **Oil_Change_Actions**.
3. Set `status` using the Status Mapping table (Section 5.1).
4. For `approved_by`, `approved_at`, `completed_by`, `completed_at`: leave blank.

---

### Step I: Migrate Oil Inventory

1. Copy each inventory row to **Oil_Inventory**.
2. Resolve oil_type_id and oil_brand_id from mapping sheets.
3. Add opening balance rows to **Oil_Stock_Transactions**:
   ```
   transaction_type = RECEIPT
   quantity_liters  = [current quantity]
   transaction_date = [migration date]
   notes            = "Opening balance — migrated from legacy sheet [date]"
   ```

---

### Step J: Migrate Oil Samples (if present)

1. Create a row in **Oil_Samples** for each sample that was collected.
2. Set `status`:
   - Sample exists in sheet only → `COLLECTED`
   - Sample was sent to lab → `SENT_TO_LAB`
   - Lab results exist → `ANALYSIS_COMPLETE`
3. Create rows in **Oil_Analysis_Results** for any known analysis values.

---

## 8. Validation Checklist

Run these checks after migration is complete before going live.

### Legacy Mapping Layer (preview — Sprint 08)

| Rule ID | Check | Preview severity |
|---|---|---|
| V-MAP-001 | Legacy value has no mapping and no direct platform match | **ERROR** |
| V-MAP-002 | Mapping row points to missing destination record | **ERROR** |

Preview report sections: **Migration Mapping Statistics**, **Unmapped Legacy Values**.

### Area Contractor Validation (preview + post-migrate)

| Rule ID | Check | Preview severity | Post-migrate |
|---|---|---|---|
| V-AREA-001 | Every area has `responsible_contractor_id` | **ERROR** | **ERROR** |
| V-AREA-002 | Every equipment row has `area_id` | **ERROR** | **ERROR** |
| V-AREA-003 | Legacy equipment `Contractor` matches area `responsible_contractor_id` | **WARNING** | **WARNING** (or ERROR if >5% mismatch) |
| V-LP-001 | Every LP row has `equipment_id` | **ERROR** | **ERROR** |
| V-OIL-001 | LP missing `oil_type_id` / lubricant type | **WARNING** | **WARNING** |
| V-EQP-DUP | No duplicate `equipment_tag` in Equipment_Master candidates | **ERROR** | **ERROR** |
| V-LP-DUP | No duplicate `lp_id` | **BLOCKER** | **BLOCKER** |
| V-AREA-004 | No `secondary_contractor_id` / `is_shared_area` / `owner_notes` columns created | **ERROR** | **ERROR** |
| V-AREA-005 | RHI areas reference RHI contractor only; ASEC areas reference ASEC contractor only | **ERROR** | **ERROR** |

Log all V-AREA-* results to `Migration_Change_Log` with `changeType=VALIDATION_FLAG`.

### Data Integrity

- [ ] Every area has a valid `responsible_contractor_id` in Contractors
- [ ] Every Equipment_Master row has a valid `area_id` in Areas
- [ ] Legacy equipment contractor matches area responsible contractor (or logged as WARNING)
- [ ] Every LP_Master row has a valid equipment_id that exists in Equipment_Master
- [ ] LP rows missing oil type logged as WARNING (V-OIL-001)
- [ ] Every Oil_Change_Actions row has a valid lp_id in LP_Master
- [ ] Every Oil_Change_History row has a valid lp_id in LP_Master
- [ ] Every user_id in action sheets exists in Users
- [ ] All oil_type_id values in actions exist in Oil_Types
- [ ] All oil_brand_id values exist in Oil_Brands
- [ ] No duplicate lp_id values in LP_Master
- [ ] No duplicate equipment_tag values in Equipment_Master
- [ ] No duplicate email values in Users

### Completeness

- [ ] Total record count in Oil_Change_History >= record count in old completed sheet
- [ ] Total record count in Oil_Change_Actions matches open records in old sheet
- [ ] All LPs have last_change_date populated (from migrated history)
- [ ] All inventory rows have an opening balance transaction

### Status Values

- [ ] No status values in Oil_Change_Actions outside the approved list
- [ ] No status values in Oil_Sampling_Actions outside the approved list
- [ ] All is_active values are exactly TRUE or FALSE (not yes/no/1/0)

### Date Formats

- [ ] All dates in YYYY-MM-DD format
- [ ] All timestamps in YYYY-MM-DDTHH:MM:SS format
- [ ] No Excel serial date numbers remain

### Spot Checks (manual)

- [ ] Pick 5 LPs and verify their change history is correct
- [ ] Pick 3 equipment records and verify all LPs link back correctly
- [ ] Pick 5 open actions and verify they have the correct status and assignee
- [ ] Check that inventory quantities match what you expect from the old sheet

---

## 9. Rollback Plan

If migration introduces data issues after go-live:

1. **Old sheet remains intact** — it was never deleted or modified.
2. Set the new application to read-only mode or disable it.
3. Instruct engineers to revert to using the old sheet manually.
4. Identify which migration step introduced the error.
5. Fix the mapping and re-run only the affected migration step.
6. Re-validate and re-enable the application.

**Do not delete the old sheet** for at least 90 days after go-live.

---

## 10. Known Data Quality Issues

These issues exist in most manually-maintained legacy sheets and must be
addressed during migration:

### Common Issues and How to Handle Them

| Issue | Symptom | Resolution |
|---|---|---|
| LP has no assigned oil type | `oil_type_id` is blank | Consult the Lubrication Engineer to fill in the correct oil type before migration |
| Equipment has no area | `area_id` is blank | Assign area from legacy Area column; **block migration** if still blank |
| Area has no contractor | `responsible_contractor_id` blank | Map from legacy Areas.Contractor (`RHI`/`ASEC`); **block migration** if unresolved |
| Equipment contractor ≠ area contractor | Legacy mismatch | Log WARNING; prefer area ownership; fix source data before go-live if ERROR threshold exceeded |
| Technician name not matching email | Cannot resolve `user_id` | Match by employee ID or name; create a new user row if truly missing |
| Duplicate LP codes | Same lp_id appears twice | **BLOCKER** — investigate and deduplicate before migration |
| Inconsistent oil quantity units | Some in litres, some in kg | Convert to litres. Note: 1 kg ≈ 1 litre for mineral oils (±5%) |
| Missing completion dates | History records with no date | Use the scheduled date as the completion date; add a note |
| Free-text in status columns | "done but not signed off", etc. | Map to closest standard status; add the original text to `notes` |
| Intervals stored as months | "3 months" change interval | Convert: 3 months = 90 days |
| Missing change history | Old sheet only shows last change | Create a single history row per LP using the last known date |
| Lab results in PDF files only | No digital result records | Create Oil_Samples rows; set `status=ANALYSIS_COMPLETE`; data entry team creates Oil_Analysis_Results rows from PDFs |

---

## 11. Post-Migration Tasks

Complete these tasks after data migration and before application go-live:

### Configuration

- [ ] Configure `App_Settings` with production values (session timeout, feature flags)
- [ ] Configure `Module_Settings` for OIL_LUB and OIL_ANALYSIS modules
- [ ] Set up `Notification_Rules` for overdue actions, approvals, inventory alerts
- [ ] Set up `Approval_Rules` for oil change and oil sample approval chains
- [ ] Set up `Escalation_Rules` with appropriate delay hours
- [ ] Populate `KPI_Config` with relevant KPIs
- [ ] Configure `Audit_Config` for all operational sheets
- [ ] Set up `Role_Permissions` mapping for all roles and permissions
- [ ] Configure `Dashboard_Config` for each role's homepage

### Data Completion

- [ ] Populate `Status_Dictionary` for all modules and entity types
- [ ] Populate `Priority_Dictionary` with response SLAs
- [ ] Populate `Criticality_Dictionary`
- [ ] Populate `Language_Config` with all Arabic translations
- [ ] Configure `Theme_Config` with ACC branding

### Validation

- [ ] Run the application in test mode against migrated data
- [ ] Have the Lubrication Engineer review 20 LP records for accuracy
- [ ] Have the Maintenance Supervisor verify 10 oil change actions
- [ ] Confirm overdue detection picks up the correct actions
- [ ] Test one complete approval workflow end-to-end

### Operational Handover

- [ ] Brief all technicians on the new sheet structure
- [ ] Provide the Manual Fallback Operations Guide (Section 10 of DATABASE_SHEETS_ARCHITECTURE.md)
- [ ] Set up a one-week monitoring period where both old and new sheets are compared
- [ ] Archive the old sheet to a read-only "Archive" folder in Google Drive
- [ ] Document any data decisions made during migration in a "Migration Log" tab on the old sheet

---

*For full column definitions and architecture, see `docs/DATABASE_SHEETS_ARCHITECTURE.md` and `docs/04_PLATFORM_INFRASTRUCTURE/DATABASE_SCHEMA.md`.*  
*For the initializer script, see `apps-script/database/initializeAccDatabase.gs`.*
