/**
 * JSON response envelope helpers.
 *
 * Success: { ok: true, data: ..., meta?: ... }
 * Failure: { ok: false, error: { code, message, details? } }
 */

function jsonOutput_(envelope) {
  return ContentService
    .createTextOutput(JSON.stringify(envelope))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * @param {*} data
 * @param {Object=} meta
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function successResponse(data, meta) {
  var envelope = { ok: true, data: data };
  if (meta) {
    envelope.meta = meta;
  }
  return jsonOutput_(envelope);
}

/**
 * @param {string} code
 * @param {string} message
 * @param {Object=} details
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function errorResponse(code, message, details) {
  var error = { code: code, message: message };
  if (details) {
    error.details = details;
  }
  return jsonOutput_({ ok: false, error: error });
}

/**
 * @param {string} action
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function notImplementedResponse(action) {
  return errorResponse(
    ErrorCodes.NOT_IMPLEMENTED,
    action + ' is not implemented yet',
    { action: action }
  );
}
