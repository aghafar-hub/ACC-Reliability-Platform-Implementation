# ACC Reliability Platform — Manual Fallback Guide

**Version:** 1.0.0  
**Date:** 2026-07-03  
**Audience:** Lubrication Engineers, Technicians, Supervisors, Lab Admins  
**When to use:** When the ACC web application is unavailable, offline, or producing errors.

---

## What Is This Guide?

The ACC Reliability Platform stores all data in Google Sheets. The web
application reads and writes to those sheets, but engineers can also
interact with the sheets directly. This guide tells you exactly what to
do when the app is down and work must continue manually.

**You do not need the app to:**
- Record completed oil changes
- Record oil samples collected
- Update inventory stock levels
- Approve or reject pending actions
- Enter lab analysis results manually
- Track routes manually

**You do need the app to:**
- Generate scheduled actions automatically from LP intervals
- Run OCR on lab report PDFs
- Send automated email notifications
- Calculate KPI dashboards and forecasts

---

## The Golden Rules

Read these before touching any sheet.

**Rule 1 — Never delete rows.**  
Especially in History and Audit Log sheets. Mark records as CANCELLED or INACTIVE instead.

**Rule 2 — Never edit App-Only columns.**  
Columns with a red/pink background (`approved_by`, `approved_at`, `completed_by`, `completed_at`, `last_login`, `google_id`, `based_on_actions`, `ocr_status`, `ip_address`, `session_id`) are owned by the application. Leave them blank if they are empty. Do not overwrite them.

**Rule 3 — Never edit System columns.**  
Columns with a purple background (`created_at`, `updated_at`, `created_by`, `updated_by`) are set by the app. You may fill `created_at` and `created_by` if you are creating a row manually — write today's date and your email. Do not edit them on existing rows.

**Rule 4 — Use exact validation values.**  
Every column with a drop-down list will reject values not in the list. Use the drop-down to select. If you type manually, match the case exactly (e.g. `SCHEDULED` not `Scheduled`).

**Rule 5 — Date format is always YYYY-MM-DD.**  
Example: `2025-07-04` — not `04/07/2025`, not `July 4, 2025`.

**Rule 6 — Document your manual edits.**  
Always write in the `notes` column: `"Manual entry — app unavailable — [your name] — [date]"`.

**Rule 7 — History and Audit sheets are append-only.**  
`Oil_Change_History`, `Oil_Sampling_History`, `Lubrication_Audit_Log`, and `Oil_Analysis_Audit_Log` are immutable records. Only append new rows. Never edit existing rows.

---

## Column Color Guide

The initializer script applies background colors to every column in every sheet.

| Background | Column Type | Meaning |
|---|---|---|
| Yellow | Required `[R]` | Must fill before saving the row |
| Light red | App-Only `[A]` | Do not touch — app controls this |
| Light purple | System `[S]` | Auto-set by app — fill only when creating a row manually |
| White | Optional `[O]` | Fill if you have the information — not mandatory |

---

## Which Sheets Are Safe to Edit

### Freely Editable (human-primary sheets)

| Workbook | Sheet | Who Edits |
|---|---|---|
| SETTINGS | App_Settings | Platform Admin only |
| SETTINGS | Module_Settings | Platform Admin or Module Admin |
| SETTINGS | Roles | Platform Admin |
| SETTINGS | Users | Platform Admin |
| SETTINGS | User_Module_Access | Platform Admin or Module Admin |
| SETTINGS | Notification_Rules | Platform Admin or Module Admin |
| SETTINGS | Approval_Rules | Platform Admin or Module Admin |
| MASTER_DATA | Equipment_Master | Maintenance Engineer or Admin |
| MASTER_DATA | LP_Master | Lubrication Engineer or Admin |
| MASTER_DATA | Areas | Plant Admin |
| MASTER_DATA | Contractors | Admin or Procurement |
| MASTER_DATA | Oil_Types | Lubrication Engineer |
| MASTER_DATA | Oil_Brands | Lubrication Engineer or Procurement |
| OIL_LUB | Oil_Change_Actions | Technician, Supervisor, Engineer |
| OIL_LUB | Oil_Sampling_Actions | Technician or Supervisor |
| OIL_LUB | Oil_Inventory | Warehouse Admin or Engineer |
| OIL_LUB | Oil_Stock_Transactions | Warehouse Admin |
| OIL_LUB | Lubrication_Approvals | Designated Approver |
| OIL_ANALYSIS | Oil_Samples | Lab Admin or Engineer |
| OIL_ANALYSIS | Oil_Analysis_Results | Lab Admin or Reliability Engineer |
| OIL_ANALYSIS | OCR_Review | Reliability Engineer or Lab Admin |
| OIL_ANALYSIS | Oil_Analysis_Actions | Reliability Engineer or Supervisor |

