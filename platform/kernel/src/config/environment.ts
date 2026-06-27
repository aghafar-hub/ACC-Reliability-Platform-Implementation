// platform/kernel/src/config/environment.ts
//
// Reads ACC_* environment variables and applies them as overrides on top of
// an existing AppConfig. This is pure — it produces a new config object and
// never mutates the input.
//
// Environment variable naming convention:
//   ACC_<GROUP>_<FIELD>   — group-level fields
//   ACC_FEATURE_<FLAG>    — feature flags (value: "true" | "false")

import type { LogLevel } from '../logger';
import type {
  AppConfig,
  BuildGroup,
  FeatureFlags,
  LoggingGroup,
  ModuleDefaultsGroup,
  PlatformEnvironment,
  PlatformGroup,
  RuntimeGroup,
  SecurityGroup,
  StorageGroup,
  StorageProvider,
  ConfigSource,
} from './config-types';

// ── Valid value sets (used for runtime guarding) ──────────────────────────────

const VALID_ENVIRONMENTS: ReadonlySet<string> = new Set<PlatformEnvironment>([
  'development',
  'test',
  'staging',
  'production',
]);

const VALID_STORAGE_PROVIDERS: ReadonlySet<string> = new Set<StorageProvider>([
  'GoogleSheets',
  'SQLServer',
  'PostgreSQL',
  'SQLite',
  'Mock',
]);

const VALID_LOG_LEVELS: ReadonlySet<string> = new Set<LogLevel>([
  'debug',
  'info',
  'warn',
  'error',
]);

const VALID_CONFIG_SOURCES: ReadonlySet<string> = new Set<ConfigSource>([
  'static',
  'environment',
  'remote',
]);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a new AppConfig with any recognised ACC_* environment variables
 * applied as overrides. Unrecognised or empty variables are silently ignored.
 * Runs in both Node.js and non-Node.js environments safely.
 */
export function applyEnvironmentOverrides(base: Readonly<AppConfig>): AppConfig {
  if (typeof process === 'undefined' || !process.env) {
    return base;
  }

  const env = process.env;

  return {
    platform:       resolvePlatform(base.platform, env),
    security:       resolveSecurity(base.security, env),
    storage:        resolveStorage(base.storage, env),
    logging:        resolveLogging(base.logging, env),
    features:       resolveFeatures(base.features, env),
    runtime:        resolveRuntime(base.runtime, env),
    build:          resolveBuild(base.build, env),
    moduleDefaults: resolveModuleDefaults(base.moduleDefaults, env),
  };
}

// ── Group resolvers ───────────────────────────────────────────────────────────

function resolvePlatform(
  base: PlatformGroup,
  env: NodeJS.ProcessEnv
): PlatformGroup {
  return {
    name:        stringOrDefault(env['ACC_PLATFORM_NAME'], base.name),
    version:     stringOrDefault(env['ACC_VERSION'], base.version),
    environment: validOrDefault(env['ACC_ENVIRONMENT'], VALID_ENVIRONMENTS, base.environment) as PlatformEnvironment,
  };
}

function resolveSecurity(
  base: SecurityGroup,
  env: NodeJS.ProcessEnv
): SecurityGroup {
  return {
    sessionTimeoutMinutes: positiveIntOrDefault(env['ACC_SECURITY_SESSION_TIMEOUT_MINUTES'], base.sessionTimeoutMinutes),
    maxLoginAttempts:      positiveIntOrDefault(env['ACC_SECURITY_MAX_LOGIN_ATTEMPTS'], base.maxLoginAttempts),
    tokenExpiryHours:      positiveIntOrDefault(env['ACC_SECURITY_TOKEN_EXPIRY_HOURS'], base.tokenExpiryHours),
  };
}

function resolveStorage(
  base: StorageGroup,
  env: NodeJS.ProcessEnv
): StorageGroup {
  return {
    provider:            validOrDefault(env['ACC_STORAGE_PROVIDER'], VALID_STORAGE_PROVIDERS, base.provider) as StorageProvider,
    connectionTimeoutMs: positiveIntOrDefault(env['ACC_STORAGE_CONNECTION_TIMEOUT_MS'], base.connectionTimeoutMs),
    queryTimeoutMs:      positiveIntOrDefault(env['ACC_STORAGE_QUERY_TIMEOUT_MS'], base.queryTimeoutMs),
    maxRetries:          positiveIntOrDefault(env['ACC_STORAGE_MAX_RETRIES'], base.maxRetries),
  };
}

