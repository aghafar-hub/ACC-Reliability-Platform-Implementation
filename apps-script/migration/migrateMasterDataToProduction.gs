/**
 * ACC Reliability Platform — Master Data Production Migration
 * File: apps-script/migration/migrateMasterDataToProduction.gs
 *
 * Copies validated *_PREVIEW sheets into production master sheets.
 * Does NOT read legacy source workbooks or recalculate migration.
 *
 * Prerequisites:
 *   - dryRunMasterDataMigration() completed successfully
 *   - Migration_Dry_Run_Summary shows Errors=0, Blockers=0, Needs mapping=0
 *   - All six *_PREVIEW sheets present on MASTER_DATA_SPREADSHEET_ID
 *
 * Run: migrateMasterDataToProduction()
 */

var MIGRATION_PRODUCTION = {
  SPRINT: '08',
  DRY_RUN_SUMMARY_SHEET: 'Migration_Dry_Run_Summary',
  REPORT_SHEET: 'Migration_Production_Report',
  SHEET_PAIRS: [
    { preview: 'Equipment_Master_PREVIEW', production: 'Equipment_Master' },
    { preview: 'LP_Master_PREVIEW', production: 'LP_Master' },
    { preview: 'Oil_Types_PREVIEW', production: 'Oil_Types' },
    { preview: 'Oil_Brands_PREVIEW', production: 'Oil_Brands' },
    { preview: 'Oil_Products_PREVIEW', production: 'Oil_Products' },
    { preview: 'Equipment_Line_Assignments_PREVIEW', production: 'Equipment_Line_Assignments' },
  ],
  UNTOUCHED_SHEETS: [
    'Areas',
    'Contractors',
    'Equipment_Types',
    'Status_Dictionary',
    'Legacy_Area_Mapping',
    'Legacy_Oil_Type_Mapping',
    'Legacy_Oil_Brand_Mapping',
    'Legacy_Equipment_Type_Mapping',
    'Legacy_Contractor_Mapping',
    'Legacy_Status_Mapping',
    'Legacy_Line_Mapping',
  ],
  REQUIRED_METRICS: {
    ERRORS: 'Errors (incl. blockers)',
    BLOCKERS: 'Blockers',
    NEEDS_MAPPING: 'Needs mapping',
  },
};

/**
 * Main entry — validates dry-run summary, backs up production sheets, copies preview → production.
 * @returns {Object} production migration report payload
 */
