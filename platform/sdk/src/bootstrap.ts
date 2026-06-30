// platform/sdk/src/bootstrap.ts
// Platform SDK bootstrap — the single public entry point to start the full
// ACC Reliability Platform and obtain an initialized IPlatformSdk instance.
//
// Responsibilities:
//   1. Boot the platform kernel (config, logger, service registry, lifecycle).
//   2. Instantiate and register all platform services (health, metrics,
//      notifications, actions, audit).
//   3. Build and validate the DI container.
//   4. Create a system-level SdkContext (authentication placeholder).
//   5. Assemble the PlatformSdk with all typed clients.
//   6. Fail fast with a clear error if any required service is missing.
//
// Non-responsibilities:
//   - User authentication (not yet implemented).
//   - Storage wiring (not yet implemented).
//   - Workflow engine (not yet implemented).
//   - Business module initialization (caller's responsibility).

import {
  bootstrapPlatform as kernelBootstrap,
  Container,
  Token,
  PlatformError,
} from '@acc-reliability/kernel';
import type { IConfigManager, ILogger, IServiceRegistry, ServiceStatus } from '@acc-reliability/kernel';
import {
  HealthService,
  MetricsService,
  NotificationService,
  ActionService,
  AuditService,
  UserService,
  InMemoryUserRepository,
  ContractorService,
  InMemoryContractorRepository,
  ModuleService,
  InMemoryModuleRepository,
  NotificationManagementService,
  InMemoryNotificationManagementRepository,
  ReportingService,
  InMemoryReportingRepository,
  WorkflowService,
  InMemoryWorkflowRepository,
  PermissionService,
  AuthService,
  InMemoryAuthRepository,
  createUserId,
  createContractorId,
  createSessionId,
} from '@acc-reliability/services';
import type {
  IHealthService,
  IMetricsService,
  INotificationService,
  IActionService,
  IAuditService,
  IUserService,
  IContractorService,
  IModuleService,
  INotificationManagementService,
  IReportingService,
  IWorkflowService,
  IPermissionService,
  IAuthService,
  HealthStatus,
  CreateNotificationRuleRequest,
  CreateReportRequest,
  CreateWorkflowDefinitionRequest,
  UserContext,
  UserRole,
  RegisterModuleRequest,
  ModuleHealthStatus,
  ModuleConfigStatus,
  ModuleLocalizationStatus,
  ModuleSearchStatus,
} from '@acc-reliability/services';
import { globalScope } from '@acc-reliability/storage';

import type { IPlatformSdk } from './platform-sdk';
import type { SdkContext } from './sdk-context';
import { PlatformSdk } from './impl/platform-sdk-impl';
import { AuthClientImpl } from './impl/auth-client-impl';
import { SessionStorageAuthRepository } from './impl/session-storage-auth-repository';
import { DevAuthProvider } from './impl/dev-auth-provider';
import { NullStorageClient } from './impl/null-storage-client';
import { PermissionsClientImpl } from './impl/permissions-client-impl';
import { NullWorkflowClient } from './impl/null-workflow-client';
import { NotificationsClientImpl } from './impl/notifications-client-impl';
import { ActionsClientImpl } from './impl/actions-client-impl';
import { AuditClientImpl } from './impl/audit-client-impl';
import { HealthClientImpl } from './impl/health-client-impl';
import { MetricsClientImpl } from './impl/metrics-client-impl';
import { ConfigClientImpl } from './impl/config-client-impl';
import { UserClientImpl } from './impl/user-client-impl';
import { ContractorClientImpl } from './impl/contractor-client-impl';
import { ModuleClientImpl } from './impl/module-client-impl';
import { NotificationManagementClientImpl } from './impl/notification-management-client-impl';
import { ReportingClientImpl } from './impl/reporting-client-impl';
import { WorkflowsClientImpl } from './impl/workflows-client-impl';

// ── DI tokens ─────────────────────────────────────────────────────────────────

/** DI tokens for all platform services registered by the SDK bootstrap. */
export const SDK_TOKENS = {
  auth:          new Token<IAuthService>('platform.auth'),
  health:        new Token<IHealthService>('platform.health'),
  metrics:       new Token<IMetricsService>('platform.metrics'),
  notifications: new Token<INotificationService>('platform.notifications'),
  actions:       new Token<IActionService>('platform.actions'),
  audit:         new Token<IAuditService>('platform.audit'),
  identity:      new Token<IUserService>('platform.identity'),
  contractors:   new Token<IContractorService>('platform.contractors'),
  modules:       new Token<IModuleService>('platform.modules'),
  notificationManagement: new Token<INotificationManagementService>('platform.notification-management'),
  reporting:   new Token<IReportingService>('platform.reporting'),
  workflows:   new Token<IWorkflowService>('platform.workflows'),
  permissions:   new Token<IPermissionService>('platform.permissions'),
} as const;

