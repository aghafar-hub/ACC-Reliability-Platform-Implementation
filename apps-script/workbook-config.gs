/**
 * ACC Reliability Platform — Workbook configuration & verification.
 *
 * Preferred source: Script Properties (set in Apps Script → Project settings).
 * Fallback only: WORKBOOK_IDS constants in database/initializeAccDatabase.gs.
 *
 * Run from the Apps Script editor:
 *   showConfiguredWorkbookIds()
 *   verifyActiveWorkbookNames()
 *   detectDuplicateWorkbookNames()
 */

var WORKBOOK_CONFIG = {
  KEYS: ['SETTINGS', 'MASTER_DATA', 'OIL_LUB', 'OIL_ANALYSIS'],
  PROPERTIES: {
    SETTINGS: 'SETTINGS_CONFIG_SPREADSHEET_ID',
    MASTER_DATA: 'MASTER_DATA_SPREADSHEET_ID',
    OIL_LUB: 'OIL_LUBRICATION_SPREADSHEET_ID',
    OIL_ANALYSIS: 'OIL_ANALYSIS_SPREADSHEET_ID',
  },
  EXPECTED_NAMES: {
    SETTINGS: 'ACC_PLATFORM_SETTINGS_CONFIG',
    MASTER_DATA: 'ACC_PLATFORM_MASTER_DATA',
    OIL_LUB: 'ACC_OIL_LUBRICATION_DATA',
    OIL_ANALYSIS: 'ACC_OIL_ANALYSIS_DATA',
  },
};

/**
 * @param {GoogleAppsScript.Properties.Properties} props
 * @param {string} key
 * @returns {string}
 */
function wcPropOrEmpty_(props, key) {
  var raw = props.getProperty(key);
  if (!raw) {
    return '';
  }
  var trimmed = String(raw).trim();
  if (!trimmed || trimmed.indexOf('REPLACE_') === 0) {
    return '';
  }
  return trimmed;
}

/**
 * Resolves a workbook ID: Script Property first, WORKBOOK_IDS fallback second.
 * @param {string} key SETTINGS | MASTER_DATA | OIL_LUB | OIL_ANALYSIS
 * @returns {string} spreadsheet ID or empty string
 */
function getResolvedWorkbookId_(key) {
  var propName = WORKBOOK_CONFIG.PROPERTIES[key];
  if (!propName) {
    return '';
  }

  var props = PropertiesService.getScriptProperties();
  var fromProp = wcPropOrEmpty_(props, propName);
  if (fromProp) {
    return fromProp;
  }

  if (typeof WORKBOOK_IDS !== 'undefined' && WORKBOOK_IDS[key]) {
    var fallback = String(WORKBOOK_IDS[key]).trim();
    if (fallback && fallback.indexOf('REPLACE_') !== 0) {
      return fallback;
    }
  }

  return '';
}

/**
 * @param {string} fileId
 * @returns {{ id: string, name: (string|null), ok: boolean, error?: string }}
 */
function getWorkbookInfo_(fileId) {
  if (!fileId) {
    return { id: '', name: null, ok: false, error: 'ID not configured' };
  }
  try {
    var ss = SpreadsheetApp.openById(fileId);
    return { id: fileId, name: ss.getName(), ok: true };
  } catch (e) {
    return { id: fileId, name: null, ok: false, error: e.message };
  }
}

/**
 * @param {string} key
 * @returns {'scriptProperty'|'fallback'|'missing'}
 */
function wcResolveSource_(key) {
  var propName = WORKBOOK_CONFIG.PROPERTIES[key];
  var fromProp = wcPropOrEmpty_(PropertiesService.getScriptProperties(), propName);
  if (fromProp) {
    return 'scriptProperty';
  }
  if (typeof WORKBOOK_IDS !== 'undefined' && WORKBOOK_IDS[key]) {
    var fallback = String(WORKBOOK_IDS[key]).trim();
    if (fallback && fallback.indexOf('REPLACE_') !== 0) {
      return 'fallback';
    }
  }
  return 'missing';
}

/**
 * Logs and returns all configured workbook IDs with their resolution source.
 * @returns {Object}
 */
