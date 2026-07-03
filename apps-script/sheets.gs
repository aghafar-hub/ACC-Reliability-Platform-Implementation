/**
 * Google Sheets utilities for master-data read/write operations.
 */

/**
 * @param {string} code
 * @param {string} message
 * @param {Object=} details
 * @returns {{ sheetError: true, code: string, message: string, details: (Object|undefined) }}
 */
function createSheetError(code, message, details) {
  return {
    sheetError: true,
    code: code,
    message: message,
    details: details,
  };
}

/**
 * @returns {string}
 */
function requireSpreadsheetId() {
  var spreadsheetId = getMasterDataSpreadsheetId();
  if (!spreadsheetId) {
    throw createSheetError(
      ErrorCodes.MISSING_SPREADSHEET_ID,
      'Master data spreadsheet ID is not configured',
      { property: MASTER_DATA_CONFIG.SPREADSHEET_ID_PROPERTY }
    );
  }
  return spreadsheetId;
}

/**
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function openMasterDataSpreadsheet() {
  var spreadsheetId = requireSpreadsheetId();
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    throw createSheetError(
      ErrorCodes.MISSING_SPREADSHEET_ID,
      'Unable to open master data spreadsheet',
      { spreadsheetId: spreadsheetId }
    );
  }
}

/**
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getMasterDataSheet(sheetName) {
  var spreadsheet = openMasterDataSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw createSheetError(
      ErrorCodes.SHEET_NOT_FOUND,
      'Sheet not found: ' + sheetName,
      { sheetName: sheetName }
    );
  }
  return sheet;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 * @returns {string[]}
 */
function readHeaderRow(sheet, expectedColumns) {
  var lastColumn = Math.max(sheet.getLastColumn(), expectedColumns.length);
  if (lastColumn < 1) {
    return expectedColumns.slice();
  }

  var headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var headers = [];

  for (var i = 0; i < headerValues.length; i++) {
    var header = String(headerValues[i] || '').trim();
    if (header) {
      headers.push(header);
    }
  }

  if (headers.length === 0) {
    return expectedColumns.slice();
  }

  return headers;
}

/**
 * @param {string[]} headerRow
 * @param {string[]} expectedColumns
 * @returns {Object<string, number>}
 */
function buildHeaderIndex(headerRow, expectedColumns) {
  var index = {};
  var columns = headerRow.length > 0 ? headerRow : expectedColumns;

  for (var i = 0; i < columns.length; i++) {
    index[columns[i]] = i;
  }

  return index;
}

/**
 * @param {Array} rowValues
 * @param {Object<string, number>} headerIndex
 * @param {string[]} expectedColumns
 * @returns {Object}
 */
function rowValuesToObject(rowValues, headerIndex, expectedColumns) {
  var record = {};

  for (var i = 0; i < expectedColumns.length; i++) {
    var column = expectedColumns[i];
    var columnIndex = headerIndex[column];
    record[column] = columnIndex === undefined ? '' : rowValues[columnIndex];
  }

  return record;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 * @returns {Object[]}
 */
function mapRowsToObjects(sheet, expectedColumns) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  var headerRow = readHeaderRow(sheet, expectedColumns);
  var headerIndex = buildHeaderIndex(headerRow, expectedColumns);
  var lastColumn = Math.max(sheet.getLastColumn(), expectedColumns.length);
  var values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  var records = [];

  for (var i = 0; i < values.length; i++) {
    records.push(rowValuesToObject(values[i], headerIndex, expectedColumns));
  }

  return records;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 */
function ensureHeaderRow(sheet, expectedColumns) {
  if (sheet.getLastRow() >= 1 && sheet.getLastColumn() >= 1) {
    return;
  }

  sheet.getRange(1, 1, 1, expectedColumns.length).setValues([expectedColumns]);
}

/**
 * @param {string[]} expectedColumns
 * @param {Object} record
 * @returns {Array}
 */
function objectToRowValues(expectedColumns, record) {
  var row = [];

  for (var i = 0; i < expectedColumns.length; i++) {
    var column = expectedColumns[i];
    var value = record[column];
    row.push(value === undefined || value === null ? '' : value);
  }

  return row;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 * @param {Object} record
 * @returns {number} 1-based sheet row number
 */
function appendRow(sheet, expectedColumns, record) {
  ensureHeaderRow(sheet, expectedColumns);
  var targetRow = Math.max(sheet.getLastRow(), 1) + 1;
  sheet.getRange(targetRow, 1, 1, expectedColumns.length).setValues([
    objectToRowValues(expectedColumns, record),
  ]);
  return targetRow;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 * @param {string} idColumn
 * @param {string} idValue
 * @returns {number} 1-based sheet row number, or -1 when not found
 */
function findRowIndexById(sheet, expectedColumns, idColumn, idValue) {
  var normalizedId = String(idValue || '').trim();
  if (!normalizedId) {
    return -1;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }

  var headerRow = readHeaderRow(sheet, expectedColumns);
  var headerIndex = buildHeaderIndex(headerRow, expectedColumns);
  var idColumnIndex = headerIndex[idColumn];
  if (idColumnIndex === undefined) {
    return -1;
  }

  var lastColumn = Math.max(sheet.getLastColumn(), expectedColumns.length);
  var values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][idColumnIndex] || '').trim() === normalizedId) {
      return i + 2;
    }
  }

  return -1;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 * @param {string} idColumn
 * @param {string} idValue
 * @param {Object} record
 * @returns {number} 1-based sheet row number
 */
