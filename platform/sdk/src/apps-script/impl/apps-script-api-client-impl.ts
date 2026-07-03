// platform/sdk/src/apps-script/impl/apps-script-api-client-impl.ts

import type { AppsScriptApiConfig } from '../apps-script-api-config';
import {
  APPS_SCRIPT_ERROR_CODES,
  AppsScriptApiError,
  AppsScriptResponseParseError,
  AppsScriptTimeoutError,
} from '../apps-script-api-errors';
import type {
  AppsScriptApiRequestOptions,
  IAppsScriptApiClient,
} from '../apps-script-api-client';
import {
  buildAppsScriptActionBody,
  buildAppsScriptHeaders,
  buildAppsScriptUrl,
  executeAppsScriptRequestSync,
  finalizeAppsScriptResponse,
} from '../apps-script-request-runtime';
import type { AppsScriptEndpoint } from '../contracts/apps-script-endpoints';

export class AppsScriptApiClient implements IAppsScriptApiClient {
  readonly config: Readonly<AppsScriptApiConfig>;

  constructor(config: AppsScriptApiConfig) {
    this.config = Object.freeze({
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      timeoutMs: config.timeoutMs,
    });
  }

  isConfigured(): boolean {
    return this.config.baseUrl.length > 0;
  }

  request<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): Promise<T> {
    if (payload === undefined) {
      return this.get<T>(endpoint, undefined, options);
    }
    return this.post<T>(endpoint, payload, options);
  }

  requestSync<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): T {
    if (payload === undefined) {
      return this.getSync<T>(endpoint, undefined, options);
    }
    return this.postSync<T>(endpoint, payload, options);
  }

  get<T>(
    endpoint: AppsScriptEndpoint,
    query?: Readonly<Record<string, string | number | boolean | undefined>>,
    options?: AppsScriptApiRequestOptions,
  ): Promise<T> {
    const url = buildAppsScriptUrl(this.config.baseUrl, endpoint, query);
    return this.executeAsync<T>({
      method: 'GET',
      url,
      action: endpoint,
      headers: options?.headers,
    }, options?.timeoutMs);
  }

  getSync<T>(
    endpoint: AppsScriptEndpoint,
    query?: Readonly<Record<string, string | number | boolean | undefined>>,
    options?: AppsScriptApiRequestOptions,
  ): T {
    const url = buildAppsScriptUrl(this.config.baseUrl, endpoint, query);
    return executeAppsScriptRequestSync<T>(this.config, {
      method: 'GET',
      url,
      action: endpoint,
      headers: options?.headers,
    }, options?.timeoutMs);
  }

  post<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): Promise<T> {
    const body = buildAppsScriptActionBody(endpoint, payload);

    return this.executeAsync<T>({
      method: 'POST',
      url: this.config.baseUrl,
      action: endpoint,
      headers: options?.headers,
      body: JSON.stringify(body),
    }, options?.timeoutMs);
  }

  postSync<T>(
    endpoint: AppsScriptEndpoint,
    payload?: unknown,
    options?: AppsScriptApiRequestOptions,
  ): T {
    const body = buildAppsScriptActionBody(endpoint, payload);

    return executeAppsScriptRequestSync<T>(this.config, {
      method: 'POST',
      url: this.config.baseUrl,
      action: endpoint,
      headers: options?.headers,
      body: JSON.stringify(body),
    }, options?.timeoutMs);
  }

  private async executeAsync<T>(
    init: {
      method: 'GET' | 'POST';
      url: string;
      action: AppsScriptEndpoint;
      headers?: Readonly<Record<string, string>>;
      body?: string;
    },
    timeoutMs?: number,
  ): Promise<T> {
    const effectiveTimeout = timeoutMs ?? this.config.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);
    const context = {
      url: init.url,
      action: init.action,
      method: init.method,
    };

    try {
      const response = await fetch(init.url, {
        method: init.method,
        headers: buildAppsScriptHeaders(init.headers),
        body: init.body,
        signal: controller.signal,
      });

      const rawText = await response.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        throw new AppsScriptResponseParseError('Apps Script API returned invalid JSON', {
          ...context,
          status: response.status,
          bodyPreview: rawText.slice(0, 200),
        });
      }

      return finalizeAppsScriptResponse<T>(parsed, response.status, {
        ...context,
        status: response.status,
        bodyPreview: rawText.slice(0, 200),
      });
    } catch (error) {
      if (error instanceof AppsScriptApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppsScriptTimeoutError('Apps Script API request timed out', {
          ...context,
          timeoutMs: effectiveTimeout,
        });
      }
      throw new AppsScriptApiError(
        error instanceof Error ? error.message : 'Apps Script API request failed',
        APPS_SCRIPT_ERROR_CODES.NETWORK_ERROR,
        context,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createAppsScriptApiClient(config: AppsScriptApiConfig): IAppsScriptApiClient {
  return new AppsScriptApiClient(config);
}