function showConfiguredWorkbookIds() {
  var report = {
    checkedAt: new Date().toISOString(),
    workbooks: {},
  };

  for (var i = 0; i < WORKBOOK_CONFIG.KEYS.length; i++) {
    var key = WORKBOOK_CONFIG.KEYS[i];
    var resolvedId = getResolvedWorkbookId_(key);
    var info = getWorkbookInfo_(resolvedId);

    report.workbooks[key] = {
      scriptProperty: WORKBOOK_CONFIG.PROPERTIES[key],
      expectedName: WORKBOOK_CONFIG.EXPECTED_NAMES[key],
      resolvedId: resolvedId || null,
      source: wcResolveSource_(key),
      actualName: info.ok ? info.name : null,
      accessible: info.ok,
      error: info.ok ? null : info.error,
    };
  }

  wcLog_('=== Configured Workbook IDs ===');
  wcLog_(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Verifies each resolved workbook name matches the canonical ACC name.
 * @returns {Object}
 */
function verifyActiveWorkbookNames() {
  var report = {
    checkedAt: new Date().toISOString(),
    allMatch: true,
    workbooks: [],
  };

  for (var i = 0; i < WORKBOOK_CONFIG.KEYS.length; i++) {
    var key = WORKBOOK_CONFIG.KEYS[i];
    var expected = WORKBOOK_CONFIG.EXPECTED_NAMES[key];
    var resolvedId = getResolvedWorkbookId_(key);
    var info = getWorkbookInfo_(resolvedId);
    var entry = {
      key: key,
      expectedName: expected,
      resolvedId: resolvedId || null,
      actualName: info.ok ? info.name : null,
      matches: false,
      accessible: info.ok,
      error: null,
    };

    if (!resolvedId) {
      entry.error = 'Workbook ID not configured';
      report.allMatch = false;
    } else if (!info.ok) {
      entry.error = info.error;
      report.allMatch = false;
    } else if (info.name !== expected) {
      entry.error = 'Name mismatch — expected "' + expected + '", got "' + info.name + '"';
      report.allMatch = false;
    } else {
      entry.matches = true;
    }

    report.workbooks.push(entry);
  }

  wcLog_('=== Workbook Name Verification ===');
  wcLog_(report.allMatch ? 'PASS — all names match' : 'FAIL — see workbooks[] for details');
  wcLog_(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Detects duplicate workbook names among all configured spreadsheet IDs.
 * @returns {Object}
 */
function detectDuplicateWorkbookNames() {
  var byName = {};
  var byId = {};
  var unresolved = [];

  for (var i = 0; i < WORKBOOK_CONFIG.KEYS.length; i++) {
    var key = WORKBOOK_CONFIG.KEYS[i];
    var resolvedId = getResolvedWorkbookId_(key);
    if (!resolvedId) {
      unresolved.push({ key: key, reason: 'ID not configured' });
      continue;
    }

    if (byId[resolvedId]) {
      byId[resolvedId].keys.push(key);
      continue;
    }

    var info = getWorkbookInfo_(resolvedId);
    if (!info.ok) {
      unresolved.push({ key: key, id: resolvedId, reason: info.error });
      continue;
    }

    byId[resolvedId] = { keys: [key], name: info.name };

    if (!byName[info.name]) {
      byName[info.name] = [];
    }
    byName[info.name].push({ key: key, id: resolvedId });
  }

  var duplicates = [];
  for (var name in byName) {
    if (byName[name].length > 1) {
      duplicates.push({ name: name, workbooks: byName[name] });
    }
  }

  var sameIdUsedTwice = [];
  for (var id in byId) {
    if (byId[id].keys.length > 1) {
      sameIdUsedTwice.push({
        id: id,
        name: byId[id].name,
        keys: byId[id].keys,
      });
    }
  }

  var report = {
    checkedAt: new Date().toISOString(),
    hasDuplicates: duplicates.length > 0 || sameIdUsedTwice.length > 0,
    duplicateNames: duplicates,
    duplicateIdsAcrossKeys: sameIdUsedTwice,
    unresolved: unresolved,
  };

  wcLog_('=== Duplicate Workbook Detection ===');
  wcLog_(report.hasDuplicates ? 'DUPLICATES FOUND — review before initializing' : 'OK — no duplicate names');
  wcLog_(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Logs workbook target before destructive or structural operations.
 * @param {string} operation
 * @param {string} key
 */
function logWorkbookGuard_(operation, key) {
  var expected = WORKBOOK_CONFIG.EXPECTED_NAMES[key];
  var resolvedId = getResolvedWorkbookId_(key);
  var info = getWorkbookInfo_(resolvedId);
  var line = 'GUARD ' + operation + ' — '
    + 'key=' + key
    + ' expected="' + expected + '"'
    + ' actual="' + (info.name || 'UNKNOWN') + '"'
    + ' id=' + (resolvedId || 'NOT_CONFIGURED');

  if (typeof log_ === 'function') {
    log_(line);
  } else if (typeof mpLog_ === 'function') {
    mpLog_(line);
  } else {
    Logger.log(line);
  }

  if (!resolvedId) {
    throw new Error('Workbook ID not configured for ' + key + ' (' + WORKBOOK_CONFIG.PROPERTIES[key] + ')');
  }
  if (!info.ok) {
    throw new Error('Cannot open workbook for ' + key + ' [' + resolvedId + ']: ' + info.error);
  }
}

/** @param {string} message */
function wcLog_(message) {
  Logger.log(message);
}
