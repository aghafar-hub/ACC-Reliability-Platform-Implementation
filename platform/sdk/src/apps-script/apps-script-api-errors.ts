// platform/sdk/src/apps-script/apps-script-api-errors.ts
// Structured errors for Apps Script API integration.

import { PlatformError } from '@acc-reliability/kernel';

/** Canonical SDK error codes for Apps Script API integration. */
export const APPS_SCRIPT_ERROR_CODES = {
  NOT_CONFIGURED: 'APPS_SCRIPT_NOT_CONFIGURED',
  MISSING_ACTION: 'APPS_SCRIPT_MISSING_ACTION',
  UNKNOWN_ACTION: 'APPS_SCRIPT_UNKNOWN_ACTION',
  INVALID_RESPONSE: 'APPS_SCRIPT_INVALID_RESPONSE',
  API_ERROR: 'APPS_SCRIPT_API_ERROR',
  TIMEOUT: 'APPS_SCRIPT_TIMEOUT',
  NETWORK_ERROR: 'APPS_SCRIPT_NETWORK_ERROR',
  HTTP_ERROR: 'APPS_SCRIPT_HTTP_ERROR',
  RESPONSE_PARSE_ERROR: 'APPS_SCRIPT_RESPONSE_PARSE_ERROR',
  NOT_IMPLEMENTED: 'APPS_SCRIPT_NOT_IMPLEMENTED',
  RECORD_NOT_FOUND: 'APPS_SCRIPT_RECORD_NOT_FOUND',
} as const;

/** Backend error codes echoed in the Apps Script `error.code` field. */
export const APPS_SCRIPT_BACKEND_ERROR_CODES = {
  MISSING_ACTION: 'MISSING_ACTION',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
} as const;

/** Thrown when Apps Script integration is selected but `appsScriptBaseUrl` is missing. */
export class AppsScriptNotConfiguredError extends PlatformError {
  constructor(
    message: string = 'Apps Script API is not configured: appsScriptBaseUrl is required when apiMode is appsScript or master-data provider is googleSheets',
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.NOT_CONFIGURED, context);
    this.name = 'AppsScriptNotConfiguredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an Apps Script repository method is not yet implemented. */
export class AppsScriptNotImplementedError extends PlatformError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.NOT_IMPLEMENTED, context);
    this.name = 'AppsScriptNotImplementedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the Apps Script HTTP request fails or returns a non-success envelope. */
export class AppsScriptApiError extends PlatformError {
  constructor(
    message: string,
    code: string = APPS_SCRIPT_ERROR_CODES.API_ERROR,
    context?: Record<string, unknown>,
  ) {
    super(message, code, context);
    this.name = 'AppsScriptApiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the Apps Script API request is missing the required `action` parameter. */
export class AppsScriptMissingActionError extends AppsScriptApiError {
  constructor(
    message: string = 'Apps Script API request is missing the action parameter',
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.MISSING_ACTION, context);
    this.name = 'AppsScriptMissingActionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the Apps Script API request targets an unknown action. */
export class AppsScriptUnknownActionError extends AppsScriptApiError {
  constructor(
    message: string = 'Apps Script API request targets an unknown action',
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.UNKNOWN_ACTION, context);
    this.name = 'AppsScriptUnknownActionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the Apps Script response body is not a valid API envelope. */
export class AppsScriptInvalidResponseError extends AppsScriptApiError {
  constructor(
    message: string = 'Apps Script API returned an invalid response envelope',
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.INVALID_RESPONSE, context);
    this.name = 'AppsScriptInvalidResponseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a requested Apps Script master-data record does not exist. */
export class AppsScriptRecordNotFoundError extends AppsScriptApiError {
  constructor(
    message: string = 'Apps Script master-data record not found',
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.RECORD_NOT_FOUND, context);
    this.name = 'AppsScriptRecordNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an Apps Script HTTP request exceeds the configured timeout. */
export class AppsScriptTimeoutError extends AppsScriptApiError {
  constructor(
    message: string = 'Apps Script API request timed out',
    context?: Record<string, unknown>,
  ) {
    super(message, APPS_SCRIPT_ERROR_CODES.TIMEOUT, context);
    this.name = 'AppsScriptTimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the Apps Script response body is not valid JSON. */
export class AppsScriptResponseParseError extends AppsScriptInvalidResponseError {
  constructor(
    message: string = 'Apps Script API returned invalid JSON',
    context?: Record<string, unknown>,
  ) {
    super(message, context);
    this.code = APPS_SCRIPT_ERROR_CODES.RESPONSE_PARSE_ERROR;
    this.name = 'AppsScriptResponseParseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