### Conditionally Editable (append-only or limited edits)

| Sheet | Allowed Manual Actions |
|---|---|
| Oil_Change_History | Append new rows only in emergencies |
| Oil_Sampling_History | Fill `lab_reference` field only |
| Oil_Routes | Create new route rows |
| Route_Actions | Add rows; update `status` and `technician_notes` |
| Oil_Analysis_Approvals | Approver edits `status` and `decision_notes` |
| Oil_Analysis_Reports | Engineer may append manual report rows |

### Read-Only (do not edit)

| Sheet | Reason |
|---|---|
| Lubrication_Audit_Log | Immutable compliance record |
| Oil_Analysis_Audit_Log | Immutable compliance record |
| Oil_Forecast | App-generated only |
| Oil_Analysis_Trends | App-generated only |
| Lubrication_Notifications | App-managed; view only |
| Oil_Analysis_Notifications | App-managed; view only |

---

## Procedure 1: Record a Completed Oil Change

**When:** A technician completed an oil change in the field, but the app was unavailable.

### Step 1 — Find or create the action row

Open **ACC_OIL_LUBRICATION_DATA > Oil_Change_Actions**.

Use the filter on column `lp_id` and `scheduled_date` to find the planned action.

**If the row exists:**
- Set `status` = `COMPLETED`
- Write in `notes`: `"Manual completion — app unavailable — [your name] — [date]"`

**If no row exists** (unscheduled emergency change):
- Append a new row with a manual `action_id`: `ACT-OC-MANUAL-[YYYYMMDD]-[LP code]`
- Fill all yellow (required) columns
- Set `status` = `COMPLETED`
- Set `created_at` = today's timestamp, `created_by` = your email

### Step 2 — Append to Oil_Change_History

Open **ACC_OIL_LUBRICATION_DATA > Oil_Change_History**.

Append a new row at the bottom:

| Column | Value to enter |
|---|---|
| `history_id` | `HIST-OC-MANUAL-[YYYYMMDD]-[LP code]` |
| `action_id` | The action_id from Step 1 |
| `lp_id` | The LP code |
| `equipment_id` | The equipment ID |
| `change_date` | Today (YYYY-MM-DD) |
| `technician_id` | Your user_id from Users sheet |
| `oil_type_id` | Oil type used |
| `oil_brand_id` | Oil brand used |
| `quantity_used_liters` | Actual quantity used |
| `condition_before` | Select from drop-down |
| `condition_after` | Select from drop-down |
| `notes` | `"Manual entry — app unavailable — [name] — [date]"` |
| `created_at` | Today's ISO timestamp |
| `created_by` | Your email |

### Step 3 — Update LP_Master

Open **ACC_PLATFORM_MASTER_DATA > LP_Master**.

Find the LP row and manually update:
- `last_change_date` = Today (YYYY-MM-DD)  
  ⚠️ This is an App-Only column but must be updated here because the app cannot do it while offline. Add a note in Oil_Change_History explaining the manual update.

### Step 4 — Update oil inventory

Open **ACC_OIL_LUBRICATION_DATA > Oil_Inventory**.

Find the oil product row and subtract the quantity used from `quantity_liters`.  
Example: If current stock is 200 L and you used 5 L, change to 195 L.  
Update `last_updated` and `last_updated_by`.