// ── Required service ids ──────────────────────────────────────────────────────

const REQUIRED_SERVICE_IDS: readonly string[] = [
  'platform.logger',
  'platform.config',
  'platform.eventBus',
  'platform.lifecycle',
  'platform.auth',
  'platform.health',
  'platform.metrics',
  'platform.notifications',
  'platform.actions',
  'platform.audit',
  'platform.identity',
  'platform.contractors',
  'platform.modules',
  'platform.notification-management',
  'platform.reporting',
  'platform.workflows',
  'platform.permissions',
];

// ── Bootstrap result ──────────────────────────────────────────────────────────

/** Returned by {@link bootstrapPlatformSdk} on successful initialization. */
export interface SdkBootstrapResult {
  /** Fully initialized SDK ready for use by business modules. */
  readonly sdk: IPlatformSdk;
  /**
   * The DI container holding all registered service tokens.
   * Exposed for advanced use (e.g. integration tests, module scaffolding).
   * Business modules must NOT use the container directly.
   */
  readonly container: Container;
  /** Wall-clock milliseconds taken for the full bootstrap to complete. */
  readonly durationMs: number;
}

// ── bootstrapPlatformSdk ──────────────────────────────────────────────────────

/**
 * Starts the ACC Reliability Platform and returns a fully initialized
 * {@link IPlatformSdk}.
 *
 * This is the single approved entry point for all applications.  Call it
 * once at startup and pass the returned `sdk` to modules that need it.
 *
 * ```ts
 * const { sdk } = await bootstrapPlatformSdk();
 *
 * sdk.audit.record(...);
 * sdk.health.checkAll();
 * sdk.notifications.send(...);
 * ```
 *
 * @throws {PlatformError} if kernel bootstrap fails or required services are
 *   missing after registration.
 */
