# ACC Reliability Platform — Database Schema Reference

**Document ID:** 04-INFRA-DB-001  
**Version:** 1.0.0  
**Date:** 2026-07-03  
**Status:** Production Approved  
**Owner:** ACC Reliability Platform Team  

---

## Document Purpose

This is the authoritative schema reference for all Google Sheets workbooks in
the ACC Reliability Platform. It defines every workbook, every sheet, every
column, every validation list, and every manual-editing rule.

Engineers use this document to:
- Understand what each column means
- Know which columns they can edit manually
- Know which values are valid in each column
- Navigate data relationships across workbooks

Application developers use this document as the contract between the data
layer and the application code.

---

## Summary Statistics

| Metric | Count |
|---|---|
| Production workbooks | 4 |
| Total sheets | 60 |
| Total columns | 588 |
| Future reserved workbooks | 3 |

---

## Table of Contents

- [Column Type Legend](#column-type-legend)
- [Global Validation Lists](#global-validation-lists)
- [Workbook 1 — ACC\_PLATFORM\_SETTINGS\_CONFIG](#workbook-1--acc_platform_settings_config)
- [Workbook 2 — ACC\_PLATFORM\_MASTER\_DATA](#workbook-2--acc_platform_master_data)
- [Workbook 3 — ACC\_OIL\_LUBRICATION\_DATA](#workbook-3--acc_oil_lubrication_data)
- [Workbook 4 — ACC\_OIL\_ANALYSIS\_DATA](#workbook-4--acc_oil_analysis_data)
- [Future Reserved Workbooks](#future-reserved-workbooks)
- [Cross-Workbook FK Map](#cross-workbook-fk-map)

---

## Column Type Legend

Every column in every sheet carries one of six types. The initializer script
applies a background color to each column so engineers can see types at a glance.

| Type | Symbol | Color | Meaning | Who Edits |
|---|---|---|---|---|
| Primary Key | `[PK]` | — | Unique row identifier. Never change after creation. | App creates |
| Foreign Key | `[FK]` | — | References the PK of another sheet. Must be valid. | Human (with care) |
| Required | `[R]` | Yellow | Must be filled. Row is rejected by app if blank. | Human |
| Optional | `[O]` | White | Improves data quality. Not mandatory. | Human |
| System | `[S]` | Light purple | Auto-set by app (timestamps, audit). | App only |
| App-Only | `[A]` | Light red | Business-logic values. App sets; humans must not override. | App only |

---

## Global Validation Lists

These lists are applied as drop-down validation across all workbooks.

```
MODULE_IDS          PLATFORM | OIL_LUB | OIL_ANALYSIS | VIB | REL | INSP
BOOLEAN             TRUE | FALSE
SETTING_TYPE        TEXT | NUMBER | BOOLEAN | JSON | URL
PRIORITY            CRITICAL | HIGH | MEDIUM | LOW
CRITICALITY         A | B | C
LUBE_POINT_TYPE     GEARBOX | BEARING | HYDRAULIC | COMPRESSOR | OTHER
BASE_TYPE           MINERAL | SYNTHETIC | SEMI-SYNTHETIC
ACTION_STATUS       SCHEDULED | IN_PROGRESS | PENDING_APPROVAL | APPROVED |
                    COMPLETED | CANCELLED | OVERDUE
ROUTE_STATUS        PLANNED | IN_PROGRESS | COMPLETED | PARTIAL
ROUTE_ACTION_TYPE   OIL_CHANGE | OIL_SAMPLE | TOP_UP | INSPECTION
ROUTE_ACTION_STATUS PENDING | COMPLETED | SKIPPED
TRANSACTION_TYPE    RECEIPT | CONSUMPTION | ADJUSTMENT | RETURN
NOTIF_STATUS        PENDING | SENT | FAILED | SUPPRESSED
APPROVAL_STATUS     PENDING | APPROVED | REJECTED | ESCALATED
SAMPLING_METHOD     VACUUM | INLINE | DRAIN
SAMPLE_STATUS       COLLECTED | SENT_TO_LAB | RECEIVED_BY_LAB |
                    ANALYSIS_COMPLETE | CLOSED
OCR_STATUS          PENDING | PROCESSING | COMPLETE | FAILED
EXTRACTION_STATUS   NOT_STARTED | IN_REVIEW | ACCEPTED | REJECTED
REVIEW_STATUS       PENDING | ACCEPTED | CORRECTED | REJECTED
RESULT_INTERP       NORMAL | CAUTION | ALERT | CRITICAL
TREND_DIRECTION     INCREASING | DECREASING | STABLE
REPORT_TYPE         MONTHLY | QUARTERLY | ALERT | AD_HOC
ANALYSIS_ACTION     RESAMPLE | INVESTIGATE | SCHEDULE_CHANGE | ALERT | ESCALATE
ANALYSIS_STATUS     OPEN | IN_PROGRESS | COMPLETED | CANCELLED
OIL_CONDITION       GOOD | DEGRADED | CONTAMINATED | UNKNOWN | FRESH
CHANNEL             EMAIL | SHEET_COMMENT | WEBHOOK
RECIP_TYPE          ROLE | USER | EMAIL
AUDIT_ACTION        CREATE | UPDATE | DELETE | APPROVE | REJECT
WIDGET_TYPE         KPI_CARD | TABLE | CHART | CALENDAR
AGG_PERIOD          DAILY | WEEKLY | MONTHLY
ACCESS_LEVEL        FULL | READ_ONLY | NO_ACCESS
ENTITY_STATUS       ACTIVE | INACTIVE
MAPPING_STATUS      ACTIVE | INACTIVE
CONTRACTOR_TYPE     MAINTENANCE | OIL_LAB | ANALYSIS | GENERAL | ELECTRICAL
SPECIALTY           OIL_LAB | VIBRATION | GENERAL | ELECTRICAL
SAMPLE_SOURCE       IN_SERVICE | DRAIN | FILTER
AXIS                H | V | A
```

---

## Workbook 1 — ACC_PLATFORM_SETTINGS_CONFIG

**Color:** Blue (`#1565C0`)  
**Purpose:** Platform-wide configuration. Roles, users, permissions, routing rules, dashboards, theming. Changes here affect all users and all modules. Edit carefully.  
**Sheet count:** 16  
**Manual edit rule:** All sheets in this workbook require Platform Administrator or Module Administrator access.

---

### W1-S01 · App_Settings

**Purpose:** Global key-value store for application-wide settings.  
**Manual editor:** Platform Administrator only  
**Fallback notes:** Safe to read at any time. To update a setting manually, change `setting_value` and update `updated_at` and `updated_by`.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `setting_key` | `[PK]` | Unique | Identifier such as `AUTH_SESSION_TIMEOUT` |
| B | `setting_value` | `[R]` | — | Value stored as plain text string |
| C | `setting_type` | `[R]` | `SETTING_TYPE` | Governs how app parses the value |
| D | `description` | `[O]` | — | Human-readable explanation of this setting |
| E | `is_encrypted` | `[A]` | `BOOLEAN` | TRUE if value is encrypted at rest — do not touch |
| F | `created_at` | `[S]` | ISO timestamp | Set on creation |
| G | `updated_at` | `[S]` | ISO timestamp | Updated on every write |
| H | `created_by` | `[S]` | Email | Creator email |
| I | `updated_by` | `[S]` | Email | Last updater email |

**Column count: 9**

**Key settings:**

| setting_key | setting_type | Example value | Description |
|---|---|---|---|
| `AUTH_SESSION_TIMEOUT` | NUMBER | `3600` | Session timeout in seconds |
| `APP_VERSION` | TEXT | `2.0.0` | Current app version |
| `OIL_LUB_ENABLED` | BOOLEAN | `TRUE` | Enable Oil Lubrication module |
| `DEFAULT_LANGUAGE` | TEXT | `en` | Default UI language (`en` or `ar`) |
| `MAX_APPROVAL_LEVELS` | NUMBER | `3` | Maximum approval chain levels |
| `INVENTORY_LOW_STOCK_ALERT` | BOOLEAN | `TRUE` | Enable low stock alerts |

---

### W1-S02 · Module_Settings

**Purpose:** Per-module configuration overrides. Takes precedence over App_Settings for that module.  
**Manual editor:** Platform Admin or Module Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `module_id` | `[R]` | `MODULE_IDS` | Module this setting belongs to |
| B | `setting_key` | `[R]` | — | Setting name within module scope |
| C | `setting_value` | `[R]` | — | Value |
| D | `setting_type` | `[R]` | `SETTING_TYPE` | Data type |
| E | `description` | `[O]` | — | Human explanation |
| F | `is_active` | `[O]` | `BOOLEAN` | FALSE to disable without deleting. Defaults TRUE. |
| G | `created_at` | `[S]` | ISO timestamp | — |
| H | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 8**

---

### W1-S03 · Roles

**Purpose:** Defines all user roles on the platform. System roles are built-in and the app will reject deletion of `is_system_role=TRUE` rows.  
**Manual editor:** Platform Administrator only

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `role_id` | `[PK]` | Auto-int | Auto-incremented integer |
| B | `role_name` | `[R]` | — | Display name (e.g. `Senior Technician`) |
| C | `role_code` | `[R]` | Unique | `UPPERCASE_SNAKE_CASE` (e.g. `LUB_TECH`) |
| D | `description` | `[O]` | — | Role scope and responsibilities |
| E | `is_system_role` | `[A]` | `BOOLEAN` | TRUE for built-in roles — do not modify |
| F | `is_active` | `[R]` | `BOOLEAN` | FALSE to disable role |
| G | `created_at` | `[S]` | ISO timestamp | — |
| H | `updated_at` | `[S]` | ISO timestamp | — |
| I | `created_by` | `[S]` | Email | — |

**Column count: 9**

**Standard platform roles:**

| role_id | role_code | role_name | is_system_role |
|---|---|---|---|
| 1 | `PLATFORM_ADMIN` | Platform Administrator | TRUE |
| 2 | `MODULE_MANAGER` | Module Manager | TRUE |
| 3 | `MAINT_SUPV` | Maintenance Supervisor | TRUE |
| 4 | `LUB_TECH` | Lubrication Technician | TRUE |
| 5 | `LUB_ENG` | Lubrication Engineer | TRUE |
| 6 | `REL_ENG` | Reliability Engineer | TRUE |
| 7 | `LAB_ADMIN` | Lab Administrator | TRUE |
| 8 | `WAREHOUSE_ADMIN` | Warehouse Administrator | TRUE |

---

### W1-S04 · Permissions

**Purpose:** Atomic permission records — one row per module/resource/action combination.  
**Manual editor:** Platform Administrator only (usually app-managed)

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `permission_id` | `[PK]` | Auto-int | Auto-incremented integer |
| B | `permission_code` | `[R]` | Unique | Format: `MODULE.RESOURCE.ACTION` |
| C | `module_id` | `[FK]` | `MODULE_IDS` | Owning module |
| D | `resource` | `[R]` | — | Resource entity (e.g. `OIL_CHANGE_ACTIONS`) |
| E | `action` | `[R]` | `READ\|WRITE\|DELETE\|APPROVE\|EXPORT` | Operation type |
| F | `description` | `[O]` | — | Human explanation |
| G | `is_active` | `[R]` | `BOOLEAN` | — |
| H | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 8**

---

### W1-S05 · Role_Permissions

**Purpose:** Maps roles to permissions. Add a row to grant; remove a row to revoke.  
**Manual editor:** Platform Administrator only

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `role_id` | `[FK]` | → Roles.role_id | — |
| B | `permission_id` | `[FK]` | → Permissions.permission_id | — |
| C | `granted_at` | `[S]` | ISO timestamp | — |
| D | `granted_by` | `[S]` | Email | Email of granter |

**Column count: 4**

---

### W1-S06 · Users

**Purpose:** All platform user accounts, synced from Google Workspace. This is the identity source of truth.  
**Manual editor:** Platform Administrator  
**Fallback notes:** Add a user row manually with `is_active=TRUE` and a valid `role_id`. The user must sign in via Google OAuth before the app recognises them.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `user_id` | `[PK]` | UUID | Generated by app (`USR-XXXX` in manual mode) |
| B | `email` | `[R]` | Unique | Google Workspace email — must be unique |
| C | `full_name` | `[R]` | — | Full legal/display name |
| D | `display_name` | `[O]` | — | Short name used in UI |
| E | `employee_id` | `[O]` | — | HR system employee number |
| F | `department` | `[O]` | — | Department name |
| G | `position` | `[O]` | — | Job title |
| H | `role_id` | `[FK]` | → Roles.role_id | Primary platform role |
| I | `is_active` | `[R]` | `BOOLEAN` | FALSE = blocked from login |
| J | `last_login` | `[A]` | ISO timestamp | Updated by app on every login |
| K | `google_id` | `[A]` | — | Google OAuth subject ID — never edit |
| L | `created_at` | `[S]` | ISO timestamp | — |
| M | `updated_at` | `[S]` | ISO timestamp | — |
| N | `created_by` | `[S]` | Email | — |

**Column count: 14**

---

### W1-S07 · User_Module_Access

**Purpose:** Fine-grained per-user module access grants that override the user's role defaults.  
**Manual editor:** Platform Admin or Module Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `user_id` | `[FK]` | → Users.user_id | — |
| B | `module_id` | `[R]` | `MODULE_IDS` | — |
| C | `access_level` | `[R]` | `ACCESS_LEVEL` | Overrides role default for this module |
| D | `granted_at` | `[S]` | ISO timestamp | — |
| E | `granted_by` | `[S]` | Email | — |
| F | `expires_at` | `[O]` | ISO timestamp | Leave blank for permanent access |

**Column count: 6**

---

### W1-S08 · Notification_Rules

**Purpose:** Defines when notifications fire, who receives them, and via which channel.  
**Manual editor:** Platform Admin or Module Admin  
**Fallback notes:** Add rows to create rules. Set `is_active=TRUE`. App reads this sheet on each scheduled trigger run.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `rule_id` | `[PK]` | Auto-int | — |
| B | `rule_name` | `[R]` | — | Descriptive name |
| C | `module_id` | `[R]` | `MODULE_IDS` | — |
| D | `event_type` | `[R]` | — | e.g. `ACTION_OVERDUE`, `SAMPLE_RECEIVED` |
| E | `recipient_type` | `[R]` | `RECIP_TYPE` | How to identify recipient |
| F | `recipient_value` | `[R]` | — | Role code, `user_id`, or email |
| G | `channel` | `[R]` | `CHANNEL` | Delivery method |
| H | `is_active` | `[R]` | `BOOLEAN` | — |
| I | `conditions_json` | `[A]` | — | JSON filter conditions — set by app |
| J | `created_at` | `[S]` | ISO timestamp | — |
| K | `created_by` | `[S]` | Email | — |

**Column count: 11**

---

### W1-S09 · Approval_Rules

**Purpose:** Multi-level approval chain configuration per module entity type.  
**Manual editor:** Platform Admin or Module Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `rule_id` | `[PK]` | Auto-int | — |
| B | `rule_name` | `[R]` | — | Descriptive name |
| C | `module_id` | `[R]` | `MODULE_IDS` | — |
| D | `entity_type` | `[R]` | — | e.g. `OIL_CHANGE`, `OIL_SAMPLE` |
| E | `approval_level` | `[R]` | Integer ≥ 1 | 1 = first approver in chain |
| F | `approver_role_id` | `[FK]` | → Roles.role_id | Role responsible at this level |
| G | `escalation_hours` | `[O]` | Integer | Hours before auto-escalation if no decision |
| H | `is_active` | `[R]` | `BOOLEAN` | — |
| I | `created_at` | `[S]` | ISO timestamp | — |
| J | `created_by` | `[S]` | Email | — |

**Column count: 10**

---

### W1-S10 · Action_Routing_Rules

**Purpose:** Event-driven conditional routing. When a trigger fires and conditions match, an automated action executes.  
**Manual editor:** Platform Administrator only

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `rule_id` | `[PK]` | Auto-int | — |
| B | `rule_name` | `[R]` | — | Descriptive name |
| C | `module_id` | `[R]` | `MODULE_IDS` | — |
| D | `trigger_event` | `[R]` | — | Event that triggers evaluation |
| E | `condition_field` | `[O]` | — | Field name to evaluate (e.g. `priority`) |
| F | `condition_operator` | `[O]` | `EQ\|NEQ\|GT\|LT\|IN` | Comparison operator |
| G | `condition_value` | `[O]` | — | Value to compare against |
| H | `action_type` | `[R]` | `ASSIGN\|NOTIFY\|ESCALATE\|CREATE_ACTION\|FLAG` | Automation action |
| I | `action_target` | `[O]` | — | Role code, user_id, or target sheet |
| J | `priority` | `[O]` | Integer | Rule evaluation order (lower = first) |
| K | `is_active` | `[R]` | `BOOLEAN` | FALSE to disable without deleting |
| L | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 12**

---

### W1-S11 · Escalation_Rules

**Purpose:** Time-based escalation paths for items that exceed their response deadline.  
**Manual editor:** Platform Admin or Module Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `rule_id` | `[PK]` | Auto-int | — |
| B | `rule_name` | `[R]` | — | Descriptive name |
| C | `module_id` | `[R]` | `MODULE_IDS` | — |
| D | `entity_type` | `[R]` | — | Entity type being monitored |
| E | `delay_hours` | `[R]` | Integer | Hours overdue before rule fires |
| F | `escalation_level` | `[O]` | Integer | Stage number (for multi-level escalation) |
| G | `escalate_to_role_id` | `[FK]` | → Roles.role_id | Role receiving the escalation |
| H | `notify_channel` | `[O]` | `CHANNEL` | Optional notification channel |
| I | `is_active` | `[R]` | `BOOLEAN` | — |
| J | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

---

### W1-S12 · Dashboard_Config

**Purpose:** Widget layout and data source configuration per role dashboard.  
**Manual editor:** Platform Administrator only

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `config_id` | `[PK]` | Auto-int | — |
| B | `dashboard_name` | `[R]` | — | Dashboard identifier (e.g. `TECH_HOME`) |
| C | `role_id` | `[FK]` | → Roles.role_id | Target role |
| D | `widget_type` | `[R]` | `WIDGET_TYPE` | Widget kind |
| E | `widget_data_source` | `[R]` | — | Sheet name or API source |
| F | `widget_position` | `[O]` | `row,col` | Grid position on dashboard |
| G | `widget_config_json` | `[A]` | JSON | Widget configuration — set by app |
| H | `is_active` | `[R]` | `BOOLEAN` | — |
| I | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 9**

---

### W1-S13 · KPI_Config

**Purpose:** KPI definitions: formula, target, unit, aggregation period.  
**Manual editor:** Platform Admin or Module Manager

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `kpi_id` | `[PK]` | Auto-int | — |
| B | `kpi_name` | `[R]` | — | Human-readable KPI name |
| C | `kpi_code` | `[R]` | Unique | `UPPERCASE_CODE` |
| D | `module_id` | `[R]` | `MODULE_IDS` | — |
| E | `formula_description` | `[R]` | — | Plain-English formula description |
| F | `target_value` | `[O]` | Number | Numeric target |
| G | `unit` | `[O]` | — | `%`, `days`, `liters`, `count`, etc. |
| H | `aggregation_period` | `[O]` | `AGG_PERIOD` | Calculation window |
| I | `is_active` | `[R]` | `BOOLEAN` | — |
| J | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

---

### W1-S14 · Audit_Config

**Purpose:** Controls audit logging scope and row retention per module entity.  
**Manual editor:** Platform Administrator only

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `config_id` | `[PK]` | Auto-int | — |
| B | `module_id` | `[R]` | `MODULE_IDS` | — |
| C | `entity_type` | `[R]` | — | Entity to audit |
| D | `events_to_audit` | `[R]` | Comma-separated | e.g. `CREATE,UPDATE,DELETE,APPROVE` |
| E | `retention_days` | `[R]` | Integer | Audit rows are archived after N days |
| F | `is_active` | `[R]` | `BOOLEAN` | — |
| G | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W1-S15 · Language_Config

**Purpose:** UI string translation table. All strings the app displays come from here.  
**Manual editor:** Platform Admin or designated Translator

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `lang_key` | `[PK]` | Unique | Translation key (e.g. `BTN_SAVE`) |
| B | `module_id` | `[R]` | `MODULE_IDS` | Scope |
| C | `lang_en` | `[R]` | — | English text |
| D | `lang_ar` | `[R]` | — | Arabic text |
| E | `context` | `[O]` | — | Where this string appears |
| F | `is_active` | `[R]` | `BOOLEAN` | — |
| G | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W1-S16 · Theme_Config

**Purpose:** UI theme definitions. Only one row should have `is_default=TRUE`.  
**Manual editor:** Platform Administrator only

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `config_id` | `[PK]` | Auto-int | — |
| B | `theme_name` | `[R]` | — | Theme identifier (e.g. `ACC_DEFAULT`) |
| C | `is_default` | `[R]` | `BOOLEAN` | Only one row should be TRUE |
| D | `primary_color` | `[O]` | Hex | e.g. `#1565C0` |
| E | `accent_color` | `[O]` | Hex | — |
| F | `font_family` | `[O]` | — | Google Font name |
| G | `logo_url` | `[O]` | URL | Google Drive file share URL |
| H | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 8**

**Workbook 1 total columns: 142**

---

## Workbook 2 — ACC_PLATFORM_MASTER_DATA

**Color:** Green (`#2E7D32`)  
**Purpose:** Physical asset reference data. Equipment, lubrication points, vibration points, areas, contractors, and classification dictionaries. Updated rarely — only when physical assets change.  
**Sheet count:** 22

**Legacy Mapping Layer:** Seven configurable mapping sheets (W2-S15 through W2-S21) translate legacy source values into Platform Master Data. All migration transforms must resolve through these sheets — no hardcoded plant-specific translations in code.

---

### W2-S01 · Equipment_Master

**Purpose:** Authoritative registry of all on-site equipment assets (frozen master fields only).  
**Manual editor:** Maintenance Engineer or Admin  
**Fallback notes:** Add equipment by appending a row. Assign `equipment_id` as `EQP-XXXX`. Never change an existing `equipment_id`. Legacy `Equipment_ID` / plant tag maps to `equipment_tag`.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `equipment_id` | `[PK]` | `EQP-XXXX` | Unique. Never change after creation. |
| B | `equipment_tag` | `[R]` | Unique | Plant asset tag / legacy Equipment_ID (e.g. `P-101`) |
| C | `equipment_name` | `[R]` | — | Descriptive name |
| D | `area_id` | `[FK]` `[R]` | → Areas | Required — every equipment row must belong to an area |
| E | `equipment_type_id` | `[FK]` | → Equipment_Types | — |
| F | `parent_equipment_id` | `[FK]` `[O]` | → Equipment_Master | Parent asset for assemblies / sub-units |
| G | `criticality` | `[R]` | `CRITICALITY` | A=most critical, C=least critical |
| H | `status` | `[R]` | `ENTITY_STATUS` | `ACTIVE` \| `INACTIVE` |
| I | `created_at` | `[S]` | ISO timestamp | — |
| J | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

---

### W2-S02 · LP_Master

**Purpose:** Lubrication Points. The primary reference entity for all oil change, sampling, and analysis activities. Every operational action must link to a valid LP.  
**Manual editor:** Lubrication Engineer or Admin  
**Fallback notes:** Add LPs by appending rows (`LP-XXXX`). Every LP must reference a valid `equipment_id`. Operational dates (last change/sample) are tracked in module history sheets, not on this master row.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `lp_id` | `[PK]` | `LP-XXXX` | Unique. Never change. |
| B | `equipment_id` | `[FK]` `[R]` | → Equipment_Master | Required — every LP belongs to one equipment |
| C | `lp_name` | `[R]` | — | Descriptive name |
| D | `lube_point_type` | `[R]` | `LUBE_POINT_TYPE` | Type of lubrication point |
| E | `oil_type_id` | `[FK]` `[O]` | → Oil_Types | Specified oil type — missing value is a migration WARNING |
| F | `oil_brand_id` | `[FK]` | → Oil_Brands | Specified oil brand |
| G | `oil_capacity_liters` | `[R]` | Number > 0 | Total oil volume in system |
| H | `change_interval_days` | `[R]` | Integer > 0 | Days between scheduled oil changes |
| I | `sampling_required` | `[R]` | `BOOLEAN` | TRUE if periodic oil sampling applies |
| J | `sampling_interval_days` | `[O]` | Integer > 0 | Days between samples (required when `sampling_required=TRUE`) |
| K | `status` | `[R]` | `ENTITY_STATUS` | `ACTIVE` \| `INACTIVE` |
| L | `created_at` | `[S]` | ISO timestamp | — |
| M | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 13**

---

### W2-S03 · VB_Master

**Purpose:** Vibration measurement points. Reserved for the future VIB module. Populate now for any equipment that will be vibration-monitored.  
**Manual editor:** Vibration Engineer or Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `vb_id` | `[PK]` | `VB-XXXX` | Unique |
| B | `vb_code` | `[R]` | Unique | Human code (e.g. `VB-P101-DE`) |
| C | `vb_name` | `[R]` | — | Descriptive name |
| D | `equipment_id` | `[FK]` | → Equipment_Master | — |
| E | `vibration_sensor_type` | `[O]` | — | Accelerometer model/type |
| F | `measurement_axis` | `[O]` | `AXIS` | H=horizontal, V=vertical, A=axial |
| G | `alarm_threshold` | `[O]` | Number | mm/s — CAUTION level |
| H | `danger_threshold` | `[O]` | Number | mm/s — DANGER level |
| I | `measurement_interval_days` | `[R]` | Integer > 0 | Recurrence in days |
| J | `is_active` | `[R]` | `BOOLEAN` | — |
| K | `created_at` | `[S]` | ISO timestamp | — |
| L | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 12**

---

### W2-S04 · Areas

**Purpose:** Plant areas and sections. Each area belongs to exactly one responsible contractor. Contractor data visibility is derived from area ownership (no shared areas).  
**Manual editor:** Plant Admin or Maintenance Manager

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `area_id` | `[PK]` | `AREA-XXX` | Unique |
| B | `area_code` | `[R]` | Unique, UPPERCASE | Short code (e.g. `111`, `UTIL`) |
| C | `area_name` | `[R]` | — | Full area name |
| D | `main_area` | `[O]` | — | Production unit / plant section (e.g. Kiln, Raw Mill) |
| E | `line` | `[O]` | — | Production line identifier (e.g. `Line1`) |
| F | `responsible_contractor_id` | `[R]` `[FK]` | → Contractors | Single owning contractor per area |
| G | `status` | `[R]` | `AREA_STATUS` | `ACTIVE` \| `INACTIVE` |
| H | `created_at` | `[S]` | ISO timestamp | — |
| I | `updated_at` | `[S]` | ISO timestamp | — |

> **Not used:** `secondary_contractor_id`, `is_shared_area`, `owner_notes` — one contractor per area only.

**Column count: 9**

---

### W2-S05 · Contractors

**Purpose:** External contractors and oil analysis laboratories. Referenced by `Areas.responsible_contractor_id`.  
**Manual editor:** Admin or Procurement

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `contractor_id` | `[PK]` | `CTR-XXX` | Unique |
| B | `contractor_code` | `[R]` | Unique, UPPERCASE | Short code (e.g. `RHI`, `ASEC`) |
| C | `contractor_name` | `[R]` | — | Company name |
| D | `contractor_type` | `[R]` | `CONTRACTOR_TYPE` | e.g. `MAINTENANCE`, `OIL_LAB`, `GENERAL` |
| E | `contact_person` | `[O]` | — | Primary contact name |
| F | `email` | `[O]` | Email | — |
| G | `phone` | `[O]` | — | — |
| H | `scope` | `[O]` | — | Work scope / service description |
| I | `status` | `[R]` | `ENTITY_STATUS` | `ACTIVE` \| `INACTIVE` |
| J | `created_at` | `[S]` | ISO timestamp | — |
| K | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 11**

---

### W2-S06 · Equipment_Types

**Purpose:** Equipment classification taxonomy.  
**Manual editor:** Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `type_id` | `[PK]` | `ET-XXX` | Unique |
| B | `type_code` | `[R]` | Unique, UPPERCASE | e.g. `PUMP`, `COMPRESSOR` |
| C | `type_name` | `[R]` | — | e.g. `Centrifugal Pump` |
| D | `description` | `[O]` | — | Usage notes |
| E | `default_criticality` | `[O]` | `CRITICALITY` | Default for new equipment of this type |
| F | `is_active` | `[R]` | `BOOLEAN` | — |
| G | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W2-S07 · Oil_Types

**Purpose:** Oil product types catalog. Defines viscosity grade, base type, and application notes.  
**Manual editor:** Lubrication Engineer

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `oil_type_id` | `[PK]` | `OT-XXX` | Unique |
| B | `type_code` | `[R]` | Unique | Short code (e.g. `VG46`, `VG320`) |
| C | `type_name` | `[R]` | — | Full name (e.g. `Hydraulic Oil ISO VG 46`) |
| D | `viscosity_grade` | `[R]` | — | ISO grade (e.g. `VG32`, `VG46`, `VG320`) |
| E | `base_type` | `[O]` | `BASE_TYPE` | Base oil category |
| F | `application_notes` | `[O]` | — | Recommended applications |
| G | `is_active` | `[R]` | `BOOLEAN` | — |
| H | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 8**

---

### W2-S08 · Oil_Brands

**Purpose:** Oil brand and manufacturer catalog.  
**Manual editor:** Lubrication Engineer or Procurement

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `brand_id` | `[PK]` | `OB-XXX` | Unique |
| B | `brand_name` | `[R]` | — | Product brand name (e.g. `Shell Omala S2 G 320`) |
| C | `manufacturer` | `[R]` | — | OEM company name |
| D | `product_line` | `[O]` | — | Product family |
| E | `is_active` | `[R]` | `BOOLEAN` | — |
| F | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 6**

---

### W2-S08b · Oil_Products

**Purpose:** Catalog of specific oil products (type + brand + commercial SKU). Links viscosity grade and safety data for LPs and inventory.  
**Manual editor:** Lubrication Engineer or Procurement

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `oil_product_id` | `[PK]` | `OP-XXX` | Unique |
| B | `oil_type_id` | `[FK]` `[R]` | → Oil_Types | Base oil type / viscosity family |
| C | `oil_brand_id` | `[FK]` `[R]` | → Oil_Brands | Brand / manufacturer line |
| D | `product_name` | `[R]` | — | Commercial product name |
| E | `iso_vg` | `[O]` | — | ISO viscosity grade (e.g. `VG46`) |
| F | `application` | `[O]` | — | Intended application |
| G | `oem_approval` | `[O]` | — | OEM approval reference |
| H | `density` | `[O]` | Number | kg/L at 15°C |
| I | `viscosity` | `[O]` | — | Nominal viscosity description |
| J | `flash_point` | `[O]` | Number | °C |
| K | `msds_url` | `[O]` | URL | Safety data sheet link |
| L | `safety_notes` | `[O]` | — | Handling / storage notes |
| M | `status` | `[R]` | `ENTITY_STATUS` | `ACTIVE` \| `INACTIVE` |
| N | `created_at` | `[S]` | ISO timestamp | — |
| O | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 15**

---

### W2-S09 · Route_Templates

**Purpose:** Reusable route templates. The app generates Oil_Routes instances from these on their frequency schedule.  
**Manual editor:** Maintenance Supervisor or Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `template_id` | `[PK]` | `RT-XXX` | Unique |
| B | `template_name` | `[R]` | — | Descriptive name |
| C | `module_id` | `[R]` | `MODULE_IDS` | `OIL_LUB`, `VIB`, or `INSP` |
| D | `area_id` | `[FK]` | → Areas | — |
| E | `frequency_days` | `[R]` | Integer > 0 | 1=daily, 7=weekly, 30=monthly |
| F | `estimated_duration_hours` | `[O]` | Number | Expected completion time |
| G | `is_active` | `[R]` | `BOOLEAN` | — |
| H | `created_at` | `[S]` | ISO timestamp | — |
| I | `created_by` | `[S]` | Email | — |

**Column count: 9**

---

### W2-S10 · Action_Types

**Purpose:** Catalog of all work action types across modules.  
**Manual editor:** Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `action_type_id` | `[PK]` | `ACT-XXX` | Unique |
| B | `action_code` | `[R]` | Unique | e.g. `OIL_CHANGE`, `OIL_SAMPLE` |
| C | `action_name` | `[R]` | — | Full readable name |
| D | `module_id` | `[R]` | `MODULE_IDS` | Owning module |
| E | `requires_approval` | `[R]` | `BOOLEAN` | TRUE = approval workflow triggered |
| F | `default_priority` | `[O]` | `PRIORITY` | — |
| G | `is_active` | `[R]` | `BOOLEAN` | — |
| H | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 8**

---

### W2-S11 · Status_Dictionary

**Purpose:** All valid status values per module and entity type, with bilingual labels and UI color codes.  
**Manual editor:** Admin or Translator (Arabic labels)

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `status_id` | `[PK]` | Auto-int | — |
| B | `module_id` | `[R]` | `MODULE_IDS` | — |
| C | `entity_type` | `[R]` | — | Entity this status applies to |
| D | `status_code` | `[R]` | Unique per entity | `UPPERCASE_CODE` |
| E | `status_label_en` | `[R]` | — | English label |
| F | `status_label_ar` | `[R]` | — | Arabic label |
| G | `status_color` | `[O]` | Hex color | Used in UI badge |
| H | `is_terminal` | `[R]` | `BOOLEAN` | TRUE = no further status transitions |
| I | `sort_order` | `[O]` | Integer | Display order in UI |
| J | `is_active` | `[R]` | `BOOLEAN` | — |

**Column count: 10**

---

### W2-S12 · Priority_Dictionary

**Purpose:** Priority levels per module with SLA response time hours.  
**Manual editor:** Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `priority_id` | `[PK]` | Auto-int | — |
| B | `module_id` | `[R]` | `MODULE_IDS` | — |
| C | `priority_code` | `[R]` | `PRIORITY` | — |
| D | `priority_label_en` | `[R]` | — | English label |
| E | `priority_label_ar` | `[R]` | — | Arabic label |
| F | `priority_color` | `[O]` | Hex color | — |
| G | `response_hours` | `[O]` | Integer | SLA response time |
| H | `is_active` | `[R]` | `BOOLEAN` | — |

**Column count: 8**

---

### W2-S13 · Criticality_Dictionary

**Purpose:** Equipment criticality levels (A/B/C) mapped to maintenance priorities.  
**Manual editor:** Reliability Engineer

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `criticality_id` | `[PK]` | Auto-int | — |
| B | `criticality_code` | `[R]` | `CRITICALITY` | A, B, or C |
| C | `criticality_label_en` | `[R]` | — | Critical / Important / Standard |
| D | `criticality_label_ar` | `[R]` | — | Arabic label |
| E | `criticality_color` | `[O]` | Hex color | — |
| F | `maintenance_priority` | `[O]` | `PRIORITY` | Linked priority code |
| G | `is_active` | `[R]` | `BOOLEAN` | — |

**Column count: 7**

---

### W2-S14 · Equipment_Line_Assignments

**Purpose:** Preserves legacy Equipment Register line-level rows where one equipment code may appear on multiple production lines. Used for migration traceability and line-based reporting — not the authoritative equipment registry (`Equipment_Master` holds one row per `equipment_tag`).  
**Manual editor:** Maintenance Engineer or Admin (migration team during cutover)

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `assignment_id` | `[PK]` | `ELA-XXXX` | Unique |
| B | `line` | `[R]` | — | Production line identifier |
| C | `area` | `[O]` | — | Area name or code from source register |
| D | `equipment_code` | `[R]` | — | Legacy equipment tag (maps to `equipment_tag`) |
| E | `source_workbook` | `[R]` | — | Origin workbook name |
| F | `source_sheet` | `[R]` | — | Origin sheet tab |
| G | `source_row` | `[R]` | Integer | Origin row number |
| H | `status` | `[R]` | `ENTITY_STATUS` | `ACTIVE` \| `INACTIVE` |
| I | `created_at` | `[S]` | ISO timestamp | — |
| J | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

---

### W2-S15 · Legacy_Area_Mapping

**Purpose:** Data-driven translation of legacy area codes and names (from Users_Config, Operational, Equipment Register) into `Areas` rows. Editable by the Platform Owner — replaces all hardcoded area lookups in the migration engine.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-AREA-XXXX` | Unique mapping row identifier |
| B | `legacy_value` | `[R]` | — | Area code or name exactly as it appears in legacy source |
| C | `legacy_workbook` | `[O]` | — | Source workbook label; blank = match any workbook |
| D | `legacy_sheet` | `[O]` | — | Source sheet tab; blank = match any sheet |
| E | `new_area_id` | `[FK]` `[R]` | → Areas | Target `area_id` when status is ACTIVE |
| F | `new_area_code` | `[O]` | — | Denormalized `area_code` for human review |
| G | `new_area_name` | `[O]` | — | Denormalized `area_name` for human review |
| H | `responsible_contractor_id` | `[FK]` `[O]` | → Contractors | Optional contractor override |
| I | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| J | `notes` | `[O]` | — | Platform Owner notes |
| K | `created_at` | `[S]` | ISO timestamp | — |
| L | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 12**

---

### W2-S16 · Legacy_Oil_Type_Mapping

**Purpose:** Maps legacy lubricant type names (e.g. from `Lubricant Types.Name`, `Lubrication Points.Lubricant Type`) to `Oil_Types.oil_type_id`.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-OIL-XXXX` | Unique |
| B | `legacy_value` | `[R]` | — | Legacy lubricant type label |
| C | `new_value` | `[FK]` `[R]` | → Oil_Types | Target `oil_type_id` |
| D | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| E | `notes` | `[O]` | — | Platform Owner notes |
| F | `created_at` | `[S]` | ISO timestamp | — |
| G | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W2-S17 · Legacy_Oil_Brand_Mapping

**Purpose:** Maps legacy oil brand names to `Oil_Brands.brand_id`.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-OBR-XXXX` | Unique |
| B | `legacy_value` | `[R]` | — | Legacy brand name |
| C | `new_value` | `[FK]` `[R]` | → Oil_Brands | Target `brand_id` |
| D | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| E | `notes` | `[O]` | — | Platform Owner notes |
| F | `created_at` | `[S]` | ISO timestamp | — |
| G | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W2-S18 · Legacy_Equipment_Type_Mapping

**Purpose:** Maps legacy equipment type labels to `Equipment_Types.type_id`.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-EQT-XXXX` | Unique |
| B | `legacy_value` | `[R]` | — | Legacy equipment type label |
| C | `new_value` | `[FK]` `[R]` | → Equipment_Types | Target `type_id` |
| D | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| E | `notes` | `[O]` | — | Platform Owner notes |
| F | `created_at` | `[S]` | ISO timestamp | — |
| G | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W2-S19 · Legacy_Contractor_Mapping

**Purpose:** Maps legacy contractor names and codes (e.g. `RHI`, `ASEC`) to `Contractors.contractor_id`. Replaces all hardcoded contractor translations.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-CTR-XXXX` | Unique |
| B | `legacy_value` | `[R]` | — | Legacy contractor name or code |
| C | `new_value` | `[FK]` `[R]` | → Contractors | Target `contractor_id` |
| D | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| E | `notes` | `[O]` | — | Platform Owner notes |
| F | `created_at` | `[S]` | ISO timestamp | — |
| G | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W2-S20 · Legacy_Status_Mapping

**Purpose:** Maps legacy workflow status labels to `Status_Dictionary.status_code` values.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-STS-XXXX` | Unique |
| B | `legacy_value` | `[R]` | — | Legacy status label |
| C | `new_value` | `[R]` | → Status_Dictionary | Target `status_code` |
| D | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| E | `notes` | `[O]` | — | Platform Owner notes |
| F | `created_at` | `[S]` | ISO timestamp | — |
| G | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W2-S21 · Legacy_Line_Mapping

**Purpose:** Maps legacy production line labels (from Equipment Register) to normalized line identifiers used in `Areas.line` and `Equipment_Line_Assignments.line`.  
**Manual editor:** Platform Owner or Migration Admin

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `mapping_id` | `[PK]` | `MAP-LIN-XXXX` | Unique |
| B | `legacy_value` | `[R]` | — | Legacy production line label |
| C | `new_value` | `[R]` | — | Target line identifier |
| D | `status` | `[R]` | `MAPPING_STATUS` | `ACTIVE` \| `INACTIVE` |
| E | `notes` | `[O]` | — | Platform Owner notes |
| F | `created_at` | `[S]` | ISO timestamp | — |
| G | `updated_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

**Workbook 2 total columns: 194**

---

## Workbook 3 — ACC_OIL_LUBRICATION_DATA

**Color:** Orange (`#E65100`)  
**Purpose:** All operational data for the Oil Lubrication module. Written to and read from continuously. Technicians, supervisors, and engineers interact with this workbook daily.  
**Sheet count:** 12

---

### W3-S01 · Oil_Change_Actions

**Purpose:** The primary operational sheet. Every oil change work order — scheduled or ad-hoc — lives here.  
**Manual editor:** Lubrication Technician, Supervisor, or Engineer  
**Fallback notes:** This is the main sheet for manual fallback. See the MANUAL_FALLBACK_GUIDE for step-by-step procedures.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `action_id` | `[PK]` | `ACT-OC-XXXX` | Do not change after creation |
| B | `lp_id` | `[FK]` | → LP_Master | — |
| C | `equipment_id` | `[FK]` | → Equipment_Master | Denormalized from LP for filtering |
| D | `scheduled_date` | `[R]` | `YYYY-MM-DD` | Planned execution date |
| E | `assigned_technician_id` | `[FK]` | → Users | — |
| F | `status` | `[R]` | `ACTION_STATUS` | Current workflow state |
| G | `priority` | `[R]` | `PRIORITY` | Urgency level |
| H | `oil_type_id` | `[FK]` | → Oil_Types | Oil to use (defaults from LP, can override) |
| I | `oil_brand_id` | `[FK]` | → Oil_Brands | — |
| J | `quantity_required_liters` | `[R]` | Number > 0 | Expected oil volume |
| K | `notes` | `[O]` | — | Technician field notes |
| L | `created_at` | `[S]` | ISO timestamp | — |
| M | `updated_at` | `[S]` | ISO timestamp | — |
| N | `created_by` | `[S]` | Email | — |
| O | `approved_by` | `[A]` | Email | Set by app on approval |
| P | `approved_at` | `[A]` | ISO timestamp | Set by app on approval |
| Q | `completed_by` | `[A]` | Email | Set by app on completion |
| R | `completed_at` | `[A]` | ISO timestamp | Set by app on completion |
| S | `route_action_id` | `[A]` | → Route_Actions | Set by app if part of a route |

**Column count: 19**

**Status transition rules:**

```
SCHEDULED → IN_PROGRESS → PENDING_APPROVAL → APPROVED → COMPLETED
SCHEDULED → OVERDUE  (if past scheduled_date with no completion)
Any non-terminal → CANCELLED
```

---

### W3-S02 · Oil_Change_History

**Purpose:** Immutable archive of every completed oil change. Append-only — never edit existing rows.  
**Manual editor:** READ ONLY in normal operation. Admins may append rows in emergencies.  
**Fallback notes:** After completing an oil change manually, you must: (1) update the action row in Oil_Change_Actions to `COMPLETED`, and (2) append a history row here. Also update `LP_Master.last_change_date` for the affected LP.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `history_id` | `[PK]` | `HIST-OC-XXXX` | — |
| B | `action_id` | `[FK]` | → Oil_Change_Actions | Source action |
| C | `lp_id` | `[FK]` | → LP_Master | — |
| D | `equipment_id` | `[FK]` | → Equipment_Master | — |
| E | `change_date` | `[R]` | `YYYY-MM-DD` | Actual date performed |
| F | `technician_id` | `[FK]` | → Users | Who performed the change |
| G | `oil_type_id` | `[FK]` | → Oil_Types | Oil actually used |
| H | `oil_brand_id` | `[FK]` | → Oil_Brands | — |
| I | `quantity_used_liters` | `[R]` | Number > 0 | Actual quantity consumed |
| J | `condition_before` | `[O]` | `OIL_CONDITION` | Oil condition observed before draining |
| K | `condition_after` | `[O]` | `GOOD\|FRESH` | Condition confirmed after refill |
| L | `notes` | `[O]` | — | Technician observations |
| M | `created_at` | `[S]` | ISO timestamp | — |
| N | `created_by` | `[S]` | Email | — |

**Column count: 14**

---

### W3-S03 · Oil_Sampling_Actions

**Purpose:** Scheduled oil sampling work orders.  
**Manual editor:** Lubrication Technician or Supervisor

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `action_id` | `[PK]` | `ACT-OS-XXXX` | — |
| B | `lp_id` | `[FK]` | → LP_Master | — |
| C | `equipment_id` | `[FK]` | → Equipment_Master | — |
| D | `scheduled_date` | `[R]` | `YYYY-MM-DD` | Planned date |
| E | `assigned_technician_id` | `[FK]` | → Users | — |
| F | `status` | `[R]` | `ACTION_STATUS` | Same status set as Oil_Change_Actions |
| G | `priority` | `[R]` | `PRIORITY` | — |
| H | `sampling_method` | `[O]` | `SAMPLING_METHOD` | How the sample is drawn |
| I | `sample_bottle_id` | `[O]` | — | Physical bottle barcode or label |
| J | `notes` | `[O]` | — | — |
| K | `created_at` | `[S]` | ISO timestamp | — |
| L | `updated_at` | `[S]` | ISO timestamp | — |
| M | `created_by` | `[S]` | Email | — |
| N | `approved_by` | `[A]` | Email | — |
| O | `approved_at` | `[A]` | ISO timestamp | — |

**Column count: 15**

---

### W3-S04 · Oil_Sampling_History

**Purpose:** Completed sampling records — links physical samples to lab submissions.  
**Manual editor:** READ ONLY in normal operation. Lab Admin may fill `lab_reference` manually.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `history_id` | `[PK]` | `HIST-OS-XXXX` | — |
| B | `action_id` | `[FK]` | → Oil_Sampling_Actions | — |
| C | `lp_id` | `[FK]` | → LP_Master | — |
| D | `equipment_id` | `[FK]` | → Equipment_Master | — |
| E | `sample_date` | `[R]` | `YYYY-MM-DD` | Date sample was actually taken |
| F | `technician_id` | `[FK]` | → Users | — |
| G | `sample_bottle_id` | `[O]` | — | Physical bottle label |
| H | `lab_reference` | `[O]` | — | Lab-assigned reference — can fill manually |
| I | `sent_to_lab_date` | `[O]` | `YYYY-MM-DD` | Date dispatched to lab |
| J | `notes` | `[O]` | — | — |
| K | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 11**

---

### W3-S05 · Oil_Routes

**Purpose:** Route instances generated from Route_Templates.  
**Manual editor:** Maintenance Supervisor  
**Fallback notes:** Create a route row manually for today. Then add Route_Actions rows for each LP to visit.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `route_id` | `[PK]` | `RTE-XXXX` | — |
| B | `template_id` | `[FK]` | → Route_Templates | — |
| C | `route_date` | `[R]` | `YYYY-MM-DD` | Date of this route |
| D | `area_id` | `[FK]` | → Areas | Area being covered |
| E | `assigned_technician_id` | `[FK]` | → Users | Assigned technician |
| F | `status` | `[R]` | `ROUTE_STATUS` | — |
| G | `start_time` | `[A]` | ISO timestamp | Set by app when technician starts |
| H | `end_time` | `[A]` | ISO timestamp | Set by app when completed |
| I | `total_actions` | `[A]` | Integer | Count of Route_Actions rows |
| J | `completed_actions` | `[A]` | Integer | Count with status=COMPLETED |
| K | `notes` | `[O]` | — | Supervisor notes |
| L | `created_at` | `[S]` | ISO timestamp | — |
| M | `created_by` | `[S]` | Email | — |

**Column count: 13**

---

### W3-S06 · Route_Actions

**Purpose:** Individual action items within a route, in visit sequence order.  
**Manual editor:** App-managed. Technicians may add notes manually.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `route_action_id` | `[PK]` | `RA-XXXX` | — |
| B | `route_id` | `[FK]` | → Oil_Routes | Parent route |
| C | `action_type` | `[R]` | `ROUTE_ACTION_TYPE` | — |
| D | `lp_id` | `[FK]` | → LP_Master | Target LP |
| E | `equipment_id` | `[FK]` | → Equipment_Master | Target equipment |
| F | `sequence_number` | `[R]` | Integer ≥ 1 | Visit order |
| G | `status` | `[R]` | `ROUTE_ACTION_STATUS` | — |
| H | `completed_at` | `[A]` | ISO timestamp | — |
| I | `technician_notes` | `[O]` | — | Field notes |
| J | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

---

### W3-S07 · Oil_Inventory

**Purpose:** Current oil stock levels by product and warehouse location.  
**Manual editor:** Warehouse Admin or Lubrication Engineer  
**Fallback notes:** Update `quantity_liters` directly after a stock movement. Then document the movement in Oil_Stock_Transactions.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `inventory_id` | `[PK]` | `INV-XXX` | — |
| B | `oil_type_id` | `[FK]` | → Oil_Types | — |
| C | `oil_brand_id` | `[FK]` | → Oil_Brands | — |
| D | `warehouse_location` | `[O]` | — | Physical storage location |
| E | `quantity_liters` | `[R]` | Number ≥ 0 | Current on-hand stock |
| F | `min_stock_liters` | `[R]` | Number ≥ 0 | Safety stock level — triggers alert when reached |
| G | `reorder_point_liters` | `[R]` | Number ≥ 0 | Stock level at which to place a reorder |
| H | `last_updated` | `[S]` | ISO timestamp | Updated on every stock change |
| I | `last_updated_by` | `[S]` | Email | — |

**Column count: 9**

---

### W3-S08 · Oil_Stock_Transactions

**Purpose:** Full ledger of all inventory movements. The sum of all transaction `quantity_liters` for an `inventory_id` should equal `Oil_Inventory.quantity_liters`.  
**Manual editor:** Warehouse Admin for receipts and manual adjustments. App writes consumption automatically.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `transaction_id` | `[PK]` | `TXN-XXXX` | — |
| B | `inventory_id` | `[FK]` | → Oil_Inventory | Row affected |
| C | `transaction_type` | `[R]` | `TRANSACTION_TYPE` | Movement type |
| D | `quantity_liters` | `[R]` | Non-zero number | Positive = stock in, negative = stock out |
| E | `reference_action_id` | `[O]` | → Oil_Change_Actions | Linked action if type=CONSUMPTION |
| F | `transaction_date` | `[R]` | `YYYY-MM-DD` | Date of movement |
| G | `notes` | `[O]` | — | Reason for adjustment |
| H | `created_by` | `[S]` | Email | — |
| I | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 9**

---

### W3-S09 · Oil_Forecast

**Purpose:** Monthly oil consumption forecasts per LP, generated by the app from scheduled actions.  
**Manual editor:** READ ONLY — generated by app. Engineers may review.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `forecast_id` | `[PK]` | Auto-int | — |
| B | `lp_id` | `[FK]` | → LP_Master | — |
| C | `oil_type_id` | `[FK]` | → Oil_Types | — |
| D | `forecast_month` | `[R]` | `YYYY-MM` | e.g. `2025-08` |
| E | `predicted_quantity_liters` | `[R]` | Number | Forecasted volume |
| F | `based_on_actions` | `[A]` | Integer | Scheduled action count used in calculation |
| G | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 7**

---

### W3-S10 · Lubrication_Notifications

**Purpose:** Notification dispatch log — one row per sent or attempted notification.  
**Manual editor:** READ ONLY — app writes. Admins may insert a row to trigger a manual resend.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `notification_id` | `[PK]` | UUID | — |
| B | `rule_id` | `[FK]` | → Notification_Rules | Triggering rule |
| C | `entity_type` | `[R]` | — | `OIL_CHANGE\|OIL_SAMPLE\|ROUTE\|INVENTORY` |
| D | `entity_id` | `[R]` | — | ID of triggering entity |
| E | `recipient_email` | `[R]` | Email | Target address |
| F | `channel` | `[R]` | `CHANNEL` | — |
| G | `subject` | `[O]` | — | Email subject line |
| H | `body_preview` | `[O]` | — | First 200 characters of message |
| I | `status` | `[R]` | `NOTIF_STATUS` | Current delivery state |
| J | `sent_at` | `[A]` | ISO timestamp | Set by app on delivery |
| K | `error_message` | `[A]` | — | Failure reason if status=FAILED |
| L | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 12**

---

### W3-S11 · Lubrication_Approvals

**Purpose:** Approval workflow records — one row per approval level per action.  
**Manual editor:** Designated approver (for `status` and `decision_notes` only)  
**Fallback notes:** If app is unavailable: find the `PENDING` row for the action, set `status=APPROVED`, and write `"Manual approval — app unavailable — [name] — [date]"` in `decision_notes`. Then update the action row in Oil_Change_Actions to `status=APPROVED`.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `approval_id` | `[PK]` | UUID | — |
| B | `entity_type` | `[R]` | — | `OIL_CHANGE\|OIL_SAMPLE` |
| C | `entity_id` | `[R]` | — | action_id being approved |
| D | `approval_level` | `[R]` | Integer ≥ 1 | Level in the approval chain |
| E | `approver_user_id` | `[FK]` | → Users | Designated approver |
| F | `status` | `[R]` | `APPROVAL_STATUS` | Editable by approver in fallback mode |
| G | `decision_notes` | `[O]` | — | Approver comments — required for REJECTED |
| H | `requested_at` | `[S]` | ISO timestamp | When approval was requested |
| I | `decided_at` | `[A]` | ISO timestamp | Set by app on decision |
| J | `escalated_at` | `[A]` | ISO timestamp | Set by app if escalated |

**Column count: 10**

---

### W3-S12 · Lubrication_Audit_Log

**Purpose:** Immutable append-only audit trail of all data changes in this module.  
**Manual editor:** READ ONLY — never edit, never delete rows.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `log_id` | `[PK]` | UUID | — |
| B | `entity_type` | `[R]` | — | Sheet that was changed |
| C | `entity_id` | `[R]` | — | Row ID that was changed |
| D | `action` | `[R]` | `AUDIT_ACTION` | Type of change |
| E | `old_value_json` | `[A]` | JSON | Previous field values |
| F | `new_value_json` | `[A]` | JSON | New field values |
| G | `performed_by` | `[R]` | Email or `SYSTEM` | Who made the change |
| H | `performed_at` | `[R]` | ISO timestamp | When the change occurred |
| I | `ip_address` | `[A]` | IP | Client IP — set by app |
| J | `session_id` | `[A]` | — | Session token — set by app |

**Column count: 10**

**Workbook 3 total columns: 139**

---

## Workbook 4 — ACC_OIL_ANALYSIS_DATA

**Color:** Purple (`#6A1B9A`)  
**Purpose:** Oil analysis lab results, PDF lab report imports, OCR review workflow, trend analysis, generated reports, and associated workflow sheets.  
**Sheet count:** 10

---

### W4-S01 · Oil_Samples

**Purpose:** Master registry of every physical sample bottle. Every oil sample taken in the field gets a row here.  
**Manual editor:** Lab Admin or Lubrication Engineer

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `sample_id` | `[PK]` | `SMP-YYYY-XXXX` | e.g. `SMP-2025-0001` |
| B | `lp_id` | `[FK]` | → LP_Master | — |
| C | `equipment_id` | `[FK]` | → Equipment_Master | Denormalized |
| D | `sample_date` | `[R]` | `YYYY-MM-DD` | Date sample was collected |
| E | `technician_id` | `[FK]` | → Users | Who collected the sample |
| F | `sample_bottle_id` | `[O]` | — | Physical bottle barcode or label |
| G | `sample_source` | `[O]` | `SAMPLE_SOURCE` | Where oil was drawn from |
| H | `status` | `[R]` | `SAMPLE_STATUS` | Workflow state |
| I | `lab_id` | `[FK]` | → Contractors | Analysis laboratory |
| J | `sent_to_lab_date` | `[O]` | `YYYY-MM-DD` | Dispatch date |
| K | `received_by_lab_date` | `[O]` | `YYYY-MM-DD` | Lab acknowledgment date |
| L | `notes` | `[O]` | — | Free text |
| M | `created_at` | `[S]` | ISO timestamp | — |
| N | `created_by` | `[S]` | Email | — |

**Column count: 14**

---

### W4-S02 · Oil_Analysis_Results

**Purpose:** Individual parameter measurements per sample. Each sample produces multiple rows — one per parameter.  
**Manual editor:** Lab Admin or Reliability Engineer  
**Fallback notes:** Engineers may enter results manually from the paper lab report. One row per parameter per sample.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `result_id` | `[PK]` | UUID | — |
| B | `sample_id` | `[FK]` | → Oil_Samples | — |
| C | `parameter_name` | `[R]` | — | e.g. `Viscosity_40C`, `Iron_ppm`, `Water_%` |
| D | `measured_value` | `[R]` | Number | Numeric measurement |
| E | `unit` | `[R]` | — | `cSt\|ppm\|%\|mg/g\|NTU\|ISO_CODE` |
| F | `alarm_limit` | `[O]` | Number | Value above which CAUTION fires |
| G | `danger_limit` | `[O]` | Number | Value above which CRITICAL fires |
| H | `result_interpretation` | `[O]` | `RESULT_INTERP` | Assessment |
| I | `analyzed_at` | `[O]` | `YYYY-MM-DD` | Date analysis was performed |
| J | `analyzed_by` | `[O]` | — | Lab analyst name or ID |
| K | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 11**

**Standard parameters and typical limits:**

| parameter_name | unit | alarm_limit | danger_limit |
|---|---|---|---|
| `Viscosity_40C` | cSt | ±15% of new | ±25% of new |
| `Viscosity_100C` | cSt | ±15% of new | ±25% of new |
| `Iron_ppm` | ppm | 50 | 100 |
| `Copper_ppm` | ppm | 20 | 50 |
| `Lead_ppm` | ppm | 10 | 30 |
| `Silicon_ppm` | ppm | 20 | 50 |
| `Water_pct` | % | 0.1 | 0.2 |
| `TAN` | mg KOH/g | 2.0 | 3.0 |
| `TBN` | mg KOH/g | 50% of new | 25% of new |
| `Particle_Count_ISO` | ISO 4406 | 18/16/13 | 20/18/15 |

---

### W4-S03 · PDF_Imports

**Purpose:** Tracks lab report PDF files uploaded to Google Drive for OCR extraction.  
**Manual editor:** Lab Admin  
**Fallback notes:** If OCR fails, set `extraction_status=REJECTED` and enter results manually in Oil_Analysis_Results.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `import_id` | `[PK]` | UUID | — |
| B | `sample_id` | `[FK]` | → Oil_Samples | — |
| C | `file_name` | `[R]` | — | PDF filename |
| D | `google_drive_url` | `[R]` | URL | Full Drive share URL |
| E | `upload_date` | `[R]` | `YYYY-MM-DD` | — |
| F | `uploaded_by` | `[R]` | Email | — |
| G | `ocr_status` | `[A]` | `OCR_STATUS` | Set by app |
| H | `extraction_status` | `[R]` | `EXTRACTION_STATUS` | Manual review state |
| I | `pages_count` | `[O]` | Integer | PDF page count |
| J | `notes` | `[O]` | — | — |
| K | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 11**

---

### W4-S04 · OCR_Review

**Purpose:** Field-by-field OCR extraction review. This is the primary human review sheet for oil analysis — engineers verify or correct each extracted value.  
**Manual editor:** Reliability Engineer or Lab Admin — active review required  
**Fallback notes:** When OCR fails entirely, engineers enter `extracted_value` manually from the paper report and set `review_status=ACCEPTED`. If OCR ran but made an error, set `corrected_value` and `review_status=CORRECTED`.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `review_id` | `[PK]` | UUID | — |
| B | `import_id` | `[FK]` | → PDF_Imports | — |
| C | `field_name` | `[R]` | — | Parameter name being reviewed |
| D | `extracted_value` | `[R]` | — | Raw OCR output — do not change this column |
| E | `corrected_value` | `[O]` | — | Engineer correction — fill if OCR was wrong |
| F | `confidence_score` | `[A]` | 0.0–1.0 | OCR confidence — set by app |
| G | `reviewed_by` | `[O]` | Email | Reviewer identity |
| H | `reviewed_at` | `[O]` | `YYYY-MM-DD` | Review date |
| I | `review_status` | `[R]` | `REVIEW_STATUS` | Engineer sets this after review |
| J | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

> **Review rule:** Any row with `confidence_score < 0.80` must be reviewed. Set `review_status=CORRECTED` if you changed the value, `ACCEPTED` if the extracted value is correct as-is.

---

### W4-S05 · Oil_Analysis_Actions

**Purpose:** Corrective and investigative actions triggered by abnormal analysis results.  
**Manual editor:** Reliability Engineer or Maintenance Supervisor

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `action_id` | `[PK]` | `AAC-XXXX` | — |
| B | `sample_id` | `[FK]` | → Oil_Samples | Triggering sample |
| C | `result_id` | `[FK]` | → Oil_Analysis_Results | Specific abnormal result |
| D | `action_type` | `[R]` | `ANALYSIS_ACTION` | Type of response |
| E | `description` | `[R]` | — | What action to take |
| F | `assigned_to_user_id` | `[FK]` | → Users | Responsible person |
| G | `priority` | `[R]` | `PRIORITY` | — |
| H | `due_date` | `[R]` | `YYYY-MM-DD` | Completion deadline |
| I | `status` | `[R]` | `ANALYSIS_STATUS` | — |
| J | `completed_at` | `[A]` | ISO timestamp | Set by app |
| K | `completed_by` | `[A]` | Email | Set by app |
| L | `notes` | `[O]` | — | Progress notes |
| M | `created_at` | `[S]` | ISO timestamp | — |
| N | `created_by` | `[S]` | Email | — |

**Column count: 14**

---

### W4-S06 · Oil_Analysis_Trends

**Purpose:** Statistical trend summaries per LP/parameter, generated by the app.  
**Manual editor:** READ ONLY — generated by app. Reliability Engineers review.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `trend_id` | `[PK]` | UUID | — |
| B | `lp_id` | `[FK]` | → LP_Master | — |
| C | `parameter_name` | `[R]` | — | Parameter being trended |
| D | `trend_period_months` | `[R]` | Integer | Analysis window in months |
| E | `trend_direction` | `[R]` | `TREND_DIRECTION` | — |
| F | `trend_slope` | `[O]` | Number | Rate of change per month |
| G | `first_value` | `[O]` | Number | Oldest reading in period |
| H | `last_value` | `[O]` | Number | Latest reading |
| I | `anomaly_detected` | `[R]` | `BOOLEAN` | TRUE if statistically anomalous |
| J | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 10**

---

### W4-S07 · Oil_Analysis_Reports

**Purpose:** Generated or manually created analysis reports with summary and Google Drive links.  
**Manual editor:** Reliability Engineer (for manual reports). App generates periodic reports automatically.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `report_id` | `[PK]` | UUID | — |
| B | `lp_id` | `[FK]` | → LP_Master | — |
| C | `equipment_id` | `[FK]` | → Equipment_Master | — |
| D | `report_type` | `[R]` | `REPORT_TYPE` | — |
| E | `period_start` | `[R]` | `YYYY-MM-DD` | Analysis period start |
| F | `period_end` | `[R]` | `YYYY-MM-DD` | Analysis period end |
| G | `summary` | `[O]` | — | Executive summary |
| H | `recommendation` | `[O]` | — | Action recommendation |
| I | `generated_at` | `[S]` | ISO timestamp | — |
| J | `generated_by` | `[S]` | Email or `SYSTEM` | — |
| K | `google_drive_url` | `[O]` | URL | Drive URL of full report |
| L | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 12**

---

### W4-S08 · Oil_Analysis_Notifications

**Purpose:** Notification dispatch log for all oil analysis module events.  
**Manual editor:** READ ONLY — same schema as Lubrication_Notifications

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `notification_id` | `[PK]` | UUID | — |
| B | `rule_id` | `[FK]` | → Notification_Rules | — |
| C | `entity_type` | `[R]` | — | `OIL_SAMPLE\|ANALYSIS_RESULT\|OCR_REVIEW\|TREND` |
| D | `entity_id` | `[R]` | — | — |
| E | `recipient_email` | `[R]` | Email | — |
| F | `channel` | `[R]` | `CHANNEL` | — |
| G | `subject` | `[O]` | — | — |
| H | `body_preview` | `[O]` | — | — |
| I | `status` | `[R]` | `NOTIF_STATUS` | — |
| J | `sent_at` | `[A]` | ISO timestamp | — |
| K | `error_message` | `[A]` | — | — |
| L | `created_at` | `[S]` | ISO timestamp | — |

**Column count: 12**

---

### W4-S09 · Oil_Analysis_Approvals

**Purpose:** Approval workflow for analysis actions and report sign-off.  
**Manual editor:** Approver — same manual fallback procedure as Lubrication_Approvals.

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `approval_id` | `[PK]` | UUID | — |
| B | `entity_type` | `[R]` | — | `OIL_ANALYSIS_ACTION\|OIL_ANALYSIS_REPORT` |
| C | `entity_id` | `[R]` | — | ID being approved |
| D | `approval_level` | `[R]` | Integer ≥ 1 | — |
| E | `approver_user_id` | `[FK]` | → Users | — |
| F | `status` | `[R]` | `APPROVAL_STATUS` | Editable by approver in fallback mode |
| G | `decision_notes` | `[O]` | — | Approver comments |
| H | `requested_at` | `[S]` | ISO timestamp | — |
| I | `decided_at` | `[A]` | ISO timestamp | Set by app on decision |

**Column count: 9**

---

### W4-S10 · Oil_Analysis_Audit_Log

**Purpose:** Immutable audit trail for all oil analysis module changes. Append-only — never edit.  
**Manual editor:** READ ONLY

| # | Column | Type | Validation | Notes |
|---|---|---|---|---|
| A | `log_id` | `[PK]` | UUID | — |
| B | `entity_type` | `[R]` | — | Sheet that was changed |
| C | `entity_id` | `[R]` | — | Row ID changed |
| D | `action` | `[R]` | `AUDIT_ACTION` | — |
| E | `old_value_json` | `[A]` | JSON | Previous field values |
| F | `new_value_json` | `[A]` | JSON | New field values |
| G | `performed_by` | `[R]` | Email or `SYSTEM` | — |
| H | `performed_at` | `[R]` | ISO timestamp | — |

**Column count: 8**

**Workbook 4 total columns: 111**

---

## Column Count Summary

| Workbook | Sheets | Columns |
|---|---|---|
| ACC_PLATFORM_SETTINGS_CONFIG | 16 | 142 |
| ACC_PLATFORM_MASTER_DATA | 15 | 141 |
| ACC_OIL_LUBRICATION_DATA | 12 | 139 |
| ACC_OIL_ANALYSIS_DATA | 10 | 111 |
| **Total** | **53** | **535** |

---

## Future Reserved Workbooks

| Workbook | Module | Status |
|---|---|---|
| `ACC_VIBRATION_DATA` | Vibration Analysis (VIB) | Reserved |
| `ACC_RELIABILITY_DATA` | Reliability Engineering (REL) | Reserved |
| `ACC_INSPECTION_DATA` | Field Inspections (INSP) | Reserved |

These workbooks will follow the same structural patterns: module-specific action, history, notifications, approvals, and audit log sheets. Reference `Equipment_Master`, `Areas`, and `Users` from the existing master and settings workbooks.

---

## Cross-Workbook FK Map

```
SETTINGS (W1) ← provides identities and rules
  Roles.role_id          ← Users.role_id
                         ← Approval_Rules.approver_role_id
                         ← Role_Permissions.role_id
                         ← Escalation_Rules.escalate_to_role_id
  Permissions.id         ← Role_Permissions.permission_id
  Users.user_id          ← Oil_Change_Actions.assigned_technician_id
                         ← Oil_Sampling_Actions.assigned_technician_id
                         ← Oil_Samples.technician_id
                         ← Oil_Analysis_Actions.assigned_to_user_id
                         ← Lubrication_Approvals.approver_user_id
                         ← Oil_Analysis_Approvals.approver_user_id
  Notification_Rules.id  ← Lubrication_Notifications.rule_id
                         ← Oil_Analysis_Notifications.rule_id

MASTER DATA (W2) ← provides physical asset references
  Equipment_Master.id    ← LP_Master.equipment_id
                         ← VB_Master.equipment_id
                         ← Oil_Change_Actions.equipment_id
                         ← Oil_Sampling_Actions.equipment_id
                         ← Oil_Change_History.equipment_id
                         ← Oil_Samples.equipment_id
                         ← Oil_Analysis_Reports.equipment_id
  LP_Master.lp_id        ← Oil_Change_Actions.lp_id
                         ← Oil_Sampling_Actions.lp_id
                         ← Oil_Change_History.lp_id
                         ← Oil_Sampling_History.lp_id
                         ← Oil_Routes (via Route_Actions.lp_id)
                         ← Oil_Samples.lp_id
                         ← Oil_Forecast.lp_id
                         ← Oil_Analysis_Trends.lp_id
                         ← Oil_Analysis_Reports.lp_id
  Areas.area_id          ← Equipment_Master.area_id
                         ← Route_Templates.area_id
                         ← Oil_Routes.area_id
  Equipment_Types.id     ← Equipment_Master.equipment_type_id
  Oil_Types.id           ← LP_Master.oil_type_id
                         ← Oil_Change_Actions.oil_type_id
                         ← Oil_Change_History.oil_type_id
                         ← Oil_Inventory.oil_type_id
                         ← Oil_Forecast.oil_type_id
  Oil_Brands.id          ← LP_Master.oil_brand_id
                         ← Oil_Products.oil_brand_id
                         ← Oil_Change_Actions.oil_brand_id
                         ← Oil_Change_History.oil_brand_id
                         ← Oil_Inventory.oil_brand_id
  Oil_Products.id        ← (future inventory / LP product refs)
  Route_Templates.id     ← Oil_Routes.template_id
  Contractors.id         ← Areas.responsible_contractor_id
                         ← Oil_Samples.lab_id
  Equipment_Line_Assignments.equipment_code ← traceability to Equipment_Master.equipment_tag

OIL LUBRICATION (W3) ← internal references
  Oil_Change_Actions.id  ← Oil_Change_History.action_id
                         ← Lubrication_Approvals.entity_id
                         ← Lubrication_Audit_Log.entity_id
                         ← Oil_Stock_Transactions.reference_action_id
  Oil_Routes.id          ← Route_Actions.route_id
  Oil_Inventory.id       ← Oil_Stock_Transactions.inventory_id

OIL ANALYSIS (W4) ← internal references
  Oil_Samples.id         ← Oil_Analysis_Results.sample_id
                         ← PDF_Imports.sample_id
                         ← Oil_Analysis_Actions.sample_id
  Oil_Analysis_Results.id← Oil_Analysis_Actions.result_id
  PDF_Imports.id         ← OCR_Review.import_id
```

---

*Document version controlled. Update version number on any schema change.*  
*For the initializer script: `apps-script/database/initializeAccDatabase.gs`*  
*For manual operations: `apps-script/database/MANUAL_FALLBACK_GUIDE.md`*
