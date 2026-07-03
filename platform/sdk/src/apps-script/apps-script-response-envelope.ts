// platform/sdk/src/apps-script/apps-script-response-envelope.ts
// Wire response envelope for Google Apps Script API calls.

/** Structured error detail in an Apps Script API response envelope. */
export interface AppsScriptErrorDetail {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, string>>;
}

/**
 * JSON envelope returned by the Apps Script web app for every API call.
 *
 * Success: `{ ok: true, data: ..., meta?: ... }`
 * Failure: `{ ok: false, error: { code, message, details? } }`
 */
export interface AppsScriptResponseEnvelope<TData = unknown> {
  readonly ok: boolean;
  readonly data?: TData;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly error?: AppsScriptErrorDetail;
}