### Step 5 — Record the stock transaction

Open **ACC_OIL_LUBRICATION_DATA > Oil_Stock_Transactions**.

Append a row:

| Column | Value |
|---|---|
| `transaction_id` | `TXN-MANUAL-[YYYYMMDD]-[inventory_id]` |
| `inventory_id` | The inventory row ID |
| `transaction_type` | `CONSUMPTION` |
| `quantity_liters` | Negative number (e.g. `-5`) |
| `reference_action_id` | The action_id from Step 1 |
| `transaction_date` | Today |
| `notes` | `"Manual consumption — app unavailable — [name] — [date]"` |
| `created_by` | Your email |
| `created_at` | Today's ISO timestamp |

---

## Procedure 2: Record a Collected Oil Sample

**When:** Technician collected an oil sample and the app was unavailable.

### Step 1 — Create the action row (if missing)

Open **ACC_OIL_LUBRICATION_DATA > Oil_Sampling_Actions**.

Find the scheduled sampling action for this LP. If found, set `status` = `COMPLETED`.

If no row exists, append a new row:
- `action_id` = `ACT-OS-MANUAL-[YYYYMMDD]-[LP code]`
- Fill all required columns
- Set `status` = `COMPLETED`

### Step 2 — Append to Oil_Sampling_History

Open **Oil_Sampling_History**. Append:

| Column | Value |
|---|---|
| `history_id` | `HIST-OS-MANUAL-[YYYYMMDD]-[LP code]` |
| `action_id` | From Step 1 |
| `lp_id` | LP code |
| `equipment_id` | Equipment ID |
| `sample_date` | Date sample was taken |
| `technician_id` | Your user_id |
| `sample_bottle_id` | Bottle label/barcode if available |
| `lab_reference` | Leave blank — lab will provide |
| `notes` | `"Manual entry — app unavailable — [name] — [date]"` |
| `created_at` | Today's ISO timestamp |

### Step 3 — Create the sample registry row

Open **ACC_OIL_ANALYSIS_DATA > Oil_Samples**.

Append a row:

| Column | Value |
|---|---|
| `sample_id` | `SMP-[YYYY]-MANUAL-[LP code]` |
| `lp_id` | LP code |
| `equipment_id` | Equipment ID |
| `sample_date` | Date collected |
| `technician_id` | Your user_id |
| `sample_bottle_id` | Bottle label |
| `sample_source` | Select from drop-down |
| `status` | `COLLECTED` |
| `lab_id` | Lab contractor ID |
| `notes` | `"Manual entry — app unavailable"` |
| `created_at` | Today's ISO timestamp |
| `created_by` | Your email |

### Step 4 — Update LP_Master

Update `last_sample_date` in LP_Master to today (same caveat as Procedure 1 Step 3).

---

## Procedure 3: Approve an Oil Change Manually

**When:** An approver needs to approve an action but cannot reach the app.

### Step 1 — Find the approval row

Open **ACC_OIL_LUBRICATION_DATA > Lubrication_Approvals**.

Filter by `entity_id` = the action_id you need to approve.  
Find the row with `status` = `PENDING` and your user_id in `approver_user_id`.

### Step 2 — Set the approval

Edit the row:
- `status` = `APPROVED` (or `REJECTED` if refusing)
- `decision_notes` = `"Manual approval — app unavailable — [your full name] — [date]"`

If rejecting, you must provide a reason in `decision_notes`.

### Step 3 — Update the action row

Open **Oil_Change_Actions**.

Find the action and set `status` = `APPROVED`.

Add to `notes`: `"Manually approved by [approver name] — [date]"`

### Step 4 — Notify the technician

The notification system cannot fire while the app is down. Send the technician an email or call them directly to proceed with the oil change.

---

## Procedure 4: Receive Oil Stock Manually

**When:** Oil delivered to warehouse and the app is unavailable.

### Step 1 — Update inventory quantity

Open **ACC_OIL_LUBRICATION_DATA > Oil_Inventory**.

Find the row for the oil product received. Add the received quantity to `quantity_liters`.  
Example: Current stock 50 L + 200 L received = 250 L.

