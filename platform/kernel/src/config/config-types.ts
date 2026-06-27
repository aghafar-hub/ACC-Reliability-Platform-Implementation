// platform/kernel/src/config/config-types.ts
//
// All strongly-typed configuration interfaces for the ACC Reliability Platform.
// This file is the single source of truth for configuration shape.

import type { LogLevel } from '../logger';

// ── Environment ───────────────────────────────────────────────────────────────

/** All valid runtime environments for the platform. */
export type PlatformEnvironment = 'development' | 'test' | 'staging' | 'production';

// ── Storage ───────────────────────────────────────────────────────────────────

/**
 * Supported storage backend providers.
 * Only the provider name is configured here. The implementation lives in
 * platform/storage and is injected at runtime via the Platform SDK.
 */
export type StorageProvider =
  | 'GoogleSheets'
  | 'SQLServer'
  | 'PostgreSQL'
  | 'SQLite'
  | 'Mock';

// ── Config Source ─────────────────────────────────────────────────────────────

/** Where the configuration was sourced from. */
export type ConfigSource = 'static' | 'environment' | 'remote';

// ── Configuration Groups ──────────────────────────────────────────────────────

/** Core platform identity. */
export interface PlatformGroup {
  /** Human-readable platform name. Must not be empty. */
  readonly name: string;
  /** Semantic version of the running platform (e.g. "0.1.0"). */
  readonly version: string;
  /** Current runtime environment. */
  readonly environment: PlatformEnvironment;
}

/** Authentication and session security settings. */
export interface SecurityGroup {
  /** How long an authenticated session remains valid (minutes). */
  readonly sessionTimeoutMinutes: number;
  /** Maximum consecutive failed login attempts before lockout. */
  readonly maxLoginAttempts: number;
  /** Access token lifetime (hours). */
  readonly tokenExpiryHours: number;
}

/** Storage backend selection and connection behaviour. */
export interface StorageGroup {
  /** Which storage backend to use. No implementation is loaded at config time. */
  readonly provider: StorageProvider;
  /** Milliseconds to wait when opening a connection before timing out. */
  readonly connectionTimeoutMs: number;
  /** Milliseconds to wait for a single query to complete before timing out. */
  readonly queryTimeoutMs: number;
  /** Number of automatic retries on transient storage failures. */
  readonly maxRetries: number;
}

/** Structured logging configuration. */
export interface LoggingGroup {
  /** Minimum severity level that will be written to output. */
  readonly level: LogLevel;
  /** Whether ISO 8601 timestamps are prepended to each log line. */
  readonly includeTimestamps: boolean;
  /** Whether correlationId is appended to each log entry when available. */
  readonly includeCorrelationId: boolean;
  /** Static prefix string prepended to every log line. */
  readonly prefix: string;
}

/**
 * Feature flag registry.
 *
 * All flags are disabled by default. Enable per-environment via
 * ACC_FEATURE_* environment variables or a remote config provider.
 * Adding a new flag requires updating this interface, default-config.ts,
 * and environment.ts.
 */
export interface FeatureFlags {
  /** Authentication system (login, sessions, tokens). */
  readonly authentication: boolean;
  /** In-app notification delivery. */
  readonly notifications: boolean;
  /** Audit log recording for write operations. */
  readonly audit: boolean;
  /** Offline data access and sync. */
  readonly offlineMode: boolean;
  /** AI-assisted analysis features. */
  readonly aiAssistant: boolean;
  /** Developer tooling (debug panels, verbose output). */
  readonly developerTools: boolean;
}

/** Runtime concurrency and request-handling limits. */
export interface RuntimeGroup {
  /** Maximum number of in-flight requests at any one time. */
  readonly maxConcurrentRequests: number;
  /** Milliseconds before an individual request is considered timed out. */
  readonly requestTimeoutMs: number;
  /** Interval (ms) between platform health-check ticks. */
  readonly healthCheckIntervalMs: number;
}

/** Build-time and configuration-source metadata. */
export interface BuildGroup {
  /** How this configuration was assembled. */
  readonly configSource: ConfigSource;
  /** ISO 8601 timestamp of when this configuration was assembled. */
  readonly builtAt: string;
  /** Git commit hash at build time, if available. */
  readonly commitHash?: string;
}

/** Default behaviour applied to business modules at registration time. */
export interface ModuleDefaultsGroup {
  /** Whether a newly registered module is automatically enabled. */
  readonly enabledByDefault: boolean;
  /** Milliseconds allowed for a module to complete its load phase. */
  readonly loadTimeoutMs: number;
  /** Number of times a module load will be retried on failure. */
  readonly maxRetries: number;
}

// ── Composite Root ────────────────────────────────────────────────────────────

/**
 * The complete, validated platform application configuration.
 * Produced by ConfigManager.load() and cached for the lifetime of the process.
 * All nested groups are readonly. Do not mutate after construction.
 */
export interface AppConfig {
  readonly platform: PlatformGroup;
  readonly security: SecurityGroup;
  readonly storage: StorageGroup;
  readonly logging: LoggingGroup;
  readonly features: FeatureFlags;
  readonly runtime: RuntimeGroup;
  readonly build: BuildGroup;
  readonly moduleDefaults: ModuleDefaultsGroup;
}
