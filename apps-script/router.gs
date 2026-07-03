/**
 * Route incoming requests by action name to handler stubs.
 */

var ROUTES = {
  'equipment.list': handleEquipmentList,
  'equipment.get': handleEquipmentGet,
  'lp.list': handleLpList,
  'lp.get': handleLpGet,
  'lp.upsert': handleLpUpsert,
  'lp.deactivate': handleLpDeactivate,
};

/**
 * @param {'GET'|'POST'} method
 * @param {{ action: (string|undefined), payload: Object }} parsed
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function routeRequest(method, parsed) {
  var action = parsed.action;

  if (!action) {
    return errorResponse(
      ErrorCodes.MISSING_ACTION,
      'Missing action parameter',
      { method: method }
    );
  }

  var handler = ROUTES[action];
  if (!handler) {
    return errorResponse(
      ErrorCodes.UNKNOWN_ACTION,
      'Unknown action: ' + action,
      { action: action, method: method }
    );
  }

  return handler(method, parsed.payload || {});
}
