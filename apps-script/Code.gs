/**
 * ACC Reliability Platform — Apps Script web app entry points.
 *
 * Routes by `action` query parameter (GET) or `action` field in POST JSON body.
 * Response envelope: { ok, data|error, meta? }
 */

function doGet(e) {
  try {
    var parsed = parseGetRequest(e);
    return routeRequest('GET', parsed);
  } catch (err) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      err && err.message ? err.message : String(err)
    );
  }
}

function doPost(e) {
  try {
    var parsed = parsePostRequest(e);

    if (parsed.parseError) {
      return errorResponse(parsed.parseError, parsed.message);
    }

    return routeRequest('POST', parsed);
  } catch (err) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      err && err.message ? err.message : String(err)
    );
  }
}
