/**
 * Equipment master-data endpoint handlers (stubs).
 * TODO Sprint 05: Wire Google Sheets equipment tab reads/writes.
 */

/**
 * equipment.list — return active equipment with optional filters.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleEquipmentList(method, payload) {
  // TODO Sprint 05: Read equipment rows from Google Sheets with status/contractorId/area/searchText filters.
  var offset = Number(payload.offset) || 0;
  var limit = Number(payload.limit) || 0;

  return successResponse({
    equipment: [],
    total: 0,
    offset: offset,
    limit: limit,
  });
}

/**
 * equipment.get — return a single equipment record by equipmentId.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleEquipmentGet(method, payload) {
  // TODO Sprint 05: Look up equipment row by equipmentId in Google Sheets.
  return successResponse({ equipment: null });
}
