/**
 * Lubrication point endpoint handlers.
 */

/**
 * @param {Object} row
 * @returns {Object}
 */
function mapLpRowToDto(row) {
  var lpId = String(row.lpId || '');

  return {
    id: lpId,
    lpId: lpId,
    equipmentId: String(row.equipmentId || ''),
    name: String(row.name || ''),
    lubricant: String(row.lubricant || ''),
    frequencyDays: Number(row.frequencyDays) || 0,
    oaRequired: parseSheetBoolean(row.oaRequired),
    samplingIntervalDays: row.samplingIntervalDays === '' || row.samplingIntervalDays === null || row.samplingIntervalDays === undefined
      ? null
      : Number(row.samplingIntervalDays),
    status: String(row.status || 'active'),
    area: String(row.area || ''),
    contractorId: String(row.contractorId || ''),
    lastChangeDate: null,
    nextDueDate: null,
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || ''),
    createdBy: '',
    updatedBy: '',
  };
}

/**
 * @param {Object} dto
 * @param {string} nowIso
 * @param {Object=} existingRow
 * @returns {Object}
 */
function mapLpDtoToRow(dto, nowIso, existingRow) {
  var lpId = String(dto.lpId || dto.id || '').trim();
  if (!lpId) {
    throw createSheetError(
      ErrorCodes.MISSING_REQUIRED_ID,
      'Missing required field: lpId',
      { field: 'lpId' }
    );
  }

  return {
    lpId: lpId,
    equipmentId: String(dto.equipmentId || ''),
    name: String(dto.name || ''),
    lubricant: String(dto.lubricant || ''),
    frequencyDays: Number(dto.frequencyDays) || 0,
    oaRequired: parseSheetBoolean(dto.oaRequired) ? 'TRUE' : 'FALSE',
    samplingIntervalDays: dto.samplingIntervalDays === null || dto.samplingIntervalDays === undefined
      ? ''
      : Number(dto.samplingIntervalDays),
    status: String(dto.status || 'active'),
    area: String(dto.area || ''),
    contractorId: String(dto.contractorId || ''),
    createdAt: existingRow ? String(existingRow.createdAt || nowIso) : String(dto.createdAt || nowIso),
    updatedAt: nowIso,
  };
}

/**
 * @param {Object} payload
 * @returns {Object}
 */
function requireLpRecordPayload(payload) {
  var lubricationPoint = payload ? payload.lubricationPoint : undefined;
  if (!lubricationPoint || typeof lubricationPoint !== 'object') {
    throw createSheetError(
      ErrorCodes.VALIDATION_ERROR,
      'Missing required field: lubricationPoint',
      { field: 'lubricationPoint' }
    );
  }
  return lubricationPoint;
}

/**
 * lp.list — return lubrication points with optional filters.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpList(method, payload) {
  return runSheetHandler(function () {
    var sheet = getMasterDataSheet(MASTER_DATA_CONFIG.SHEETS.LP);
    var columns = MASTER_DATA_CONFIG.LP_COLUMNS;
    var records = mapRowsToObjects(sheet, columns);
    var filtered = applyListFilters(records, {
      status: payload.status,
      contractorId: payload.contractorId,
      area: payload.area,
      equipmentId: payload.equipmentId,
      searchText: payload.searchText,
    }, ['lpId', 'equipmentId', 'name', 'lubricant', 'area', 'contractorId']);
    var page = applyPagination(filtered, payload.offset, payload.limit);

    return successResponse({
      lubricationPoints: page.items.map(mapLpRowToDto),
      total: page.total,
      offset: page.offset,
      limit: page.limit,
    });
  });
}

/**
 * lp.get — return a single lubrication point by id or lpId.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpGet(method, payload) {
  return runSheetHandler(function () {
    var lookupId = payload && payload.id ? String(payload.id).trim() : '';
    var lookupLpId = payload && payload.lpId ? String(payload.lpId).trim() : '';
    var targetId = lookupId || lookupLpId;

    if (!targetId) {
      throw createSheetError(
        ErrorCodes.MISSING_REQUIRED_ID,
        'Missing required field: id or lpId',
        { fields: ['id', 'lpId'] }
      );
    }

    var sheet = getMasterDataSheet(MASTER_DATA_CONFIG.SHEETS.LP);
    var columns = MASTER_DATA_CONFIG.LP_COLUMNS;
    var rowIndex = findRowIndexById(sheet, columns, 'lpId', targetId);

    if (rowIndex < 0 && lookupId && lookupId !== lookupLpId) {
      rowIndex = findRowIndexById(sheet, columns, 'lpId', lookupId);
    }

    if (rowIndex < 0) {
      return successResponse({ lubricationPoint: null });
    }

    var headerRow = readHeaderRow(sheet, columns);
    var headerIndex = buildHeaderIndex(headerRow, columns);
    var lastColumn = Math.max(sheet.getLastColumn(), columns.length);
    var rowValues = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];

    return successResponse({
      lubricationPoint: mapLpRowToDto(rowValuesToObject(rowValues, headerIndex, columns)),
    });
  });
}

/**
 * lp.upsert — create or update a lubrication point by lpId.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpUpsert(method, payload) {
  return runSheetHandler(function () {
    var lubricationPoint = requireLpRecordPayload(payload);
    var sheet = getMasterDataSheet(MASTER_DATA_CONFIG.SHEETS.LP);
    var columns = MASTER_DATA_CONFIG.LP_COLUMNS;
    var nowIso = new Date().toISOString();
    var lpId = String(lubricationPoint.lpId || lubricationPoint.id || '').trim();

    if (!lpId) {
      throw createSheetError(
        ErrorCodes.MISSING_REQUIRED_ID,
        'Missing required field: lpId',
        { field: 'lpId' }
      );
    }

    var existingRowIndex = findRowIndexById(sheet, columns, 'lpId', lpId);
    var existingRow = null;

    if (existingRowIndex >= 0) {
      var headerRow = readHeaderRow(sheet, columns);
      var headerIndex = buildHeaderIndex(headerRow, columns);
      var lastColumn = Math.max(sheet.getLastColumn(), columns.length);
      var existingValues = sheet.getRange(existingRowIndex, 1, 1, lastColumn).getValues()[0];
      existingRow = rowValuesToObject(existingValues, headerIndex, columns);
    }

    var row = mapLpDtoToRow(lubricationPoint, nowIso, existingRow);

    if (existingRowIndex >= 0) {
      updateRowById(sheet, columns, 'lpId', lpId, row);
    } else {
      appendRow(sheet, columns, row);
    }

    return successResponse({
      lubricationPoint: mapLpRowToDto(row),
    });
  });
}

/**
 * lp.deactivate — soft-deactivate a lubrication point.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpDeactivate(method, payload) {
  return runSheetHandler(function () {
    var id = requirePayloadField(payload, 'id');
    var sheet = getMasterDataSheet(MASTER_DATA_CONFIG.SHEETS.LP);
    var columns = MASTER_DATA_CONFIG.LP_COLUMNS;
    var deactivated = softDeactivateRow(sheet, columns, 'lpId', id, 'status');

    if (!deactivated) {
      return errorResponse(
        ErrorCodes.RECORD_NOT_FOUND,
        'Lubrication point not found: ' + id,
        { id: id }
      );
    }

    return successResponse({
      lubricationPoint: mapLpRowToDto(deactivated),
    });
  });
}
