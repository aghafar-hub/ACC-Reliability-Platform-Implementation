// backend/src/gas-do-post-adapter.ts
// Google Apps Script doPost adapter contracts for the ACC Reliability Platform backend.
//
// Conforms to 008_APPS_SCRIPT_ARCHITECTURE_STANDARD.md §4 (API Gateway):
// every request shall pass through a single API Gateway entry point.
//
// In Google Apps Script, doPost(e) is that entry point.  IGasDoPostAdapter
// defines the contract for converting a GAS event into backend processing
// and returning a serialisable output.
//
// Design decisions:
//   - GasPostEvent is a structural stub — it mirrors the shape of the GAS
//     event object without importing @types/google-apps-script.
//   - GasPostOutput mirrors ContentService.createTextOutput() return shape
//     without importing GAS runtime APIs.
//   - IGasDoPostHandler defines the global function signature expected in
//     the Apps Script project file (future deployment milestone).
//   - No implementation, no appsscript.json, no clasp configuration.

// ── GasPostEvent ──────────────────────────────────────────────────────────────

/**
 * Structural stub for the Google Apps Script doPost event parameter.
 *
 * Mirrors the relevant fields of the GAS event object.  Real GAS types are
 * not imported — this interface is sufficient for contract definition and
 * unit testing with plain objects.
 */
export interface GasPostEvent {
  /** Raw POST body contents (typically JSON string). */
  readonly postData?: {
    readonly contents: string;
    readonly name?: string;
    readonly type?: string;
    readonly length?: number;
  };
  /** URL query/path parameters supplied by the GAS web app. */
  readonly parameter?: Readonly<Record<string, string>>;
  /** Request headers when available. */
  readonly headers?: Readonly<Record<string, string>>;
  /** HTTP method (typically `'POST'` for doPost). */
  readonly method?: string;
  /** Full request path when exposed by the GAS runtime. */
  readonly pathInfo?: string;
  /** Query string portion of the URL. */
  readonly queryString?: string;
  /** Content length in bytes. */
  readonly contentLength?: number;
}

// ── GasPostOutput ─────────────────────────────────────────────────────────────

/**
 * Structural stub for the output returned by a GAS doPost handler.
 *
 * Mirrors ContentService.createTextOutput() result shape.  The adapter
 * serialises {@link BackendResponseEnvelope} to JSON and sets mimeType to
 * `'application/json'`.
 */
export interface GasPostOutput {
  /** Serialised response body (typically JSON string). */
  readonly content: string;
  /** MIME type of the response (typically `'application/json'`). */
  readonly mimeType: string;
}

// ── IGasDoPostAdapter ─────────────────────────────────────────────────────────

/**
 * Converts a GAS doPost event into backend processing and a serialisable output.
 *
 * Pipeline:
 *   GasPostEvent → parse JSON → BackendRequestEnvelope
 *   → create BackendContext → IRouteDispatcher.dispatch()
 *   → BackendResponseEnvelope → JSON → GasPostOutput
 *
 * Must not throw.  Parse failures and dispatch errors are returned as structured
 * JSON error responses in the output content.
 */
export interface IGasDoPostAdapter {
  /**
   * Handles a single doPost invocation.
   *
   * Returns a {@link GasPostOutput} with JSON content.  Never throws.
   */
  handlePost(event: GasPostEvent): GasPostOutput | Promise<GasPostOutput>;
}

// ── IGasDoPostHandler ─────────────────────────────────────────────────────────

/**
 * Global entry-point function signature for the Apps Script project.
 *
 * This is the function registered as `doPost` in the GAS web app.
 * A future deployment milestone will wire a concrete IGasDoPostAdapter
 * implementation to this handler in the Apps Script source file.
 *
 * Example (future deployment — not implemented in this milestone):
 * ```typescript
 * function doPost(e: GasPostEvent): GasPostOutput {
 *   return gasDoPostAdapter.handlePost(e);
 * }
 * ```
 */
export type IGasDoPostHandler = (event: GasPostEvent) => GasPostOutput | Promise<GasPostOutput>;
