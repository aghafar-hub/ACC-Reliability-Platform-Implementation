/**
 * Request parsing for GET query parameters and POST JSON bodies.
 */

/**
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {{ action: (string|undefined), payload: Object }}
 */
function parseGetRequest(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = params.action;
  var payload = {};

  for (var key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key) && key !== 'action') {
      payload[key] = params[key];
    }
  }

  return { action: action, payload: payload };
}

/**
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {{ action?: string, payload?: Object, parseError?: string, message?: string }}
 */
function parsePostRequest(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {
      parseError: ErrorCodes.MISSING_BODY,
      message: 'POST request requires a JSON body',
    };
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (parseErr) {
    return {
      parseError: ErrorCodes.INVALID_JSON,
      message: 'Invalid JSON in POST body',
    };
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      parseError: ErrorCodes.INVALID_JSON,
      message: 'POST body must be a JSON object',
    };
  }

  var action = body.action;
  var payload = {};

  for (var key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key) && key !== 'action') {
      payload[key] = body[key];
    }
  }

  return { action: action, payload: payload };
}
