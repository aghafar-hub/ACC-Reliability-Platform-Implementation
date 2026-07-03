/**
 * Equipment master-data endpoint handlers.
 */

/**
 * @param {Object} row
 * @returns {Object}
 */
function mapEquipmentRowToDto(row) {
  return {
    equipmentId: String(row.equipmentId || ''),
    name: String(row.name || ''),
    area: String(row.area || ''),
    contractorId: String(row.contractorId || ''),
    status: String(row.status || 'active'),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || ''),
    createdBy: '',
    updatedBy: '',
  };
}

/**
 * equipment.list — return equipment with optional filters.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleEquipmentList(method, payload) {
  return runSheetHandler(function () {
    var sheet = getMasterDataSheet(MASTER_DATA_CONFIG.SHEETS.EQUIPMENT);
    var columns = MASTER_DATA_CONFIG.EQUIPMENT_COLUMNS;
    var records = mapRowsToObjects(sheet, columns);
    var filtered = applyListFilters(records, {
      status: payload.status,
      contractorId: payload.contractorId,
      area: payload.area,
      searchText: payload.searchText,
    }, ['equipmentId', 'name', 'area', 'contractorId']);
    var page = applyPagination(filtered, payload.offset, payload.limit);

    return successResponse({
      equipment: page.items.map(mapEquipmentRowToDto),
      total: page.total,
      offset: page.offset,
      limit: page.limit,
    });
  });
}

/**
 * equipment.get — return a single equipment record by equipmentId.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleEquipmentGet(method, payload) {
  return runSheetHandler(function () {
    var equipmentId = requirePayloadField(payload, 'equipmentId');
    var sheet = getMasterDataSheet(MASTER_DATA_CONFIG.SHEETS.EQUIPMENT);
    var columns = MASTER_DATA_CONFIG.EQUIPMENT_COLUMNS;
    var rowIndex = findRowIndexById(sheet, columns, 'equipmentId', equipmentId);

    if (rowIndex < 0) {
      return successResponse({ equipment: null });
    }

    var headerRow = readHeaderRow(sheet, columns);
    var headerIndex = buildHeaderIndex(headerRow, columns);
    var lastColumn = Math.max(sheet.getLastColumn(), columns.length);
    var rowValues = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];

    return successResponse({
      equipment: mapEquipmentRowToDto(rowValuesToObject(rowValues, headerIndex, columns)),
    });
  });
}