Update:
- `quantity_liters` = new total
- `last_updated` = today's ISO timestamp
- `last_updated_by` = your email

### Step 2 — Record the transaction

Open **Oil_Stock_Transactions**. Append:

| Column | Value |
|---|---|
| `transaction_id` | `TXN-RECV-[YYYYMMDD]-[inventory_id]` |
| `inventory_id` | The inventory row ID |
| `transaction_type` | `RECEIPT` |
| `quantity_liters` | Positive number received |
| `reference_action_id` | Leave blank |
| `transaction_date` | Today |
| `notes` | `"Manual receipt — PO#[number] — Supplier: [name] — [your email]"` |
| `created_by` | Your email |
| `created_at` | Today's ISO timestamp |

---

## Procedure 5: Enter Lab Analysis Results Manually

**When:** Paper lab report is received but OCR failed or app is unavailable.

### Step 1 — Confirm the sample exists

Open **ACC_OIL_ANALYSIS_DATA > Oil_Samples**.

Find the sample row. If it doesn't exist, create it following Procedure 2 Step 3.

Update `status` = `ANALYSIS_COMPLETE`.

### Step 2 — Enter results

Open **Oil_Analysis_Results**.

For each parameter in the lab report, append one row:

| Column | Value |
|---|---|
| `result_id` | `RES-MANUAL-[sample_id]-[parameter_name]` |
| `sample_id` | Sample ID |
| `parameter_name` | Exact name (e.g. `Viscosity_40C`, `Iron_ppm`) |
| `measured_value` | Numeric value from report |
| `unit` | Unit from report (cSt, ppm, %, mg KOH/g, etc.) |
| `alarm_limit` | Leave blank if unknown |
| `danger_limit` | Leave blank if unknown |
| `result_interpretation` | Your engineering assessment (NORMAL/CAUTION/ALERT/CRITICAL) |
| `analyzed_at` | Date lab analyzed the sample |
| `analyzed_by` | Lab analyst name |
| `created_at` | Today's ISO timestamp |

### Step 3 — Mark the PDF import and OCR review

Open **PDF_Imports** (if the PDF was uploaded):
- Set `extraction_status` = `ACCEPTED`

Open **OCR_Review**:
- For each row related to this import, set `review_status` = `ACCEPTED` (if values match report) or `CORRECTED` (if you changed any value)

### Step 4 — Create corrective actions if needed

If any result shows CAUTION or CRITICAL, open **Oil_Analysis_Actions** and create an action row describing the required follow-up.

---

## Procedure 6: Create a Route Manually

**When:** Supervisor needs to create a day's lube route but app is unavailable.

### Step 1 — Create the route

Open **ACC_OIL_LUBRICATION_DATA > Oil_Routes**. Append:

| Column | Value |
|---|---|
| `route_id` | `RTE-MANUAL-[YYYYMMDD]-[area_code]` |
| `template_id` | Template ID from Route_Templates (or leave blank for ad-hoc) |
| `route_date` | Today |
| `area_id` | Area being covered |
| `assigned_technician_id` | Technician's user_id |
| `status` | `PLANNED` |
| `notes` | `"Manual route — app unavailable"` |
| `created_at` | Today's ISO timestamp |
| `created_by` | Your email |

### Step 2 — Add route actions

Open **Route_Actions**. For each LP on the route, append:

| Column | Value |
|---|---|
| `route_action_id` | `RA-MANUAL-[YYYYMMDD]-[sequence]` |
| `route_id` | Route ID from Step 1 |
| `action_type` | `OIL_CHANGE`, `OIL_SAMPLE`, `TOP_UP`, or `INSPECTION` |
| `lp_id` | LP code |
| `equipment_id` | Equipment ID |
| `sequence_number` | Visit order (1, 2, 3, ...) |
| `status` | `PENDING` |
| `created_at` | Today's ISO timestamp |

### Step 3 — Track progress

As the technician completes each LP:
- Update `status` = `COMPLETED` in the Route_Actions row
- Add `technician_notes` if needed

