// platform/sdk/src/apps-script/apps-script-request-runtime.ts
// Shared Apps Script HTTP request helpers for async and sync clients.

import type { AppsScriptApiConfig } from './apps-script-api-config';
import {
  APPS_SCRIPT_BACKEND_ERROR_CODES,
  APPS_SCRIPT_ERROR_CODES,
  AppsScriptApiError,
  AppsScriptInvalidResponseError,
  AppsScriptMissingActionError,
  AppsScriptRecordNotFoundError,
  AppsScriptResponseParseError,
  AppsScriptTimeoutError,
  AppsScriptUnknownActionError,
} from './apps-script-api-errors';
import type { AppsScriptResponseEnvelope } from './apps-script-response-envelope';
import type { AppsScriptEndpoint } from './contracts/apps-script-endpoints';

export interface AppsScriptRequestInit {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly action: AppsScriptEndpoint;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export function buildAppsScriptActionBody(
  action: AppsScriptEndpoint,
  payload?: unknown,
): Record<string, unknown> {
  const body: Record<string, unknown> = { action };

  if (payload !== undefined && payload !== null) {
    if (typeof payload === 'object' && !Array.isArray(payload)) {
      Object.assign(body, payload as Record<string, unknown>);
    } else {
      body.payload = payload;
    }
  }

  return body;
}

export function buildAppsScriptUrl(
  baseUrl: string,
  action: AppsScriptEndpoint,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('action', action);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function buildAppsScriptHeaders(
  extra?: Readonly<Record<string, string>>,
): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  };
}

export function parseAppsScriptEnvelope<T>(
  parsed: unknown,
  context: Record<string, unknown>,
): AppsScriptResponseEnvelope<T> {
  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('ok' in parsed)
    || typeof (parsed as { ok: unknown }).ok !== 'boolean'
  ) {
    throw new AppsScriptInvalidResponseError(
      'Apps Script API returned an invalid response envelope',
      context,
    );
  }

  return parsed as AppsScriptResponseEnvelope<T>;
}

export function throwAppsScriptEnvelopeError(
  envelope: AppsScriptResponseEnvelope<unknown>,
  context: Record<string, unknown>,
  fallbackCode: string = APPS_SCRIPT_ERROR_CODES.API_ERROR,
): never {
  const backendCode = envelope.error?.code;
  const message = envelope.error?.message ?? 'Apps Script API request failed';
  const errorContext = {
    ...context,
    details: envelope.error?.details,
    backendCode,
  };

  switch (backendCode) {
    case APPS_SCRIPT_BACKEND_ERROR_CODES.MISSING_ACTION:
      throw new AppsScriptMissingActionError(message, errorContext);
    case APPS_SCRIPT_BACKEND_ERROR_CODES.UNKNOWN_ACTION:
      throw new AppsScriptUnknownActionError(message, errorContext);
    case APPS_SCRIPT_BACKEND_ERROR_CODES.RECORD_NOT_FOUND:
      throw new AppsScriptRecordNotFoundError(message, errorContext);
    default:
      throw new AppsScriptApiError(
        message,
        backendCode ?? fallbackCode,
        errorContext,
      );
  }
}

export function finalizeAppsScriptResponse<T>(
  parsed: unknown,
  httpStatus: number,
  context: Record<string, unknown>,
): T {
  const envelope = parseAppsScriptEnvelope<T>(parsed, context);

  if (httpStatus < 200 || httpStatus >= 300) {
    throwAppsScriptEnvelopeError(
      envelope,
      { ...context, httpStatus },
      APPS_SCRIPT_ERROR_CODES.HTTP_ERROR,
    );
  }

  if (!envelope.ok) {
    throwAppsScriptEnvelopeError(envelope, context);
  }

  return envelope.data as T;
}

export function executeAppsScriptRequestSync<T>(
  config: Readonly<AppsScriptApiConfig>,
  init: AppsScriptRequestInit,
  timeoutMs?: number,
): T {
  if (typeof XMLHttpRequest === 'undefined') {
    throw new AppsScriptApiError(
      'Synchronous Apps Script requests require a browser XMLHttpRequest environment',
      APPS_SCRIPT_ERROR_CODES.NETWORK_ERROR,
      { url: init.url, action: init.action },
    );
  }

  const effectiveTimeout = timeoutMs ?? config.timeoutMs;
  const xhr = new XMLHttpRequest();
  const context = {
    url: init.url,
    action: init.action,
    method: init.method,
  };

  try {
    xhr.open(init.method, init.url, false);
    xhr.timeout = effectiveTimeout;

    const headers = buildAppsScriptHeaders(init.headers);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.send(init.body);
  } catch (error) {
    throw new AppsScriptApiError(
      error instanceof Error ? error.message : 'Apps Script API request failed',
      APPS_SCRIPT_ERROR_CODES.NETWORK_ERROR,
      context,
    );
  }

  if (xhr.status === 0) {
    throw new AppsScriptTimeoutError('Apps Script API request timed out', {
      ...context,
      timeoutMs: effectiveTimeout,
    });
  }

  const rawText = xhr.responseText;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    throw new AppsScriptResponseParseError('Apps Script API returned invalid JSON', {
      ...context,
      status: xhr.status,
      bodyPreview: rawText.slice(0, 200),
    });
  }

  return finalizeAppsScriptResponse<T>(parsed, xhr.status, {
    ...context,
    status: xhr.status,
    bodyPreview: rawText.slice(0, 200),
  });
}