function updateRowById(sheet, expectedColumns, idColumn, idValue, record) {
  var rowIndex = findRowIndexById(sheet, expectedColumns, idColumn, idValue);
  if (rowIndex < 0) {
    return -1;
  }

  sheet.getRange(rowIndex, 1, 1, expectedColumns.length).setValues([
    objectToRowValues(expectedColumns, record),
  ]);

  return rowIndex;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} expectedColumns
 * @param {string} idColumn
 * @param {string} idValue
 * @param {string=} statusColumn
 * @returns {Object|null}
 */
function softDeactivateRow(sheet, expectedColumns, idColumn, idValue, statusColumn) {
  var rowIndex = findRowIndexById(sheet, expectedColumns, idColumn, idValue);
  if (rowIndex < 0) {
    return null;
  }

  var headerRow = readHeaderRow(sheet, expectedColumns);
  var headerIndex = buildHeaderIndex(headerRow, expectedColumns);
  var lastColumn = Math.max(sheet.getLastColumn(), expectedColumns.length);
  var rowValues = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
  var record = rowValuesToObject(rowValues, headerIndex, expectedColumns);
  var now = new Date().toISOString();

  record[statusColumn || 'status'] = 'inactive';
  record.updatedAt = now;

  sheet.getRange(rowIndex, 1, 1, expectedColumns.length).setValues([
    objectToRowValues(expectedColumns, record),
  ]);

  return record;
}

/**
 * @param {Object} payload
 * @param {string} fieldName
 * @returns {string}
 */
function requirePayloadField(payload, fieldName) {
  var value = payload ? payload[fieldName] : undefined;
  if (value === undefined || value === null || String(value).trim() === '') {
    throw createSheetError(
      ErrorCodes.MISSING_REQUIRED_ID,
      'Missing required field: ' + fieldName,
      { field: fieldName }
    );
  }
  return String(value).trim();
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function parseSheetBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  var normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * @param {Object[]} records
 * @param {Object} filters
 * @param {string[]} searchFields
 * @returns {Object[]}
 */
function applyListFilters(records, filters, searchFields) {
  var result = records.slice();

  if (filters.status) {
    var statusFilter = String(filters.status).trim().toLowerCase();
    result = result.filter(function (record) {
      return String(record.status || '').trim().toLowerCase() === statusFilter;
    });
  }

  if (filters.contractorId) {
    var contractorFilter = String(filters.contractorId).trim();
    result = result.filter(function (record) {
      return String(record.contractorId || '').trim() === contractorFilter;
    });
  }

  if (filters.area) {
    var areaFilter = String(filters.area).trim();
    result = result.filter(function (record) {
      return String(record.area || '').trim() === areaFilter;
    });
  }

  if (filters.equipmentId) {
    var equipmentFilter = String(filters.equipmentId).trim();
    result = result.filter(function (record) {
      return String(record.equipmentId || '').trim() === equipmentFilter;
    });
  }

  if (filters.searchText) {
    var search = String(filters.searchText).trim().toLowerCase();
    result = result.filter(function (record) {
      for (var i = 0; i < searchFields.length; i++) {
        var fieldValue = String(record[searchFields[i]] || '').toLowerCase();
        if (fieldValue.indexOf(search) !== -1) {
          return true;
        }
      }
      return false;
    });
  }

  return result;
}

/**
 * @param {Object[]} records
 * @param {number} offset
 * @param {number} limit
 * @returns {{ items: Object[], offset: number, limit: number, total: number }}
 */
function applyPagination(records, offset, limit) {
  var safeOffset = Number(offset);
  var safeLimit = Number(limit);

  if (isNaN(safeOffset) || safeOffset < 0) {
    safeOffset = 0;
  }
  if (isNaN(safeLimit) || safeLimit < 0) {
    safeLimit = 0;
  }

  var total = records.length;
  var items = safeLimit > 0
    ? records.slice(safeOffset, safeOffset + safeLimit)
    : records.slice(safeOffset);

  return {
    items: items,
    offset: safeOffset,
    limit: safeLimit,
    total: total,
  };
}

/**
 * @param {Function} handler
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function runSheetHandler(handler) {
  try {
    return handler();
  } catch (err) {
    if (err && err.sheetError) {
      return errorResponse(err.code, err.message, err.details);
    }

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      err && err.message ? err.message : String(err)
    );
  }
}
