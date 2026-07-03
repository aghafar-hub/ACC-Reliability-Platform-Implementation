/**
 * Lubrication point endpoint handlers (stubs).
 * TODO Sprint 05: Wire Google Sheets lubrication-point tab reads/writes.
 */

/**
 * lp.list — return lubrication points with optional filters.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpList(method, payload) {
  // TODO Sprint 05: Read lubrication-point rows from Google Sheets with equipmentId/contractorId/area/status filters.
  var offset = Number(payload.offset) || 0;
  var limit = Number(payload.limit) || 0;

  return successResponse({
    lubricationPoints: [],
    total: 0,
    offset: offset,
    limit: limit,
  });
}

/**
 * lp.get — return a single lubrication point by id or lpId.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpGet(method, payload) {
  // TODO Sprint 05: Look up lubrication-point row by id or lpId in Google Sheets.
  return successResponse({ lubricationPoint: null });
}

/**
 * lp.upsert — create or update a lubrication point.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpUpsert(method, payload) {
  // TODO Sprint 05: Upsert lubrication-point row in Google Sheets.
  return notImplementedResponse('lp.upsert');
}

/**
 * lp.deactivate — soft-deactivate a lubrication point.
 * @param {'GET'|'POST'} method
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLpDeactivate(method, payload) {
  // TODO Sprint 05: Set lubrication-point status to inactive in Google Sheets.
  return notImplementedResponse('lp.deactivate');
}
