/**
 * ============================================================
 * ACC Reliability Platform — Database Initializer
 * ============================================================
 * File:    apps-script/database/initializeAccDatabase.gs
 * Version: 1.0.0
 *
 * Purpose:
 *   Creates, formats, and validates all 51 sheets across the
 *   4 production workbooks of the ACC Reliability Platform.
 *
 * Design:
 *   - No secrets or real IDs stored here.
 *   - Replace WORKBOOK_IDS placeholders before running.
 *   - Safe to re-run: existing sheets are NOT overwritten.
 *   - Run individual init functions per workbook if needed.
 *
 * Usage:
 *   1. Create 4 blank Google Sheets files.
 *   2. Copy each file's URL ID into WORKBOOK_IDS below.
 *   3. Open any of the 4 files → Extensions → Apps Script.
 *   4. Paste this script into Code.gs.
 *   5. Run verifyConfig() first — confirm all IDs are set.
 *   6. Run initializeAccDatabase().
 *   7. Check Execution Log for results.
 *
 * Column color coding applied by this script:
 *   Yellow (#FFF8E1) = Required — must fill
 *   Light red (#FFEBEE) = App-Only — do not edit manually
 *   Light purple (#F3E5F5) = System — auto-filled by app
 *   White = Optional
 * ============================================================
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Replace each value with the Google Sheets file ID from its URL.
// URL format: https://docs.google.com/spreadsheets/d/FILE_ID/edit

var WORKBOOK_IDS = {
  SETTINGS:     "REPLACE_WITH_SETTINGS_FILE_ID",
  MASTER_DATA:  "REPLACE_WITH_MASTER_DATA_FILE_ID",
  OIL_LUB:      "REPLACE_WITH_OIL_LUB_FILE_ID",
  OIL_ANALYSIS: "REPLACE_WITH_OIL_ANALYSIS_FILE_ID"
};

// ─── THEME COLORS ─────────────────────────────────────────────────────────────
var COLOR = {
  SETTINGS:     "#1565C0",  // Header: Blue
  MASTER_DATA:  "#2E7D32",  // Header: Green
  OIL_LUB:      "#E65100",  // Header: Orange
  OIL_ANALYSIS: "#6A1B9A",  // Header: Purple
  HEADER_TEXT:  "#FFFFFF",
  REQUIRED:     "#FFF8E1",  // Yellow — required columns
  APP_ONLY:     "#FFEBEE",  // Light red — app-only columns
  SYSTEM:       "#F3E5F5",  // Light purple — system columns
  OPTIONAL:     "#FFFFFF",  // White — optional columns
  ALT_ROW:      "#FAFAFA"   // Near-white — alternating row shading
};

// ─── VALIDATION LISTS ────────────────────────────────────────────────────────
var LIST = {
  MODULE_IDS:      ["PLATFORM","OIL_LUB","OIL_ANALYSIS","VIB","REL","INSP"],
  BOOLEAN:         ["TRUE","FALSE"],
  SETTING_TYPE:    ["TEXT","NUMBER","BOOLEAN","JSON","URL"],
  PRIORITY:        ["CRITICAL","HIGH","MEDIUM","LOW"],
  CRITICALITY:     ["A","B","C"],
  LUBE_PT_TYPE:    ["GEARBOX","BEARING","HYDRAULIC","COMPRESSOR","OTHER"],
  BASE_TYPE:       ["MINERAL","SYNTHETIC","SEMI-SYNTHETIC"],
  ACTION_STATUS:   ["SCHEDULED","IN_PROGRESS","PENDING_APPROVAL","APPROVED","COMPLETED","CANCELLED","OVERDUE"],
  ROUTE_STATUS:    ["PLANNED","IN_PROGRESS","COMPLETED","PARTIAL"],
  ROUTE_ACT_TYPE:  ["OIL_CHANGE","OIL_SAMPLE","TOP_UP","INSPECTION"],
  ROUTE_ACT_STAT:  ["PENDING","COMPLETED","SKIPPED"],
  TXN_TYPE:        ["RECEIPT","CONSUMPTION","ADJUSTMENT","RETURN"],
  NOTIF_STATUS:    ["PENDING","SENT","FAILED","SUPPRESSED"],
  APPROVAL_STATUS: ["PENDING","APPROVED","REJECTED","ESCALATED"],
  SAMPLING_METHOD: ["VACUUM","INLINE","DRAIN"],
  SAMPLE_STATUS:   ["COLLECTED","SENT_TO_LAB","RECEIVED_BY_LAB","ANALYSIS_COMPLETE","CLOSED"],
  OCR_STATUS:      ["PENDING","PROCESSING","COMPLETE","FAILED"],
  EXTRACT_STATUS:  ["NOT_STARTED","IN_REVIEW","ACCEPTED","REJECTED"],
  REVIEW_STATUS:   ["PENDING","ACCEPTED","CORRECTED","REJECTED"],
  RESULT_INTERP:   ["NORMAL","CAUTION","ALERT","CRITICAL"],
  TREND_DIR:       ["INCREASING","DECREASING","STABLE"],
  REPORT_TYPE:     ["MONTHLY","QUARTERLY","ALERT","AD_HOC"],
  ANAL_ACTION:     ["RESAMPLE","INVESTIGATE","SCHEDULE_CHANGE","ALERT","ESCALATE"],
  ANAL_STATUS:     ["OPEN","IN_PROGRESS","COMPLETED","CANCELLED"],
  OIL_COND:        ["GOOD","DEGRADED","CONTAMINATED","UNKNOWN","FRESH"],
  CHANNEL:         ["EMAIL","SHEET_COMMENT","WEBHOOK"],
  RECIP_TYPE:      ["ROLE","USER","EMAIL"],
  AUDIT_ACTION:    ["CREATE","UPDATE","DELETE","APPROVE","REJECT"],
  WIDGET_TYPE:     ["KPI_CARD","TABLE","CHART","CALENDAR"],
  AGG_PERIOD:      ["DAILY","WEEKLY","MONTHLY"],
  ACCESS_LEVEL:    ["FULL","READ_ONLY","NO_ACCESS"],
  SPECIALTY:       ["OIL_LAB","VIBRATION","GENERAL","ELECTRICAL"],
  SAMPLE_SOURCE:   ["IN_SERVICE","DRAIN","FILTER"],
  AXIS:            ["H","V","A"],
  COND_AFTER:      ["GOOD","FRESH"],
  ROUTING_ACTION:  ["ASSIGN","NOTIFY","ESCALATE","CREATE_ACTION","FLAG"],
  ROUTING_OP:      ["EQ","NEQ","GT","LT","IN"]
};

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────

/**
 * Run this function to initialise all 4 workbooks.
 * Pre-requisite: WORKBOOK_IDS must all be replaced.
 */
function initializeAccDatabase() {
  var results = [];
  var startTime = new Date();

  log_("=== ACC Reliability Platform — Database Initializer START ===");
  log_("Time: " + startTime.toISOString());

  results.push(runWorkbook_("SETTINGS",     initSettingsWorkbook));
  results.push(runWorkbook_("MASTER_DATA",  initMasterDataWorkbook));
  results.push(runWorkbook_("OIL_LUB",      initOilLubWorkbook));
  results.push(runWorkbook_("OIL_ANALYSIS", initOilAnalysisWorkbook));

  var elapsed = Math.round((new Date() - startTime) / 1000);
  var ok    = results.filter(function(r) { return r.ok; }).length;
  var fail  = results.filter(function(r) { return !r.ok; }).length;

  log_("=== COMPLETE — " + ok + " workbooks OK, " + fail + " failed — " + elapsed + "s ===");

  try {
    SpreadsheetApp.getUi().alert(
      "ACC Database Initializer Complete\n\n" +
      ok + " workbooks initialized\n" +
      (fail > 0 ? fail + " workbooks failed — check Execution Log\n" : "") +
      "\nTime: " + elapsed + "s\n\n" +
      "Next step: Review each sheet to verify headers and validation."
    );
  } catch (e) { /* no UI in headless mode */ }
}

/** Wraps a workbook init function with error handling and logging. */
function runWorkbook_(name, fn) {
  try {
    fn();
    log_("[OK] " + name);
    return { name: name, ok: true };
  } catch (e) {
    log_("[ERROR] " + name + ": " + e.message);
    return { name: name, ok: false, error: e.message };
  }
}

// ─── QUICK-ACCESS FUNCTIONS ──────────────────────────────────────────────────
// Run any of these to initialise a single workbook.

function initSettingsOnly()   { initSettingsWorkbook(); }
function initMasterDataOnly() { initMasterDataWorkbook(); }
function initOilLubOnly()     { initOilLubWorkbook(); }
function initOilAnalysisOnly(){ initOilAnalysisWorkbook(); }

/**
 * Run before initializeAccDatabase() to confirm all IDs are configured.
 */