export async function bootstrapPlatformSdk(): Promise<SdkBootstrapResult> {
  const startedAt = Date.now();

  // ── Step 1: Boot kernel ──────────────────────────────────────────────────
  const { context: kernelContext } = await kernelBootstrap();

  const logger  = kernelContext.services.getRequired<ILogger>('platform.logger');
  const configManager = kernelContext.services.getRequired<IConfigManager>('platform.configManager');
  const registry = kernelContext.services;

  logger.info('Platform SDK: registering platform services…');

  // ── Step 2: Build DI container ───────────────────────────────────────────
  const container = new Container(logger);

  // ── Step 3: Instantiate and register platform services ───────────────────

  const healthService        = new HealthService();
  const metricsService       = new MetricsService();
  const notificationService  = new NotificationService();
  const actionService        = new ActionService();
  const auditService         = new AuditService();

  // Authentication Service — provider-independent; uses abstract repository and provider.
  // SessionStorageAuthRepository is used in browser environments; InMemoryAuthRepository
  // is the fallback for server-side or test contexts.
  const authRepository = (typeof window !== 'undefined')
    ? new SessionStorageAuthRepository()
    : new InMemoryAuthRepository();
  const authProvider = new DevAuthProvider();
  const authService  = new AuthService(authRepository, auditService, authProvider);

  // Resolve the event bus registered by the kernel bootstrap
  const eventBus = kernelContext.services.getRequired<import('@acc-reliability/kernel').IEventBus>('platform.eventBus');

  // User Management Service — authentication-provider-agnostic
  const userRepository = new InMemoryUserRepository();
  const userService    = new UserService(userRepository, auditService, eventBus);

  // Contractor Management Service
  const contractorRepository = new InMemoryContractorRepository();
  const contractorService    = new ContractorService(contractorRepository, auditService, eventBus);

  // Seed known contractors (ACC, RHI, ASEC) so the UI has real data on first load
  seedContractors(contractorService);

  // Module Registry Service
  const moduleRepository = new InMemoryModuleRepository();
  const moduleService    = new ModuleService(moduleRepository, auditService, eventBus);

  // Seed platform modules so the UI has real data on first load
  seedModules(moduleService);

  // Notification Management Service — configuration only, no delivery
  const notificationManagementRepository = new InMemoryNotificationManagementRepository();
  const notificationManagementService    = new NotificationManagementService(
    notificationManagementRepository,
    auditService,
    eventBus,
  );

  // Seed notification configuration so the UI has real data on first load
  seedNotificationManagement(notificationManagementService);

  // Reporting Service — configuration only, no report execution
  const reportingRepository = new InMemoryReportingRepository();
  const reportingService    = new ReportingService(
    reportingRepository,
    auditService,
    eventBus,
  );

  // Seed reporting configuration so the UI has real data on first load
  seedReporting(reportingService);

  // Workflow & Approval Service — definitions and basic instance lifecycle
  const workflowRepository = new InMemoryWorkflowRepository();
  const workflowService    = new WorkflowService(workflowRepository, auditService, eventBus);

  // Seed workflow definitions so the UI has real data on first load
  seedWorkflows(workflowService);

  // Permission Service — derives effective permissions from UserContext roles;
  // uses userService for suspended/archived account status enforcement.
  const permissionService = new PermissionService(auditService, userService);

  // Register in DI container (singletons — one instance per bootstrap)
  container.registerSingleton(SDK_TOKENS.auth,          authService);
  container.registerSingleton(SDK_TOKENS.health,        healthService);
  container.registerSingleton(SDK_TOKENS.metrics,       metricsService);
  container.registerSingleton(SDK_TOKENS.notifications, notificationService);
  container.registerSingleton(SDK_TOKENS.actions,       actionService);
  container.registerSingleton(SDK_TOKENS.audit,         auditService);
  container.registerSingleton(SDK_TOKENS.identity,      userService);
  container.registerSingleton(SDK_TOKENS.contractors,   contractorService);
  container.registerSingleton(SDK_TOKENS.modules,       moduleService);
  container.registerSingleton(SDK_TOKENS.notificationManagement, notificationManagementService);
  container.registerSingleton(SDK_TOKENS.reporting,   reportingService);
  container.registerSingleton(SDK_TOKENS.workflows,   workflowService);
  container.registerSingleton(SDK_TOKENS.permissions,   permissionService);

  // Register in ServiceRegistry (lifecycle tracking + status visibility)
  registry.register('platform.auth',          'Authentication Service',       authService);
  registry.register('platform.health',        'Health Service',               healthService);
  registry.register('platform.metrics',       'Metrics Service',              metricsService);
  registry.register('platform.notifications', 'Notification Service',         notificationService);
  registry.register('platform.actions',       'Action Service',               actionService);
  registry.register('platform.audit',         'Audit Service',                auditService);
  registry.register('platform.identity',      'User Management Service',      userService);
  registry.register('platform.contractors',   'Contractor Management Service', contractorService);
  registry.register('platform.modules',       'Module Registry Service',      moduleService);
  registry.register('platform.notification-management', 'Notification Management Service', notificationManagementService);
  registry.register('platform.reporting',   'Reporting Service',              reportingService);
  registry.register('platform.workflows',   'Workflow & Approval Service',    workflowService);
  registry.register('platform.permissions',   'Permission Service',           permissionService);

  // Transition all platform services to 'running'
  for (const id of [
    'platform.auth', 'platform.health', 'platform.metrics', 'platform.notifications',
    'platform.actions', 'platform.audit', 'platform.identity',
    'platform.contractors', 'platform.modules', 'platform.notification-management', 'platform.reporting', 'platform.workflows', 'platform.permissions',
  ] as const) {
    registry.setStatus(id, 'running');
  }

  // Register platform services as health-monitored components and prime checks.
  registerPlatformHealthChecks(healthService, registry);
  await healthService.checkAll();

  // ── Step 4: Validate bootstrap ───────────────────────────────────────────
  validateRequiredServices(registry, logger);

  // ── Step 5: Create system SDK context (auth placeholder) ─────────────────
  const sdkContext = buildSystemContext();

  // ── Step 6: Assemble SDK ─────────────────────────────────────────────────
  const sdk = new PlatformSdk({
    auth:          new AuthClientImpl(authService),
    permissions:   new PermissionsClientImpl(permissionService, sdkContext),
    notifications: new NotificationsClientImpl(notificationService, sdkContext),
    actions:       new ActionsClientImpl(actionService, sdkContext),
    audit:         new AuditClientImpl(auditService, sdkContext),
    storage:       new NullStorageClient(),
    workflow:      new NullWorkflowClient(),
    config:        new ConfigClientImpl(configManager),
    health:        new HealthClientImpl(healthService),
    metrics:       new MetricsClientImpl(metricsService),
    users:         new UserClientImpl(userService, sdkContext),
    contractors:   new ContractorClientImpl(contractorService, sdkContext),
    modules:       new ModuleClientImpl(moduleService, sdkContext),
    notificationManagement: new NotificationManagementClientImpl(notificationManagementService, sdkContext),
    reporting:     new ReportingClientImpl(reportingService, sdkContext),
    workflows:     new WorkflowsClientImpl(workflowService, sdkContext),
    context:       sdkContext,
  });

  const durationMs = Date.now() - startedAt;

  logger.info('Platform SDK bootstrap complete ✓', {
    durationMs,
    runningServices: registry.listByStatus('running').map((s) => s.serviceId),
  });

  return { sdk, container, durationMs };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_SERVICE_VERSION = '1.0';

function mapServiceStatusToHealth(status: ServiceStatus): HealthStatus {
  switch (status) {
    case 'running':     return 'healthy';
    case 'degraded':    return 'degraded';
    case 'failed':      return 'critical';
    case 'stopped':     return 'offline';
    case 'registered':
    case 'initialized': return 'warning';
    default:            return 'warning';
  }
}

function serviceStatusMessage(status: ServiceStatus): string {
  switch (status) {
    case 'running':      return 'Service is running normally.';
    case 'degraded':     return 'Service is running in degraded mode.';
    case 'failed':       return 'Service has failed.';
    case 'stopped':      return 'Service is stopped.';
    case 'registered':   return 'Service is registered but not yet initialized.';
    case 'initialized':  return 'Service is initialized but not yet running.';
    default:             return `Service lifecycle status: ${status}`;
  }
}

/**
 * Registers every service in the platform registry as a health-monitored
 * component.  Check functions read lifecycle status from the registry — no
 * duplicate health model.
 */
function registerPlatformHealthChecks(
  healthService: IHealthService,
  registry: IServiceRegistry,
): void {
  for (const svc of registry.list()) {
    const { serviceId, displayName } = svc;
    healthService.register({
      componentId:   serviceId,
      componentName: displayName,
      category:      'service',
      check: () => {
        const lifecycleStatus = registry.getStatus(serviceId);
        return {
          status:  mapServiceStatusToHealth(lifecycleStatus),
          message: serviceStatusMessage(lifecycleStatus),
          details: { version: PLATFORM_SERVICE_VERSION },
        };
      },
    });
  }
}

/**
 * Creates a system-level {@link SdkContext} used before authentication
 * is implemented.  The system user has the `platform.admin` role and
 * operates in GLOBAL (cross-contractor) scope.
 *
 * Replace with a session-specific context factory once auth is wired.
 */
function buildSystemContext(): SdkContext {
  const now = new Date().toISOString();
  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const systemUser: UserContext = {
    userId:          createUserId('platform.system'),
    contractorId:    createContractorId('ACC'),
    displayName:     'Platform System',
    email:           'system@acc-reliability.platform',
    roles:           ['platform.admin' as UserRole],
    sessionId:       createSessionId(`sys-${Date.now().toString(36)}`),
    authenticatedAt: now,
    expiresAt:       oneYear,
  };

  const context: SdkContext = {
    currentUser: systemUser,
    scope:       globalScope(),
  };

  return context;
}

/**
 * Seeds the known contractor organizations (ACC, RHI, ASEC) into the
 * ContractorService on first bootstrap.  Uses the system actor from the
 * system context.  Silently skips if a contractor code already exists.
 */
function seedContractors(service: IContractorService): void {
  const systemActor = {
    userId:       createUserId('platform.system'),
    contractorId: createContractorId('ACC'),
  };

  const seeds: Array<{
    contractorCode: string;
    name: string;
    shortName: string;
    email: string;
    phone: string;
    contactPerson: string;
    areasOwned: string[];
  }> = [
    {
      contractorCode: 'ACC',
      name:          'ACC Reliability',
      shortName:     'ACC',
      email:         'admin@acc-reliability.com',
      phone:         '+966-11-000-0001',
      contactPerson: 'ACC Platform Admin',
      areasOwned:    ['Area-01', 'Area-02', 'Area-03'],
    },
    {
      contractorCode: 'RHI',
      name:          'RHI Services',
      shortName:     'RHI',
      email:         'admin@rhi-services.com',
      phone:         '+966-11-000-0002',
      contactPerson: 'RHI Operations Manager',
      areasOwned:    ['Area-04', 'Area-05'],
    },
    {
      contractorCode: 'ASEC',
      name:          'ASEC Engineering',
      shortName:     'ASEC',
      email:         'admin@asec-engineering.com',
      phone:         '+966-11-000-0003',
      contactPerson: 'ASEC Chief Engineer',
      areasOwned:    ['Area-06'],
    },
  ];

  for (const seed of seeds) {
    try {
      service.create(
        {
          contractorCode: createContractorId(seed.contractorCode),
          name:           seed.name,
          shortName:      seed.shortName,
          email:          seed.email,
          phone:          seed.phone,
          contactPerson:  seed.contactPerson,
          areasOwned:     seed.areasOwned,
          equipmentScope: { categories: ['Rotating Equipment', 'Static Equipment'] },
        },
        systemActor,
      );
    } catch {
      // Silently skip duplicates — safe for hot-reloads
    }
  }
}

/**
 * Seeds the platform modules into the ModuleService on first bootstrap.
 * Uses the system actor.  Silently skips if a module key already exists.
 */
function seedModules(service: IModuleService): void {
  const systemActor = {
    userId:       createUserId('platform.system'),
    contractorId: createContractorId('ACC'),
  };

  const seeds: Array<RegisterModuleRequest> = [
    {
      moduleKey:          'user-management',
      name:               'User Management',
      version:            '1.0.0',
      category:           'Core',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'ready'        as ('ready' | 'pending' | 'none'),
      searchStatus:       'indexed'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       [],
    },
    {
      moduleKey:          'contractor-management',
      name:               'Contractor Management',
      version:            '1.0.0',
      category:           'Core',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'ready'        as ('ready' | 'pending' | 'none'),
      searchStatus:       'indexed'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['user-management'],
    },
    {
      moduleKey:          'module-registry',
      name:               'Module Registry',
      version:            '1.0.0',
      category:           'Core',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'pending'      as ('ready' | 'pending' | 'none'),
      searchStatus:       'indexed'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['user-management'],
    },
    {
      moduleKey:          'workflow-engine',
      name:               'Workflow Engine',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'partial'      as ModuleConfigStatus,
      localizationStatus: 'partial'      as ModuleLocalizationStatus,
      learningStatus:     'pending'      as ('ready' | 'pending' | 'none'),
      searchStatus:       'pending'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['user-management', 'contractor-management'],
    },
    {
      moduleKey:          'audit-service',
      name:               'Audit Service',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'indexed'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       [],
    },
    {
      moduleKey:          'notification-management',
      name:               'Notification Management',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['user-management'],
    },
    {
      moduleKey:          'health-monitor',
      name:               'Health Monitor',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'partial'      as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       [],
    },
    {
      moduleKey:          'reporting-center',
      name:               'Reporting Center',
      version:            '1.0.0',
      category:           'Analytics',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['audit-service'],
    },
    {
      moduleKey:          'oil-lubrication',
      name:               'Oil Lubrication',
      version:            '1.0.0',
      category:           'Operations',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'ready'        as ('ready' | 'pending' | 'none'),
      searchStatus:       'indexed'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['workflow-engine', 'contractor-management'],
    },
    {
      moduleKey:          'oil-analysis',
      name:               'Oil Analysis',
      version:            '1.0.0',
      category:           'Operations',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'ready'        as ('ready' | 'pending' | 'none'),
      searchStatus:       'indexed'      as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       ['oil-lubrication'],
    },
    {
      moduleKey:          'vibration-analysis',
      name:               'Vibration Analysis',
      version:            '1.0.0',
      category:           'Operations',
      healthStatus:       'unknown'      as ModuleHealthStatus,
      configStatus:       'unconfigured' as ModuleConfigStatus,
      localizationStatus: 'none'         as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'hidden'       as ('visible' | 'hidden'),
      dependencies:       ['contractor-management'],
    },
    // Sprint 03: Owner Center platform modules not previously seeded
    {
      moduleKey:          'branding',
      name:               'Branding Center',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       [],
    },
    {
      moduleKey:          'localization',
      name:               'Localization Center',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       [],
    },
    {
      moduleKey:          'platform-settings',
      name:               'Platform Settings',
      version:            '1.0.0',
      category:           'Platform',
      healthStatus:       'healthy'      as ModuleHealthStatus,
      configStatus:       'configured'   as ModuleConfigStatus,
      localizationStatus: 'ready'        as ModuleLocalizationStatus,
      learningStatus:     'none'         as ('ready' | 'pending' | 'none'),
      searchStatus:       'none'         as ModuleSearchStatus,
      visibility:         'visible'      as ('visible' | 'hidden'),
      dependencies:       [],
    },
  ];

  for (const seed of seeds) {
    try {
      service.register(seed, systemActor);
    } catch {
      // Silently skip duplicates — safe for hot-reloads
    }
  }
}

/**
 * Seeds default notification configuration records on first bootstrap.
 */
function seedNotificationManagement(service: INotificationManagementService): void {
  const systemActor = {
    userId:       createUserId('platform.system'),
    contractorId: createContractorId('ACC'),
  };

  const seeds: CreateNotificationRuleRequest[] = [
    {
      objectType: 'channel',
      ruleKey:    'in-app',
      name:       'In-App Notifications',
      description: 'Platform in-app notification delivery channel',
      settings:   { channelType: 'in-app' },
    },
    {
      objectType: 'channel',
      ruleKey:    'email',
      name:       'Email Notifications',
      description: 'Email delivery channel (configuration only)',
      settings:   { channelType: 'email' },
    },
    {
      objectType: 'template',
      ruleKey:    'action-assigned',
      name:       'Action Assigned',
      description: 'Template sent when an action is assigned to a user',
      settings:   { messageTemplate: 'You have been assigned action {{actionId}}.' },
    },
    {
      objectType: 'template',
      ruleKey:    'approval-required',
      name:       'Approval Required',
      description: 'Template sent when an approval is required',
      settings:   { messageTemplate: 'Approval required for {{entityType}} {{entityId}}.' },
    },
    {
      objectType: 'rule',
      ruleKey:    'action-created',
      name:       'Action Created Rule',
      description: 'Notify assignees when a new action is created',
      settings:   {
        triggerEvent:   'ActionCreated',
        templateKey:    'action-assigned',
        channelKeys:    ['in-app', 'email'],
        recipientRoles: ['operator', 'supervisor'],
      },
    },
    {
      objectType: 'rule',
      ruleKey:    'approval-pending',
      name:       'Approval Pending Rule',
      description: 'Notify approvers when approval is pending',
      settings:   {
        triggerEvent:   'ApprovalPending',
        templateKey:    'approval-required',
        channelKeys:    ['in-app'],
        recipientRoles: ['approver'],
      },
    },
    {
      objectType: 'reminder',
      ruleKey:    'overdue-action-reminder',
      name:       'Overdue Action Reminder',
      description: 'Remind users of overdue actions every 24 hours',
      settings:   {
        linkedRuleKey:          'action-created',
        templateKey:            'action-assigned',
        reminderIntervalHours:  24,
      },
    },
    {
      objectType: 'escalation',
      ruleKey:    'unacknowledged-escalation-l1',
      name:       'Unacknowledged Escalation L1',
      description: 'Escalate to supervisor when notification is unacknowledged',
      settings:   {
        linkedRuleKey:    'action-created',
        escalationLevel:  1,
        escalateToRoles:  ['supervisor'],
      },
    },
    {
      objectType: 'escalation',
      ruleKey:    'unacknowledged-escalation-l2',
      name:       'Unacknowledged Escalation L2',
      description: 'Escalate to platform admin when L1 escalation is unacknowledged',
      settings:   {
        linkedRuleKey:    'action-created',
        escalationLevel:  2,
        escalateToRoles:  ['platform.admin'],
      },
    },
  ];

  for (const seed of seeds) {
    try {
      service.create(seed, systemActor);
    } catch {
      // Silently skip duplicates — safe for hot-reloads
    }
  }
}

/**
 * Seeds default reporting configuration records on first bootstrap.
 */
function seedReporting(service: IReportingService): void {
  const systemActor = {
    userId:       createUserId('platform.system'),
    contractorId: createContractorId('ACC'),
  };
  const ownerId = createUserId('platform.admin');

  const seeds: CreateReportRequest[] = [
    {
      objectType: 'category',
      reportKey:  'equipment-health',
      name:       'Equipment Health',
      description: 'Reports covering asset condition and reliability metrics',
    },
    {
      objectType: 'category',
      reportKey:  'compliance',
      name:       'Compliance',
      description: 'Regulatory and procedural compliance reporting',
    },
    {
      objectType: 'category',
      reportKey:  'operations',
      name:       'Operations',
      description: 'Operational performance and contractor KPIs',
    },
    {
      objectType: 'category',
      reportKey:  'platform',
      name:       'Platform',
      description: 'Platform health, audit, and module status reports',
    },
    {
      objectType: 'template',
      reportKey:  'standard-tabular',
      name:       'Standard Tabular Template',
      description: 'Default tabular layout for operational reports',
      settings:   { layoutTemplate: 'tabular-v1' },
    },
    {
      objectType: 'template',
      reportKey:  'summary-dashboard',
      name:       'Summary Dashboard Template',
      description: 'Executive summary layout with KPI highlights',
      settings:   { layoutTemplate: 'summary-v1' },
    },
    {
      objectType: 'export-profile',
      reportKey:  'standard-exports',
      name:       'Standard Export Profile',
      description: 'PDF, Excel, and CSV export formats',
      settings:   { allowedFormats: ['pdf', 'xlsx', 'csv'] },
    },
    {
      objectType: 'export-profile',
      reportKey:  'audit-exports',
      name:       'Audit Export Profile',
      description: 'PDF and CSV for audit and compliance reports',
      settings:   { allowedFormats: ['pdf', 'csv'] },
    },
    {
      objectType: 'schedule-profile',
      reportKey:  'daily-morning',
      name:       'Daily Morning Schedule',
      description: 'Automated daily distribution at 06:00',
      settings:   { frequency: 'daily', scheduleExpression: '0 6 * * *', recipientRoles: ['supervisor'] },
    },
    {
      objectType: 'schedule-profile',
      reportKey:  'weekly-summary',
      name:       'Weekly Summary Schedule',
      description: 'Weekly summary distribution every Monday',
      settings:   { frequency: 'weekly', scheduleExpression: '0 8 * * 1', recipientRoles: ['platform.admin'] },
    },
    {
      objectType:  'definition',
      reportKey:   'equipment-health-report',
      name:        'Equipment Health Report',
      description: 'Asset condition scores, failure trends, and maintenance backlog',
      category:    'equipment-health',
      exportFormats: ['pdf', 'xlsx'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'oil-lubrication',
        templateKey:        'standard-tabular',
        exportProfileKey:   'standard-exports',
        scheduleProfileKey: 'daily-morning',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'lubrication-compliance',
      name:        'Lubrication Compliance',
      description: 'Lubrication route adherence and missed task summary',
      category:    'compliance',
      exportFormats: ['pdf', 'csv'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'oil-lubrication',
        templateKey:        'standard-tabular',
        exportProfileKey:   'standard-exports',
        scheduleProfileKey: 'weekly-summary',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'oil-analysis-summary',
      name:        'Oil Analysis Summary',
      description: 'Laboratory oil analysis results and anomaly flags',
      category:    'equipment-health',
      exportFormats: ['pdf', 'xlsx'],
      scheduleEnabled: false,
      owner: ownerId,
      settings: {
        sourceModule:     'oil-lubrication',
        templateKey:      'summary-dashboard',
        exportProfileKey: 'standard-exports',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'vibration-trend',
      name:        'Vibration Trend',
      description: 'Vibration measurement trends and alert thresholds',
      category:    'equipment-health',
      exportFormats: ['pdf', 'xlsx', 'csv'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'oil-lubrication',
        templateKey:        'standard-tabular',
        exportProfileKey:   'standard-exports',
        scheduleProfileKey: 'daily-morning',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'contractor-kpi',
      name:        'Contractor KPI',
      description: 'Contractor performance indicators and SLA adherence',
      category:    'operations',
      exportFormats: ['pdf', 'xlsx'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'contractor-management',
        templateKey:        'summary-dashboard',
        exportProfileKey:   'standard-exports',
        scheduleProfileKey: 'weekly-summary',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'workflow-sla',
      name:        'Workflow SLA',
      description: 'Approval workflow turnaround times and breach counts',
      category:    'operations',
      exportFormats: ['pdf', 'csv'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'workflow-approval',
        templateKey:        'standard-tabular',
        exportProfileKey:   'audit-exports',
        scheduleProfileKey: 'weekly-summary',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'platform-health',
      name:        'Platform Health',
      description: 'Module health status, degraded services, and uptime summary',
      category:    'platform',
      exportFormats: ['pdf', 'html'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'module-registry',
        templateKey:        'summary-dashboard',
        exportProfileKey:   'standard-exports',
        scheduleProfileKey: 'daily-morning',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'audit-report',
      name:        'Audit Report',
      description: 'Platform audit trail summary by category and severity',
      category:    'platform',
      exportFormats: ['pdf', 'csv'],
      scheduleEnabled: false,
      owner: ownerId,
      settings: {
        sourceModule:     'audit-service',
        templateKey:      'standard-tabular',
        exportProfileKey: 'audit-exports',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'notification-statistics',
      name:        'Notification Statistics',
      description: 'Notification volume, delivery rates, and escalation counts',
      category:    'platform',
      exportFormats: ['pdf', 'xlsx'],
      scheduleEnabled: true,
      owner: ownerId,
      settings: {
        sourceModule:       'notification-management',
        templateKey:        'standard-tabular',
        exportProfileKey:   'standard-exports',
        scheduleProfileKey: 'weekly-summary',
      },
    },
    {
      objectType:  'definition',
      reportKey:   'module-status',
      name:        'Module Status',
      description: 'Registered module versions, health, and configuration status',
      category:    'platform',
      exportFormats: ['pdf', 'xlsx', 'csv'],
      scheduleEnabled: false,
      owner: ownerId,
      settings: {
        sourceModule:     'module-registry',
        templateKey:      'standard-tabular',
        exportProfileKey: 'standard-exports',
      },
    },
  ];

  for (const seed of seeds) {
    try {
      service.create(seed, systemActor);
    } catch {
      // Silently skip duplicates — safe for hot-reloads
    }
  }
}

/**
 * Seeds sample workflow definitions into the WorkflowService on first bootstrap.
 */
function seedWorkflows(service: IWorkflowService): void {
  const systemActor = {
    userId:       createUserId('platform.system'),
    contractorId: createContractorId('ACC'),
  };

  const seeds: CreateWorkflowDefinitionRequest[] = [
    {
      workflowKey: 'action-approval',
      name:        'Action Approval',
      description: 'Standard approval workflow for operational actions',
      workflowType: 'sequential',
      slaHours:    48,
      steps: [
        { stepKey: 'supervisor-review', name: 'Supervisor Review', order: 1, approverRole: 'supervisor' },
        { stepKey: 'manager-approval',  name: 'Manager Approval',  order: 2, approverRole: 'manager' },
      ],
      approvalRules: [
        { ruleKey: 'supervisor-approval', name: 'Supervisor Approval', approverRoles: ['supervisor'], requiredApprovals: 1 },
        { ruleKey: 'manager-approval',    name: 'Manager Approval',    approverRoles: ['manager'],    requiredApprovals: 1 },
      ],
      slaRules: [
        { ruleKey: 'action-sla', name: 'Action Approval SLA', targetHours: 48 },
      ],
      escalationRules: [
        { ruleKey: 'action-escalation-l1', name: 'Action Escalation L1', escalateAfterHours: 24, escalateToRoles: ['manager'] },
      ],
    },
    {
      workflowKey: 'contractor-change',
      name:        'Contractor Change Request',
      description: 'Approval workflow for contractor profile changes',
      workflowType: 'sequential',
      slaHours:    72,
      steps: [
        { stepKey: 'compliance-review', name: 'Compliance Review', order: 1, approverRole: 'compliance' },
        { stepKey: 'admin-approval',    name: 'Admin Approval',    order: 2, approverRole: 'platform.admin' },
      ],
      approvalRules: [
        { ruleKey: 'compliance-check', name: 'Compliance Check', approverRoles: ['compliance'], requiredApprovals: 1 },
      ],
      slaRules: [
        { ruleKey: 'change-sla', name: 'Change Request SLA', targetHours: 72 },
      ],
      escalationRules: [
        { ruleKey: 'change-escalation', name: 'Change Escalation', escalateAfterHours: 48, escalateToRoles: ['platform.admin'] },
      ],
      conditionRules: [
        { ruleKey: 'high-impact', name: 'High Impact Change', field: 'impactLevel', operator: 'eq', value: 'high' },
      ],
    },
    {
      workflowKey: 'module-deployment',
      name:        'Module Deployment',
      description: 'Parallel approval for module release deployment',
      workflowType: 'parallel',
      slaHours:    24,
      steps: [
        { stepKey: 'qa-signoff',   name: 'QA Sign-off',   order: 1, approverRole: 'qa' },
        { stepKey: 'ops-signoff',  name: 'Ops Sign-off',  order: 2, approverRole: 'operator' },
      ],
      slaRules: [
        { ruleKey: 'deploy-sla', name: 'Deployment SLA', targetHours: 24 },
      ],
    },
  ];

  for (const seed of seeds) {
    try {
      const created = service.createDefinition(seed, systemActor);
      if (seed.workflowKey === 'action-approval' || seed.workflowKey === 'module-deployment') {
        service.publishDefinition(created.id, systemActor);
      }
    } catch {
      // Silently skip duplicates — safe for hot-reloads
    }
  }
}

/**
 * Asserts that all required services are registered in the service registry.
 * Throws {@link PlatformError} with a clear diagnostic message on failure.
 */
function validateRequiredServices(
  registry: IServiceRegistry,
  logger: ILogger,
): void {
  const missing = REQUIRED_SERVICE_IDS.filter((id) => !registry.has(id));

  if (missing.length > 0) {
    throw new PlatformError(
      `Platform SDK bootstrap validation failed — missing required services: ${missing.join(', ')}`,
      'SDK_BOOTSTRAP_VALIDATION_FAILED',
      { missing, registered: registry.list().map((s) => s.serviceId) },
    );
  }

  const duplicateCheck = REQUIRED_SERVICE_IDS.reduce<string[]>((acc, id) => {
    if (!registry.has(id)) acc.push(id);
    return acc;
  }, []);

  logger.debug('Platform SDK: startup validation passed', {
    required:        REQUIRED_SERVICE_IDS.length,
    running:         registry.listByStatus('running').length,
    missingServices: duplicateCheck,
  });
}
