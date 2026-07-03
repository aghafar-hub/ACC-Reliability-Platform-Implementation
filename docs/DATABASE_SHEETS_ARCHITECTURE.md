# ACC Reliability Platform — Google Sheets Database Architecture

**Version:** 1.0.0  
**Date:** 2026-07-03  
**Status:** Production Design  
**Owner:** ACC Reliability Platform Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Principles](#2-design-principles)
3. [Workbook Summary](#3-workbook-summary)
4. [Column Type Definitions](#4-column-type-definitions)
5. [Workbook 1: ACC_PLATFORM_SETTINGS_CONFIG](#5-workbook-1-acc_platform_settings_config)
6. [Workbook 2: ACC_PLATFORM_MASTER_DATA](#6-workbook-2-acc_platform_master_data)
7. [Workbook 3: ACC_OIL_LUBRICATION_DATA](#7-workbook-3-acc_oil_lubrication_data)
8. [Workbook 4: ACC_OIL_ANALYSIS_DATA](#8-workbook-4-acc_oil_analysis_data)
9. [Future Reserved Workbooks](#9-future-reserved-workbooks)
10. [Manual Fallback Operations Guide](#10-manual-fallback-operations-guide)
11. [Validation Reference](#11-validation-reference)
12. [Cross-Workbook Relationship Map](#12-cross-workbook-relationship-map)

---

## 1. Overview

The ACC Reliability Platform uses Google Sheets as its primary database. Each
workbook is a separate Google Sheets file, separated by functional domain. The
structure is designed so engineers can read and update records manually using
the Sheet UI even when the application is offline.

**Four production workbooks:**

| Workbook | Purpose | Sheets |
|---|---|---|
| ACC_PLATFORM_SETTINGS_CONFIG | Roles, users, rules, UI config | 16 |
| ACC_PLATFORM_MASTER_DATA | Equipment, LPs, reference dictionaries | 15 |
| ACC_OIL_LUBRICATION_DATA | Oil change/sampling operations, inventory | 12 |
| ACC_OIL_ANALYSIS_DATA | Lab results, OCR, trends, reports | 10 |

---

## 2. Design Principles

### Separation of Concerns
- **Settings** workbook: only configuration. Never operational data.
- **Master Data** workbook: only reference entities. Updated rarely.
- **Module workbooks**: only operational data for one module each.

### Manual-Usability
- Every sheet has human-readable column headers (snake_case, self-describing).
- Validation drop-down lists are applied to all enumerated columns.
- Row 1 is always frozen and filtered.
- Column colors indicate editability (see column type guide).

### Immutability Rules
- History and audit log sheets are append-only. Never delete or edit rows.
- App-Only columns must not be edited manually. They are protected where possible.

### Timestamp Format
All timestamps use ISO 8601: `YYYY-MM-DDTHH:MM:SS` (e.g. `2025-07-04T09:30:00`).

---

## 3. Workbook Summary

```
ACC_PLATFORM_SETTINGS_CONFIG
├── App_Settings
├── Module_Settings
├── Roles
├── Permissions
├── Role_Permissions
├── Users
├── User_Module_Access
├── Notification_Rules
├── Approval_Rules
├── Action_Routing_Rules
├── Escalation_Rules
├── Dashboard_Config
├── KPI_Config
├── Audit_Config
├── Language_Config
└── Theme_Config

ACC_PLATFORM_MASTER_DATA
├── Equipment_Master
├── LP_Master
├── VB_Master
├── Areas
├── Contractors
├── Equipment_Types
├── Oil_Types
├── Oil_Brands
├── Oil_Products
├── Route_Templates
├── Action_Types
├── Status_Dictionary
├── Priority_Dictionary
├── Criticality_Dictionary
└── Equipment_Line_Assignments

ACC_OIL_LUBRICATION_DATA
├── Oil_Change_Actions
├── Oil_Change_History
├── Oil_Sampling_Actions
├── Oil_Sampling_History
├── Oil_Routes
├── Route_Actions
├── Oil_Inventory
├── Oil_Stock_Transactions
├── Oil_Forecast
├── Lubrication_Notifications
├── Lubrication_Approvals
└── Lubrication_Audit_Log

ACC_OIL_ANALYSIS_DATA
├── Oil_Samples
├── Oil_Analysis_Results
├── PDF_Imports
├── OCR_Review
├── Oil_Analysis_Actions
├── Oil_Analysis_Trends
├── Oil_Analysis_Reports
├── Oil_Analysis_Notifications
├── Oil_Analysis_Approvals
└── Oil_Analysis_Audit_Log
```

---

## 4. Column Type Definitions

Every column in every sheet is classified. The initializer script applies
background colors to make these visible in the sheet.

| Type | Indicator | Description | Who Can Edit |
|---|---|---|---|
| **PK** | — | Primary key — unique row identifier | App creates; do not change |
| **FK** | — | Foreign key — references another sheet's PK | Human editable with care |
| **Required** | Yellow background | Must have a value; sheet is incomplete without it | Human editable |
| **Optional** | White (no color) | Improves data quality but not mandatory | Human editable |
| **System** | Purple background | Set automatically by the app (timestamps, audit info) | App only |
| **App-Only** | Pink/red background | Business logic values set by app code — do not touch | App only |

---

## 5. Workbook 1: ACC_PLATFORM_SETTINGS_CONFIG

**Purpose:** Platform-wide configuration. Changes here affect all users and all
modules. Edit carefully and document any changes in the Audit_Config sheet.

---

### App_Settings

**Purpose:** Global key-value store for application-wide settings.

**Manual editor:** Platform Administrator only  
**Manual fallback:** Safe to read. To update a setting manually, change `setting_value` and update `updated_at` and `updated_by`.

| Column | Type | Description | Validation |
|---|---|---|---|
| setting_key | PK | Unique setting name (e.g. `AUTH_SESSION_TIMEOUT`) | No duplicates |
| setting_value | Required | The setting value as a string | — |
| setting_type | Required | Data type of the value | TEXT \| NUMBER \| BOOLEAN \| JSON \| URL |
| description | Optional | Human-readable explanation | — |
| is_encrypted | App-Only | TRUE if value is encrypted at rest | — |
| created_at | System | ISO timestamp of creation | — |
| updated_at | System | ISO timestamp of last update | — |
| created_by | System | Email of creator | — |
| updated_by | System | Email of last updater | — |

**Sample values:**

| setting_key | setting_value | setting_type | description |
|---|---|---|---|
| AUTH_SESSION_TIMEOUT | 3600 | NUMBER | Session timeout in seconds |
| APP_VERSION | 2.0.0 | TEXT | Current application version |
| OIL_LUB_ENABLED | TRUE | BOOLEAN | Enable Oil Lubrication module |
| DEFAULT_LANGUAGE | en | TEXT | Default UI language code |

---

### Module_Settings

**Purpose:** Per-module configuration overrides that apply within a single module scope.

**Manual editor:** Platform Admin or Module Admin  
**Manual fallback:** Add or edit rows to override module behavior immediately.

| Column | Type | Description | Validation |
|---|---|---|---|
| module_id | Required | Module this setting applies to | PLATFORM \| OIL_LUB \| OIL_ANALYSIS \| VIB \| REL \| INSP |
| setting_key | Required | Setting name within module | — |
| setting_value | Required | Value | — |
| setting_type | Required | Data type | TEXT \| NUMBER \| BOOLEAN \| JSON |
| description | Optional | Human explanation | — |
| is_active | Optional | FALSE to disable without deleting | TRUE \| FALSE |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### Roles

**Purpose:** Defines all user roles. System roles are built-in and cannot be deleted.

**Manual editor:** Platform Administrator only  
**Manual fallback:** Add new roles by appending rows. Do not delete rows with `is_system_role=TRUE`.

| Column | Type | Description | Validation |
|---|---|---|---|
| role_id | PK | Auto-incremented integer | Unique |
| role_name | Required | Display name | — |
| role_code | Required | UPPERCASE_SNAKE_CASE code | Unique |
| description | Optional | Scope and responsibilities | — |
| is_system_role | App-Only | TRUE = built-in, cannot delete | — |
| is_active | Required | FALSE to disable role | TRUE \| FALSE |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

**Standard roles:**

| role_id | role_name | role_code |
|---|---|---|
| 1 | Platform Administrator | PLATFORM_ADMIN |
| 2 | Module Manager | MODULE_MANAGER |
| 3 | Lubrication Technician | LUB_TECH |
| 4 | Lubrication Engineer | LUB_ENG |
| 5 | Reliability Engineer | REL_ENG |
| 6 | Maintenance Supervisor | MAINT_SUPV |
| 7 | Warehouse Admin | WAREHOUSE_ADMIN |
| 8 | Lab Administrator | LAB_ADMIN |

---

### Permissions

**Purpose:** Atomic permission records. One row per module/resource/action combination.

**Manual editor:** Platform Administrator only (usually app-managed)  
**Manual fallback:** Add rows to grant new permissions.

| Column | Type | Description | Validation |
|---|---|---|---|
| permission_id | PK | Auto-incremented integer | — |
| permission_code | Required | `MODULE.RESOURCE.ACTION` format | Unique |
| module_id | FK | Module scope | — |
| resource | Required | Resource entity name | — |
| action | Required | Operation type | READ \| WRITE \| DELETE \| APPROVE \| EXPORT |
| description | Optional | Human explanation | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Role_Permissions

**Purpose:** Maps roles to permissions. Add or remove rows to grant or revoke access.

**Manual editor:** Platform Administrator only  
**Manual fallback:** Add a row with `role_id` + `permission_id` to grant access. Delete the row to revoke.

| Column | Type | Description | Validation |
|---|---|---|---|
| role_id | FK | References Roles.role_id | — |
| permission_id | FK | References Permissions.permission_id | — |
| granted_at | System | ISO timestamp | — |
| granted_by | System | Email of granter | — |

---

### Users

**Purpose:** All platform user accounts, synced from Google Workspace.

**Manual editor:** Platform Administrator  
**Manual fallback:** Add a user row manually. Set `is_active=TRUE` and a valid `role_id`. The user must sign in via Google OAuth before the app recognises them.

| Column | Type | Description | Validation |
|---|---|---|---|
| user_id | PK | UUID generated by app | — |
| email | Required | Google Workspace email | Unique |
| full_name | Required | Full display name | — |
| display_name | Optional | Short UI name | — |
| employee_id | Optional | HR system number | — |
| department | Optional | Department name | — |
| position | Optional | Job title | — |
| role_id | FK | Primary role | References Roles.role_id |
| is_active | Required | FALSE = blocked | TRUE \| FALSE |
| last_login | App-Only | Updated on each login | — |
| google_id | App-Only | Google OAuth subject ID | — |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### User_Module_Access

**Purpose:** Fine-grained access grants that override the user's role defaults for specific modules.

**Manual editor:** Platform Admin or Module Admin  
**Manual fallback:** Add a row to explicitly grant or deny module access for a user.

| Column | Type | Description | Validation |
|---|---|---|---|
| user_id | FK | References Users.user_id | — |
| module_id | Required | Module code | — |
| access_level | Required | Access override | FULL \| READ_ONLY \| NO_ACCESS |
| granted_at | System | ISO timestamp | — |
| granted_by | System | Email | — |
| expires_at | Optional | Leave blank for permanent | ISO timestamp or blank |

---

### Notification_Rules

**Purpose:** Defines which events trigger notifications, who receives them, and via which channel.

**Manual editor:** Platform Admin or Module Admin  
**Manual fallback:** Add rows to create notification rules. Set `is_active=TRUE` to enable. The app reads this sheet on the next scheduled trigger run.

| Column | Type | Description | Validation |
|---|---|---|---|
| rule_id | PK | Auto-incremented | — |
| rule_name | Required | Descriptive name | — |
| module_id | Required | Module scope | — |
| event_type | Required | e.g. `ACTION_OVERDUE`, `SAMPLE_RECEIVED` | — |
| recipient_type | Required | How to identify recipient | ROLE \| USER \| EMAIL |
| recipient_value | Required | Role code, user_id, or email address | — |
| channel | Required | Delivery method | EMAIL \| SHEET_COMMENT \| WEBHOOK |
| is_active | Required | Enable/disable rule | TRUE \| FALSE |
| conditions_json | App-Only | JSON filter — set by app | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Approval_Rules

**Purpose:** Defines multi-level approval chains per module entity type.

**Manual editor:** Platform Admin or Module Admin  
**Manual fallback:** Add rows to configure approval steps. `approval_level=1` is the first required approver.

| Column | Type | Description | Validation |
|---|---|---|---|
| rule_id | PK | Auto-incremented | — |
| rule_name | Required | Descriptive name | — |
| module_id | Required | Module scope | — |
| entity_type | Required | Entity requiring approval | e.g. OIL_CHANGE, OIL_SAMPLE |
| approval_level | Required | Integer, 1 = first approver | — |
| approver_role_id | FK | References Roles.role_id | — |
| escalation_hours | Optional | Hours before auto-escalation | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Action_Routing_Rules

**Purpose:** Conditional automation rules. When a trigger event occurs and a condition matches, an action is performed automatically.

**Manual editor:** Platform Administrator only  
**Manual fallback:** Set `is_active=FALSE` to disable a rule. The app evaluates active rules on each trigger event.

| Column | Type | Description | Validation |
|---|---|---|---|
| rule_id | PK | Auto-incremented | — |
| rule_name | Required | Descriptive name | — |
| module_id | Required | Module scope | — |
| trigger_event | Required | Event that triggers evaluation | — |
| condition_field | Optional | Field to evaluate | — |
| condition_operator | Optional | Comparison operator | EQ \| NEQ \| GT \| LT \| IN |
| condition_value | Optional | Value to compare | — |
| action_type | Required | Automation action | ASSIGN \| NOTIFY \| ESCALATE \| CREATE_ACTION \| FLAG |
| action_target | Optional | Role, user, or sheet target | — |
| priority | Optional | Rule evaluation order | Integer |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Escalation_Rules

**Purpose:** Time-based escalations for items that remain unresolved past their deadline.

**Manual editor:** Platform Admin or Module Admin

| Column | Type | Description | Validation |
|---|---|---|---|
| rule_id | PK | Auto-incremented | — |
| rule_name | Required | Descriptive name | — |
| module_id | Required | Module scope | — |
| entity_type | Required | Entity being escalated | — |
| delay_hours | Required | Hours overdue before escalation fires | — |
| escalation_level | Optional | Stage number (1, 2, etc.) | — |
| escalate_to_role_id | FK | References Roles.role_id | — |
| notify_channel | Optional | EMAIL \| SHEET_COMMENT | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Dashboard_Config

**Purpose:** Widget configuration per role dashboard.

**Manual editor:** Platform Administrator only

| Column | Type | Description | Validation |
|---|---|---|---|
| config_id | PK | Auto-incremented | — |
| dashboard_name | Required | Dashboard identifier | — |
| role_id | FK | Target role | — |
| widget_type | Required | Widget kind | KPI_CARD \| TABLE \| CHART \| CALENDAR |
| widget_data_source | Required | Sheet or API source | — |
| widget_position | Optional | Grid position `row,col` | — |
| widget_config_json | App-Only | JSON widget config | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### KPI_Config

**Purpose:** Defines KPIs: formulas, targets, units, and aggregation periods.

**Manual editor:** Platform Admin or Module Manager

| Column | Type | Description | Validation |
|---|---|---|---|
| kpi_id | PK | Auto-incremented | — |
| kpi_name | Required | Human-readable name | — |
| kpi_code | Required | UPPERCASE_CODE | — |
| module_id | Required | Module scope | — |
| formula_description | Required | Plain English formula | — |
| target_value | Optional | Numeric target | — |
| unit | Optional | %, days, liters, count, etc. | — |
| aggregation_period | Optional | DAILY \| WEEKLY \| MONTHLY | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

**Recommended KPIs for Oil Lubrication:**

| kpi_name | formula_description | target_value | unit |
|---|---|---|---|
| Oil Change Compliance Rate | Completed on-time / Total scheduled × 100 | 95 | % |
| Overdue Actions Count | Count of OVERDUE status actions | 0 | count |
| Average Days Overdue | Mean overdue days for overdue actions | 0 | days |
| Oil Inventory Coverage Days | On-hand quantity / Monthly consumption × 30 | 90 | days |
| Sample Analysis Turnaround | Mean days from sample to analysis result | 7 | days |

---

### Audit_Config

**Purpose:** Configures audit logging scope and retention per module entity.

**Manual editor:** Platform Administrator only

| Column | Type | Description | Validation |
|---|---|---|---|
| config_id | PK | Auto-incremented | — |
| module_id | Required | Module scope | — |
| entity_type | Required | Entity being audited | — |
| events_to_audit | Required | Comma-separated event list | CREATE,UPDATE,DELETE,APPROVE,REJECT |
| retention_days | Required | Log rows retained for N days | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Language_Config

**Purpose:** All UI strings in English and Arabic. Used by the frontend for i18n.

**Manual editor:** Platform Admin or designated Translator

| Column | Type | Description | Validation |
|---|---|---|---|
| lang_key | PK | Unique translation key | — |
| module_id | Required | Module scope | — |
| lang_en | Required | English text | — |
| lang_ar | Required | Arabic text | — |
| context | Optional | Where string appears | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Theme_Config

**Purpose:** UI theme definitions. Only one theme should have `is_default=TRUE`.

**Manual editor:** Platform Administrator only

| Column | Type | Description | Validation |
|---|---|---|---|
| config_id | PK | Auto-incremented | — |
| theme_name | Required | Theme identifier | — |
| is_default | Required | Only one row TRUE at a time | TRUE \| FALSE |
| primary_color | Optional | Hex color (e.g. #1565C0) | — |
| accent_color | Optional | Hex color | — |
| font_family | Optional | Google Font name | — |
| logo_url | Optional | Google Drive file URL | — |
| created_at | System | ISO timestamp | — |

---

## 6. Workbook 2: ACC_PLATFORM_MASTER_DATA

**Purpose:** Reference data for all modules. Equipment, lubrication points, areas,
classification dictionaries. Data changes rarely — only when physical assets change.

---

### Equipment_Master

**Purpose:** The authoritative registry of all on-site equipment assets (frozen master fields only).

**Manual editor:** Maintenance Engineer or Admin  
**Manual fallback:** Add new equipment by appending a row. Assign a unique `equipment_id` prefix manually (e.g. `EQP-XXXX`). Legacy plant tag maps to `equipment_tag`.

| Column | Type | Description | Validation |
|---|---|---|---|
| equipment_id | PK | UUID or `EQP-XXXX` | Unique |
| equipment_tag | Required | Plant asset tag / legacy Equipment_ID (e.g. P-101) | Unique |
| equipment_name | Required | Descriptive name | — |
| area_id | Required FK | References Areas.area_id | — |
| equipment_type_id | FK | References Equipment_Types.type_id | — |
| parent_equipment_id | FK | Parent equipment for assemblies | → Equipment_Master |
| criticality | Required | Asset criticality class | A \| B \| C |
| status | Required | Lifecycle status | ACTIVE \| INACTIVE |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### LP_Master

**Purpose:** Lubrication Points — the primary reference entity for all oil change and sampling activities. Every action must link to a valid LP.

**Manual editor:** Lubrication Engineer or Admin  
**Manual fallback:** Add LP by appending a row. Use prefix `LP-XXXX`. Ensure `equipment_id` references Equipment_Master.

| Column | Type | Description | Validation |
|---|---|---|---|
| lp_id | PK | `LP-XXXX` | Unique |
| equipment_id | Required FK | References Equipment_Master | — |
| lp_name | Required | Descriptive name | — |
| lube_point_type | Required | Type of lubrication point | GEARBOX \| BEARING \| HYDRAULIC \| COMPRESSOR \| OTHER |
| oil_type_id | FK | References Oil_Types | — |
| oil_brand_id | FK | References Oil_Brands | — |
| oil_capacity_liters | Required | Total oil volume in system | — |
| change_interval_days | Required | Days between scheduled changes | — |
| sampling_required | Required | Whether periodic sampling applies | TRUE \| FALSE |
| sampling_interval_days | Optional | Days between scheduled samples | — |
| status | Required | Lifecycle status | ACTIVE \| INACTIVE |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### VB_Master

**Purpose:** Vibration measurement points. Reserved for future VIB module. Populate now for equipment that will be monitored.

**Manual editor:** Vibration Engineer or Admin

| Column | Type | Description | Validation |
|---|---|---|---|
| vb_id | PK | `VB-XXXX` | Unique |
| vb_code | Required | Human code | — |
| vb_name | Required | Descriptive name | — |
| equipment_id | FK | References Equipment_Master | — |
| vibration_sensor_type | Optional | Accelerometer model | — |
| measurement_axis | Optional | Measurement direction | H \| V \| A |
| alarm_threshold | Optional | mm/s alarm level | — |
| danger_threshold | Optional | mm/s danger level | — |
| measurement_interval_days | Required | Recurrence in days | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### Areas

**Purpose:** Plant areas and sections for equipment location grouping and route assignment. Each area has exactly one responsible contractor; contractor visibility is derived from area ownership (no shared areas).

**Manual editor:** Plant Admin or Maintenance Manager

| Column | Type | Description | Validation |
|---|---|---|---|
| area_id | PK | `AREA-XXX` | Unique |
| area_code | Required | Short code (e.g. `111`, `UTIL`) | Unique |
| area_name | Required | Full name | — |
| main_area | Optional | Production unit / plant section (e.g. Kiln) | — |
| line | Optional | Production line (e.g. `Line1`) | — |
| responsible_contractor_id | Required FK | References Contractors.contractor_id | One contractor per area |
| status | Required | Area lifecycle | ACTIVE \| INACTIVE |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

> **Excluded columns:** `secondary_contractor_id`, `is_shared_area`, `owner_notes` are not part of this schema.

---

### Contractors

**Purpose:** External companies including oil analysis laboratories and maintenance contractors.

**Manual editor:** Admin or Procurement

| Column | Type | Description | Validation |
|---|---|---|---|
| contractor_id | PK | `CTR-XXX` | Unique |
| contractor_code | Required | Short code (e.g. RHI, ASEC) | Unique |
| contractor_name | Required | Company name | — |
| contractor_type | Required | Contractor category | MAINTENANCE \| OIL_LAB \| ANALYSIS \| GENERAL \| ELECTRICAL |
| contact_person | Optional | Primary contact name | — |
| email | Optional | Contact email | — |
| phone | Optional | Contact phone | — |
| scope | Optional | Service scope description | — |
| status | Required | Lifecycle status | ACTIVE \| INACTIVE |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### Equipment_Types

**Purpose:** Equipment classification taxonomy used to categorise Equipment_Master records.

**Manual editor:** Admin

| Column | Type | Description | Validation |
|---|---|---|---|
| type_id | PK | `ET-XXX` | — |
| type_code | Required | UPPERCASE code (e.g. PUMP) | Unique |
| type_name | Required | Full name (e.g. Centrifugal Pump) | — |
| description | Optional | Usage notes | — |
| default_criticality | Optional | Default for new equipment | A \| B \| C |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Types

**Purpose:** Oil product types catalog with viscosity and application info.

**Manual editor:** Lubrication Engineer

| Column | Type | Description | Validation |
|---|---|---|---|
| oil_type_id | PK | `OT-XXX` | — |
| type_code | Required | Short code (e.g. VG46) | Unique |
| type_name | Required | Full name | — |
| viscosity_grade | Required | ISO grade (e.g. VG46, VG320) | — |
| base_type | Optional | Base oil category | MINERAL \| SYNTHETIC \| SEMI-SYNTHETIC |
| application_notes | Optional | Where to use this oil | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Brands

**Purpose:** Oil brand and manufacturer catalog, linked to specific products used on LPs.

**Manual editor:** Lubrication Engineer or Procurement

| Column | Type | Description | Validation |
|---|---|---|---|
| brand_id | PK | `OB-XXX` | — |
| brand_name | Required | Product brand name | — |
| manufacturer | Required | OEM company | — |
| product_line | Optional | Product family | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Products

**Purpose:** Specific commercial oil products combining type, brand, and safety/spec data.

**Manual editor:** Lubrication Engineer or Procurement

| Column | Type | Description | Validation |
|---|---|---|---|
| oil_product_id | PK | `OP-XXX` | Unique |
| oil_type_id | Required FK | References Oil_Types | — |
| oil_brand_id | Required FK | References Oil_Brands | — |
| product_name | Required | Commercial product name | — |
| iso_vg | Optional | ISO viscosity grade | — |
| application | Optional | Intended application | — |
| oem_approval | Optional | OEM approval reference | — |
| density | Optional | Density (kg/L) | — |
| viscosity | Optional | Nominal viscosity | — |
| flash_point | Optional | Flash point (°C) | — |
| msds_url | Optional | MSDS document URL | — |
| safety_notes | Optional | Handling notes | — |
| status | Required | ACTIVE \| INACTIVE | — |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### Equipment_Line_Assignments

**Purpose:** Line-level equipment register rows from legacy sources. Preserves duplicate equipment codes across lines for migration traceability.

**Manual editor:** Maintenance Engineer or Admin (migration team)

| Column | Type | Description | Validation |
|---|---|---|---|
| assignment_id | PK | `ELA-XXXX` | Unique |
| line | Required | Production line | — |
| area | Optional | Area from source register | — |
| equipment_code | Required | Legacy equipment tag | — |
| source_workbook | Required | Origin workbook | — |
| source_sheet | Required | Origin sheet tab | — |
| source_row | Required | Origin row number | Integer |
| status | Required | ACTIVE \| INACTIVE | — |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |

---

### Route_Templates

**Purpose:** Template definitions for recurring technician routes. The app generates Oil_Routes instances from these templates.

**Manual editor:** Maintenance Supervisor or Admin

| Column | Type | Description | Validation |
|---|---|---|---|
| template_id | PK | `RT-XXX` | — |
| template_name | Required | Descriptive name | — |
| module_id | Required | OIL_LUB \| VIB \| INSP | — |
| area_id | FK | References Areas | — |
| frequency_days | Required | 1=daily, 7=weekly, 30=monthly | — |
| estimated_duration_hours | Optional | Expected time to complete | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Action_Types

**Purpose:** Catalog of all work action types across all modules. Used by routing rules and route templates.

**Manual editor:** Admin

| Column | Type | Description | Validation |
|---|---|---|---|
| action_type_id | PK | `ACT-XXX` | — |
| action_code | Required | OIL_CHANGE \| OIL_SAMPLE \| VIB_READING | Unique |
| action_name | Required | Full readable name | — |
| module_id | Required | Owning module | — |
| requires_approval | Required | TRUE = approval workflow triggered | TRUE \| FALSE |
| default_priority | Optional | HIGH \| MEDIUM \| LOW | — |
| is_active | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Status_Dictionary

**Purpose:** All valid status values per module and entity type, with bilingual labels and UI color codes. The app reads this sheet to render status badges.

**Manual editor:** Admin or Translator (for Arabic labels)

| Column | Type | Description | Validation |
|---|---|---|---|
| status_id | PK | Auto-incremented | — |
| module_id | Required | Module scope | — |
| entity_type | Required | Entity this applies to | — |
| status_code | Required | UPPERCASE_CODE | — |
| status_label_en | Required | English label | — |
| status_label_ar | Required | Arabic label | — |
| status_color | Optional | Hex color for UI badge | — |
| is_terminal | Required | TRUE = no further changes allowed | TRUE \| FALSE |
| sort_order | Optional | Display order integer | — |
| is_active | Required | TRUE \| FALSE | — |

---

### Priority_Dictionary

**Purpose:** Priority levels with SLA response hours and bilingual labels.

**Manual editor:** Admin

| Column | Type | Description | Validation |
|---|---|---|---|
| priority_id | PK | Auto-incremented | — |
| module_id | Required | Module scope | — |
| priority_code | Required | HIGH \| MEDIUM \| LOW \| CRITICAL | — |
| priority_label_en | Required | English label | — |
| priority_label_ar | Required | Arabic label | — |
| priority_color | Optional | Hex color | — |
| response_hours | Optional | SLA response time | — |
| is_active | Required | TRUE \| FALSE | — |

---

### Criticality_Dictionary

**Purpose:** Equipment criticality levels mapped to maintenance priority codes.

**Manual editor:** Reliability Engineer

| Column | Type | Description | Validation |
|---|---|---|---|
| criticality_id | PK | Auto-incremented | — |
| criticality_code | Required | A \| B \| C | — |
| criticality_label_en | Required | Critical \| Important \| Standard | — |
| criticality_label_ar | Required | Arabic label | — |
| criticality_color | Optional | Hex color | — |
| maintenance_priority | Optional | Linked priority code | — |
| is_active | Required | TRUE \| FALSE | — |

---

## 7. Workbook 3: ACC_OIL_LUBRICATION_DATA

**Purpose:** All operational data for the Oil Lubrication module. This workbook is written to and read from continuously by the application.

---

### Oil_Change_Actions

**Purpose:** The primary operational sheet. Every scheduled and ad-hoc oil change lives here. Technicians execute against this sheet.

**Manual editor:** Lubrication Technician, Supervisor, or Engineer  
**Manual fallback:** See section 10 for complete manual fallback procedure.

| Column | Type | Description | Validation |
|---|---|---|---|
| action_id | PK | UUID (e.g. ACT-OC-XXXX) | — |
| lp_id | FK | References LP_Master.lp_id | — |
| equipment_id | FK | Denormalized from LP for easier filtering | — |
| scheduled_date | Required | Planned execution date (YYYY-MM-DD) | — |
| assigned_technician_id | FK | References Users.user_id | — |
| status | Required | Current workflow state | SCHEDULED \| IN_PROGRESS \| PENDING_APPROVAL \| APPROVED \| COMPLETED \| CANCELLED \| OVERDUE |
| priority | Required | Urgency level | CRITICAL \| HIGH \| MEDIUM \| LOW |
| oil_type_id | FK | Oil specification | — |
| oil_brand_id | FK | Oil brand | — |
| quantity_required_liters | Required | Expected oil volume | — |
| notes | Optional | Technician field notes | — |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |
| approved_by | App-Only | Set on approval | — |
| approved_at | App-Only | Approval timestamp | — |
| completed_by | App-Only | Completing technician ID | — |
| completed_at | App-Only | Completion timestamp | — |

---

### Oil_Change_History

**Purpose:** Immutable archive of every completed oil change. Do not edit existing rows.

**Manual editor:** READ ONLY. Admins may append rows manually in emergencies.  
**Notes:** After completing an oil change manually, append a history row here AND update `LP_Master.last_change_date` for the affected LP.

| Column | Type | Description | Validation |
|---|---|---|---|
| history_id | PK | UUID | — |
| action_id | FK | Source action from Oil_Change_Actions | — |
| lp_id | FK | Lubrication point | — |
| equipment_id | FK | Equipment | — |
| change_date | Required | Actual date performed | YYYY-MM-DD |
| technician_id | FK | Who performed the change | — |
| oil_type_id | FK | Oil actually used | — |
| oil_brand_id | FK | Brand used | — |
| quantity_used_liters | Required | Actual quantity consumed | — |
| condition_before | Optional | Oil condition before change | GOOD \| DEGRADED \| CONTAMINATED \| UNKNOWN |
| condition_after | Optional | Condition after change | GOOD \| FRESH |
| notes | Optional | Observations | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Oil_Sampling_Actions

**Purpose:** Scheduled oil sampling work orders. Each row is a sampling task assigned to a technician.

**Manual editor:** Lubrication Technician or Supervisor

| Column | Type | Description | Validation |
|---|---|---|---|
| action_id | PK | UUID | — |
| lp_id | FK | References LP_Master | — |
| equipment_id | FK | Equipment | — |
| scheduled_date | Required | Planned date | YYYY-MM-DD |
| assigned_technician_id | FK | Assigned technician | — |
| status | Required | Workflow state | Same as Oil_Change_Actions |
| priority | Required | Urgency | CRITICAL \| HIGH \| MEDIUM \| LOW |
| sampling_method | Optional | How sample is taken | VACUUM \| INLINE \| DRAIN |
| sample_bottle_id | Optional | Physical bottle barcode | — |
| notes | Optional | Field notes | — |
| created_at | System | ISO timestamp | — |
| updated_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |
| approved_by | App-Only | Set by app | — |
| approved_at | App-Only | Approval timestamp | — |

---

### Oil_Sampling_History

**Purpose:** Completed sampling records. Links physical samples to lab submissions.

**Manual editor:** READ ONLY. Lab Admin may fill `lab_reference` manually.

| Column | Type | Description | Validation |
|---|---|---|---|
| history_id | PK | UUID | — |
| action_id | FK | Source sampling action | — |
| lp_id | FK | LP | — |
| equipment_id | FK | Equipment | — |
| sample_date | Required | Date sample was taken | YYYY-MM-DD |
| technician_id | FK | Collector | — |
| sample_bottle_id | Optional | Physical bottle label | — |
| lab_reference | Optional | Lab-assigned reference — fill manually if needed | — |
| sent_to_lab_date | Optional | Dispatch date | YYYY-MM-DD |
| notes | Optional | Notes | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Routes

**Purpose:** Route instances generated from Route_Templates. One row per route per day.

**Manual editor:** Maintenance Supervisor  
**Manual fallback:** Create a route row manually for today. Then add Route_Actions rows for each LP to be visited.

| Column | Type | Description | Validation |
|---|---|---|---|
| route_id | PK | UUID | — |
| template_id | FK | Source template | — |
| route_date | Required | Date of this route | YYYY-MM-DD |
| area_id | FK | Area covered | — |
| assigned_technician_id | FK | Assigned technician | — |
| status | Required | PLANNED \| IN_PROGRESS \| COMPLETED \| PARTIAL | — |
| start_time | App-Only | When technician started | — |
| end_time | App-Only | When completed | — |
| total_actions | App-Only | Count of route actions | — |
| completed_actions | App-Only | Completed count | — |
| notes | Optional | Supervisor notes | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Route_Actions

**Purpose:** Individual action items within a route, in visit sequence.

**Manual editor:** App-managed. Technicians may add notes.  
**Manual fallback:** Add rows with `route_id`, `lp_id`, `action_type`, and `sequence_number`. Update `status` to COMPLETED as each LP is visited.

| Column | Type | Description | Validation |
|---|---|---|---|
| route_action_id | PK | UUID | — |
| route_id | FK | Parent route | — |
| action_type | Required | Type of activity | OIL_CHANGE \| OIL_SAMPLE \| TOP_UP \| INSPECTION |
| lp_id | FK | Target LP | — |
| equipment_id | FK | Target equipment | — |
| sequence_number | Required | Visit order | Integer |
| status | Required | PENDING \| COMPLETED \| SKIPPED | — |
| completed_at | App-Only | Completion timestamp | — |
| technician_notes | Optional | Field notes | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Inventory

**Purpose:** Current oil stock levels by product. One row per oil product per location.

**Manual editor:** Warehouse Admin or Lubrication Engineer  
**Manual fallback:** Update `quantity_liters` directly. Add a row to Oil_Stock_Transactions to document why.

| Column | Type | Description | Validation |
|---|---|---|---|
| inventory_id | PK | `INV-XXX` | — |
| oil_type_id | FK | Oil type | — |
| oil_brand_id | FK | Oil brand | — |
| warehouse_location | Optional | Physical storage location | — |
| quantity_liters | Required | Current stock level | — |
| min_stock_liters | Required | Safety stock minimum | — |
| reorder_point_liters | Required | Order trigger threshold | — |
| last_updated | System | ISO timestamp | — |
| last_updated_by | System | Updater email | — |

---

### Oil_Stock_Transactions

**Purpose:** Full ledger of all inventory movements. The running total of all transactions should equal `Oil_Inventory.quantity_liters`.

**Manual editor:** Warehouse Admin (for receipts, adjustments). App writes consumption automatically.

| Column | Type | Description | Validation |
|---|---|---|---|
| transaction_id | PK | UUID | — |
| inventory_id | FK | Inventory row affected | — |
| transaction_type | Required | Movement type | RECEIPT \| CONSUMPTION \| ADJUSTMENT \| RETURN |
| quantity_liters | Required | Positive = in, negative = out | — |
| reference_action_id | Optional | Linked oil change action | — |
| transaction_date | Required | Date of movement | YYYY-MM-DD |
| notes | Optional | Reason for movement | — |
| created_by | System | Creator email | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Forecast

**Purpose:** Monthly predicted oil consumption per LP, generated by the app based on scheduled actions.

**Manual editor:** READ ONLY. Reliability Engineers may review and note discrepancies.

| Column | Type | Description | Validation |
|---|---|---|---|
| forecast_id | PK | Auto-ID | — |
| lp_id | FK | LP being forecasted | — |
| oil_type_id | FK | Oil type | — |
| forecast_month | Required | `YYYY-MM` | — |
| predicted_quantity_liters | Required | Forecasted volume | — |
| based_on_actions | App-Only | Scheduled action count used | — |
| created_at | System | ISO timestamp | — |

---

### Lubrication_Notifications

**Purpose:** Dispatch log. One row per notification sent or attempted.

**Manual editor:** READ ONLY. Admins may manually insert a row to trigger a resend.

| Column | Type | Description | Validation |
|---|---|---|---|
| notification_id | PK | UUID | — |
| rule_id | FK | Triggering rule | — |
| entity_type | Required | OIL_CHANGE \| OIL_SAMPLE \| ROUTE \| INVENTORY | — |
| entity_id | Required | ID of triggering entity | — |
| recipient_email | Required | Target email | — |
| channel | Required | EMAIL \| SHEET_COMMENT \| WEBHOOK | — |
| subject | Optional | Email subject | — |
| body_preview | Optional | First 200 chars of body | — |
| status | Required | PENDING \| SENT \| FAILED \| SUPPRESSED | — |
| sent_at | App-Only | Delivery timestamp | — |
| error_message | App-Only | Failure reason | — |
| created_at | System | ISO timestamp | — |

---

### Lubrication_Approvals

**Purpose:** Approval workflow records. One row per approval request per level.

**Manual editor:** Approver (status + decision_notes)  
**Manual fallback:** If app is unavailable, the designated approver opens this sheet, finds the pending row, sets `status=APPROVED` and writes their name in `decision_notes`. Then updates the action row in Oil_Change_Actions to `status=APPROVED`.

| Column | Type | Description | Validation |
|---|---|---|---|
| approval_id | PK | UUID | — |
| entity_type | Required | OIL_CHANGE \| OIL_SAMPLE | — |
| entity_id | Required | Action ID being approved | — |
| approval_level | Required | Tier number | — |
| approver_user_id | FK | Designated approver | — |
| status | Required | PENDING \| APPROVED \| REJECTED \| ESCALATED | — |
| decision_notes | Optional | Approver comments | — |
| requested_at | System | Request timestamp | — |
| decided_at | App-Only | Decision timestamp | — |
| escalated_at | App-Only | Escalation timestamp | — |

---

### Lubrication_Audit_Log

**Purpose:** Immutable append-only audit trail of all data changes.

**Manual editor:** READ ONLY — never edit, never delete rows.

| Column | Type | Description | Validation |
|---|---|---|---|
| log_id | PK | UUID | — |
| entity_type | Required | Sheet that was changed | — |
| entity_id | Required | Row ID that was changed | — |
| action | Required | CREATE \| UPDATE \| DELETE \| APPROVE \| REJECT | — |
| old_value_json | App-Only | Previous field values as JSON | — |
| new_value_json | App-Only | New field values as JSON | — |
| performed_by | Required | User email or SYSTEM | — |
| performed_at | Required | ISO timestamp | — |
| ip_address | App-Only | Client IP | — |
| session_id | App-Only | Session token | — |

---

## 8. Workbook 4: ACC_OIL_ANALYSIS_DATA

**Purpose:** Oil analysis lab results, PDF import tracking, OCR review workflow, trend analysis, generated reports, and associated workflow sheets.

---

### Oil_Samples

**Purpose:** The master registry of every physical sample bottle. Every sample taken in the field gets a row here.

**Manual editor:** Lab Admin or Lubrication Engineer

| Column | Type | Description | Validation |
|---|---|---|---|
| sample_id | PK | `SMP-YYYY-XXXX` | — |
| lp_id | FK | References LP_Master | — |
| equipment_id | FK | Denormalized from LP | — |
| sample_date | Required | Date collected | YYYY-MM-DD |
| technician_id | FK | Who collected | — |
| sample_bottle_id | Optional | Physical bottle ID | — |
| sample_source | Optional | Where oil was drawn from | IN_SERVICE \| DRAIN \| FILTER |
| status | Required | Workflow state | COLLECTED \| SENT_TO_LAB \| RECEIVED_BY_LAB \| ANALYSIS_COMPLETE \| CLOSED |
| lab_id | FK | References Contractors (lab) | — |
| sent_to_lab_date | Optional | Dispatch date | YYYY-MM-DD |
| received_by_lab_date | Optional | Lab acknowledgment date | YYYY-MM-DD |
| notes | Optional | Free text | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Oil_Analysis_Results

**Purpose:** Individual parameter measurements per sample. Each sample produces multiple rows (one per parameter).

**Manual editor:** Lab Admin or Reliability Engineer — may enter results manually from the lab report paper copy.

| Column | Type | Description | Validation |
|---|---|---|---|
| result_id | PK | UUID | — |
| sample_id | FK | References Oil_Samples | — |
| parameter_name | Required | e.g. `Viscosity_40C`, `Iron_ppm`, `Water_%` | — |
| measured_value | Required | Numeric measurement | — |
| unit | Required | cSt \| ppm \| % \| mg/g \| NTU | — |
| alarm_limit | Optional | CAUTION threshold | — |
| danger_limit | Optional | CRITICAL threshold | — |
| result_interpretation | Optional | Assessment | NORMAL \| CAUTION \| ALERT \| CRITICAL |
| analyzed_at | Optional | Analysis date | YYYY-MM-DD |
| analyzed_by | Optional | Analyst name or ID | — |
| created_at | System | ISO timestamp | — |

**Standard oil analysis parameters:**

| parameter_name | unit | alarm_limit | danger_limit |
|---|---|---|---|
| Viscosity_40C | cSt | ±15% of new oil | ±25% of new oil |
| Viscosity_100C | cSt | ±15% | ±25% |
| Iron_ppm | ppm | 50 | 100 |
| Copper_ppm | ppm | 20 | 50 |
| Lead_ppm | ppm | 10 | 30 |
| Silicon_ppm | ppm | 20 | 50 |
| Water_pct | % | 0.1 | 0.2 |
| TAN | mg KOH/g | 2.0 | 3.0 |
| TBN | mg KOH/g | 50% of new | 25% of new |
| Particle_Count_ISO | ISO 4406 code | 18/16/13 | 20/18/15 |

---

### PDF_Imports

**Purpose:** Tracks lab report PDF files uploaded to Google Drive for OCR extraction.

**Manual editor:** Lab Admin  
**Manual fallback:** Engineers set `extraction_status=ACCEPTED` manually after verifying results were entered correctly in Oil_Analysis_Results.

| Column | Type | Description | Validation |
|---|---|---|---|
| import_id | PK | UUID | — |
| sample_id | FK | References Oil_Samples | — |
| file_name | Required | PDF filename | — |
| google_drive_url | Required | Full Drive share URL | — |
| upload_date | Required | Upload date | YYYY-MM-DD |
| uploaded_by | Required | Uploader email | — |
| ocr_status | App-Only | OCR processing state | PENDING \| PROCESSING \| COMPLETE \| FAILED |
| extraction_status | Required | Review workflow state | NOT_STARTED \| IN_REVIEW \| ACCEPTED \| REJECTED |
| pages_count | Optional | PDF page count | — |
| notes | Optional | Notes | — |
| created_at | System | ISO timestamp | — |

---

### OCR_Review

**Purpose:** The primary manual workflow sheet for oil analysis. Engineers review each extracted field, accept correct values, or provide corrections where OCR made errors.

**Manual editor:** Reliability Engineer or Lab Admin — this sheet requires active human review.  
**Manual fallback:** This is the fallback itself. When OCR fails (`ocr_status=FAILED`), engineers enter extracted values manually in `extracted_value` and set `review_status=ACCEPTED`.

| Column | Type | Description | Validation |
|---|---|---|---|
| review_id | PK | UUID | — |
| import_id | FK | References PDF_Imports | — |
| field_name | Required | Parameter name being reviewed | — |
| extracted_value | Required | Raw OCR output | — |
| corrected_value | Optional | Engineer correction — fill if OCR was wrong | — |
| confidence_score | App-Only | 0.0–1.0 OCR confidence | — |
| reviewed_by | Optional | Reviewer email | — |
| reviewed_at | Optional | Review date | YYYY-MM-DD |
| review_status | Required | PENDING \| ACCEPTED \| CORRECTED \| REJECTED | — |
| created_at | System | ISO timestamp | — |

> **Manual Review Rule:** Any row with `confidence_score < 0.80` must be manually reviewed. Set `review_status=CORRECTED` if you changed the value, `ACCEPTED` if it was correct.

---

### Oil_Analysis_Actions

**Purpose:** Corrective and investigative actions triggered by abnormal analysis results.

**Manual editor:** Reliability Engineer or Maintenance Supervisor

| Column | Type | Description | Validation |
|---|---|---|---|
| action_id | PK | UUID | — |
| sample_id | FK | Triggering sample | — |
| result_id | FK | Specific abnormal result | — |
| action_type | Required | Type of response | RESAMPLE \| INVESTIGATE \| SCHEDULE_CHANGE \| ALERT \| ESCALATE |
| description | Required | What to do | — |
| assigned_to_user_id | FK | Responsible person | — |
| priority | Required | CRITICAL \| HIGH \| MEDIUM \| LOW | — |
| due_date | Required | Completion deadline | YYYY-MM-DD |
| status | Required | OPEN \| IN_PROGRESS \| COMPLETED \| CANCELLED | — |
| completed_at | App-Only | Completion timestamp | — |
| completed_by | App-Only | Completer email | — |
| notes | Optional | Progress notes | — |
| created_at | System | ISO timestamp | — |
| created_by | System | Creator email | — |

---

### Oil_Analysis_Trends

**Purpose:** Statistical trend summaries generated by the app over rolling analysis windows.

**Manual editor:** READ ONLY. Reliability Engineers review for anomalies.

| Column | Type | Description | Validation |
|---|---|---|---|
| trend_id | PK | UUID | — |
| lp_id | FK | Subject LP | — |
| parameter_name | Required | Parameter being trended | — |
| trend_period_months | Required | Analysis window | — |
| trend_direction | Required | INCREASING \| DECREASING \| STABLE | — |
| trend_slope | Optional | Rate of change per month | — |
| first_value | Optional | Oldest measurement in period | — |
| last_value | Optional | Latest measurement | — |
| anomaly_detected | Required | TRUE \| FALSE | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Analysis_Reports

**Purpose:** Generated or manually created analysis reports with Google Drive links.

**Manual editor:** Reliability Engineer (for manual reports). App generates periodic reports.

| Column | Type | Description | Validation |
|---|---|---|---|
| report_id | PK | UUID | — |
| lp_id | FK | Subject LP | — |
| equipment_id | FK | Subject equipment | — |
| report_type | Required | MONTHLY \| QUARTERLY \| ALERT \| AD_HOC | — |
| period_start | Required | Analysis start date | YYYY-MM-DD |
| period_end | Required | Analysis end date | YYYY-MM-DD |
| summary | Optional | Executive summary | — |
| recommendation | Optional | Action recommendation | — |
| generated_at | System | ISO timestamp | — |
| generated_by | System | Author email or SYSTEM | — |
| google_drive_url | Optional | Drive URL of full report | — |
| created_at | System | ISO timestamp | — |

---

### Oil_Analysis_Notifications / Approvals / Audit_Log

These three sheets share the same schema as their counterparts in the Oil
Lubrication workbook. See `Lubrication_Notifications`, `Lubrication_Approvals`,
and `Lubrication_Audit_Log` for column definitions and manual fallback notes.

The only difference is in `entity_type` values:

| Sheet | entity_type values |
|---|---|
| Oil_Analysis_Notifications | OIL_SAMPLE, ANALYSIS_RESULT, OCR_REVIEW, TREND |
| Oil_Analysis_Approvals | OIL_ANALYSIS_ACTION, OIL_ANALYSIS_REPORT |
| Oil_Analysis_Audit_Log | Same as Lubrication_Audit_Log |

---

## 9. Future Reserved Workbooks

The following workbooks are to be created when their modules are designed:

| Workbook Name | Module | Status |
|---|---|---|
| ACC_VIBRATION_DATA | Vibration Analysis (VIB) | Reserved — not yet designed |
| ACC_RELIABILITY_DATA | Reliability Engineering (REL) | Reserved — not yet designed |
| ACC_INSPECTION_DATA | Field Inspections (INSP) | Reserved — not yet designed |

When creating these workbooks:
1. Follow the same naming convention and design patterns as existing workbooks.
2. Include Notifications, Approvals, and Audit_Log sheets in each.
3. Reference `Equipment_Master`, `Areas`, and `Users` from the master and settings workbooks.
4. Run `db-initializer.gs` extended with new workbook functions.

---

## 10. Manual Fallback Operations Guide

This section tells engineers exactly what to do when the application is unavailable.

### When Should You Use Manual Mode?

- The web application is down (Apps Script quota exceeded, auth error, outage).
- An engineer is in the field without connectivity.
- You need to correct data that the app produced incorrectly.
- Emergency approval is needed and the approver cannot reach the app.

### General Rules

1. **Never delete rows** from History, Notification, or Audit_Log sheets.
2. **Do not edit App-Only columns** (pink background). Leave them blank or as-is.
3. **Always fill required columns** (yellow background). A row without required data will be rejected when the app syncs.
4. **Use the same date format:** `YYYY-MM-DD` for dates, `YYYY-MM-DDTHH:MM:SS` for timestamps.
5. **Document your manual changes** — add a note in the `notes` column and the Audit_Log if possible.

---

### Manual Procedure: Record a Completed Oil Change

**When:** Technician completed an oil change in the field but app was unavailable.

1. Open **ACC_OIL_LUBRICATION_DATA > Oil_Change_Actions**
2. Find the action row (filter by `lp_id` or `scheduled_date`)
3. Change `status` to `COMPLETED`
4. Fill in `notes` with "Manual completion — app unavailable [your name] [date]"
5. Open **Oil_Change_History**
6. Append a new row with all required fields:
   - `history_id`: Write `MANUAL-[date]-[LP code]` (e.g. `MANUAL-20250704-LP-0001`)
   - `action_id`: Copy from the action row
   - `change_date`: Actual date performed
   - `quantity_used_liters`: Actual amount used
7. Open **ACC_PLATFORM_MASTER_DATA > LP_Master**
8. Find the LP row and update `last_change_date` to today's date
9. Open **Oil_Inventory**
10. Reduce `quantity_liters` by the amount used
11. Open **Oil_Stock_Transactions** and append a consumption row

---

### Manual Procedure: Approve an Oil Change

**When:** Approver needs to approve and the app is unavailable.

1. Open **ACC_OIL_LUBRICATION_DATA > Lubrication_Approvals**
2. Find rows where `entity_id` matches the action and `status=PENDING`
3. Set `status=APPROVED`
4. Write in `decision_notes`: "Manual approval — app unavailable — [your name] — [date]"
5. Open **Oil_Change_Actions**
6. Find the same action and set `status=APPROVED`
7. Notify the technician via email or phone to proceed

---

### Manual Procedure: Enter a Lab Result Manually

**When:** Lab report PDF is available but OCR failed or app is down.

1. Open **ACC_OIL_ANALYSIS_DATA > Oil_Samples**
2. Find the sample row. If it doesn't exist, create it.
3. Update `status=ANALYSIS_COMPLETE`
4. Open **Oil_Analysis_Results**
5. For each parameter in the lab report, append a row:
   - `result_id`: Write `MANUAL-[sample_id]-[parameter]`
   - `sample_id`: The sample ID
   - `parameter_name`: Exact parameter name (e.g. `Viscosity_40C`)
   - `measured_value`, `unit`: From the report
   - `result_interpretation`: Based on your engineering judgment
   - `analyzed_by`: Your name
6. Open **PDF_Imports** and set `extraction_status=ACCEPTED`
7. Open **OCR_Review** and set all rows for this import to `review_status=ACCEPTED`

---

### Manual Procedure: Update Oil Inventory on Delivery

**When:** Oil received and app is unavailable.

1. Open **ACC_OIL_LUBRICATION_DATA > Oil_Inventory**
2. Find the row for the oil type received
3. Add the received quantity to `quantity_liters`
4. Update `last_updated` and `last_updated_by`
5. Open **Oil_Stock_Transactions** and append:
   - `transaction_type=RECEIPT`
   - `quantity_liters`: Received quantity (positive)
   - `transaction_date`: Today
   - `notes`: "Manual receipt — PO# [number] — app unavailable"

---

## 11. Validation Reference

These are the complete lists used in drop-down validation across all sheets.

| List Name | Values |
|---|---|
| Module IDs | PLATFORM, OIL_LUB, OIL_ANALYSIS, VIB, REL, INSP |
| Setting Types | TEXT, NUMBER, BOOLEAN, JSON, URL |
| Boolean | TRUE, FALSE |
| Priority | CRITICAL, HIGH, MEDIUM, LOW |
| Criticality | A, B, C |
| Lube Point Types | GEARBOX, BEARING, HYDRAULIC, COMPRESSOR, OTHER |
| Base Oil Types | MINERAL, SYNTHETIC, SEMI-SYNTHETIC |
| Oil Change Status | SCHEDULED, IN_PROGRESS, PENDING_APPROVAL, APPROVED, COMPLETED, CANCELLED, OVERDUE |
| Route Status | PLANNED, IN_PROGRESS, COMPLETED, PARTIAL |
| Route Action Types | OIL_CHANGE, OIL_SAMPLE, TOP_UP, INSPECTION |
| Route Action Status | PENDING, COMPLETED, SKIPPED |
| Transaction Types | RECEIPT, CONSUMPTION, ADJUSTMENT, RETURN |
| Notification Status | PENDING, SENT, FAILED, SUPPRESSED |
| Approval Status | PENDING, APPROVED, REJECTED, ESCALATED |
| Sampling Methods | VACUUM, INLINE, DRAIN |
| Sample Status | COLLECTED, SENT_TO_LAB, RECEIVED_BY_LAB, ANALYSIS_COMPLETE, CLOSED |
| OCR Status | PENDING, PROCESSING, COMPLETE, FAILED |
| Extraction Status | NOT_STARTED, IN_REVIEW, ACCEPTED, REJECTED |
| Review Status | PENDING, ACCEPTED, CORRECTED, REJECTED |
| Result Interpretation | NORMAL, CAUTION, ALERT, CRITICAL |
| Trend Direction | INCREASING, DECREASING, STABLE |
| Report Types | MONTHLY, QUARTERLY, ALERT, AD_HOC |
| Analysis Action Types | RESAMPLE, INVESTIGATE, SCHEDULE_CHANGE, ALERT, ESCALATE |
| Analysis Action Status | OPEN, IN_PROGRESS, COMPLETED, CANCELLED |
| Condition | GOOD, DEGRADED, CONTAMINATED, UNKNOWN, FRESH |
| Channel | EMAIL, SHEET_COMMENT, WEBHOOK |
| Recipient Types | ROLE, USER, EMAIL |
| Audit Actions | CREATE, UPDATE, DELETE, APPROVE, REJECT |
| Measurement Axes | H, V, A |
| Sample Sources | IN_SERVICE, DRAIN, FILTER |
| Contractor Specialties | OIL_LAB, VIBRATION, GENERAL, ELECTRICAL |
| Area Status | ACTIVE, INACTIVE |
| Entity Status | ACTIVE, INACTIVE |
| Contractor Types | MAINTENANCE, OIL_LAB, ANALYSIS, GENERAL, ELECTRICAL |
| Access Levels | FULL, READ_ONLY, NO_ACCESS |
| Widget Types | KPI_CARD, TABLE, CHART, CALENDAR |
| Aggregation Periods | DAILY, WEEKLY, MONTHLY |

---

## 12. Cross-Workbook Relationship Map

```
ACC_PLATFORM_SETTINGS_CONFIG
  Roles ──────────────────────── FK from: Users.role_id
  │                                      Approval_Rules.approver_role_id
  │                                      Role_Permissions.role_id
  │                                      Escalation_Rules.escalate_to_role_id
  Permissions ─────────────────── FK from: Role_Permissions.permission_id
  Users ───────────────────────── FK from: Oil_Change_Actions.assigned_technician_id
  │                                       Oil_Sampling_Actions.assigned_technician_id
  │                                       Oil_Samples.technician_id
  │                                       Oil_Analysis_Actions.assigned_to_user_id
  │                                       Lubrication_Approvals.approver_user_id
  Notification_Rules ──────────── FK from: Lubrication_Notifications.rule_id
                                           Oil_Analysis_Notifications.rule_id

ACC_PLATFORM_MASTER_DATA
  Equipment_Master ────────────── FK from: LP_Master.equipment_id
  │                                       VB_Master.equipment_id
  │                                       Oil_Change_Actions.equipment_id
  │                                       Oil_Analysis_Results (via Oil_Samples)
  LP_Master ───────────────────── FK from: Oil_Change_Actions.lp_id
  │                                       Oil_Sampling_Actions.lp_id
  │                                       Oil_Change_History.lp_id
  │                                       Oil_Samples.lp_id
  │                                       Oil_Analysis_Trends.lp_id
  │                                       Oil_Analysis_Reports.lp_id
  Areas ───────────────────────── FK from: Equipment_Master.area_id
  │                                       Route_Templates.area_id
  │                                       Oil_Routes.area_id
  Contractors ─────────────────── FK from: Areas.responsible_contractor_id
  │                                       Oil_Samples.lab_id
  Equipment_Types ─────────────── FK from: Equipment_Master.equipment_type_id
  Oil_Types ───────────────────── FK from: LP_Master.oil_type_id
  │                                       Oil_Change_Actions.oil_type_id
  │                                       Oil_Change_History.oil_type_id
  │                                       Oil_Inventory.oil_type_id
  Oil_Brands ──────────────────── FK from: LP_Master.oil_brand_id
  │                                       Oil_Products.oil_brand_id
  │                                       Oil_Change_Actions.oil_brand_id
  │                                       Oil_Inventory.oil_brand_id
  Oil_Products ────────────────── FK from: (future LP / inventory product refs)
  Equipment_Line_Assignments ── equipment_code → Equipment_Master.equipment_tag
  Route_Templates ─────────────── FK from: Oil_Routes.template_id

ACC_OIL_LUBRICATION_DATA (internal)
  Oil_Change_Actions ──────────── FK from: Oil_Change_History.action_id
  │                                       Lubrication_Approvals.entity_id
  │                                       Lubrication_Audit_Log.entity_id
  │                                       Oil_Stock_Transactions.reference_action_id
  Oil_Routes ──────────────────── FK from: Route_Actions.route_id
  Oil_Inventory ───────────────── FK from: Oil_Stock_Transactions.inventory_id
  Oil_Sampling_Actions ────────── FK from: Oil_Sampling_History.action_id

ACC_OIL_ANALYSIS_DATA (internal)
  Oil_Samples ─────────────────── FK from: Oil_Analysis_Results.sample_id
  │                                        PDF_Imports.sample_id
  │                                        Oil_Analysis_Actions.sample_id
  PDF_Imports ─────────────────── FK from: OCR_Review.import_id
  Oil_Analysis_Results ────────── FK from: Oil_Analysis_Actions.result_id
```

---

*Document maintained by the ACC Reliability Platform Team.*  
*For the interactive version of this architecture, see the Canvas: `acc-database-architecture.canvas.tsx`.*  
*For initializer script, see: `apps-script/db-initializer.gs`*