function resolveLogging(
  base: LoggingGroup,
  env: NodeJS.ProcessEnv
): LoggingGroup {
  return {
    level:                validOrDefault(env['ACC_LOG_LEVEL'], VALID_LOG_LEVELS, base.level) as LogLevel,
    includeTimestamps:    boolOrDefault(env['ACC_LOG_INCLUDE_TIMESTAMPS'], base.includeTimestamps),
    includeCorrelationId: boolOrDefault(env['ACC_LOG_INCLUDE_CORRELATION_ID'], base.includeCorrelationId),
    prefix:               stringOrDefault(env['ACC_LOG_PREFIX'], base.prefix),
  };
}

function resolveFeatures(
  base: FeatureFlags,
  env: NodeJS.ProcessEnv
): FeatureFlags {
  return {
    authentication: boolOrDefault(env['ACC_FEATURE_AUTHENTICATION'], base.authentication),
    notifications:  boolOrDefault(env['ACC_FEATURE_NOTIFICATIONS'],  base.notifications),
    audit:          boolOrDefault(env['ACC_FEATURE_AUDIT'],           base.audit),
    offlineMode:    boolOrDefault(env['ACC_FEATURE_OFFLINE_MODE'],    base.offlineMode),
    aiAssistant:    boolOrDefault(env['ACC_FEATURE_AI_ASSISTANT'],    base.aiAssistant),
    developerTools: boolOrDefault(env['ACC_FEATURE_DEVELOPER_TOOLS'], base.developerTools),
  };
}

function resolveRuntime(
  base: RuntimeGroup,
  env: NodeJS.ProcessEnv
): RuntimeGroup {
  return {
    maxConcurrentRequests:  positiveIntOrDefault(env['ACC_RUNTIME_MAX_CONCURRENT_REQUESTS'],  base.maxConcurrentRequests),
    requestTimeoutMs:       positiveIntOrDefault(env['ACC_RUNTIME_REQUEST_TIMEOUT_MS'],       base.requestTimeoutMs),
    healthCheckIntervalMs:  positiveIntOrDefault(env['ACC_RUNTIME_HEALTH_CHECK_INTERVAL_MS'], base.healthCheckIntervalMs),
  };
}

function resolveBuild(
  base: BuildGroup,
  env: NodeJS.ProcessEnv
): BuildGroup {
  const resolved: BuildGroup = {
    configSource: validOrDefault(env['ACC_CONFIG_SOURCE'], VALID_CONFIG_SOURCES, base.configSource) as ConfigSource,
    builtAt:      base.builtAt,
  };

  const commitHash = env['ACC_COMMIT_HASH'];
  if (commitHash && commitHash.trim() !== '') {
    return { ...resolved, commitHash: commitHash.trim() };
  }

  return resolved;
}

function resolveModuleDefaults(
  base: ModuleDefaultsGroup,
  env: NodeJS.ProcessEnv
): ModuleDefaultsGroup {
  return {
    enabledByDefault: boolOrDefault(env['ACC_MODULE_ENABLED_BY_DEFAULT'], base.enabledByDefault),
    loadTimeoutMs:    positiveIntOrDefault(env['ACC_MODULE_LOAD_TIMEOUT_MS'], base.loadTimeoutMs),
    maxRetries:       positiveIntOrDefault(env['ACC_MODULE_MAX_RETRIES'],     base.maxRetries),
  };
}

// ── Primitive coercers ────────────────────────────────────────────────────────

function stringOrDefault(value: string | undefined, fallback: string): string {
  return value !== undefined && value.trim() !== '' ? value : fallback;
}

function boolOrDefault(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true')  return true;
  if (value === 'false') return false;
  return fallback;
}

function positiveIntOrDefault(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function validOrDefault<T extends string>(
  value: string | undefined,
  allowed: ReadonlySet<string>,
  fallback: T
): T {
  if (value !== undefined && allowed.has(value)) {
    return value as T;
  }
  return fallback;
}
