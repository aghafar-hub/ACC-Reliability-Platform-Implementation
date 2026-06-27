// platform/kernel/src/config/default-config.ts
//
// Static default configuration for the ACC Reliability Platform.
// These values are always loaded first. They are overridden by the
// async config provider (if set) and then by ACC_* environment variables.
//
// Explicit type parameters on every Object.freeze<Group>() call are required
// to prevent TypeScript from widening string literals (e.g. 'development' → string).
//
// ⚠ Do not add secrets, credentials, or environment-specific values here.

import type {
  AppConfig,
  BuildGroup,
  FeatureFlags,
  LoggingGroup,
  ModuleDefaultsGroup,
  PlatformGroup,
  RuntimeGroup,
  SecurityGroup,
  StorageGroup,
} from './config-types';

export const DEFAULT_CONFIG: Readonly<AppConfig> = Object.freeze<AppConfig>({
  platform: Object.freeze<PlatformGroup>({
    name:        'ACC Reliability Platform',
    version:     '0.1.0',
    environment: 'development',
  }),

  security: Object.freeze<SecurityGroup>({
    sessionTimeoutMinutes: 60,
    maxLoginAttempts:      5,
    tokenExpiryHours:      24,
  }),

  storage: Object.freeze<StorageGroup>({
    provider:            'GoogleSheets',
    connectionTimeoutMs: 10_000,
    queryTimeoutMs:      30_000,
    maxRetries:          3,
  }),

  logging: Object.freeze<LoggingGroup>({
    level:                'info',
    includeTimestamps:    true,
    includeCorrelationId: true,
    prefix:               '[ACC-Platform]',
  }),

  features: Object.freeze<FeatureFlags>({
    authentication: false,
    notifications:  false,
    audit:          false,
    offlineMode:    false,
    aiAssistant:    false,
    developerTools: true,
  }),

  runtime: Object.freeze<RuntimeGroup>({
    maxConcurrentRequests: 10,
    requestTimeoutMs:      30_000,
    healthCheckIntervalMs: 60_000,
  }),

  build: Object.freeze<BuildGroup>({
    configSource: 'static',
    builtAt:      new Date().toISOString(),
  }),

  moduleDefaults: Object.freeze<ModuleDefaultsGroup>({
    enabledByDefault: false,
    loadTimeoutMs:    15_000,
    maxRetries:       2,
  }),
});