function migrateMasterDataToProduction() {
  var started = new Date();
  var ts = mmtpFormatTimestamp_(started);
  mmtpLog_('=== Master Data Production Migration START (Sprint ' + MIGRATION_PRODUCTION.SPRINT + ') ===');

  var targetId = mpRequireProp_(MIGRATION_PREVIEW.TARGET_PROP);
  logWorkbookGuard_('migrateMasterDataToProduction', 'MASTER_DATA');
  var ss = SpreadsheetApp.openById(targetId);

  var report = {
    generatedAt: started.toISOString(),
    sprint: MIGRATION_PRODUCTION.SPRINT,
    status: 'BLOCKED',
    validation: { passed: false, errors: [], blockers: [] },
    backups: [],
    migrations: [],
    untouchedSnapshots: { before: {}, after: {} },
    warnings: [],
    errors: [],
  };

  var preflight = mmtpRunPreflight_(ss, report);
  if (!preflight.ok) {
    report.status = 'BLOCKED';
    report.errors = report.errors.concat(preflight.errors);
    mmtpWriteProductionReport_(ss, report);
    mmtpLog_('Production migration BLOCKED — ' + preflight.errors.join('; '));
    return report;
  }

  report.validation = preflight.validation;
  report.untouchedSnapshots.before = mmtpSnapshotUntouchedSheets_(ss);

  try {
    for (var i = 0; i < MIGRATION_PRODUCTION.SHEET_PAIRS.length; i++) {
      var pair = MIGRATION_PRODUCTION.SHEET_PAIRS[i];
      var migrationResult = mmtpMigratePair_(ss, pair.preview, pair.production, ts, report);
      report.migrations.push(migrationResult);
      if (migrationResult.errors && migrationResult.errors.length > 0) {
        report.errors = report.errors.concat(migrationResult.errors);
      }
      if (migrationResult.warnings && migrationResult.warnings.length > 0) {
        report.warnings = report.warnings.concat(migrationResult.warnings);
      }
    }

    report.untouchedSnapshots.after = mmtpSnapshotUntouchedSheets_(ss);
    mmtpVerifyUntouchedSheets_(report);

    if (report.errors.length > 0) {
      report.status = 'FAILED';
    } else {
      report.status = 'SUCCESS';
    }
  } catch (err) {
    report.status = 'FAILED';
    report.errors.push(String(err.message || err));
    mmtpLog_('Production migration FAILED — ' + report.errors[report.errors.length - 1]);
  }

  mmtpWriteProductionReport_(ss, report);

  var elapsed = Math.round((new Date() - started) / 1000);
  mmtpLog_('Production migration ' + report.status + ' in ' + elapsed + 's'
    + ' — sheets=' + report.migrations.length
    + ' warnings=' + report.warnings.length
    + ' errors=' + report.errors.length);
  return report;
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 * @returns {{ ok: boolean, errors: string[], validation: Object }}
 */
function mmtpRunPreflight_(ss, report) {
  var errors = [];
  var validation = {
    passed: false,
    previewSheetsOk: true,
    summarySheetOk: false,
    errors: null,
    blockers: null,
    needsMapping: null,
    warnings: null,
  };

  for (var i = 0; i < MIGRATION_PRODUCTION.SHEET_PAIRS.length; i++) {
    var previewName = MIGRATION_PRODUCTION.SHEET_PAIRS[i].preview;
    if (!ss.getSheetByName(previewName)) {
      validation.previewSheetsOk = false;
      errors.push('Missing preview sheet: ' + previewName);
    }
  }

  var summarySheet = ss.getSheetByName(MIGRATION_PRODUCTION.DRY_RUN_SUMMARY_SHEET);
  if (!summarySheet) {
    errors.push('Missing dry-run summary sheet: ' + MIGRATION_PRODUCTION.DRY_RUN_SUMMARY_SHEET);
  } else {
    validation.summarySheetOk = true;
    var metrics = mmtpParseSummaryMetrics_(summarySheet);
    var req = MIGRATION_PRODUCTION.REQUIRED_METRICS;

    validation.errors = mmtpMetricValue_(metrics, req.ERRORS);
    validation.blockers = mmtpMetricValue_(metrics, req.BLOCKERS);
    validation.needsMapping = mmtpMetricValue_(metrics, req.NEEDS_MAPPING);
    validation.warnings = mmtpMetricValue_(metrics, 'Warnings');

    if (validation.errors === null) {
      errors.push('Dry-run summary missing metric: ' + req.ERRORS);
    } else if (validation.errors !== 0) {
      errors.push(req.ERRORS + ' must be 0 (found ' + validation.errors + ')');
    }

    if (validation.blockers === null) {
      errors.push('Dry-run summary missing metric: ' + req.BLOCKERS);
    } else if (validation.blockers !== 0) {
      errors.push(req.BLOCKERS + ' must be 0 (found ' + validation.blockers + ')');
    }

    if (validation.needsMapping === null) {
      errors.push('Dry-run summary missing metric: ' + req.NEEDS_MAPPING);
    } else if (validation.needsMapping !== 0) {
      errors.push(req.NEEDS_MAPPING + ' must be 0 (found ' + validation.needsMapping + ')');
    }
  }

  validation.passed = errors.length === 0;
  return { ok: validation.passed, errors: errors, validation: validation };
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} previewName
 * @param {string} productionName
 * @param {string} ts
 * @param {Object} report
 * @returns {Object}
 */
function mmtpMigratePair_(ss, previewName, productionName, ts, report) {
  var result = {
    previewSheet: previewName,
    productionSheet: productionName,
    backupSheet: '',
    previewRows: 0,
    productionRows: 0,
    rowCountsMatch: false,
    warnings: [],
    errors: [],
  };

  var previewSheet = ss.getSheetByName(previewName);
  var productionSheet = ss.getSheetByName(productionName);

  result.previewRows = mmtpCountSheetDataRows_(previewSheet);

  if (productionSheet) {
    result.backupSheet = mmtpCreateBackup_(ss, productionSheet, ts);
    report.backups.push({
      productionSheet: productionName,
      backupSheet: result.backupSheet,
      rowCount: mmtpCountSheetDataRows_(productionSheet),
    });
  } else {
    result.warnings.push('Production sheet not found — creating: ' + productionName);
    productionSheet = ss.insertSheet(productionName);
  }

  mmtpCopySheetData_(previewSheet, productionSheet);
  result.productionRows = mmtpCountSheetDataRows_(productionSheet);
  result.rowCountsMatch = result.previewRows === result.productionRows;

  if (!result.rowCountsMatch) {
    result.errors.push(
      productionName + ' row count mismatch: preview=' + result.previewRows
      + ' production=' + result.productionRows
    );
  }

  return result;
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} source
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dest
 */
function mmtpCopySheetData_(source, dest) {
  var lastRow = source.getLastRow();
  var lastCol = source.getLastColumn();
  dest.clear();

  if (lastRow < 1 || lastCol < 1) {
    dest.setFrozenRows(0);
    return;
  }

  var data = source.getRange(1, 1, lastRow, lastCol).getValues();
  dest.getRange(1, 1, data.length, data[0].length).setValues(data);
  dest.setFrozenRows(1);
  dest.autoResizeColumns(1, data[0].length);
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} ts
 * @returns {string} backup sheet name
 */
function mmtpCreateBackup_(ss, sheet, ts) {
  var baseName = sheet.getName() + '_BACKUP_' + ts;
  var backup = sheet.copyTo(ss);
  backup.setName(mmtpUniqueSheetName_(ss, baseName));
  return backup.getName();
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} desiredName
 * @returns {string}
 */
function mmtpUniqueSheetName_(ss, desiredName) {
  var name = desiredName.slice(0, 100);
  if (!ss.getSheetByName(name)) {
    return name;
  }
  for (var n = 2; n < 100; n++) {
    var suffix = '_' + n;
    var candidate = name.slice(0, 100 - suffix.length) + suffix;
    if (!ss.getSheetByName(candidate)) {
      return candidate;
    }
  }
  throw new Error('Unable to allocate unique backup sheet name for: ' + desiredName);
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} summarySheet
 * @returns {Object<string, number>}
 */
function mmtpParseSummaryMetrics_(summarySheet) {
  var values = summarySheet.getDataRange().getValues();
  var metrics = {};
  for (var i = 0; i < values.length; i++) {
    var label = String(values[i][0] || '').trim();
    if (!label) {
      continue;
    }
    var raw = values[i][1];
    if (raw === '' || raw === null || raw === undefined) {
      continue;
    }
    var num = Number(raw);
    metrics[label] = isNaN(num) ? raw : num;
  }
  return metrics;
}


/**
 * @param {Object} metrics
 * @param {string} label
 * @returns {number|null}
 */
function mmtpMetricValue_(metrics, label) {
  if (!metrics.hasOwnProperty(label)) {
    return null;
  }
  var val = metrics[label];
  return typeof val === 'number' ? val : Number(val);
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {number}
 */
function mmtpCountSheetDataRows_(sheet) {
  var lastRow = sheet.getLastRow();
  return lastRow <= 1 ? 0 : lastRow - 1;
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {Object<string, number|string>}
 */
function mmtpSnapshotUntouchedSheets_(ss) {
  var snapshot = {};
  for (var i = 0; i < MIGRATION_PRODUCTION.UNTOUCHED_SHEETS.length; i++) {
    var name = MIGRATION_PRODUCTION.UNTOUCHED_SHEETS[i];
    var sheet = ss.getSheetByName(name);
    snapshot[name] = sheet ? mmtpCountSheetDataRows_(sheet) : 'MISSING';
  }
  return snapshot;
}


/**
 * @param {Object} report
 */
function mmtpVerifyUntouchedSheets_(report) {
  var before = report.untouchedSnapshots.before;
  var after = report.untouchedSnapshots.after;
  for (var name in before) {
    if (!before.hasOwnProperty(name)) {
      continue;
    }
    if (before[name] !== after[name]) {
      report.warnings.push(
        'Untouched sheet row count changed: ' + name
        + ' before=' + before[name] + ' after=' + after[name]
      );
    }
  }
}


/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function mmtpWriteProductionReport_(ss, report) {
  var existing = ss.getSheetByName(MIGRATION_PRODUCTION.REPORT_SHEET);
  if (existing) {
    ss.deleteSheet(existing);
  }
  var sheet = ss.insertSheet(MIGRATION_PRODUCTION.REPORT_SHEET);
  var rows = [];

  rows.push(['ACC Reliability Platform — Master Data Production Migration Report']);
  rows.push(['Sprint', report.sprint]);
  rows.push(['Generated', report.generatedAt]);
  rows.push(['Status', report.status]);
  rows.push([]);

  rows.push(['=== VALIDATION (PRE-COPY) ===']);
  rows.push(['Check', 'Result']);
  rows.push(['Preview sheets present', report.validation.previewSheetsOk ? 'PASS' : 'FAIL']);
  rows.push(['Dry-run summary present', report.validation.summarySheetOk ? 'PASS' : 'FAIL']);
  rows.push(['Errors (incl. blockers)', report.validation.errors]);
  rows.push(['Blockers', report.validation.blockers]);
  rows.push(['Needs mapping', report.validation.needsMapping]);
  rows.push(['Validation passed', report.validation.passed ? 'YES' : 'NO']);
  rows.push([]);

  rows.push(['=== BACKUP SHEETS ===']);
  rows.push(['Production Sheet', 'Backup Sheet', 'Backed-up Rows']);
  for (var b = 0; b < report.backups.length; b++) {
    var bk = report.backups[b];
    rows.push([bk.productionSheet, bk.backupSheet, bk.rowCount]);
  }
  if (report.backups.length === 0) {
    rows.push(['(none)', '', '']);
  }
  rows.push([]);

  rows.push(['=== MIGRATION ROW COUNTS ===']);
  rows.push(['Preview Sheet', 'Production Sheet', 'Preview Rows', 'Production Rows', 'Match']);
  for (var m = 0; m < report.migrations.length; m++) {
    var mg = report.migrations[m];
    rows.push([
      mg.previewSheet,
      mg.productionSheet,
      mg.previewRows,
      mg.productionRows,
      mg.rowCountsMatch ? 'YES' : 'NO',
    ]);
  }
  rows.push([]);

  rows.push(['=== WARNINGS ===']);
  if (report.warnings.length === 0) {
    rows.push(['(none)']);
  } else {
    for (var w = 0; w < report.warnings.length; w++) {
      rows.push([report.warnings[w]]);
    }
  }
  rows.push([]);

  rows.push(['=== ERRORS ===']);
  if (report.errors.length === 0) {
    rows.push(['(none)']);
  } else {
    for (var e = 0; e < report.errors.length; e++) {
      rows.push([report.errors[e]]);
    }
  }
  rows.push([]);

  rows.push(['=== UNTOUCHED SHEETS (ROW COUNTS) ===']);
  rows.push(['Sheet', 'Before', 'After']);
  var before = report.untouchedSnapshots.before || {};
  var after = report.untouchedSnapshots.after || {};
  for (var u = 0; u < MIGRATION_PRODUCTION.UNTOUCHED_SHEETS.length; u++) {
    var untouched = MIGRATION_PRODUCTION.UNTOUCHED_SHEETS[u];
    rows.push([untouched, before[untouched], after[untouched]]);
  }

  if (rows.length > 0) {
    var padded = mpPadRows_(rows, 5);
    sheet.getRange(1, 1, padded.length, 5).setValues(padded);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 5);
}


/**
 * @param {Date} date
 * @returns {string}
 */
function mmtpFormatTimestamp_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
}


/**
 * @param {string} message
 */
function mmtpLog_(message) {
  Logger.log('[MigrationProduction] ' + message);
}