When all done, update `Oil_Routes.status` = `COMPLETED`.

---

## Common Mistakes to Avoid

### Mistakes that break the app when it comes back online

| Mistake | Why it's a problem | What to do instead |
|---|---|---|
| Editing a PK after creation | App loses the foreign key reference | Never change a `*_id` column |
| Entering a status value not in the list | App rejects the row on read | Always use the drop-down list |
| Editing App-Only columns | App will overwrite them on next sync with incorrect values | Leave them blank or as-is |
| Deleting a row | All rows linking to it become orphaned | Set `is_active=FALSE` instead |
| Changing `last_change_date` or `last_sample_date` without noting the manual change | App overdue detection fires incorrectly | Document in the history notes |
| Entering dates in wrong format | App date parser fails | Use YYYY-MM-DD only |
| Duplicate `action_id` values | App treats them as the same record | Use the `MANUAL-[date]` prefix to guarantee uniqueness |

### Mistakes that create data inconsistencies

| Mistake | Result | Prevention |
|---|---|---|
| Completing an action in Oil_Change_Actions but not appending to Oil_Change_History | LP history is incomplete | Always do both steps |
| Updating inventory without a stock transaction | Stock ledger doesn't balance | Always add a transaction row |
| Setting approval status without updating the action status | Action stays in wrong state | Update both sheets |
| Entering results in Oil_Analysis_Results without updating Oil_Samples status | Sample appears still in progress | Update `Oil_Samples.status` = `ANALYSIS_COMPLETE` |

---

## How to Tell the App About Manual Changes

When the application comes back online, it will read the sheets and sync.
However, it needs to know which rows were manually created:

1. **Rows with `MANUAL-` in the ID** — the app recognises the `MANUAL-` prefix and treats these as manually-created records. It will not overwrite them but may update system columns on the next sync.

2. **Notes column** — the app reads `notes` for human context but never overwrites it. Your manual notes are preserved.

3. **App-Only columns left blank** — the app fills these on the next event (e.g. next approval, next login). This is expected behavior.

4. **Status fields you updated** — the app respects the current status. If you set `COMPLETED`, the app will not reset it to `SCHEDULED`.

---

## Contact Information

If you are unsure about a manual operation, contact:

| Role | Responsibility |
|---|---|
| Platform Administrator | Settings, roles, permissions |
| Lubrication Engineer | LP data, oil change procedures |
| Reliability Engineer | Oil analysis, OCR review |
| Warehouse Admin | Inventory, stock transactions |
| IT / Apps Script Owner | Script errors, app recovery |

---

## Quick Reference Card (Print This Page)

```
SAFE TO EDIT                       READ-ONLY
─────────────────────────────────  ──────────────────────────────
Oil_Change_Actions   ✓ All users   Lubrication_Audit_Log    ✗
Oil_Change_History   ✓ Append only Oil_Analysis_Audit_Log   ✗
Oil_Sampling_Actions ✓ All users   Oil_Forecast             ✗
Oil_Sampling_History ✓ lab_ref     Oil_Analysis_Trends      ✗
Oil_Routes           ✓ Supervisor  Lubrication_Notifications ✗
Route_Actions        ✓ Notes+status Oil_Analysis_Notifications ✗
Oil_Inventory        ✓ Warehouse
Oil_Stock_Trans      ✓ Warehouse
Lubrication_Approvals ✓ Approver only (status + notes)
Oil_Samples          ✓ Lab Admin
Oil_Analysis_Results ✓ Lab / RE
OCR_Review           ✓ RE / Lab

COLUMN COLORS
─────────────────────────────────
Yellow  = Required — must fill
Red     = App-Only — do not touch
Purple  = System — fill only when creating row manually
White   = Optional

DATE FORMAT: YYYY-MM-DD always
NOTES: always write "Manual entry — app unavailable — [name] — [date]"
```

---

*For full schema reference: `docs/04_PLATFORM_INFRASTRUCTURE/DATABASE_SCHEMA.md`*  
*For the initializer script: `apps-script/database/initializeAccDatabase.gs`*
