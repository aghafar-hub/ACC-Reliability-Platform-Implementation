// platform/kernel/src/index.ts
// Public API surface for @acc-reliability/kernel

// ── Bootstrap ────────────────────────────────────────────────────────────────
export { bootstrapPlatform } from './bootstrap';
export type { BootstrapResult } from './bootstrap';

// ── Platform Context ─────────────────────────────────────────────────────────
export { createPlatformContext } from './platform-context';
export type { PlatformContext } from './platform-context';

// ── Configuration — Types ────────────────────────────────────────────────────
export type {
  AppConfig,
  PlatformEnvironment,
  PlatformGroup,
  SecurityGroup,
  StorageGroup,
  StorageProvider,
  LoggingGroup,
  FeatureFlags,
  RuntimeGroup,
  BuildGroup,
  ModuleDefaultsGroup,
  ConfigSource,
} from './config/config-types';

// ── Configuration — Manager ───────────────────────────────────────────────────
export { ConfigManager } from './config/config-manager';
export type { IConfigManager, IConfigProvider } from './config/config-manager';

// ── Configuration — Validator ─────────────────────────────────────────────────
export { ConfigValidator } from './config/config-validator';
export type { ValidationResult } from './config/config-validator';

// ── Configuration — Defaults ──────────────────────────────────────────────────
export { DEFAULT_CONFIG } from './config/default-config';

// ── Logger ────────────────────────────────────────────────────────────────────
export { PlatformLogger, kernelLogger } from './logger';
export type { ILogger, LogLevel, LogEntry, LoggerOptions } from './logger';

// ── Service Registry ──────────────────────────────────────────────────────────
export { ServiceRegistry } from './service-registry';
export type {
  IServiceRegistry,
  ServiceDescriptor,
  ServiceInfo,
  ServiceStatus,
} from './service-registry';

// ── Module Registry ───────────────────────────────────────────────────────────
export { ModuleRegistry } from './module-registry';
export type {
  IModuleRegistry,
  ModuleDescriptor,
  ModuleStatus,
} from './module-registry';

// ── Dependency Injection ──────────────────────────────────────────────────────
export { Token } from './di/token';
export { Container } from './di/container';
export type {
  IContainer,
  Factory,
  RegistrationKind,
  ContainerRegistrationInfo,
} from './di/container-types';

// ── Event Bus ─────────────────────────────────────────────────────────────────
export { EventToken } from './events/event-token';
export { NullEventBus } from './events/null-event-bus';
export type {
  IEventBus,
  IEventHandler,
  EventSubscription,
  EventChannelInfo,
} from './events/event-bus-types';

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  PlatformError,
  ConfigurationError,
  RegistryError,
  ModuleError,
  ContainerError,
  EventBusError,
} from './errors';