function verifyConfig() {
  var missing = [];
  for (var key in WORKBOOK_IDS) {
    if (!WORKBOOK_IDS[key] || WORKBOOK_IDS[key].indexOf("REPLACE_") === 0) {
      missing.push(key);
    }
  }

  var msg = missing.length === 0
    ? "All 4 workbook IDs are configured.\nReady to run initializeAccDatabase()."
    : "Missing IDs:\n" + missing.join(", ") +
      "\n\nUpdate WORKBOOK_IDS at the top of this script, then run again.";

  try {
    SpreadsheetApp.getUi().alert("Configuration Check\n\n" + msg);
  } catch (e) {
    log_(msg);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKBOOK 1: ACC_PLATFORM_SETTINGS_CONFIG (16 sheets, 142 columns)
// ─────────────────────────────────────────────────────────────────────────────

function initSettingsWorkbook() {
  var ss = openWorkbook_(WORKBOOK_IDS.SETTINGS);
  var hdr = COLOR.SETTINGS;

  /* W1-S01 App_Settings (9 cols) */
  buildSheet_(ss, "App_Settings", hdr, [
    col_("A","setting_key",  "PK",  "Unique setting identifier (e.g. AUTH_SESSION_TIMEOUT)"),
    col_("B","setting_value","R",   "Value stored as plain text"),
    col_("C","setting_type", "R",   "Data type of value", LIST.SETTING_TYPE),
    col_("D","description",  "O",   "Human explanation"),
    col_("E","is_encrypted", "A",   "TRUE if encrypted at rest — do not touch", LIST.BOOLEAN),
    col_("F","created_at",   "S",   "ISO timestamp"),
    col_("G","updated_at",   "S",   "ISO timestamp"),
    col_("H","created_by",   "S",   "Creator email"),
    col_("I","updated_by",   "S",   "Last updater email")
  ], [
    ["AUTH_SESSION_TIMEOUT","3600","NUMBER","Session timeout in seconds","FALSE",ts_(),ts_(),"admin@example.com","admin@example.com"],
    ["APP_VERSION","2.0.0","TEXT","Current application version","FALSE",ts_(),ts_(),"admin@example.com","admin@example.com"],
    ["OIL_LUB_ENABLED","TRUE","BOOLEAN","Enable Oil Lubrication module","FALSE",ts_(),ts_(),"admin@example.com","admin@example.com"],
    ["DEFAULT_LANGUAGE","en","TEXT","Default UI language (en or ar)","FALSE",ts_(),ts_(),"admin@example.com","admin@example.com"],
    ["INVENTORY_LOW_STOCK_ALERT","TRUE","BOOLEAN","Enable low-stock inventory alerts","FALSE",ts_(),ts_(),"admin@example.com","admin@example.com"]
  ]);

  /* W1-S02 Module_Settings (8 cols) */
  buildSheet_(ss, "Module_Settings", hdr, [
    col_("A","module_id",    "R","Module code",              LIST.MODULE_IDS),
    col_("B","setting_key",  "R","Setting name in module scope"),
    col_("C","setting_value","R","Value"),
    col_("D","setting_type", "R","Data type",                LIST.SETTING_TYPE),
    col_("E","description",  "O","Human explanation"),
    col_("F","is_active",    "O","FALSE to disable without deleting", LIST.BOOLEAN),
    col_("G","created_at",   "S","ISO timestamp"),
    col_("H","updated_at",   "S","ISO timestamp")
  ], [
    ["OIL_LUB","OVERDUE_REMINDER_HOURS","48","NUMBER","Notify N hours before action goes overdue","TRUE",ts_(),ts_()],
    ["OIL_LUB","SAMPLING_APPROVAL_REQUIRED","FALSE","BOOLEAN","Require approval for sampling actions","TRUE",ts_(),ts_()],
    ["OIL_ANALYSIS","OCR_CONFIDENCE_THRESHOLD","0.80","NUMBER","Confidence below this requires manual review","TRUE",ts_(),ts_()]
  ]);

  /* W1-S03 Roles (9 cols) */
  buildSheet_(ss, "Roles", hdr, [
    col_("A","role_id",       "PK","Auto-incremented integer"),
    col_("B","role_name",     "R", "Display name"),
    col_("C","role_code",     "R", "UPPERCASE_SNAKE_CASE — unique"),
    col_("D","description",   "O", "Scope and responsibilities"),
    col_("E","is_system_role","A", "TRUE for built-in roles — do not modify", LIST.BOOLEAN),
    col_("F","is_active",     "R", "FALSE to disable", LIST.BOOLEAN),
    col_("G","created_at",    "S", "ISO timestamp"),
    col_("H","updated_at",    "S", "ISO timestamp"),
    col_("I","created_by",    "S", "Creator email")
  ], [
    [1,"Platform Administrator","PLATFORM_ADMIN","Full system access","TRUE","TRUE",ts_(),ts_(),"system"],
    [2,"Module Manager",        "MODULE_MANAGER","Manages a module",   "TRUE","TRUE",ts_(),ts_(),"system"],
    [3,"Maintenance Supervisor","MAINT_SUPV",    "Field supervision",   "TRUE","TRUE",ts_(),ts_(),"system"],
    [4,"Lubrication Technician","LUB_TECH",      "Executes lube tasks", "TRUE","TRUE",ts_(),ts_(),"system"],
    [5,"Lubrication Engineer",  "LUB_ENG",       "Plans lubrication",   "TRUE","TRUE",ts_(),ts_(),"system"],
    [6,"Reliability Engineer",  "REL_ENG",       "Oil analysis & RE",   "TRUE","TRUE",ts_(),ts_(),"system"],
    [7,"Lab Administrator",     "LAB_ADMIN",     "Manages lab samples",  "TRUE","TRUE",ts_(),ts_(),"system"],
    [8,"Warehouse Admin",       "WAREHOUSE_ADMIN","Manages oil stock",  "TRUE","TRUE",ts_(),ts_(),"system"]
  ]);

  /* W1-S04 Permissions (8 cols) */
  buildSheet_(ss, "Permissions", hdr, [
    col_("A","permission_id",   "PK","Auto-incremented integer"),
    col_("B","permission_code", "R", "MODULE.RESOURCE.ACTION — unique"),
    col_("C","module_id",       "FK","Module scope",          LIST.MODULE_IDS),
    col_("D","resource",        "R", "Resource entity name"),
    col_("E","action",          "R", "Operation type",        ["READ","WRITE","DELETE","APPROVE","EXPORT"]),
    col_("F","description",     "O", "Human explanation"),
    col_("G","is_active",       "R", "TRUE/FALSE",            LIST.BOOLEAN),
    col_("H","created_at",      "S", "ISO timestamp")
  ], [
    [1,"OIL_LUB.OIL_CHANGE_ACTIONS.READ",  "OIL_LUB","OIL_CHANGE_ACTIONS","READ",  "View oil change actions",    "TRUE",ts_()],
    [2,"OIL_LUB.OIL_CHANGE_ACTIONS.WRITE", "OIL_LUB","OIL_CHANGE_ACTIONS","WRITE", "Create/edit oil changes",    "TRUE",ts_()],
    [3,"OIL_LUB.OIL_CHANGE_ACTIONS.APPROVE","OIL_LUB","OIL_CHANGE_ACTIONS","APPROVE","Approve oil changes",       "TRUE",ts_()],
    [4,"OIL_LUB.OIL_INVENTORY.READ",       "OIL_LUB","OIL_INVENTORY",    "READ",  "View inventory",             "TRUE",ts_()],
    [5,"OIL_LUB.OIL_INVENTORY.WRITE",      "OIL_LUB","OIL_INVENTORY",    "WRITE", "Edit inventory",             "TRUE",ts_()]
  ]);

  /* W1-S05 Role_Permissions (4 cols) */
  buildSheet_(ss, "Role_Permissions", hdr, [
    col_("A","role_id",       "FK","→ Roles.role_id"),
    col_("B","permission_id", "FK","→ Permissions.permission_id"),
    col_("C","granted_at",    "S", "ISO timestamp"),
    col_("D","granted_by",    "S", "Granter email")
  ], [
    [1,1,ts_(),"system"],[1,2,ts_(),"system"],[1,3,ts_(),"system"],
    [1,4,ts_(),"system"],[1,5,ts_(),"system"],
    [4,1,ts_(),"system"],[5,2,ts_(),"system"],[5,3,ts_(),"system"]
  ]);

  /* W1-S06 Users (14 cols) */
  buildSheet_(ss, "Users", hdr, [
    col_("A","user_id",       "PK","UUID — do not change after creation"),
    col_("B","email",         "R", "Google Workspace email — unique"),
    col_("C","full_name",     "R", "Full display name"),
    col_("D","display_name",  "O", "Short name for UI"),
    col_("E","employee_id",   "O", "HR system number"),
    col_("F","department",    "O", "Department name"),
    col_("G","position",      "O", "Job title"),
    col_("H","role_id",       "FK","→ Roles.role_id"),
    col_("I","is_active",     "R", "FALSE = blocked from login", LIST.BOOLEAN),
    col_("J","last_login",    "A", "Updated by app on each login"),
    col_("K","google_id",     "A", "Google OAuth subject ID — never edit"),
    col_("L","created_at",    "S", "ISO timestamp"),
    col_("M","updated_at",    "S", "ISO timestamp"),
    col_("N","created_by",    "S", "Creator email")
  ], [
    ["USR-0001","admin@example.com","Platform Administrator","Admin","EMP-001","IT","Platform Admin",
     1,"TRUE","","",ts_(),ts_(),"system"]
  ]);

  /* W1-S07 User_Module_Access (6 cols) */
  buildSheet_(ss, "User_Module_Access", hdr, [
    col_("A","user_id",      "FK","→ Users.user_id"),
    col_("B","module_id",    "R", "Module code",       LIST.MODULE_IDS),
    col_("C","access_level", "R", "Access override",   LIST.ACCESS_LEVEL),
    col_("D","granted_at",   "S", "ISO timestamp"),
    col_("E","granted_by",   "S", "Granter email"),
    col_("F","expires_at",   "O", "ISO timestamp — blank = permanent")
  ], [
    ["USR-0001","OIL_LUB","FULL",ts_(),"system",""],
    ["USR-0001","OIL_ANALYSIS","FULL",ts_(),"system",""]
  ]);

  /* W1-S08 Notification_Rules (11 cols) */
  buildSheet_(ss, "Notification_Rules", hdr, [
    col_("A","rule_id",         "PK","Auto-int"),
    col_("B","rule_name",       "R", "Descriptive name"),
    col_("C","module_id",       "R", "Module scope",         LIST.MODULE_IDS),
    col_("D","event_type",      "R", "Trigger event code"),
    col_("E","recipient_type",  "R", "How to identify recipient", LIST.RECIP_TYPE),
    col_("F","recipient_value", "R", "Role code, user_id, or email"),
    col_("G","channel",         "R", "Delivery method",      LIST.CHANNEL),
    col_("H","is_active",       "R", "TRUE/FALSE",           LIST.BOOLEAN),
    col_("I","conditions_json", "A", "JSON filter — set by app"),
    col_("J","created_at",      "S", "ISO timestamp"),
    col_("K","created_by",      "S", "Creator email")
  ], [
    [1,"Overdue Oil Change Alert","OIL_LUB","ACTION_OVERDUE","ROLE","LUB_ENG","EMAIL","TRUE","",ts_(),"admin@example.com"],
    [2,"Low Inventory Alert",     "OIL_LUB","INVENTORY_LOW", "ROLE","WAREHOUSE_ADMIN","EMAIL","TRUE","",ts_(),"admin@example.com"],
    [3,"Sample Received",         "OIL_ANALYSIS","SAMPLE_RECEIVED","ROLE","REL_ENG","EMAIL","TRUE","",ts_(),"admin@example.com"]
  ]);

  /* W1-S09 Approval_Rules (10 cols) */
  buildSheet_(ss, "Approval_Rules", hdr, [
    col_("A","rule_id",          "PK","Auto-int"),
    col_("B","rule_name",        "R", "Descriptive name"),
    col_("C","module_id",        "R", "Module scope",    LIST.MODULE_IDS),
    col_("D","entity_type",      "R", "Entity to approve"),
    col_("E","approval_level",   "R", "Integer ≥ 1 (1 = first)"),
    col_("F","approver_role_id", "FK","→ Roles.role_id"),
    col_("G","escalation_hours", "O", "Hours before auto-escalation"),
    col_("H","is_active",        "R", "TRUE/FALSE",      LIST.BOOLEAN),
    col_("I","created_at",       "S", "ISO timestamp"),
    col_("J","created_by",       "S", "Creator email")
  ], [
    [1,"Oil Change Approval L1","OIL_LUB","OIL_CHANGE",1,5,24,"TRUE",ts_(),"admin@example.com"],
    [2,"Oil Change Approval L2","OIL_LUB","OIL_CHANGE",2,2,48,"TRUE",ts_(),"admin@example.com"],
    [3,"Analysis Action Approval","OIL_ANALYSIS","OIL_ANALYSIS_ACTION",1,6,24,"TRUE",ts_(),"admin@example.com"]
  ]);

  /* W1-S10 Action_Routing_Rules (12 cols) */
  buildSheet_(ss, "Action_Routing_Rules", hdr, [
    col_("A","rule_id",           "PK","Auto-int"),
    col_("B","rule_name",         "R", "Descriptive name"),
    col_("C","module_id",         "R", "Module scope",       LIST.MODULE_IDS),
    col_("D","trigger_event",     "R", "Event that triggers evaluation"),
    col_("E","condition_field",   "O", "Field to evaluate"),
    col_("F","condition_operator","O", "Comparison operator", LIST.ROUTING_OP),
    col_("G","condition_value",   "O", "Value to compare against"),
    col_("H","action_type",       "R", "Automation action",  LIST.ROUTING_ACTION),
    col_("I","action_target",     "O", "Role code, user_id, or sheet target"),
    col_("J","priority",          "O", "Rule evaluation order (lower = first)"),
    col_("K","is_active",         "R", "FALSE to disable",   LIST.BOOLEAN),
    col_("L","created_at",        "S", "ISO timestamp")
  ], [
    [1,"Critical Priority Escalate","OIL_LUB","ACTION_CREATED","priority","EQ","CRITICAL","NOTIFY","MODULE_MANAGER",1,"TRUE",ts_()]
  ]);

  /* W1-S11 Escalation_Rules (10 cols) */
  buildSheet_(ss, "Escalation_Rules", hdr, [
    col_("A","rule_id",            "PK","Auto-int"),
    col_("B","rule_name",          "R", "Descriptive name"),
    col_("C","module_id",          "R", "Module scope",      LIST.MODULE_IDS),
    col_("D","entity_type",        "R", "Entity being monitored"),
    col_("E","delay_hours",        "R", "Hours overdue before rule fires"),
    col_("F","escalation_level",   "O", "Stage number"),
    col_("G","escalate_to_role_id","FK","→ Roles.role_id"),
    col_("H","notify_channel",     "O", "Notification channel", LIST.CHANNEL),
    col_("I","is_active",          "R", "TRUE/FALSE",         LIST.BOOLEAN),
    col_("J","created_at",         "S", "ISO timestamp")
  ], [
    [1,"OIL_LUB 48h Escalation","OIL_LUB","OIL_CHANGE",48,1,2,"EMAIL","TRUE",ts_()],
    [2,"OIL_LUB 96h Escalation","OIL_LUB","OIL_CHANGE",96,2,1,"EMAIL","TRUE",ts_()]
  ]);

  /* W1-S12 Dashboard_Config (9 cols) */
  buildSheet_(ss, "Dashboard_Config", hdr, [
    col_("A","config_id",          "PK","Auto-int"),
    col_("B","dashboard_name",     "R", "Dashboard identifier"),
    col_("C","role_id",            "FK","→ Roles.role_id"),
    col_("D","widget_type",        "R", "Widget kind",        LIST.WIDGET_TYPE),
    col_("E","widget_data_source", "R", "Sheet name or API source"),
    col_("F","widget_position",    "O", "Grid position (row,col)"),
    col_("G","widget_config_json", "A", "JSON config — set by app"),
    col_("H","is_active",          "R", "TRUE/FALSE",         LIST.BOOLEAN),
    col_("I","created_at",         "S", "ISO timestamp")
  ], []);

  /* W1-S13 KPI_Config (10 cols) */
  buildSheet_(ss, "KPI_Config", hdr, [
    col_("A","kpi_id",              "PK","Auto-int"),
    col_("B","kpi_name",            "R", "Human-readable KPI name"),
    col_("C","kpi_code",            "R", "UPPERCASE_CODE — unique"),
    col_("D","module_id",           "R", "Module scope",      LIST.MODULE_IDS),
    col_("E","formula_description", "R", "Plain-English formula"),
    col_("F","target_value",        "O", "Numeric target"),
    col_("G","unit",                "O", "%, days, liters, count, etc."),
    col_("H","aggregation_period",  "O", "Calculation window", LIST.AGG_PERIOD),
    col_("I","is_active",           "R", "TRUE/FALSE",         LIST.BOOLEAN),
    col_("J","created_at",          "S", "ISO timestamp")
  ], [
    [1,"Oil Change Compliance Rate","OIL_CHANGE_COMPLIANCE","OIL_LUB",
     "Completed on-time / Total scheduled x 100",95,"%","MONTHLY","TRUE",ts_()],
    [2,"Overdue Actions Count","OVERDUE_COUNT","OIL_LUB",
     "Count of actions with status=OVERDUE",0,"count","DAILY","TRUE",ts_()],
    [3,"Sample Analysis TAT","SAMPLE_ANALYSIS_TAT","OIL_ANALYSIS",
     "Mean days: sample_date to analysis_complete",7,"days","MONTHLY","TRUE",ts_()]
  ]);

  /* W1-S14 Audit_Config (7 cols) */
  buildSheet_(ss, "Audit_Config", hdr, [
    col_("A","config_id",      "PK","Auto-int"),
    col_("B","module_id",      "R", "Module scope",      LIST.MODULE_IDS),
    col_("C","entity_type",    "R", "Entity to audit"),
    col_("D","events_to_audit","R", "Comma-separated events"),
    col_("E","retention_days", "R", "Audit rows archived after N days"),
    col_("F","is_active",      "R", "TRUE/FALSE",         LIST.BOOLEAN),
    col_("G","created_at",     "S", "ISO timestamp")
  ], [
    [1,"OIL_LUB","OIL_CHANGE_ACTIONS",    "CREATE,UPDATE,DELETE,APPROVE",365,"TRUE",ts_()],
    [2,"OIL_LUB","OIL_SAMPLING_ACTIONS",  "CREATE,UPDATE,APPROVE",       365,"TRUE",ts_()],
    [3,"OIL_LUB","OIL_INVENTORY",         "UPDATE",                       365,"TRUE",ts_()],
    [4,"OIL_ANALYSIS","OIL_SAMPLES",      "CREATE,UPDATE,DELETE",         730,"TRUE",ts_()],
    [5,"OIL_ANALYSIS","OCR_REVIEW",       "CREATE,UPDATE",                730,"TRUE",ts_()]
  ]);

  /* W1-S15 Language_Config (7 cols) */
  buildSheet_(ss, "Language_Config", hdr, [
    col_("A","lang_key",   "PK","Translation key (e.g. BTN_SAVE)"),
    col_("B","module_id",  "R", "Module scope",   LIST.MODULE_IDS),
    col_("C","lang_en",    "R", "English text"),
    col_("D","lang_ar",    "R", "Arabic text"),
    col_("E","context",    "O", "Where this string appears"),
    col_("F","is_active",  "R", "TRUE/FALSE",      LIST.BOOLEAN),
    col_("G","created_at", "S", "ISO timestamp")
  ], [
    ["BTN_SAVE",        "PLATFORM","Save",      "حفظ",      "Button label",     "TRUE",ts_()],
    ["BTN_CANCEL",      "PLATFORM","Cancel",    "إلغاء",    "Button label",     "TRUE",ts_()],
    ["BTN_APPROVE",     "PLATFORM","Approve",   "موافقة",   "Button label",     "TRUE",ts_()],
    ["BTN_REJECT",      "PLATFORM","Reject",    "رفض",      "Button label",     "TRUE",ts_()],
    ["STATUS_SCHEDULED","OIL_LUB", "Scheduled", "مجدول",    "Status badge",     "TRUE",ts_()],
    ["STATUS_COMPLETED","OIL_LUB", "Completed", "مكتمل",    "Status badge",     "TRUE",ts_()],
    ["STATUS_OVERDUE",  "OIL_LUB", "Overdue",   "متأخر",    "Status badge",     "TRUE",ts_()]
  ]);

  /* W1-S16 Theme_Config (8 cols) */
  buildSheet_(ss, "Theme_Config", hdr, [
    col_("A","config_id",    "PK","Auto-int"),
    col_("B","theme_name",   "R", "Theme identifier"),
    col_("C","is_default",   "R", "One row TRUE at a time", LIST.BOOLEAN),
    col_("D","primary_color","O", "Hex color (e.g. #1565C0)"),
    col_("E","accent_color", "O", "Hex color"),
    col_("F","font_family",  "O", "Google Font name"),
    col_("G","logo_url",     "O", "Google Drive file URL"),
    col_("H","created_at",   "S", "ISO timestamp")
  ], [
    [1,"ACC_DEFAULT","TRUE","#1565C0","#E65100","Inter","",ts_()]
  ]);

  removeDefaultSheet_(ss);
  log_("Settings: " + ss.getSheets().length + " sheets");
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKBOOK 2: ACC_PLATFORM_MASTER_DATA (13 sheets, 121 columns)
// ─────────────────────────────────────────────────────────────────────────────

function initMasterDataWorkbook() {
  var ss = openWorkbook_(WORKBOOK_IDS.MASTER_DATA);
  var hdr = COLOR.MASTER_DATA;

  /* W2-S01 Equipment_Master (15 cols) */
  buildSheet_(ss, "Equipment_Master", hdr, [
    col_("A","equipment_id",      "PK","EQP-XXXX — never change after creation"),
    col_("B","equipment_tag",     "R", "Plant asset tag (e.g. P-101) — unique"),
    col_("C","equipment_name",    "R", "Descriptive name"),
    col_("D","equipment_type_id", "FK","→ Equipment_Types.type_id"),
    col_("E","area_id",           "FK","→ Areas.area_id"),
    col_("F","criticality",       "R", "A=most critical, C=least",  LIST.CRITICALITY),
    col_("G","is_active",         "R", "FALSE = decommissioned",     LIST.BOOLEAN),
    col_("H","description",       "O", "Free-text notes"),
    col_("I","manufacturer",      "O", "OEM company name"),
    col_("J","model",             "O", "Model number"),
    col_("K","serial_number",     "O", "Manufacturer serial"),
    col_("L","install_date",      "O", "YYYY-MM-DD"),
    col_("M","created_at",        "S", "ISO timestamp"),
    col_("N","updated_at",        "S", "ISO timestamp"),
    col_("O","created_by",        "S", "Creator email")
  ], [
    ["EQP-0001","P-101","Feed Water Pump","ET-001","AREA-001","A","TRUE",
     "Primary feed water pump","Sulzer","CPE-100","SN-SAMPLE-001","2020-01-15",ts_(),ts_(),"admin@example.com"],
    ["EQP-0002","C-201","Air Compressor Unit 1","ET-002","AREA-002","A","TRUE",
     "Main process air compressor","Atlas Copco","GA75","SN-SAMPLE-002","2019-06-01",ts_(),ts_(),"admin@example.com"]
  ]);

  /* W2-S02 LP_Master (16 cols) */
  buildSheet_(ss, "LP_Master", hdr, [
    col_("A","lp_id",                 "PK","LP-XXXX — never change"),
    col_("B","lp_code",               "R", "Human code (e.g. LP-P101-GB) — unique"),
    col_("C","lp_name",               "R", "Descriptive name"),
    col_("D","equipment_id",          "FK","→ Equipment_Master"),
    col_("E","lube_point_type",       "R", "Type of lubrication point", LIST.LUBE_PT_TYPE),
    col_("F","oil_type_id",           "FK","→ Oil_Types"),
    col_("G","oil_brand_id",          "FK","→ Oil_Brands"),
    col_("H","oil_capacity_liters",   "R", "Total oil volume in system (L)"),
    col_("I","change_interval_days",  "R", "Days between oil changes"),
    col_("J","sampling_interval_days","R", "Days between oil samples"),
    col_("K","last_change_date",      "A", "App updates — do not edit manually"),
    col_("L","last_sample_date",      "A", "App updates — do not edit manually"),
    col_("M","is_active",             "R", "FALSE = decommissioned", LIST.BOOLEAN),
    col_("N","created_at",            "S", "ISO timestamp"),
    col_("O","updated_at",            "S", "ISO timestamp"),
    col_("P","created_by",            "S", "Creator email")
  ], [
    ["LP-0001","LP-P101-GB","P-101 Gearbox","EQP-0001","GEARBOX","OT-001","OB-001",
     5,90,45,"","","TRUE",ts_(),ts_(),"admin@example.com"],
    ["LP-0002","LP-C201-BEARING-DE","C-201 Drive End Bearing","EQP-0002","BEARING",
     "OT-002","OB-002",1.5,180,60,"","","TRUE",ts_(),ts_(),"admin@example.com"]
  ]);

  /* W2-S03 VB_Master (12 cols) */
  buildSheet_(ss, "VB_Master", hdr, [
    col_("A","vb_id",                     "PK","VB-XXXX"),
    col_("B","vb_code",                   "R", "Human code — unique"),
    col_("C","vb_name",                   "R", "Descriptive name"),
    col_("D","equipment_id",              "FK","→ Equipment_Master"),
    col_("E","vibration_sensor_type",     "O", "Accelerometer model/type"),
    col_("F","measurement_axis",          "O", "H=horizontal V=vertical A=axial", LIST.AXIS),
    col_("G","alarm_threshold",           "O", "mm/s — CAUTION level"),
    col_("H","danger_threshold",          "O", "mm/s — DANGER level"),
    col_("I","measurement_interval_days", "R", "Recurrence in days"),
    col_("J","is_active",                 "R", "TRUE/FALSE",              LIST.BOOLEAN),
    col_("K","created_at",                "S", "ISO timestamp"),
    col_("L","updated_at",                "S", "ISO timestamp")
  ], [
    ["VB-0001","VB-P101-DE","P-101 Drive End","EQP-0001","SKF CMSS 100","H",4.5,7.1,30,"TRUE",ts_(),ts_()]
  ]);

  /* W2-S04 Areas (7 cols) */
  buildSheet_(ss, "Areas", hdr, [
    col_("A","area_id",              "PK","AREA-XXX"),
    col_("B","area_code",            "R", "Short UPPERCASE code — unique"),
    col_("C","area_name",            "R", "Full area name"),
    col_("D","plant_section",        "O", "Plant section or unit"),
    col_("E","responsible_supervisor","O","Supervisor email"),
    col_("F","is_active",            "R", "TRUE/FALSE",                 LIST.BOOLEAN),
    col_("G","created_at",           "S", "ISO timestamp")
  ], [
    ["AREA-001","UTIL","Utilities Area",  "Utility Plant",    "supervisor@example.com","TRUE",ts_()],
    ["AREA-002","PROC","Process Area",    "Production Unit 1","supervisor@example.com","TRUE",ts_()],
    ["AREA-003","STOR","Storage Area",    "Tank Farm",        "supervisor@example.com","TRUE",ts_()]
  ]);

  /* W2-S05 Contractors (8 cols) */
  buildSheet_(ss, "Contractors", hdr, [
    col_("A","contractor_id",  "PK","CTR-XXX"),
    col_("B","contractor_name","R", "Company name"),
    col_("C","contact_person", "O", "Primary contact name"),
    col_("D","email",          "O", "Contact email"),
    col_("E","phone",          "O", "Contact phone"),
    col_("F","specialty",      "O", "Contractor type",   LIST.SPECIALTY),
    col_("G","is_active",      "R", "TRUE/FALSE",        LIST.BOOLEAN),
    col_("H","created_at",     "S", "ISO timestamp")
  ], [
    ["CTR-001","Sample Oil Analysis Lab","Lab Manager","lab@example.com","+966-11-555-0001","OIL_LAB","TRUE",ts_()]
  ]);

  /* W2-S06 Equipment_Types (7 cols) */
  buildSheet_(ss, "Equipment_Types", hdr, [
    col_("A","type_id",            "PK","ET-XXX"),
    col_("B","type_code",          "R", "UPPERCASE — unique (e.g. PUMP)"),
    col_("C","type_name",          "R", "Full name (e.g. Centrifugal Pump)"),
    col_("D","description",        "O", "Usage notes"),
    col_("E","default_criticality","O", "Default for new equipment",  LIST.CRITICALITY),
    col_("F","is_active",          "R", "TRUE/FALSE",                 LIST.BOOLEAN),
    col_("G","created_at",         "S", "ISO timestamp")
  ], [
    ["ET-001","PUMP",       "Centrifugal Pump",       "Rotary kinetic pump",           "A","TRUE",ts_()],
    ["ET-002","COMPRESSOR", "Reciprocating Compressor","Gas compression",               "A","TRUE",ts_()],
    ["ET-003","GEARBOX",    "Gearbox / Reducer",       "Mechanical power transmission", "B","TRUE",ts_()],
    ["ET-004","MOTOR",      "Electric Motor",          "Electric drive motor",          "B","TRUE",ts_()],
    ["ET-005","FAN",        "Industrial Fan",          "Forced or induced draft fan",   "B","TRUE",ts_()],
    ["ET-006","PUMP_SCREW", "Screw Pump",              "Positive displacement pump",    "B","TRUE",ts_()]
  ]);

  /* W2-S07 Oil_Types (8 cols) */
  buildSheet_(ss, "Oil_Types", hdr, [
    col_("A","oil_type_id",      "PK","OT-XXX"),
    col_("B","type_code",        "R", "Short code (e.g. VG46) — unique"),
    col_("C","type_name",        "R", "Full product name"),
    col_("D","viscosity_grade",  "R", "ISO grade (e.g. VG32, VG46, VG320)"),
    col_("E","base_type",        "O", "Base oil category",  LIST.BASE_TYPE),
    col_("F","application_notes","O", "Recommended applications"),
    col_("G","is_active",        "R", "TRUE/FALSE",          LIST.BOOLEAN),
    col_("H","created_at",       "S", "ISO timestamp")
  ], [
    ["OT-001","VG320","Industrial Gear Oil ISO VG 320","VG320","MINERAL",  "Gearboxes, enclosed drives",        "TRUE",ts_()],
    ["OT-002","VG46", "Hydraulic Oil ISO VG 46",       "VG46", "MINERAL",  "Hydraulic systems, bearings",       "TRUE",ts_()],
    ["OT-003","VG68", "Compressor Oil ISO VG 68",      "VG68", "SYNTHETIC","Rotary screw compressors",          "TRUE",ts_()],
    ["OT-004","VG100","Turbine Oil ISO VG 100",         "VG100","MINERAL",  "Steam and gas turbines",            "TRUE",ts_()],
    ["OT-005","VG150","Gear Oil ISO VG 150",            "VG150","MINERAL",  "Open gears, manual gearboxes",      "TRUE",ts_()]
  ]);

  /* W2-S08 Oil_Brands (6 cols) */
  buildSheet_(ss, "Oil_Brands", hdr, [
    col_("A","brand_id",    "PK","OB-XXX"),
    col_("B","brand_name",  "R", "Product brand name"),
    col_("C","manufacturer","R", "OEM company name"),
    col_("D","product_line","O", "Product family"),
    col_("E","is_active",   "R", "TRUE/FALSE",  LIST.BOOLEAN),
    col_("F","created_at",  "S", "ISO timestamp")
  ], [
    ["OB-001","Shell Omala S2 G 320", "Shell","Omala S2",    "TRUE",ts_()],
    ["OB-002","Shell Tellus S2 MX 46","Shell","Tellus S2",   "TRUE",ts_()],
    ["OB-003","Mobil SHC Gear 320",   "Mobil","SHC Gear",    "TRUE",ts_()],
    ["OB-004","Castrol Tribol 1100",  "Castrol","Tribol",    "TRUE",ts_()],
    ["OB-005","Total Nevastane SH 46","Total","Nevastane SH","TRUE",ts_()]
  ]);

  /* W2-S09 Route_Templates (9 cols) */
  buildSheet_(ss, "Route_Templates", hdr, [
    col_("A","template_id",            "PK","RT-XXX"),
    col_("B","template_name",          "R", "Descriptive name"),
    col_("C","module_id",              "R", "OIL_LUB, VIB, or INSP",  LIST.MODULE_IDS),
    col_("D","area_id",                "FK","→ Areas"),
    col_("E","frequency_days",         "R", "1=daily, 7=weekly, 30=monthly"),
    col_("F","estimated_duration_hours","O","Expected completion time (h)"),
    col_("G","is_active",              "R", "TRUE/FALSE",              LIST.BOOLEAN),
    col_("H","created_at",             "S", "ISO timestamp"),
    col_("I","created_by",             "S", "Creator email")
  ], [
    ["RT-001","Daily Utilities Lube Round",   "OIL_LUB","AREA-001",1, 2,"TRUE",ts_(),"admin@example.com"],
    ["RT-002","Weekly Process Sampling Round","OIL_LUB","AREA-002",7, 4,"TRUE",ts_(),"admin@example.com"],
    ["RT-003","Monthly Full-Plant Lube Round","OIL_LUB","AREA-001",30,8,"TRUE",ts_(),"admin@example.com"]
  ]);

  /* W2-S10 Action_Types (8 cols) */
  buildSheet_(ss, "Action_Types", hdr, [
    col_("A","action_type_id",  "PK","ACT-XXX"),
    col_("B","action_code",     "R", "Unique code (e.g. OIL_CHANGE)"),
    col_("C","action_name",     "R", "Full readable name"),
    col_("D","module_id",       "R", "Owning module",  LIST.MODULE_IDS),
    col_("E","requires_approval","R","TRUE = approval workflow triggered", LIST.BOOLEAN),
    col_("F","default_priority","O", "Default priority", LIST.PRIORITY),
    col_("G","is_active",       "R", "TRUE/FALSE",       LIST.BOOLEAN),
    col_("H","created_at",      "S", "ISO timestamp")
  ], [
    ["ACT-001","OIL_CHANGE", "Oil Change",           "OIL_LUB",    "TRUE", "HIGH",  "TRUE",ts_()],
    ["ACT-002","OIL_SAMPLE", "Oil Sampling",          "OIL_LUB",    "FALSE","MEDIUM","TRUE",ts_()],
    ["ACT-003","TOP_UP",     "Oil Top-Up",            "OIL_LUB",    "FALSE","LOW",   "TRUE",ts_()],
    ["ACT-004","INSPECTION", "Visual Inspection",     "OIL_LUB",    "FALSE","LOW",   "TRUE",ts_()],
    ["ACT-005","VIB_READING","Vibration Measurement", "VIB",        "FALSE","MEDIUM","TRUE",ts_()]
  ]);

  /* W2-S11 Status_Dictionary (10 cols) */
  buildSheet_(ss, "Status_Dictionary", hdr, [
    col_("A","status_id",      "PK","Auto-int"),
    col_("B","module_id",      "R", "Module scope",          LIST.MODULE_IDS),
    col_("C","entity_type",    "R", "Entity this applies to"),
    col_("D","status_code",    "R", "UPPERCASE — unique per entity"),
    col_("E","status_label_en","R", "English label"),
    col_("F","status_label_ar","R", "Arabic label"),
    col_("G","status_color",   "O", "Hex color for UI badge"),
    col_("H","is_terminal",    "R", "TRUE = no further transitions", LIST.BOOLEAN),
    col_("I","sort_order",     "O", "Display order (integer)"),
    col_("J","is_active",      "R", "TRUE/FALSE",             LIST.BOOLEAN)
  ], [
    [1,"OIL_LUB","OIL_CHANGE","SCHEDULED",       "Scheduled",        "مجدول",           "#1565C0","FALSE",1,"TRUE"],
    [2,"OIL_LUB","OIL_CHANGE","IN_PROGRESS",     "In Progress",      "قيد التنفيذ",     "#F9A825","FALSE",2,"TRUE"],
    [3,"OIL_LUB","OIL_CHANGE","PENDING_APPROVAL","Pending Approval",  "بانتظار الموافقة","#6A1B9A","FALSE",3,"TRUE"],
    [4,"OIL_LUB","OIL_CHANGE","APPROVED",        "Approved",         "معتمد",           "#2E7D32","FALSE",4,"TRUE"],
    [5,"OIL_LUB","OIL_CHANGE","COMPLETED",       "Completed",        "مكتمل",           "#1B5E20","TRUE", 5,"TRUE"],
    [6,"OIL_LUB","OIL_CHANGE","CANCELLED",       "Cancelled",        "ملغى",            "#757575","TRUE", 6,"TRUE"],
    [7,"OIL_LUB","OIL_CHANGE","OVERDUE",         "Overdue",          "متأخر",           "#B71C1C","FALSE",7,"TRUE"]
  ]);

  /* W2-S12 Priority_Dictionary (8 cols) */
  buildSheet_(ss, "Priority_Dictionary", hdr, [
    col_("A","priority_id",      "PK","Auto-int"),
    col_("B","module_id",        "R", "Module scope",       LIST.MODULE_IDS),
    col_("C","priority_code",    "R", "CRITICAL/HIGH/MEDIUM/LOW"),
    col_("D","priority_label_en","R", "English label"),
    col_("E","priority_label_ar","R", "Arabic label"),
    col_("F","priority_color",   "O", "Hex color"),
    col_("G","response_hours",   "O", "SLA response time (hours)"),
    col_("H","is_active",        "R", "TRUE/FALSE",         LIST.BOOLEAN)
  ], [
    [1,"OIL_LUB","CRITICAL","Critical","حرج",    "#B71C1C",4,  "TRUE"],
    [2,"OIL_LUB","HIGH",    "High",    "عالي",   "#E65100",24, "TRUE"],
    [3,"OIL_LUB","MEDIUM",  "Medium",  "متوسط",  "#F9A825",72, "TRUE"],
    [4,"OIL_LUB","LOW",     "Low",     "منخفض",  "#2E7D32",168,"TRUE"]
  ]);

  /* W2-S13 Criticality_Dictionary (7 cols) */
  buildSheet_(ss, "Criticality_Dictionary", hdr, [
    col_("A","criticality_id",       "PK","Auto-int"),
    col_("B","criticality_code",     "R", "A, B, or C"),
    col_("C","criticality_label_en", "R", "Critical / Important / Standard"),
    col_("D","criticality_label_ar", "R", "Arabic label"),
    col_("E","criticality_color",    "O", "Hex color"),
    col_("F","maintenance_priority", "O", "Linked priority code",  LIST.PRIORITY),
    col_("G","is_active",            "R", "TRUE/FALSE",            LIST.BOOLEAN)
  ], [
    [1,"A","Critical", "حرج", "#B71C1C","CRITICAL","TRUE"],
    [2,"B","Important","مهم",  "#E65100","HIGH",    "TRUE"],
    [3,"C","Standard", "عادي","#2E7D32","MEDIUM",  "TRUE"]
  ]);

  removeDefaultSheet_(ss);
  log_("Master Data: " + ss.getSheets().length + " sheets");
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKBOOK 3: ACC_OIL_LUBRICATION_DATA (12 sheets, 139 columns)
// ─────────────────────────────────────────────────────────────────────────────

function initOilLubWorkbook() {
  var ss = openWorkbook_(WORKBOOK_IDS.OIL_LUB);
  var hdr = COLOR.OIL_LUB;

  /* W3-S01 Oil_Change_Actions (19 cols) */
  buildSheet_(ss, "Oil_Change_Actions", hdr, [
    col_("A","action_id",              "PK","ACT-OC-XXXX — never change"),
    col_("B","lp_id",                  "FK","→ LP_Master"),
    col_("C","equipment_id",           "FK","→ Equipment_Master"),
    col_("D","scheduled_date",         "R", "Planned execution date (YYYY-MM-DD)"),
    col_("E","assigned_technician_id", "FK","→ Users.user_id"),
    col_("F","status",                 "R", "Current workflow state", LIST.ACTION_STATUS),
    col_("G","priority",               "R", "Urgency level",          LIST.PRIORITY),
    col_("H","oil_type_id",            "FK","→ Oil_Types"),
    col_("I","oil_brand_id",           "FK","→ Oil_Brands"),
    col_("J","quantity_required_liters","R","Expected oil volume (L)"),
    col_("K","notes",                  "O", "Technician field notes"),
    col_("L","created_at",             "S", "ISO timestamp"),
    col_("M","updated_at",             "S", "ISO timestamp"),
    col_("N","created_by",             "S", "Creator email"),
    col_("O","approved_by",            "A", "Set by app on approval"),
    col_("P","approved_at",            "A", "ISO timestamp — set by app"),
    col_("Q","completed_by",           "A", "Completing technician — set by app"),
    col_("R","completed_at",           "A", "ISO timestamp — set by app"),
    col_("S","route_action_id",        "A", "→ Route_Actions — set by app if part of route")
  ], [
    ["ACT-OC-0001","LP-0001","EQP-0001","2025-08-01","USR-0004","SCHEDULED","HIGH",
     "OT-001","OB-001",5,"Scheduled quarterly change",ts_(),ts_(),"admin@example.com",
     "","","","",""]
  ]);

  /* W3-S02 Oil_Change_History (14 cols) */
  buildSheet_(ss, "Oil_Change_History", hdr, [
    col_("A","history_id",        "PK","HIST-OC-XXXX — append-only"),
    col_("B","action_id",         "FK","→ Oil_Change_Actions"),
    col_("C","lp_id",             "FK","→ LP_Master"),
    col_("D","equipment_id",      "FK","→ Equipment_Master"),
    col_("E","change_date",       "R", "Actual date performed (YYYY-MM-DD)"),
    col_("F","technician_id",     "FK","→ Users.user_id"),
    col_("G","oil_type_id",       "FK","→ Oil_Types — actually used"),
    col_("H","oil_brand_id",      "FK","→ Oil_Brands — actually used"),
    col_("I","quantity_used_liters","R","Actual quantity consumed (L)"),
    col_("J","condition_before",  "O", "Oil condition before draining", LIST.OIL_COND),
    col_("K","condition_after",   "O", "Condition after refill",       LIST.COND_AFTER),
    col_("L","notes",             "O", "Technician observations"),
    col_("M","created_at",        "S", "ISO timestamp"),
    col_("N","created_by",        "S", "Creator email")
  ], []);

  /* W3-S03 Oil_Sampling_Actions (15 cols) */
  buildSheet_(ss, "Oil_Sampling_Actions", hdr, [
    col_("A","action_id",              "PK","ACT-OS-XXXX"),
    col_("B","lp_id",                  "FK","→ LP_Master"),
    col_("C","equipment_id",           "FK","→ Equipment_Master"),
    col_("D","scheduled_date",         "R", "Planned date (YYYY-MM-DD)"),
    col_("E","assigned_technician_id", "FK","→ Users"),
    col_("F","status",                 "R", "Workflow state",       LIST.ACTION_STATUS),
    col_("G","priority",               "R", "Urgency level",        LIST.PRIORITY),
    col_("H","sampling_method",        "O", "How sample is drawn",  LIST.SAMPLING_METHOD),
    col_("I","sample_bottle_id",       "O", "Physical bottle barcode or label"),
    col_("J","notes",                  "O", "Field notes"),
    col_("K","created_at",             "S", "ISO timestamp"),
    col_("L","updated_at",             "S", "ISO timestamp"),
    col_("M","created_by",             "S", "Creator email"),
    col_("N","approved_by",            "A", "Set by app on approval"),
    col_("O","approved_at",            "A", "ISO timestamp — set by app")
  ], [
    ["ACT-OS-0001","LP-0001","EQP-0001","2025-07-20","USR-0004",
     "SCHEDULED","MEDIUM","VACUUM","BTL-001","Routine sampling",
     ts_(),ts_(),"admin@example.com","",""]
  ]);

  /* W3-S04 Oil_Sampling_History (11 cols) */
  buildSheet_(ss, "Oil_Sampling_History", hdr, [
    col_("A","history_id",      "PK","HIST-OS-XXXX — append-only"),
    col_("B","action_id",       "FK","→ Oil_Sampling_Actions"),
    col_("C","lp_id",           "FK","→ LP_Master"),
    col_("D","equipment_id",    "FK","→ Equipment_Master"),
    col_("E","sample_date",     "R", "Date sample was taken (YYYY-MM-DD)"),
    col_("F","technician_id",   "FK","→ Users"),
    col_("G","sample_bottle_id","O", "Physical bottle label"),
    col_("H","lab_reference",   "O", "Lab-assigned reference — fill manually if needed"),
    col_("I","sent_to_lab_date","O", "Date dispatched (YYYY-MM-DD)"),
    col_("J","notes",           "O", "Notes"),
    col_("K","created_at",      "S", "ISO timestamp")
  ], []);

  /* W3-S05 Oil_Routes (13 cols) */
  buildSheet_(ss, "Oil_Routes", hdr, [
    col_("A","route_id",              "PK","RTE-XXXX"),
    col_("B","template_id",           "FK","→ Route_Templates"),
    col_("C","route_date",            "R", "Date of this route (YYYY-MM-DD)"),
    col_("D","area_id",               "FK","→ Areas"),
    col_("E","assigned_technician_id","FK","→ Users"),
    col_("F","status",                "R", "Route status",      LIST.ROUTE_STATUS),
    col_("G","start_time",            "A", "Set by app when technician starts"),
    col_("H","end_time",              "A", "Set by app when completed"),
    col_("I","total_actions",         "A", "Count of Route_Actions rows"),
    col_("J","completed_actions",     "A", "Count with status=COMPLETED"),
    col_("K","notes",                 "O", "Supervisor notes"),
    col_("L","created_at",            "S", "ISO timestamp"),
    col_("M","created_by",            "S", "Creator email")
  ], [
    ["RTE-0001","RT-001",today_(),"AREA-001","USR-0004","PLANNED","","",0,0,"Regular daily round",ts_(),"admin@example.com"]
  ]);

  /* W3-S06 Route_Actions (10 cols) */
  buildSheet_(ss, "Route_Actions", hdr, [
    col_("A","route_action_id","PK","RA-XXXX"),
    col_("B","route_id",       "FK","→ Oil_Routes"),
    col_("C","action_type",    "R", "Activity type",       LIST.ROUTE_ACT_TYPE),
    col_("D","lp_id",          "FK","→ LP_Master"),
    col_("E","equipment_id",   "FK","→ Equipment_Master"),
    col_("F","sequence_number","R", "Visit order (integer)"),
    col_("G","status",         "R", "Action status",       LIST.ROUTE_ACT_STAT),
    col_("H","completed_at",   "A", "ISO timestamp — set by app"),
    col_("I","technician_notes","O","Field notes from technician"),
    col_("J","created_at",     "S", "ISO timestamp")
  ], [
    ["RA-0001","RTE-0001","OIL_CHANGE","LP-0001","EQP-0001",1,"PENDING","","",ts_()],
    ["RA-0002","RTE-0001","OIL_SAMPLE","LP-0002","EQP-0002",2,"PENDING","","",ts_()]
  ]);

  /* W3-S07 Oil_Inventory (9 cols) */
  buildSheet_(ss, "Oil_Inventory", hdr, [
    col_("A","inventory_id",      "PK","INV-XXX"),
    col_("B","oil_type_id",       "FK","→ Oil_Types"),
    col_("C","oil_brand_id",      "FK","→ Oil_Brands"),
    col_("D","warehouse_location","O", "Physical storage location"),
    col_("E","quantity_liters",   "R", "Current on-hand stock (L)"),
    col_("F","min_stock_liters",  "R", "Safety stock level — alert when reached"),
    col_("G","reorder_point_liters","R","Reorder trigger level"),
    col_("H","last_updated",      "S", "ISO timestamp of last change"),
    col_("I","last_updated_by",   "S", "Email of last updater")
  ], [
    ["INV-001","OT-001","OB-001","Warehouse A / Rack 3",200,50, 80, ts_(),"admin@example.com"],
    ["INV-002","OT-002","OB-002","Warehouse A / Rack 4",150,30, 60, ts_(),"admin@example.com"],
    ["INV-003","OT-003","OB-003","Warehouse B / Rack 1",80, 20, 40, ts_(),"admin@example.com"]
  ]);

  /* W3-S08 Oil_Stock_Transactions (9 cols) */
  buildSheet_(ss, "Oil_Stock_Transactions", hdr, [
    col_("A","transaction_id",     "PK","TXN-XXXX"),
    col_("B","inventory_id",       "FK","→ Oil_Inventory"),
    col_("C","transaction_type",   "R", "Movement type",              LIST.TXN_TYPE),
    col_("D","quantity_liters",    "R", "Positive=stock in, negative=stock out"),
    col_("E","reference_action_id","O", "→ Oil_Change_Actions if CONSUMPTION"),
    col_("F","transaction_date",   "R", "Date of movement (YYYY-MM-DD)"),
    col_("G","notes",              "O", "Reason for movement"),
    col_("H","created_by",         "S", "Creator email"),
    col_("I","created_at",         "S", "ISO timestamp")
  ], [
    ["TXN-0001","INV-001","RECEIPT",    200,"",today_(),"Opening balance — initial stock load","admin@example.com",ts_()],
    ["TXN-0002","INV-002","RECEIPT",    150,"",today_(),"Opening balance — initial stock load","admin@example.com",ts_()],
    ["TXN-0003","INV-003","RECEIPT",     80,"",today_(),"Opening balance — initial stock load","admin@example.com",ts_()]
  ]);

  /* W3-S09 Oil_Forecast (7 cols) */
  buildSheet_(ss, "Oil_Forecast", hdr, [
    col_("A","forecast_id",              "PK","Auto-int"),
    col_("B","lp_id",                    "FK","→ LP_Master"),
    col_("C","oil_type_id",              "FK","→ Oil_Types"),
    col_("D","forecast_month",           "R", "YYYY-MM (e.g. 2025-08)"),
    col_("E","predicted_quantity_liters","R", "Forecasted volume (L)"),
    col_("F","based_on_actions",         "A", "Scheduled action count — set by app"),
    col_("G","created_at",               "S", "ISO timestamp")
  ], []);

  /* W3-S10 Lubrication_Notifications (12 cols) */
  buildSheet_(ss, "Lubrication_Notifications", hdr, [
    col_("A","notification_id","PK","UUID"),
    col_("B","rule_id",        "FK","→ Notification_Rules"),
    col_("C","entity_type",    "R", "OIL_CHANGE | OIL_SAMPLE | ROUTE | INVENTORY"),
    col_("D","entity_id",      "R", "ID of triggering entity"),
    col_("E","recipient_email","R", "Target email address"),
    col_("F","channel",        "R", "Delivery method",       LIST.CHANNEL),
    col_("G","subject",        "O", "Email subject"),
    col_("H","body_preview",   "O", "First 200 chars of message"),
    col_("I","status",         "R", "Delivery state",         LIST.NOTIF_STATUS),
    col_("J","sent_at",        "A", "Set by app on delivery"),
    col_("K","error_message",  "A", "Failure reason if FAILED"),
    col_("L","created_at",     "S", "ISO timestamp")
  ], []);

  /* W3-S11 Lubrication_Approvals (10 cols) */
  buildSheet_(ss, "Lubrication_Approvals", hdr, [
    col_("A","approval_id",     "PK","UUID"),
    col_("B","entity_type",     "R", "OIL_CHANGE | OIL_SAMPLE"),
    col_("C","entity_id",       "R", "action_id being approved"),
    col_("D","approval_level",  "R", "Integer ≥ 1"),
    col_("E","approver_user_id","FK","→ Users"),
    col_("F","status",          "R", "Approval state — approver edits this", LIST.APPROVAL_STATUS),
    col_("G","decision_notes",  "O", "Approver comments — required for REJECTED"),
    col_("H","requested_at",    "S", "When approval was requested"),
    col_("I","decided_at",      "A", "ISO timestamp — set by app on decision"),
    col_("J","escalated_at",    "A", "ISO timestamp — set by app if escalated")
  ], []);

  /* W3-S12 Lubrication_Audit_Log (10 cols) */
  buildSheet_(ss, "Lubrication_Audit_Log", hdr, [
    col_("A","log_id",         "PK","UUID — APPEND-ONLY, never edit"),
    col_("B","entity_type",    "R", "Sheet that was changed"),
    col_("C","entity_id",      "R", "Row ID that was changed"),
    col_("D","action",         "R", "Type of change",        LIST.AUDIT_ACTION),
    col_("E","old_value_json", "A", "Previous field values as JSON"),
    col_("F","new_value_json", "A", "New field values as JSON"),
    col_("G","performed_by",   "R", "User email or SYSTEM"),
    col_("H","performed_at",   "R", "ISO timestamp"),
    col_("I","ip_address",     "A", "Client IP — set by app"),
    col_("J","session_id",     "A", "Session token — set by app")
  ], []);

  removeDefaultSheet_(ss);
  log_("Oil Lubrication: " + ss.getSheets().length + " sheets");
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKBOOK 4: ACC_OIL_ANALYSIS_DATA (10 sheets, 111 columns)
// ─────────────────────────────────────────────────────────────────────────────

function initOilAnalysisWorkbook() {
  var ss = openWorkbook_(WORKBOOK_IDS.OIL_ANALYSIS);
  var hdr = COLOR.OIL_ANALYSIS;

  /* W4-S01 Oil_Samples (14 cols) */
  buildSheet_(ss, "Oil_Samples", hdr, [
    col_("A","sample_id",           "PK","SMP-YYYY-XXXX (e.g. SMP-2025-0001)"),
    col_("B","lp_id",               "FK","→ LP_Master"),
    col_("C","equipment_id",        "FK","→ Equipment_Master"),
    col_("D","sample_date",         "R", "Date collected (YYYY-MM-DD)"),
    col_("E","technician_id",       "FK","→ Users"),
    col_("F","sample_bottle_id",    "O", "Physical bottle barcode or label"),
    col_("G","sample_source",       "O", "Where oil was drawn from", LIST.SAMPLE_SOURCE),
    col_("H","status",              "R", "Workflow state",            LIST.SAMPLE_STATUS),
    col_("I","lab_id",              "FK","→ Contractors (lab)"),
    col_("J","sent_to_lab_date",    "O", "Dispatch date (YYYY-MM-DD)"),
    col_("K","received_by_lab_date","O", "Lab acknowledgment date"),
    col_("L","notes",               "O", "Free text"),
    col_("M","created_at",          "S", "ISO timestamp"),
    col_("N","created_by",          "S", "Creator email")
  ], [
    ["SMP-2025-0001","LP-0001","EQP-0001",today_(),"USR-0004","BTL-001",
     "IN_SERVICE","COLLECTED","CTR-001","","","Routine quarterly sample",ts_(),"admin@example.com"]
  ]);

  /* W4-S02 Oil_Analysis_Results (11 cols) */
  buildSheet_(ss, "Oil_Analysis_Results", hdr, [
    col_("A","result_id",            "PK","UUID — one row per parameter per sample"),
    col_("B","sample_id",            "FK","→ Oil_Samples"),
    col_("C","parameter_name",       "R", "e.g. Viscosity_40C, Iron_ppm, Water_%"),
    col_("D","measured_value",       "R", "Numeric measurement"),
    col_("E","unit",                 "R", "cSt | ppm | % | mg/g | NTU | ISO_CODE"),
    col_("F","alarm_limit",          "O", "CAUTION threshold"),
    col_("G","danger_limit",         "O", "CRITICAL threshold"),
    col_("H","result_interpretation","O", "Assessment",         LIST.RESULT_INTERP),
    col_("I","analyzed_at",          "O", "Analysis date (YYYY-MM-DD)"),
    col_("J","analyzed_by",          "O", "Lab analyst name or ID"),
    col_("K","created_at",           "S", "ISO timestamp")
  ], [
    ["RES-0001","SMP-2025-0001","Viscosity_40C",318,"cSt",280,260,"NORMAL",today_(),"Sample Analyst",ts_()],
    ["RES-0002","SMP-2025-0001","Iron_ppm",     12, "ppm",50, 100,"NORMAL",today_(),"Sample Analyst",ts_()],
    ["RES-0003","SMP-2025-0001","Water_pct",    0.05,"%",0.1,0.2, "NORMAL",today_(),"Sample Analyst",ts_()],
    ["RES-0004","SMP-2025-0001","TAN",          1.2,"mg KOH/g",2.0,3.0,"NORMAL",today_(),"Sample Analyst",ts_()]
  ]);

  /* W4-S03 PDF_Imports (11 cols) */
  buildSheet_(ss, "PDF_Imports", hdr, [
    col_("A","import_id",        "PK","UUID"),
    col_("B","sample_id",        "FK","→ Oil_Samples"),
    col_("C","file_name",        "R", "PDF filename"),
    col_("D","google_drive_url", "R", "Full Drive share URL"),
    col_("E","upload_date",      "R", "Upload date (YYYY-MM-DD)"),
    col_("F","uploaded_by",      "R", "Uploader email"),
    col_("G","ocr_status",       "A", "OCR processing state — set by app", LIST.OCR_STATUS),
    col_("H","extraction_status","R", "Manual review state",  LIST.EXTRACT_STATUS),
    col_("I","pages_count",      "O", "Number of PDF pages"),
    col_("J","notes",            "O", "Notes"),
    col_("K","created_at",       "S", "ISO timestamp")
  ], [
    ["IMP-0001","SMP-2025-0001","lab_report_SMP-2025-0001.pdf",
     "https://drive.google.com/file/d/SAMPLE_FILE_ID/view",
     today_(),"lab@example.com","COMPLETE","ACCEPTED",2,"",ts_()]
  ]);

  /* W4-S04 OCR_Review (10 cols) */
  buildSheet_(ss, "OCR_Review", hdr, [
    col_("A","review_id",       "PK","UUID"),
    col_("B","import_id",       "FK","→ PDF_Imports"),
    col_("C","field_name",      "R", "Parameter name (e.g. Viscosity_40C)"),
    col_("D","extracted_value", "R", "Raw OCR output — do not edit this column"),
    col_("E","corrected_value", "O", "Engineer correction — fill here if OCR wrong"),
    col_("F","confidence_score","A", "OCR confidence 0.0–1.0 — set by app"),
    col_("G","reviewed_by",     "O", "Reviewer email"),
    col_("H","reviewed_at",     "O", "Review date (YYYY-MM-DD)"),
    col_("I","review_status",   "R", "Set this after review",   LIST.REVIEW_STATUS),
    col_("J","created_at",      "S", "ISO timestamp")
  ], [
    ["REV-0001","IMP-0001","Viscosity_40C","318","",   0.97,"","","ACCEPTED",ts_()],
    ["REV-0002","IMP-0001","Iron_ppm",     "l2", "12",0.61,"","","CORRECTED",ts_()],
    ["REV-0003","IMP-0001","Water_pct",    "0.05","",  0.95,"","","ACCEPTED",ts_()],
    ["REV-0004","IMP-0001","TAN",          "1.2","",   0.88,"","","ACCEPTED",ts_()]
  ]);

  /* W4-S05 Oil_Analysis_Actions (14 cols) */
  buildSheet_(ss, "Oil_Analysis_Actions", hdr, [
    col_("A","action_id",          "PK","AAC-XXXX"),
    col_("B","sample_id",          "FK","→ Oil_Samples"),
    col_("C","result_id",          "FK","→ Oil_Analysis_Results — triggering result"),
    col_("D","action_type",        "R", "Response type",   LIST.ANAL_ACTION),
    col_("E","description",        "R", "What action to take"),
    col_("F","assigned_to_user_id","FK","→ Users"),
    col_("G","priority",           "R", "Urgency",         LIST.PRIORITY),
    col_("H","due_date",           "R", "Completion deadline (YYYY-MM-DD)"),
    col_("I","status",             "R", "Current state",   LIST.ANAL_STATUS),
    col_("J","completed_at",       "A", "ISO timestamp — set by app"),
    col_("K","completed_by",       "A", "Email — set by app"),
    col_("L","notes",              "O", "Progress notes"),
    col_("M","created_at",         "S", "ISO timestamp"),
    col_("N","created_by",         "S", "Creator email")
  ], [
    ["AAC-0001","SMP-2025-0001","RES-0002","INVESTIGATE",
     "Iron concentration elevated — check for gear wear",
     "USR-0006","MEDIUM",today_(),"OPEN","","","","",ts_(),"admin@example.com"]
  ]);

  /* W4-S06 Oil_Analysis_Trends (10 cols) */
  buildSheet_(ss, "Oil_Analysis_Trends", hdr, [
    col_("A","trend_id",           "PK","UUID"),
    col_("B","lp_id",              "FK","→ LP_Master"),
    col_("C","parameter_name",     "R", "Parameter being trended"),
    col_("D","trend_period_months","R", "Analysis window in months"),
    col_("E","trend_direction",    "R", "Trend direction",  LIST.TREND_DIR),
    col_("F","trend_slope",        "O", "Rate of change per month"),
    col_("G","first_value",        "O", "Oldest reading in period"),
    col_("H","last_value",         "O", "Latest reading"),
    col_("I","anomaly_detected",   "R", "TRUE if statistically anomalous", LIST.BOOLEAN),
    col_("J","created_at",         "S", "ISO timestamp")
  ], []);

  /* W4-S07 Oil_Analysis_Reports (12 cols) */
  buildSheet_(ss, "Oil_Analysis_Reports", hdr, [
    col_("A","report_id",       "PK","UUID"),
    col_("B","lp_id",           "FK","→ LP_Master"),
    col_("C","equipment_id",    "FK","→ Equipment_Master"),
    col_("D","report_type",     "R", "Report kind",       LIST.REPORT_TYPE),
    col_("E","period_start",    "R", "Analysis period start (YYYY-MM-DD)"),
    col_("F","period_end",      "R", "Analysis period end"),
    col_("G","summary",         "O", "Executive summary text"),
    col_("H","recommendation",  "O", "Action recommendation"),
    col_("I","generated_at",    "S", "ISO timestamp"),
    col_("J","generated_by",    "S", "Author email or SYSTEM"),
    col_("K","google_drive_url","O", "Drive URL of full report PDF"),
    col_("L","created_at",      "S", "ISO timestamp")
  ], []);

  /* W4-S08 Oil_Analysis_Notifications (12 cols) */
  buildSheet_(ss, "Oil_Analysis_Notifications", hdr, [
    col_("A","notification_id","PK","UUID"),
    col_("B","rule_id",        "FK","→ Notification_Rules"),
    col_("C","entity_type",    "R", "OIL_SAMPLE | ANALYSIS_RESULT | OCR_REVIEW | TREND"),
    col_("D","entity_id",      "R", "ID of triggering entity"),
    col_("E","recipient_email","R", "Target email"),
    col_("F","channel",        "R", "Delivery method",     LIST.CHANNEL),
    col_("G","subject",        "O", "Email subject"),
    col_("H","body_preview",   "O", "First 200 chars of body"),
    col_("I","status",         "R", "Delivery state",      LIST.NOTIF_STATUS),
    col_("J","sent_at",        "A", "ISO timestamp — set by app"),
    col_("K","error_message",  "A", "Failure detail if FAILED"),
    col_("L","created_at",     "S", "ISO timestamp")
  ], []);

  /* W4-S09 Oil_Analysis_Approvals (9 cols) */
  buildSheet_(ss, "Oil_Analysis_Approvals", hdr, [
    col_("A","approval_id",     "PK","UUID"),
    col_("B","entity_type",     "R", "OIL_ANALYSIS_ACTION | OIL_ANALYSIS_REPORT"),
    col_("C","entity_id",       "R", "ID being approved"),
    col_("D","approval_level",  "R", "Integer ≥ 1"),
    col_("E","approver_user_id","FK","→ Users"),
    col_("F","status",          "R", "Approval state — approver edits this", LIST.APPROVAL_STATUS),
    col_("G","decision_notes",  "O", "Approver comments"),
    col_("H","requested_at",    "S", "ISO timestamp"),
    col_("I","decided_at",      "A", "ISO timestamp — set by app")
  ], []);

  /* W4-S10 Oil_Analysis_Audit_Log (8 cols) */
  buildSheet_(ss, "Oil_Analysis_Audit_Log", hdr, [
    col_("A","log_id",         "PK","UUID — APPEND-ONLY, never edit"),
    col_("B","entity_type",    "R", "Sheet that was changed"),
    col_("C","entity_id",      "R", "Row ID changed"),
    col_("D","action",         "R", "Type of change",    LIST.AUDIT_ACTION),
    col_("E","old_value_json", "A", "Previous values as JSON"),
    col_("F","new_value_json", "A", "New values as JSON"),
    col_("G","performed_by",   "R", "User email or SYSTEM"),
    col_("H","performed_at",   "R", "ISO timestamp")
  ], []);

  removeDefaultSheet_(ss);
  log_("Oil Analysis: " + ss.getSheets().length + " sheets");
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens a spreadsheet by ID. Throws a descriptive error if the ID is
 * still a placeholder or the file cannot be accessed.
 */
function openWorkbook_(fileId) {
  if (!fileId || fileId.indexOf("REPLACE_") === 0) {
    throw new Error("Workbook ID not configured: " + fileId);
  }
  try {
    return SpreadsheetApp.openById(fileId);
  } catch (e) {
    throw new Error("Cannot open workbook [" + fileId + "]: " + e.message);
  }
}

/**
 * Returns a column definition object used by buildSheet_().
 * @param {string} letter  - Column letter (A, B, ... Z, AA, ...)
 * @param {string} name    - Column name (used as header)
 * @param {string} type    - PK | FK | R | O | S | A
 * @param {string} tooltip - Note added to the header cell
 * @param {string[]} [list]- Optional validation drop-down list
 */
function col_(letter, name, type, tooltip, list) {
  return { letter: letter, name: name, type: type, tooltip: tooltip, list: list || null };
}

/**
 * Creates or reuses a sheet, writes headers and sample rows, applies
 * formatting, freezes header row, adds auto-filter, and sets drop-down
 * validation for columns that have a list.
 *
 * Existing sheets are NOT overwritten — if the sheet already exists,
 * the function returns immediately. This makes the initializer safe
 * to re-run after partial failures.
 *
 * @param {Spreadsheet} ss      - Target spreadsheet
 * @param {string}      name    - Sheet tab name
 * @param {string}      hdrColor- Header background hex color
 * @param {Object[]}    colDefs - Column definitions from col_()
 * @param {Array[]}     samples - Sample data rows (can be empty)
 */
function buildSheet_(ss, name, hdrColor, colDefs, samples) {
  // Skip if sheet already exists
  if (ss.getSheetByName(name)) {
    log_("  Skip (exists): " + name);
    return;
  }

  var sheet = ss.insertSheet(name);
  var n = colDefs.length;

  // --- Write header row ---
  var headers = colDefs.map(function(c) { return c.name; });
  var headerRange = sheet.getRange(1, 1, 1, n);
  headerRange.setValues([headers]);
  headerRange
    .setBackground(hdrColor)
    .setFontColor(COLOR.HEADER_TEXT)
    .setFontWeight("bold")
    .setFontSize(10)
    .setWrap(false)
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);

  // --- Column widths and background colors ---
  for (var i = 0; i < n; i++) {
    var cd = colDefs[i];
    var colIdx = i + 1;

    // Set column width
    var w = 140;
    var nm = cd.name.toLowerCase();
    if (nm.endsWith("_json") || nm === "description" || nm.endsWith("_notes")
        || nm === "formula_description" || nm === "application_notes"
        || nm === "events_to_audit" || nm === "body_preview") { w = 220; }
    else if (nm.endsWith("_id") || nm === "status" || nm === "priority"
             || nm === "module_id" || nm === "entity_type") { w = 160; }
    else if (nm === "setting_key" || nm === "permission_code"
             || nm === "action_code" || nm === "lang_key") { w = 200; }
    sheet.setColumnWidth(colIdx, w);

    // Apply background to data rows (rows 2-1001) based on column type
    var dataRange = sheet.getRange(2, colIdx, 1000, 1);
    if (cd.type === "R")       { dataRange.setBackground(COLOR.REQUIRED); }
    else if (cd.type === "A")  { dataRange.setBackground(COLOR.APP_ONLY); }
    else if (cd.type === "S")  { dataRange.setBackground(COLOR.SYSTEM); }
    else                       { dataRange.setBackground(COLOR.OPTIONAL); }

    // Add tooltip to header cell
    if (cd.tooltip) {
      sheet.getRange(1, colIdx).setNote(
        "[" + cd.type + "] " + cd.name + "\n" + cd.tooltip
      );
    }

    // Apply drop-down validation
    if (cd.list && cd.list.length > 0) {
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(cd.list, true)
        .setAllowInvalid(false)
        .setHelpText("Allowed values: " + cd.list.join(", "))
        .build();
      dataRange.setDataValidation(rule);
    }
  }

  // --- Write sample rows ---
  if (samples && samples.length > 0) {
    var dataStart = sheet.getRange(2, 1, samples.length, n);
    dataStart.setValues(samples);
    dataStart.setFontSize(10);
  }

  // --- Apply auto-filter ---
  sheet.getRange(1, 1, 1, n).createFilter();

  // --- Alternating row shading (rows 3,5,7,...) ---
  for (var r = 3; r <= Math.min(samples.length + 2, 52); r += 2) {
    sheet.getRange(r, 1, 1, n).setBackground(COLOR.ALT_ROW);
  }

  // --- Sheet-level note explaining the color coding ---
  sheet.getRange("A1").setNote(
    "ACC Reliability Platform\nSheet: " + name + "\n" +
    "Initialized: " + ts_() + "\n\n" +
    "COLUMN COLORS:\n" +
    "  Yellow  = [R] Required — must fill\n" +
    "  Red     = [A] App-Only — do not edit manually\n" +
    "  Purple  = [S] System — auto-filled by app\n" +
    "  White   = [O] Optional\n\n" +
    "Hover over header cells for column descriptions."
  );

  log_("  Created: " + name + " (" + n + " cols)");
}

/** Deletes the default 'Sheet1' tab if present and other sheets exist. */
function removeDefaultSheet_(ss) {
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

/** Returns current date-time as ISO 8601 string. */
function ts_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ss"
  );
}

/** Returns today as YYYY-MM-DD. */
function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/** Logs a message to the Apps Script execution log. */
function log_(msg) {
  Logger.log(msg);
}
