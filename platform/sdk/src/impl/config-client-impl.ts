// platform/sdk/src/impl/config-client-impl.ts
// Concrete IConfigClient — reads the frozen AppConfig via dotted key paths.
//
// Flat key convention:
//   'platform.name'              → config.platform.name
//   'storage.provider'           → config.storage.provider
//   'features.notifications'     → config.features.notifications
//   'logging.level'              → config.logging.level
//
// Keys are resolved by splitting on '.' and walking the config tree.
// All lookups are O(depth) on the key path; the config object is never
// flattened in memory until listEntries() or getSettings() is called.

import type { AppConfig, IConfigManager } from '@acc-reliability/kernel';
import { DEFAULT_CONFIG } from '@acc-reliability/kernel';
import type {
  ConfigDataType,
  ConfigEntry,
  ConfigSummary,
  IConfigClient,
} from '../clients/config-client';

/**
 * Configuration client backed by the frozen {@link AppConfig} loaded during
 * platform bootstrap.
 *
 * All reads are in-memory; no I/O is performed per call.
 * Dotted-path resolution walks the nested config groups; non-existent paths
 * return `undefined`.
 */
export class ConfigClientImpl implements IConfigClient {
  constructor(
    private readonly configManager: IConfigManager,
    private readonly defaults: Readonly<AppConfig> = DEFAULT_CONFIG,
  ) {}

  getSetting<T>(key: string): T | undefined {
    const value = this.walkPath(this.configManager.get(), key);
    if (value === undefined) return undefined;
    return value as T;
  }

  getSettings(prefix?: string): Record<string, unknown> {
    const flat: Record<string, unknown> = {};
    this.flattenInto(
      this.configManager.get() as unknown as Record<string, unknown>,
      '',
      flat,
    );

    if (prefix === undefined || prefix.length === 0) {
      return flat;
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(flat)) {
      if (k.startsWith(prefix)) {
        result[k] = v;
      }
    }
    return result;
  }

  listEntries(): readonly ConfigEntry[] {
    const current = this.getSettings();
    const defaultFlat: Record<string, unknown> = {};
    this.flattenInto(
      this.defaults as unknown as Record<string, unknown>,
      '',
      defaultFlat,
    );

    const entries: ConfigEntry[] = [];

    for (const [key, rawValue] of Object.entries(current)) {
      if (!this.isPrimitive(rawValue)) continue;

      const defaultValue = defaultFlat[key];
      const defaultPrimitive = this.isPrimitive(defaultValue) ? defaultValue : undefined;
      const group = key.split('.')[0] ?? key;

      entries.push({
        key,
        group,
        currentValue: rawValue,
        defaultValue: defaultPrimitive,
        isModified: defaultPrimitive !== undefined && rawValue !== defaultPrimitive,
        dataType: this.inferDataType(rawValue),
        editable: false,
      });
    }

    return entries.sort((a, b) => a.key.localeCompare(b.key));
  }

  getSummary(): ConfigSummary {
    const entries = this.listEntries();
    const groups = new Set(entries.map((entry) => entry.group));
    let modifiedCount = 0;

    for (const entry of entries) {
      if (entry.isModified) modifiedCount += 1;
    }

    return {
      totalKeys: entries.length,
      modifiedCount,
      defaultCount: entries.length - modifiedCount,
      groupCount: groups.size,
    };
  }

  async reload(): Promise<void> {
    await this.configManager.reload();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Walks the config tree using a dotted path like `'platform.version'`.
   * Returns the value at the path or `undefined` if any segment is missing.
   */
  private walkPath(config: AppConfig, key: string): unknown {
    const segments = key.split('.');
    let node: unknown = config;

    for (const segment of segments) {
      if (node === null || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[segment];
    }

    return node;
  }

  /**
   * Recursively flattens the config tree into a `Record<string, unknown>`.
   * Object values are recursed; primitives and arrays are stored directly.
   */
  private flattenInto(
    obj: Record<string, unknown>,
    prefix: string,
    result: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix.length > 0 ? `${prefix}.${key}` : key;

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.flattenInto(value as Record<string, unknown>, fullKey, result);
      } else {
        result[fullKey] = value;
      }
    }
  }

  private isPrimitive(value: unknown): value is string | number | boolean {
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean';
  }

  private inferDataType(value: string | number | boolean): ConfigDataType {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }
}
